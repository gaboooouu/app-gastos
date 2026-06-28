const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'finvue_secret_key_2026';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Soporta "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó un token.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    req.user = user; // Guarda el payload: { id, email }
    next();
  });
}

async function isAdmin(req, res, next) {
  try {
    // 1. Validar por el rol presente en el payload del JWT
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    // 2. Fallback: Consulta en base de datos para retrocompatibilidad con tokens antiguos
    if (req.user && req.user.id) {
      const user = await User.findByPk(req.user.id);
      if (user && user.role === 'admin') {
        req.user.role = 'admin'; // enriquecer payload
        return next();
      }
    }

    return res.status(403).json({ error: 'Acceso denegado: Se requiere rol de administrador.' });
  } catch (error) {
    console.error('Error en middleware isAdmin:', error);
    return res.status(500).json({ error: 'Error interno del servidor al verificar rol de administrador.' });
  }
}

module.exports = {
  authenticateToken,
  isAdmin,
  JWT_SECRET
};
