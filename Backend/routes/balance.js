const express = require('express');
const router = express.Router();
const { getTotalBalance } = require('../controllers/balanceController');

router.get('/total', getTotalBalance);

module.exports = router;
