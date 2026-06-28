const express = require('express');
const router = express.Router();
const { getStats, getUsers, updateUserRole, deleteUser } = require('../controllers/adminController');
const { authenticateToken, isAdmin } = require('../middlewares/auth');

// Aplicar middlewares de autenticación y rol a nivel de enrutador
router.use(authenticateToken);
router.use(isAdmin);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);

module.exports = router;
