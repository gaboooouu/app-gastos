const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BudgetItem = sequelize.define('BudgetItem', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  concept: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  estimated: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  real_manual: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Pendiente', 'Pagado'),
    allowNull: false,
    defaultValue: 'Pendiente',
  },
  month: {
    type: DataTypes.STRING, // Format 'YYYY-MM'
    allowNull: false,
  },
  keyword: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  budget_group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  timestamps: true,
});

module.exports = BudgetItem;
