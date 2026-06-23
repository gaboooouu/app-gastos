const express = require('express');
const router = express.Router();
const { register, login, me, deleteAccount } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticateToken, me);
router.delete('/delete-account', authenticateToken, deleteAccount);

module.exports = router;
