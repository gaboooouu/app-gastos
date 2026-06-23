const express = require('express');
const router = express.Router();
const { receiveFintocWebhook, receiveNotificationWebhook } = require('../controllers/webhookController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/fintoc', receiveFintocWebhook);
router.post('/notifications', authenticateToken, receiveNotificationWebhook);

module.exports = router;

