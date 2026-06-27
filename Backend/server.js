require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { sequelize } = require('./models');

// Rutas
const authRoutes = require('./routes/auth');
const accountsRoutes = require('./routes/accounts');
const balanceRoutes = require('./routes/balance');
const transactionsRoutes = require('./routes/transactions');
const webhooksRoutes = require('./routes/webhooks');
const categoriesRoutes = require('./routes/categories');
const settingsRoutes = require('./routes/settings');
const budgetRoutes = require('./routes/budgetRoutes');
const iaRoutes = require('./routes/ia');
const { authenticateToken } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 4000;
const isProduction = process.env.NODE_ENV === 'production';

// Seguridades y Optimización
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" } // Permitir que el frontend acceda a recursos
}));
app.use(compression());
app.use(morgan(isProduction ? 'combined' : 'dev'));
app.set('trust proxy', 1);

// Configuración de CORS
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'https://app-gastos.raydot.cl'
];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir peticiones sin origen (como apps móviles o curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Logging de peticiones (DEBUG)
if (!isProduction) {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/accounts', authenticateToken, accountsRoutes);
app.use('/api/balance', authenticateToken, balanceRoutes);
app.use('/api/transactions', authenticateToken, transactionsRoutes);
app.use('/api/categories', authenticateToken, categoriesRoutes);
app.use('/api/webhooks', webhooksRoutes); // inside we protect /notifications but leave /fintoc public
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/budget', authenticateToken, budgetRoutes);
app.use('/api/ia', authenticateToken, iaRoutes);

// Health check para monitoreo de hosting
app.get('/health', (req, res) => res.status(200).send('OK'));

// Manejo de errores global
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err.stack);
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: isProduction ? 'Error interno del servidor' : err.message
  });
});

// Sincronizar Base de Datos y levantar el servidor
async function bootServer() {
  try {
    const isSqlite = sequelize.options.dialect === 'sqlite';
    if (isSqlite) {
      await sequelize.query("ALTER TABLE Transactions ADD COLUMN budget_month TEXT;").catch(() => {});
      await sequelize.query("ALTER TABLE Transactions ADD COLUMN parent_id INTEGER;").catch(() => {});
      await sequelize.query("ALTER TABLE Transactions ADD COLUMN is_split BOOLEAN DEFAULT 0;").catch(() => {});
      await sequelize.query("ALTER TABLE BudgetItems ADD COLUMN budget_group_id INTEGER;").catch(() => {});
      await sequelize.query("ALTER TABLE BudgetItems ADD COLUMN notes TEXT;").catch(() => {});
      
      // Columnas de multi-usuario para bases de datos existentes
      await sequelize.query("ALTER TABLE Accounts ADD COLUMN user_id INTEGER;").catch(() => {});
      await sequelize.query("ALTER TABLE Categories ADD COLUMN user_id INTEGER;").catch(() => {});
      await sequelize.query("ALTER TABLE Transactions ADD COLUMN user_id INTEGER;").catch(() => {});
      await sequelize.query("ALTER TABLE BudgetGroups ADD COLUMN user_id INTEGER;").catch(() => {});
      await sequelize.query("ALTER TABLE Settings ADD COLUMN user_id INTEGER;").catch(() => {});
    }
    
    await sequelize.sync();
    console.log('✅ Database synced successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
}

bootServer();
