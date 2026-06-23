const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BudgetItemCategory = sequelize.define('BudgetItemCategory', {
  // Solo la tabla de unión
}, { timestamps: false });

module.exports = BudgetItemCategory;
