const { User, Account, Transaction, Setting, Category, BudgetGroup, AiChatMessage, sequelize } = require('../models');
const { Op } = require('sequelize');

// GET /api/admin/stats
const getStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const totalTransactions = await Transaction.count();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Cantidad de usuarios únicos con transacciones en los últimos 7 días
    const activeUsersThisWeek = await Transaction.count({
      distinct: true,
      col: 'user_id',
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    // Saldo combinado del sistema (suma de todas las cuentas registradas)
    const balanceResult = await Account.sum('balance');
    const totalSystemBalance = Number(balanceResult || 0);

    res.json({
      totalUsers,
      totalTransactions,
      activeUsersThisWeek,
      totalSystemBalance
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Error al cargar estadísticas globales del sistema.' });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt'],
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Account,
          as: 'accounts',
          attributes: ['id']
        },
        {
          model: Transaction,
          as: 'transactions',
          attributes: ['id']
        }
      ]
    });

    const usersData = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      accountsCount: user.accounts ? user.accounts.length : 0,
      transactionsCount: user.transactions ? user.transactions.length : 0
    }));

    res.json(usersData);
  } catch (error) {
    console.error('Error fetching users for admin:', error);
    res.status(500).json({ error: 'Error al obtener listado de usuarios.' });
  }
};

// PUT /api/admin/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Rol inválido. Debe ser "user" o "admin".' });
    }

    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes revocar tu propio rol de administrador.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    await user.update({ role });
    res.json({ message: 'Rol de usuario actualizado exitosamente.', user: { id: user.id, role: user.role } });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Error al actualizar rol del usuario.' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    if (Number(id) === req.user.id) {
      await t.rollback();
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      await t.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Eliminar todos los registros del usuario en la base de datos
    await Transaction.destroy({ where: { user_id: id }, transaction: t });
    await Account.destroy({ where: { user_id: id }, transaction: t });
    await Category.destroy({ where: { user_id: id }, transaction: t });
    await BudgetGroup.destroy({ where: { user_id: id }, transaction: t });
    await Setting.destroy({ where: { user_id: id }, transaction: t });
    await AiChatMessage.destroy({ where: { user_id: id }, transaction: t });
    await User.destroy({ where: { id: id }, transaction: t });

    await t.commit();
    res.json({ message: 'Usuario y todos sus datos relacionados eliminados con éxito.' });
  } catch (error) {
    await t.rollback();
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Error interno al intentar eliminar al usuario.' });
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUserRole,
  deleteUser
};
