const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Category, BudgetGroup, Account, Transaction, Setting, sequelize } = require('../models');
const { JWT_SECRET } = require('../middlewares/auth');

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos (nombre, email, contraseña) son obligatorios.' });
    }

    // Validar contraseña segura
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos una letra mayúscula.' });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos una letra minúscula.' });
    }
    if (!/\d/.test(password)) {
      return res.status(400).json({ error: 'La contraseña debe contener al menos un número.' });
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado.' });
    }

    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Crear el usuario
    const newUser = await User.create({
      name,
      email,
      password_hash
    });

    // Seeding inicial de Categorías para este usuario
    const defaultCategories = [
      { name: 'Supermercado', icon: 'shopping_cart', color: 'bg-emerald-100 text-emerald-600', budget_type: 'libre', user_id: newUser.id },
      { name: 'Entretenimiento', icon: 'sports_esports', color: 'bg-purple-100 text-purple-600', budget_type: 'libre', user_id: newUser.id },
      { name: 'Sueldo / Ingreso', icon: 'payments', color: 'bg-yellow-100 text-yellow-600', budget_type: 'libre', user_id: newUser.id },
      { name: 'Servicios Básicos', icon: 'electrical_services', color: 'bg-amber-100 text-amber-600', budget_type: 'fijo', user_id: newUser.id },
      { name: 'Hogar / Arriendo', icon: 'home', color: 'bg-blue-100 text-blue-600', budget_type: 'fijo', user_id: newUser.id },
      { name: 'Transporte', icon: 'directions_car', color: 'bg-cyan-100 text-cyan-600', budget_type: 'libre', user_id: newUser.id },
      { name: 'Ahorro / Inversiones', icon: 'savings', color: 'bg-pink-100 text-pink-600', budget_type: 'ahorro', user_id: newUser.id },
      { name: 'Otros Gastos', icon: 'more_horiz', color: 'bg-slate-100 text-slate-600', budget_type: 'libre', user_id: newUser.id }
    ];
    await Category.bulkCreate(defaultCategories);

    // Seeding inicial de Grupos de Presupuesto para este usuario
    const defaultGroups = [
      { name: 'Casa y Hogar', color: 'bg-blue-100/50', textColor: 'text-blue-700', order: 1, user_id: newUser.id },
      { name: 'Servicios y Cuentas', color: 'bg-purple-100/50', textColor: 'text-purple-700', order: 2, user_id: newUser.id },
      { name: 'Estilo de Vida', color: 'bg-emerald-100/50', textColor: 'text-emerald-700', order: 3, user_id: newUser.id },
      { name: 'Inversiones y Ahorro', color: 'bg-pink-100/50', textColor: 'text-pink-700', order: 4, user_id: newUser.id }
    ];
    await BudgetGroup.bulkCreate(defaultGroups);

    // Generar Token JWT
    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '365d' });

    res.status(201).json({
      message: 'Usuario registrado con éxito',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el registro.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'El email y la contraseña son obligatorios.' });
    }

    // Buscar al usuario
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales inválidas. Correo o contraseña incorrecta.' });
    }

    // Validar contraseña
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales inválidas. Correo o contraseña incorrecta.' });
    }

    // Generar Token JWT
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '365d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el login.' });
  }
};

// GET /api/auth/me
const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email']
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error al consultar perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

// DELETE /api/auth/delete-account
const deleteAccount = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user.id;
    
    // Eliminar todos los datos relacionales del usuario
    await Transaction.destroy({ where: { user_id: userId }, transaction: t });
    await Account.destroy({ where: { user_id: userId }, transaction: t });
    await Category.destroy({ where: { user_id: userId }, transaction: t });
    await BudgetGroup.destroy({ where: { user_id: userId }, transaction: t });
    await Setting.destroy({ where: { user_id: userId }, transaction: t });
    await User.destroy({ where: { id: userId }, transaction: t });
    
    await t.commit();
    res.json({ message: 'Cuenta y todos los datos asociados eliminados correctamente.' });
  } catch (error) {
    await t.rollback();
    console.error('Error al eliminar cuenta:', error);
    res.status(500).json({ error: 'Error al eliminar la cuenta y sus datos.' });
  }
};

module.exports = {
  register,
  login,
  me,
  deleteAccount
};
