const { sequelize } = require('./models');
sequelize.query("PRAGMA table_info(BudgetItems);").then(([results]) => {
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
