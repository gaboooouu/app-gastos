const express = require('express');
const router = express.Router();
const { receiveNotificationWebhook } = require('../controllers/webhookController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/notifications', authenticateToken, receiveNotificationWebhook);

module.exports = router;

