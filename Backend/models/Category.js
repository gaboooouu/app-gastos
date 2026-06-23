const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Category = sequelize.define('Category', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'default-icon',
  },
  color: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'bg-slate-100',
  },
  budget_type: {
    type: DataTypes.ENUM('fijo', 'libre', 'ahorro'),
    allowNull: false,
    defaultValue: 'libre'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'user_id']
    }
  ]
});

module.exports = Category;

