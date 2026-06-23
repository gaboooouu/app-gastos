const { Account, Transaction } = require('../models');
const { Op } = require('sequelize');

// GET /api/accounts
const getAccounts = async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: { user_id: req.user.id }
    });
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Error fetching accounts' });
  }
};

// POST /api/accounts
const createAccount = async (req, res) => {
  try {
    const { name, currency, type, fintoc_link_id } = req.body;
    let { balance } = req.body;
    
    // Validación básica
    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // 🚀 INTERVENCIÓN FINTOC: Manejar la condición de carrera con el Webhook
    if (type === 'fintoc' && fintoc_link_id) {
       // Buscamos si el webhook se adelantó y ya guardó el token secreto (link_token) y el saldo
       const existingAccount = await Account.findOne({
         where: { fintoc_link_id: { [Op.startsWith]: fintoc_link_id } }
       });

       if (existingAccount) {
         // ¡El webhook fue más rápido! Le actualizamos el nombre y le asignamos el user_id
         await existingAccount.update({ name, user_id: req.user.id });
         
         // Sincronizamos las transacciones huérfanas creadas por el webhook con este user_id
         await Transaction.update(
           { user_id: req.user.id },
           { where: { account_id: existingAccount.id } }
         );

         return res.status(200).json(existingAccount);
       }
       // Si el webhook aún no llega, la creamos con balance 0 y el id público. El webhook la actualizará en breve.
       balance = 0;
    }

    const account = await Account.create({
      name,
      balance: balance || 0.00,
      currency: currency || 'CLP',
      type, // 'manual' o 'fintoc'
      fintoc_link_id: type === 'fintoc' ? fintoc_link_id : null,
      user_id: req.user.id
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Error creating account' });
  }
};

// PUT /api/accounts/:id
const updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, balance } = req.body;
    
    // Filtrar explícitamente por user_id para seguridad
    const account = await Account.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!account) return res.status(404).json({ error: 'Account not found or unauthorized' });
    
    // Solo permitir edición en manuales, o tal vez solo el nombre en fintoc
    if (account.type !== 'manual') {
      return res.status(400).json({ error: 'Cannot edit Fintoc generated accounts balances' });
    }

    account.name = name || account.name;
    // Permitir balance a 0 explícitamente si se remueve todo, pero respetamos si es no enviado
    if (balance !== undefined) {
      account.balance = balance;
    }
    
    await account.save();
    res.json(account);
  } catch (error) {
    console.error('Error updating account:', error);
    res.status(500).json({ error: 'Error updating account' });
  }
};

// DELETE /api/accounts/:id
const deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Filtrar explícitamente por user_id para seguridad
    const account = await Account.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!account) return res.status(404).json({ error: 'Account not found or unauthorized' });
    
    // Eliminamos manualmente las transacciones del usuario asociadas a esta cuenta
    await Transaction.destroy({ 
      where: { account_id: id, user_id: req.user.id } 
    });
    
    await account.destroy();
    res.json({ message: 'Cuenta y transacciones eliminadas correctamente' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Error al eliminar la cuenta' });
  }
};

module.exports = {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount
};
