const express = require('express');
const router = express.Router();
const multer = require('multer');
const { chatIA, getHistory, deleteHistory } = require('../controllers/iaController');

// Configuración de multer para guardar el archivo temporalmente en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de tamaño: 10MB
  }
});

// Rutas del asistente IA
router.post('/chat', upload.single('audio'), chatIA);
router.get('/chat/history', getHistory);
router.delete('/chat/history', deleteHistory);

module.exports = router;
