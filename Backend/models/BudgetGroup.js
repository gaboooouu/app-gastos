const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BudgetGroup = sequelize.define('BudgetGroup', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'bg-slate-100/50',
  },
  textColor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'text-slate-700',
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  timestamps: true,
});

module.exports = BudgetGroup;

