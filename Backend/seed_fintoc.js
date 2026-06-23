const { Account, Transaction, Category } = require('./models');

async function seed() {
  try {
    // 1. Create a Fintoc Account
    const account = await Account.create({
      name: 'Banco de Chile',
      balance: 1500000,
      type: 'fintoc',
      fintoc_link_id: 'link_test_12345',
      currency: 'CLP'
    });

    console.log('Account created:', account.id);

    // 2. Add some Fintoc transactions
    // They are 'fintoc' source so they appear differently in UI perhaps.
    // I'll make sure one of them is for 'libre' type so it updates the bar if user categories exist.
    // To do that, I'll need a Category. Let's find one or create one.
    
    let freeCategory = await Category.findOne({ where: { budget_type: 'libre' } });
    if (!freeCategory) {
      freeCategory = await Category.create({ name: 'Streaming', icon: 'FaGamepad', color: 'bg-indigo-200', budget_type: 'libre' });
    }
    
    let fixedCategory = await Category.findOne({ where: { budget_type: 'fijo' } });
    if (!fixedCategory) {
      fixedCategory = await Category.create({ name: 'Supermercado', icon: 'FaHome', color: 'bg-green-200', budget_type: 'fijo' });
    }

    const todayDate = () => {
      const d = new Date();
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().split('T')[0];
    };

    const txs = [
      {
        account_id: account.id,
        amount: 8500,
        date: todayDate(), // Today
        original_description: 'NETFLIX.COM VINC',
        custom_description: 'Netflix',
        type: 'gasto',
        source: 'fintoc',
        category_id: freeCategory.id
      },
      {
        account_id: account.id,
        amount: 120000,
        date: todayDate(),
        original_description: 'JUMBO BILBAO',
        custom_description: 'Jumbo Compra Mes',
        type: 'gasto',
        source: 'fintoc',
        category_id: fixedCategory.id
      },
      {
        account_id: account.id,
        amount: 15300,
        date: todayDate(), // Today
        original_description: 'UBER TRIP HELP',
        custom_description: 'Uber',
        type: 'gasto',
        source: 'fintoc',
        category_id: freeCategory.id
      },
      {
        account_id: account.id,
        amount: 500000,
        date: todayDate(), // Today
        original_description: 'TRANSFERENCIA RECIBIDA MATIAS',
        custom_description: '',
        type: 'ingreso',
        source: 'fintoc',
      }
    ];

    for (const tx of txs) {
      await Transaction.create(tx);
    }

    console.log('Fintoc Transactions added successfully.');
    process.exit(0);

  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
