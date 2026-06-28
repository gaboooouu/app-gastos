const { Transaction, Account, Setting, sequelize } = require('../models');
const { Op } = require('sequelize');
const { checkAndNotifySpending } = require('../services/notificationService');
const { sendSyncNotification } = require('../services/emailService');

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
  receiveNotificationWebhook
};
