const { BudgetGroup, BudgetItem, Category, Transaction, sequelize } = require('../models');
const { Op } = require('sequelize');

// Helper para calcular el monto real de un item para un usuario específico
const calculateRealAmount = async (item, userId) => {
  let realAmount = 0;
  if (item.categories && item.categories.length > 0) {
    const categoryIds = item.categories.map(c => c.id);
    const monthFilter = {
      [Op.or]: [
        { budget_month: item.month },
        {
          [Op.and]: [
            { budget_month: { [Op.or]: [null, ''] } },
            { date: { [Op.gte]: `${item.month}-01` } },
            { date: { [Op.lte]: `${item.month}-31` } }
          ]
        }
      ]
    };

    const whereClause = {
      user_id: userId, // Aislar transacción por usuario
      category_id: { [Op.in]: categoryIds },
      is_split: false, // Ignorar el "padre" de una división
      [Op.and]: [monthFilter]
    };

    if (item.keyword) {
      whereClause[Op.and].push({
        [Op.or]: [
          { original_description: { [Op.like]: `%${item.keyword}%` } },
          { custom_description: { [Op.like]: `%${item.keyword}%` } }
        ]
      });
    }

    const sum = await Transaction.sum('amount', { where: whereClause });
    realAmount = Math.abs(sum || 0);
  } else {
    realAmount = item.real_manual || 0;
  }
  return realAmount;
};

// Obtener todo el presupuesto de un mes del usuario
exports.getBudget = async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) return res.status(400).json({ error: 'Mes es requerido' });

    // Filtrar grupos que pertenezcan al usuario autenticado
    const groups = await BudgetGroup.findAll({
      where: { user_id: req.user.id },
      order: [['order', 'ASC']],
      include: [
        {
          model: BudgetItem,
          as: 'items',
          where: { month },
          required: false,
          include: [{ model: Category, as: 'categories' }]
        }
      ]
    });

    const processedGroups = await Promise.all(groups.map(async (group) => {
      const plainGroup = group.get({ plain: true });
      
      plainGroup.items = await Promise.all(plainGroup.items.map(async (item) => {
        const realAmount = await calculateRealAmount(item, req.user.id);
        const reachedGoal = (realAmount >= item.estimated && item.estimated > 0);
        const effectiveStatus = reachedGoal ? 'Pagado' : item.status;
        
        return { ...item, real: realAmount, status: effectiveStatus, isAutoPaid: reachedGoal };
      }));

      return plainGroup;
    }));

    res.json(processedGroups);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el presupuesto' });
  }
};

// Obtener historial de un item
exports.getItemHistory = async (req, res) => {
  try {
    const { concept, budget_group_id } = req.query;
    if (!concept || !budget_group_id) {
       return res.status(400).json({ error: 'Concept y budget_group_id son requeridos' });
    }

    // Verificar propiedad del grupo
    const group = await BudgetGroup.findOne({
      where: { id: budget_group_id, user_id: req.user.id }
    });
    if (!group) return res.status(403).json({ error: 'Acceso no autorizado a este grupo' });

    const items = await BudgetItem.findAll({
      where: { concept, budget_group_id },
      order: [['month', 'ASC']],
      include: [{ model: Category, as: 'categories' }]
    });

    const history = await Promise.all(items.map(async (item) => {
      const realAmount = await calculateRealAmount(item, req.user.id);
      return { 
        month: item.month, 
        estimated: parseFloat(item.estimated), 
        real: realAmount 
      };
    }));

    res.json(history);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener el historial' });
  }
};

// Crear/Editar Grupo
exports.upsertGroup = async (req, res) => {
  try {
    const { id, name, color, textColor, order } = req.body;
    let group;
    if (id) {
      group = await BudgetGroup.findOne({
        where: { id, user_id: req.user.id }
      });
      if (group) {
        await group.update({ name, color, textColor, order });
      } else {
        return res.status(404).json({ error: 'Grupo no encontrado o no autorizado' });
      }
    } else {
      group = await BudgetGroup.create({ 
        name, 
        color, 
        textColor, 
        order,
        user_id: req.user.id 
      });
    }
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar el grupo' });
  }
};

// Crear/Editar Item
exports.upsertItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
      const { id, concept, budget_group_id, estimated, real_manual, status, month, keyword, category_ids, notes } = req.body;
      
      // Validar que el grupo pertenece al usuario
      const group = await BudgetGroup.findOne({
        where: { id: budget_group_id, user_id: req.user.id },
        transaction: t
      });
      if (!group) {
        await t.rollback();
        return res.status(403).json({ error: 'El grupo de presupuesto especificado no pertenece a este usuario.' });
      }

      let item;
      if (id) {
        item = await BudgetItem.findOne({
          where: { id },
          include: [{ model: BudgetGroup, as: 'group', where: { user_id: req.user.id } }],
          transaction: t
        });
        if (item) {
          await item.update({ concept, budget_group_id, estimated, real_manual, status, month, keyword, notes }, { transaction: t });
        } else {
          await t.rollback();
          return res.status(404).json({ error: 'Item no encontrado o no autorizado.' });
        }
      } else {
        item = await BudgetItem.create({ concept, budget_group_id, estimated, real_manual, status, month, keyword, notes }, { transaction: t });
      }
  
      if (category_ids) {
        // Asegurar que las categorías pertenecen al usuario
        const categories = await Category.findAll({
          where: { id: category_ids, user_id: req.user.id },
          transaction: t
        });
        const matchedCategoryIds = categories.map(c => c.id);
        await item.setCategories(matchedCategoryIds, { transaction: t });
      }
  
      await t.commit();
      res.json(item);
    } catch (error) {
      await t.rollback();
      console.error(error);
      res.status(500).json({ error: 'Error al guardar el item' });
    }
};

// Eliminar Item
exports.deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el item pertenece a un grupo del usuario
    const item = await BudgetItem.findOne({
      where: { id },
      include: [{ model: BudgetGroup, as: 'group', where: { user_id: req.user.id } }]
    });

    if (!item) {
      return res.status(404).json({ error: 'Item no encontrado o no autorizado' });
    }

    await item.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el item' });
  }
};

// Eliminar Grupo (y sus items)
exports.deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    
    const group = await BudgetGroup.findOne({
      where: { id, user_id: req.user.id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Grupo no encontrado o no autorizado' });
    }

    await group.destroy(); // onDelete: 'CASCADE' eliminará los items
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el grupo' });
  }
};

// Importar de mes anterior
exports.importPreviousMonth = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { currentMonth, previousMonth } = req.body;
    
    // Obtener estructura del mes anterior que pertenezca a este usuario
    const prevItems = await BudgetItem.findAll({
      where: { month: previousMonth },
      include: [
        { 
          model: BudgetGroup, 
          as: 'group', 
          where: { user_id: req.user.id } 
        },
        { 
          model: Category, 
          as: 'categories' 
        }
      ],
      transaction: t
    });

    for (const item of prevItems) {
      const newItem = await BudgetItem.create({
        concept: item.concept,
        estimated: item.estimated,
        real_manual: 0,
        status: 'Pendiente',
        month: currentMonth,
        keyword: item.keyword,
        budget_group_id: item.budget_group_id
      }, { transaction: t });

      if (item.categories && item.categories.length > 0) {
        await newItem.setCategories(item.categories.map(c => c.id), { transaction: t });
      }
    }

    await t.commit();
    res.json({ success: true });
  } catch (error) {
    await t.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al importar meses' });
  }
};
