const { BudgetGroup } = require('./models');

async function checkGroups() {
  const groups = await BudgetGroup.findAll();
  console.log(JSON.stringify(groups, null, 2));
  process.exit();
}

checkGroups();
