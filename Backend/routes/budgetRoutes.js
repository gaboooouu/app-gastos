const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');

router.get('/', budgetController.getBudget);
router.post('/groups', budgetController.upsertGroup);
router.delete('/groups/:id', budgetController.deleteGroup);
router.post('/items', budgetController.upsertItem);
router.get('/items/history', budgetController.getItemHistory);
router.delete('/items/:id', budgetController.deleteItem);
router.post('/import', budgetController.importPreviousMonth);

module.exports = router;
