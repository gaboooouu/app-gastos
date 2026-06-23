const { BudgetItem } = require('./models');

async function seedHistory() {
  const months = ['2025-10', '2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
  const values = [
    { est: 45000, real: 42000 },
    { est: 45000, real: 48000 },
    { est: 50000, real: 55000 },
    { est: 50000, real: 49000 },
    { est: 50000, real: 52000 },
    { est: 55000, real: 0 } // Hoy
  ];

  for (let i = 0; i < months.length; i++) {
    await BudgetItem.create({
      concept: 'Luz',
      estimated: values[i].est,
      real_manual: values[i].real,
      status: i === months.length - 1 ? 'Pendiente' : 'Pagado',
      month: months[i],
      budget_group_id: 3 // Servicios
    });
  }

  console.log('Seed de historial para "Luz" completado.');
  process.exit();
}

seedHistory();
