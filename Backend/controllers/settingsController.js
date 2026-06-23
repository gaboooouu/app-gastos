const { Transaction, Account, Category, Setting, BudgetGroup } = require('../models');
const { Op } = require('sequelize');

// GET /api/settings
const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { user_id: req.user.id }
    });
    const result = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});
    res.json(result);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Error al obtener configuraciones' });
  }
};

// POST /api/settings
const updateSettings = async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    for (const [key, value] of Object.entries(updates)) {
      await Setting.upsert({ 
        key, 
        value: String(value),
        user_id: req.user.id 
      });
    }
    res.json({ message: 'Configuraciones actualizadas con éxito' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Error al actualizar configuraciones' });
  }
};

// DELETE /api/settings/reset
const resetAllData = async (req, res) => {
  try {
    // Eliminar solo los datos vinculados al usuario autenticado
    await Transaction.destroy({ where: { user_id: req.user.id } });
    await Account.destroy({ where: { user_id: req.user.id } });
    await Category.destroy({ where: { user_id: req.user.id } });
    await BudgetGroup.destroy({ where: { user_id: req.user.id } });
    await Setting.destroy({ where: { user_id: req.user.id } });
    
    res.json({ message: 'Todos tus datos han sido restablecidos a cero.' });
  } catch (error) {
    console.error('Error resetting database:', error);
    res.status(500).json({ error: 'Error al resetear la base de datos' });
  }
};

// POST /api/settings/delete-by-date
const deleteTransactionsByDate = async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Se requieren ambas fechas.' });
    }

    // Obtenemos los gastos dentro del rango vinculados al usuario
    const transactions = await Transaction.findAll({
      where: {
        user_id: req.user.id,
        date: {
          [Op.between]: [new Date(startDate + 'T00:00:00'), new Date(endDate + 'T23:59:59.999')]
        }
      }
    });

    if (transactions.length === 0) {
      return res.status(404).json({ message: 'No se encontraron movimientos en este rango de fechas.' });
    }

    // Ajustar saldos de las cuentas del usuario
    for (const t of transactions) {
      if (t.account_id) {
        const account = await Account.findOne({
          where: { id: t.account_id, user_id: req.user.id }
        });
        if (account) {
          let newBalance = parseFloat(account.balance);
          const amountVal = parseFloat(t.amount);
          
          if (t.type === 'ingreso') {
            newBalance -= amountVal;
          } else if (t.type === 'gasto') {
            newBalance += Math.abs(amountVal);
          }
          await account.update({ balance: newBalance });
        }
      }
      await t.destroy();
    }

    res.json({ message: `Se eliminaron ${transactions.length} movimientos y se reajustaron los saldos de las cuentas correctamente.` });
  } catch (error) {
    console.error('Error deleting transactions by date:', error);
    res.status(500).json({ error: 'Error al eliminar movimientos por fecha' });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  resetAllData,
  deleteTransactionsByDate
};
