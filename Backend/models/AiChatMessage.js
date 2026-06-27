const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiChatMessage = sequelize.define('AiChatMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  sender: {
    type: DataTypes.ENUM('user', 'ai'),
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'ai_chat_messages',
  timestamps: true
});

module.exports = AiChatMessage;
