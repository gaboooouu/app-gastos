const express = require('express');
const router = express.Router();
const { resetAllData, deleteTransactionsByDate, getSettings, updateSettings } = require('../controllers/settingsController');

router.get('/', getSettings);
router.post('/', updateSettings);
router.delete('/reset', resetAllData);
router.post('/delete-by-date', deleteTransactionsByDate);

module.exports = router;
