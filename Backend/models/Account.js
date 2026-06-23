const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Account = sequelize.define('Account', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  balance: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'CLP', // Asumiremos peso chileno u otra moneda que maneje Fintoc
  },
  type: {
    type: DataTypes.ENUM('manual', 'fintoc'),
    allowNull: false,
    defaultValue: 'manual',
  },
  fintoc_link_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Permitir nulo temporalmente por condiciones de carrera en Fintoc
  }
}, {
  timestamps: true,
});

module.exports = Account;

