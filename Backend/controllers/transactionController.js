const { Transaction, Account, Category, sequelize } = require('../models');
const { checkAndNotifySpending } = require('../services/notificationService');

// GET /api/transactions/history/splits
const getSplitHistory = async (req, res) => {
  try {
    const { description } = req.query;
    if (!description) return res.status(400).json({ error: 'Description is required' });

    // Encontrar la transacción más reciente con esta descripción que fue dividida por el usuario actual
    const lastParent = await Transaction.findOne({
      where: { 
        original_description: description,
        is_split: true,
        user_id: req.user.id
      },
      order: [['date', 'DESC']]
    });

    if (!lastParent) return res.json([]);

    // Obtener sus hijos
    const children = await Transaction.findAll({
      where: { parent_id: lastParent.id, user_id: req.user.id }
    });

    res.json(children);
  } catch (error) {
    console.error('Error fetching split history:', error);
    res.status(500).json({ error: 'Error fetching split history' });
  }
};

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const { account_id, parent_id } = req.query;
    const whereClause = { user_id: req.user.id };
    if (account_id) whereClause.account_id = account_id;
    if (parent_id) whereClause.parent_id = parent_id;

    const transactions = await Transaction.findAll({
      where: whereClause,
      include: [
        { model: Account, as: 'account', attributes: ['name', 'type', 'currency'] },
        { model: Category, as: 'category' }
      ],
      order: [['date', 'DESC']]
    });

    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      error: 'Error fetching transactions', 
      details: error.message
    });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  const t = await sequelize.transaction();

  try {
    const { 
      account_id, amount, date, original_description, 
      custom_description, category_id, type 
    } = req.body;

    if (!account_id || !amount || !original_description || !type) {
      await t.rollback();
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Obtener la cuenta para validar y asegurar que pertenece al usuario
    const account = await Account.findOne({ 
      where: { id: account_id, user_id: req.user.id },
      transaction: t 
    });
    
    if (!account) {
      await t.rollback();
      return res.status(404).json({ error: 'Account not found or unauthorized' });
    }

    // 2. Crear la transacción asociada al usuario
    const newTransaction = await Transaction.create({
      account_id,
      amount,
      date: date || new Date(),
      original_description,
      custom_description: custom_description || null,
      category_id: category_id || null,
      budget_month: req.body.budget_month || null,
      type, // 'ingreso' o 'gasto'
      source: 'manual', 
      user_id: req.user.id
    }, { transaction: t });

    // 3. Actualizar el saldo (balance) de la cuenta
    const amountVal = parseFloat(amount);
    let newBalance = parseFloat(account.balance);
    if (type === 'ingreso') {
      newBalance += amountVal;
    } else if (type === 'gasto') {
      newBalance -= Math.abs(amountVal); 
    }

    await account.update({ balance: newBalance }, { transaction: t });

    // 4. Confirmar todo
    await t.commit();

    // Traerlo con las relaciones listas para devolver al cliente
    const transactionCreated = await Transaction.findByPk(newTransaction.id, {
      include: [{ model: Account, as: 'account' }, { model: Category, as: 'category' }]
    });

    // 5. Verificar presupuesto y notificar (puedes ajustar notificaciones por usuario si fuera necesario)
    checkAndNotifySpending(req.user.id);

    res.status(201).json(transactionCreated);
  } catch (error) {
    await t.rollback();
    console.error('Error creating manual transaction:', error);
    res.status(500).json({ error: 'Error creating transaction' });
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { custom_description, category_id, amount, date, type, account_id } = req.body;

    const transaction = await Transaction.findOne({
      where: { id, user_id: req.user.id }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    // Si es fintoc, se omiten monto, tipo, fecha, account
    const isManual = transaction.source === 'manual';

    await transaction.update({
      custom_description: custom_description !== undefined ? custom_description : transaction.custom_description,
      category_id: category_id !== undefined ? category_id : transaction.category_id,
      budget_month: req.body.budget_month !== undefined ? req.body.budget_month : transaction.budget_month,
      amount: (isManual && amount !== undefined) ? amount : transaction.amount,
      date: (date !== undefined) ? date : transaction.date, 
      type: (isManual && type !== undefined) ? type : transaction.type,
      account_id: (isManual && account_id !== undefined) ? account_id : transaction.account_id,
    });

    checkAndNotifySpending(req.user.id);

    res.json(transaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ error: 'Error updating transaction' });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const transaction = await Transaction.findOne({
      where: { id, user_id: req.user.id },
      transaction: t
    });
    
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    if (transaction.source !== 'manual') {
      await t.rollback();
      return res.status(400).json({ error: 'Cannot delete Fintoc generated transactions' });
    }

    const account = await Account.findOne({
      where: { id: transaction.account_id, user_id: req.user.id },
      transaction: t
    });
    
    if (account) {
      const amountVal = parseFloat(transaction.amount);
      let newBalance = parseFloat(account.balance);
      
      if (transaction.type === 'ingreso') {
        newBalance -= amountVal;
      } else if (transaction.type === 'gasto') {
        newBalance += Math.abs(amountVal);
      }
      
      await account.update({ balance: newBalance }, { transaction: t });
    }

    await transaction.destroy({ transaction: t });
    await t.commit();

    checkAndNotifySpending(req.user.id);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Error deleting transaction' });
  }
};

// POST /api/transactions/:id/split
const splitTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { splits } = req.body; 

    const parent = await Transaction.findOne({
      where: { id, user_id: req.user.id },
      transaction: t
    });
    
    if (!parent) {
      await t.rollback();
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    if (parent.is_split) {
      // Si ya estaba dividida, primero eliminamos las divisiones anteriores
      await Transaction.destroy({ where: { parent_id: id, user_id: req.user.id }, transaction: t });
    }

    // 1. Crear las nuevas sub-transacciones (hijos)
    const childrenData = splits.map(split => ({
      account_id: parent.account_id,
      amount: split.amount,
      date: parent.date, 
      original_description: parent.original_description,
      custom_description: split.custom_description || parent.custom_description,
      category_id: split.category_id || null,
      budget_month: split.budget_month || parent.budget_month,
      type: parent.type,
      source: 'manual', 
      parent_id: parent.id,
      is_split: false,
      user_id: req.user.id
    }));

    await Transaction.bulkCreate(childrenData, { transaction: t });

    // 2. Marcar al padre como dividido
    await parent.update({ is_split: true }, { transaction: t });

    await t.commit();

    res.json({ message: 'Transaction split successfully' });
  } catch (error) {
    await t.rollback();
    console.error('Error splitting transaction:', error);
    res.status(500).json({ error: 'Error splitting transaction' });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  splitTransaction,
  getSplitHistory
};
