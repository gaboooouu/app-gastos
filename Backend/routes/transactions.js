const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  createTransaction, 
  updateTransaction,
  deleteTransaction,
  splitTransaction,
  getSplitHistory
} = require('../controllers/transactionController');

router.get('/', getTransactions);
router.get('/history/splits', getSplitHistory);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);
router.post('/:id/split', splitTransaction);

module.exports = router;
