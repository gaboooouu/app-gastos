const { BudgetItem, BudgetItemCategory } = require('./models');

const seed = async () => {
  try {
    const month = '2026-03';
    const items = [
      {
        concept: 'Arriendo / Gastos Comunes',
        estimated: 520000,
        real_manual: 0,
        status: 'Pagado',
        month,
        budget_group_id: 2, // Casa
        category_ids: [7] // Assetplan
      },
      {
        concept: 'Cuenta de Agua',
        estimated: 180000,
        real_manual: 0,
        status: 'Pendiente',
        month,
        budget_group_id: 3, // Servicios
        category_ids: [8], // Aguas Andinas
        notes: 'Ojo con el riego de las plantas este mes.'
      },
      {
        concept: 'Supermercado Mensual',
        estimated: 250000,
        real_manual: 0,
        status: 'Pendiente',
        month,
        budget_group_id: 2, // Casa
        category_ids: [1] // Supermercado
      },
      {
        concept: 'Suscripciones Digitales',
        estimated: 45000,
        real_manual: 0,
        status: 'Pagado',
        month,
        budget_group_id: 3, // Servicios
        category_ids: [6] // Digital
      },
      {
        concept: 'Ahorro Emergencia',
        estimated: 100000,
        real_manual: 100000,
        status: 'Pagado',
        month,
        budget_group_id: 4, // Inversiones
        notes: 'Depositado en cuenta de ahorro.'
      }
    ];

    for (const itemData of items) {
      const { category_ids, ...rest } = itemData;
      const item = await BudgetItem.create(rest);
      if (category_ids) {
        await item.setCategories(category_ids);
      }
    }

    console.log('Seed for March 2026 completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
};

seed();
