const { Account } = require('../models');

// GET /api/balance/total
const getTotalBalance = async (req, res) => {
  try {
    const accounts = await Account.findAll({
      where: { user_id: req.user.id }
    });
    
    // Sumar el balance de todas las cuentas
    const totalBalance = accounts.reduce((sum, account) => {
      return sum + parseFloat(account.balance);
    }, 0);

    res.json({ totalBalance });
  } catch (error) {
    console.error('Error calculating total balance:', error);
    res.status(500).json({ error: 'Error calculating total balance' });
  }
};

module.exports = {
  getTotalBalance
};
