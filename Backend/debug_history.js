const { BudgetItem, BudgetGroup } = require('./models');

async function debugHistory() {
  const concept = 'Luz';
  const groupId = 3;

  const items = await BudgetItem.findAll({
    where: { concept, budget_group_id: groupId },
    order: [['month', 'ASC']]
  });

  console.log('Items found in DB:', JSON.stringify(items, null, 2));

  const groups = await BudgetGroup.findAll();
  console.log('Groups in DB:', JSON.stringify(groups, null, 2));

  process.exit();
}

debugHistory();
