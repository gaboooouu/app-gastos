const jwt = require('jsonwebtoken');

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

module.exports = {
  authenticateToken,
  JWT_SECRET
};
