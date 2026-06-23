const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Account = require('./Account');
const Category = require('./Category');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  original_description: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  custom_description: {
    // Nombre amigable editable
    type: DataTypes.STRING,
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('ingreso', 'gasto'),
    allowNull: false,
  },
  source: {
    type: DataTypes.ENUM('fintoc', 'manual', 'notification'),
    allowNull: false,
  },
  budget_month: {
    type: DataTypes.STRING, // Format 'YYYY-MM'
    allowNull: true,
  },
  parent_id: {
    // Para transacciones divididas (split)
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  is_split: {
    // Indica que esta transacción es el "padre" y ha sido dividida, 
    // por lo tanto no debe sumarse a balances o presupuestos.
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Permitir nulo temporalmente si viene de Fintoc sin vincular cuenta aún
  }
}, {
  timestamps: true,
});

module.exports = Transaction;

