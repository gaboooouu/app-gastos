const express = require('express');
const router = express.Router();
const multer = require('multer');
const { chatIA } = require('../controllers/iaController');

// Configuración de multer para guardar el archivo temporalmente en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // Límite de tamaño: 10MB
  }
});

// Ruta POST /api/ia/chat que acepta un mensaje opcional y un archivo de audio opcional
router.post('/chat', upload.single('audio'), chatIA);

module.exports = router;
