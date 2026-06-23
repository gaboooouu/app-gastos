const { Transaction, Account, Setting, sequelize } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');
const { checkAndNotifySpending } = require('../services/notificationService');
const { sendSyncNotification } = require('../services/emailService');

const getFintocKey = () => process.env.FINTOC_SECRET_KEY || 'sk_test_tSsmjXi_aDSZx2zkxgCx2X_PU_SWHKNXo2ziAWtceCA';

// POST /api/webhooks/fintoc
const receiveFintocWebhook = async (req, res) => {
  const { type, data } = req.body;

  // == 1. Manejo de la Creación de la Vinculación (Link Created) ==
  if (type === 'link.created' && data) {
    try {
      let account = await Account.findOne({ 
        where: { fintoc_link_id: { [Op.startsWith]: data.id } } 
      });
      
      let totalFintocBalance = 0;
      if (data.accounts && data.accounts.length > 0) {
        data.accounts.forEach(acc => {
           totalFintocBalance += (acc.balance?.available || acc.balance?.current || 0);
        });
      }

      if (account) {
        await account.update({
          fintoc_link_id: data.link_token, 
          balance: totalFintocBalance
        });
        console.log(`✅ Fintoc Link Completado: Saldo actualizado -> $${totalFintocBalance}`);
      } else {
        // CONDICIÓN DE CARRERA: Se crea la cuenta sin user_id (temporalmente nulo)
        account = await Account.create({
          name: data.institution?.name || 'Cuenta Fintoc',
          type: 'fintoc',
          fintoc_link_id: data.link_token, 
          balance: totalFintocBalance,
          currency: 'CLP',
          user_id: null
        });
        console.log(`🚀 Fintoc Webhook se adelantó al Frontend creando la cuenta de ${totalFintocBalance}`);
      }
      return res.status(200).json({ status: 'Link created handled successfully' });
    } catch (error) {
      console.error('Error handling link.created:', error);
      return res.status(500).json({ error: 'Error processing link' });
    }
  }

  // == 2. Manejo de Nuevos Movimientos (Sincronización en Background) ==
  if (type === 'account.refresh_intent.succeeded' && data?.refreshed_object_id) {
    const fintocAccountId = data.refreshed_object_id;
    try {
      const fintocAccounts = await Account.findAll({ where: { type: 'fintoc' } });
      let matchedAccount = null;
      let newMovementsArray = [];
      let accountBalance = 0;

      for (const acc of fintocAccounts) {
        if (!acc.fintoc_link_id) continue;
        try {
          const response = await axios.get(`https://api.fintoc.com/v1/accounts/${fintocAccountId}/movements?link_token=${acc.fintoc_link_id}`, {
            headers: { 'Authorization': getFintocKey() }
          });
          
          if (response.data) {
            matchedAccount = acc;
            newMovementsArray = response.data;
            
            const balanceResponse = await axios.get(`https://api.fintoc.com/v1/accounts/${fintocAccountId}?link_token=${acc.fintoc_link_id}`, {
              headers: { 'Authorization': getFintocKey() }
            });
            accountBalance = balanceResponse.data?.balance?.available || balanceResponse.data?.balance?.current || acc.balance;
            
            break;
          }
        } catch (err) {
          continue;
        }
      }

      if (!matchedAccount) {
        return res.status(200).json({ status: 'Account not found or no associated link_token' });
      }

      let addedCount = 0;
      for (const mov of newMovementsArray) {
        const amountVal = parseFloat(mov.amount);
        const transactionType = amountVal < 0 ? 'gasto' : 'ingreso';
        const absoluteAmount = Math.abs(amountVal);
        
        const existingTx = await Transaction.findOne({
          where: {
            account_id: matchedAccount.id,
            amount: absoluteAmount,
            original_description: mov.description,
            type: transactionType,
            source: 'fintoc'
          }
        });

        if (!existingTx) {
          await Transaction.create({
            account_id: matchedAccount.id,
            amount: absoluteAmount,
            date: mov.post_date || new Date(),
            original_description: mov.description,
            type: transactionType,
            source: 'fintoc',
            user_id: matchedAccount.user_id // Copiar el user_id de la cuenta matched
          });
          addedCount++;
        }
      }

      await matchedAccount.update({ balance: accountBalance });
      console.log(`✅ Fintoc Sync completado: ${addedCount} nuevos movimientos guardados. Saldo actualizado: $${accountBalance}`);

      if (addedCount > 0) {
        checkAndNotifySpending();
        
        try {
          const settings = await Setting.findAll({ where: { user_id: matchedAccount.user_id } });
          const settingsMap = settings.reduce((acc, s) => { acc[s.key] = s.value; return acc; }, {});
          if (settingsMap['email_notifications_enabled'] === 'true') {
            await sendSyncNotification(addedCount, settingsMap['notification_email']);
          }
        } catch (e) {
          console.error('Error enviando notificación de sync:', e);
        }
      }

      return res.status(200).json({ status: 'Sync successful', synced_movements: addedCount });
      
    } catch (error) {
      console.error('Error sincronizando background Fintoc:', error);
      return res.status(500).json({ error: 'Internal sync error' });
    }
  }

  // == 3. Compatibilidad hacia atrás (Movement Created) ==
  if (type === 'movement.created' && data && data.link_token) {
    const { link_token, movement } = data;
    const t = await sequelize.transaction();

    try {
      const account = await Account.findOne({ 
        where: { fintoc_link_id: { [Op.startsWith]: link_token.split('_token')[0] } }, 
        transaction: t 
      });

      if (!account) {
        await t.rollback();
        console.warn(`Webhook ignored: no account found with link_token ${link_token}`);
        return res.status(200).json({ status: 'Account not found for the provided link_id' });
      }

      const amountVal = parseFloat(movement.amount);
      const isGasto = amountVal < 0; 
      const transactionType = isGasto ? 'gasto' : 'ingreso';
      const absoluteAmount = Math.abs(amountVal);

      await Transaction.create({
        account_id: account.id,
        amount: absoluteAmount,
        date: movement.post_date || new Date(),
        original_description: movement.description,
        custom_description: null, 
        category_id: null, 
        type: transactionType,
        source: 'fintoc',
        user_id: account.user_id // Copiar el user_id de la cuenta Fintoc
      }, { transaction: t });

      let newBalance = parseFloat(account.balance);
      if (transactionType === 'ingreso') {
        newBalance += absoluteAmount;
      } else {
        newBalance -= absoluteAmount;
      }

      await account.update({ balance: newBalance }, { transaction: t });
      await t.commit();

      if (transactionType === 'gasto') {
        checkAndNotifySpending();
      }

      return res.status(200).json({ status: 'Webhook processed successfully' });
    } catch (error) {
      await t.rollback();
      console.error('Error processing Fintoc webhook:', error);
      return res.status(500).json({ error: 'Internal server error processing webhook' });
    }
  }

  return res.status(200).json({ status: 'Event ignored by design' });
};

