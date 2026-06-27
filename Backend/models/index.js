const sequelize = require('../config/database');
const User = require('./User');
const Account = require('./Account');
const Category = require('./Category');
const Transaction = require('./Transaction');
const Setting = require('./Setting');
const BudgetGroup = require('./BudgetGroup');
const BudgetItem = require('./BudgetItem');
const BudgetItemCategory = require('./BudgetItemCategory');
const AiChatMessage = require('./AiChatMessage');

// Relaciones con User (Multi-usuario)
User.hasMany(Account, { foreignKey: 'user_id', as: 'accounts', onDelete: 'CASCADE' });
Account.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Category, { foreignKey: 'user_id', as: 'categories', onDelete: 'CASCADE' });
Category.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Transaction, { foreignKey: 'user_id', as: 'transactions', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(BudgetGroup, { foreignKey: 'user_id', as: 'budgetGroups', onDelete: 'CASCADE' });
BudgetGroup.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Setting, { foreignKey: 'user_id', as: 'settings', onDelete: 'CASCADE' });
Setting.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(AiChatMessage, { foreignKey: 'user_id', as: 'aiChatMessages', onDelete: 'CASCADE' });
AiChatMessage.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Definir Relaciones (Associations) entre modelos secundarios
Account.hasMany(Transaction, { foreignKey: 'account_id', as: 'transactions', onDelete: 'CASCADE' });
Transaction.belongsTo(Account, { foreignKey: 'account_id', as: 'account' });

Category.hasMany(Transaction, { foreignKey: 'category_id', as: 'transactions' });
Transaction.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Presupuesto
BudgetGroup.hasMany(BudgetItem, { foreignKey: 'budget_group_id', as: 'items', onDelete: 'CASCADE' });
BudgetItem.belongsTo(BudgetGroup, { foreignKey: 'budget_group_id', as: 'group' });

BudgetItem.belongsToMany(Category, { through: BudgetItemCategory, as: 'categories', foreignKey: 'budget_item_id' });
Category.belongsToMany(BudgetItem, { through: BudgetItemCategory, as: 'budgetItems', foreignKey: 'category_id' });

module.exports = {
  sequelize,
  User,
  Account,
  Category,
  Transaction,
  Setting,
  BudgetGroup,
  BudgetItem,
  BudgetItemCategory,
  AiChatMessage
};