// POST /api/webhooks/notifications (Protegido por JWT en el enrutamiento principal)
const receiveNotificationWebhook = async (req, res) => {
  const { package: appPackage, title, text, date } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'No text provided in notification' });
  }

  console.log(`\n🔔 Notificación recibida para usuario ${req.user.id} de ${appPackage}: "${text}"`);

  // --- PARSER DE BANCOS CHILENOS ---
  let amount = null;
  let description = text;
  let type = 'gasto';

  const amountMatch = text.match(/\$\s?([0-9.]+)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/\./g, ''));
  }

  const textLower = text.toLowerCase();
  const isTransferIngreso = textLower.includes('transferencia recibida') || 
                            textLower.includes('hacia tu cuenta') || 
                            textLower.includes('abono') || 
                            textLower.includes('depósito');
  
  const isTransferEgreso = textLower.includes('transferencia desde tu cuenta');

  if (isTransferIngreso) {
    type = 'ingreso';
    description = 'Transferencia Recibida';
  } else if (isTransferEgreso) {
    type = 'gasto';
    description = 'Transferencia Enviada';
  } else {
    const commerceMatch = text.match(/.*\ben\s+(.+?)\s+por\s+\$/i);
    
    if (commerceMatch) {
      description = commerceMatch[1].trim();
    } else {
       const generalMatch = text.match(/.*\ben\s+([^.,$]+)/i);
       if (generalMatch) {
         description = generalMatch[1].split(/\s+(?:con|el|la|asociada|terminada|su)/i)[0].trim();
       }
    }
  }

  if (!amount) {
    console.warn('⚠️ No se pudo extraer el monto de la notificación.');
    return res.status(200).json({ status: 'Notification received but no amount found' });
  }

  try {
    let accountName = 'Android Notifications';
    if (appPackage.includes('santander')) accountName = 'Santander';
    else if (appPackage.includes('bancochile')) accountName = 'Banco de Chile';
    else if (appPackage.includes('bci')) accountName = 'BCI';
    else if (appPackage.includes('itau')) accountName = 'Itau';
    else if (appPackage.includes('scotia')) accountName = 'Scotiabank';

    // Buscar o crear la cuenta asociada al usuario específico
    let [account] = await Account.findOrCreate({
      where: { name: accountName, user_id: req.user.id },
      defaults: { type: 'manual', balance: 0, user_id: req.user.id }
    });

    // Guardar transacción asociada al usuario
    const transaction = await Transaction.create({
      account_id: account.id,
      amount: amount,
      date: date ? new Date(date) : new Date(),
      original_description: text,
      custom_description: description,
      type: type,
      source: 'notification',
      user_id: req.user.id
    });

    // Actualizar saldo de la cuenta
    let newBalance = parseFloat(account.balance);
    if (type === 'ingreso') {
      newBalance += amount;
    } else {
      newBalance -= amount;
    }
    await account.update({ balance: newBalance });

    console.log(`✅ Transacción creada: $${amount} (${description}) desde ${accountName} para usuario ${req.user.id}`);

    if (type === 'gasto') {
      checkAndNotifySpending();
    }

    return res.status(200).json({ status: 'Notification processed', transaction: transaction });

  } catch (error) {
    console.error('❌ Error procesando notificación manual:', error);
    return res.status(500).json({ error: 'Manual notification sync error' });
  }
};

module.exports = {
  receiveFintocWebhook,
  receiveNotificationWebhook
};
