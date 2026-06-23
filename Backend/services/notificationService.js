const { Transaction, Setting, Category } = require('../models');
const { Op } = require('sequelize');
const { sendLimitNotification } = require('./emailService');

const checkAndNotifySpending = async (userId) => {
  if (!userId) {
    console.warn('⚠️ No userId provided to checkAndNotifySpending');
    return;
  }
  try {
    // 1. Obtener configuraciones del servidor para este usuario
    const settings = await Setting.findAll({ where: { user_id: userId } });
    const settingsMap = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {});

    const limit = parseInt(settingsMap['weekly_free_limit'] || '0');
    const enabled = settingsMap['email_notifications_enabled'] === 'true';
    const notificationEmail = settingsMap['notification_email'];
    
    if (!enabled || limit <= 0 || !notificationEmail) return;

    // 2. Calcular gasto de la semana actual (Lunes a Domingo)
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const getWeekNumber = (d) => {
      d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    };
    const currentWeekId = getWeekNumber(startOfWeek);

    // Obtener transacciones del usuario con categoría budget_type === 'libre'
    const transactions = await Transaction.findAll({
      where: {
        user_id: userId,
        date: {
          [Op.between]: [startOfWeek, endOfWeek]
        }
      },
      include: [{
        model: Category,
        as: 'category',
        where: { budget_type: 'libre' }
      }]
    });

    // Calcular gasto neto: sum(gastos) - sum(ingresos)
    const spent = transactions.reduce((sum, t) => {
      const val = Math.abs(parseFloat(t.amount));
      return t.type === 'gasto' ? sum + val : sum - val;
    }, 0);

    // 3. Verificar umbrales y resetear si es necesario
    if (spent < limit && settingsMap['last_100_alert_week'] === currentWeekId) {
      await Setting.upsert({ key: 'last_100_alert_week', value: 'reset', user_id: userId });
    }

    if (spent < limit * 0.9 && settingsMap['last_90_alert_week'] === currentWeekId) {
      await Setting.upsert({ key: 'last_90_alert_week', value: 'reset', user_id: userId });
    }

    // DISPARAR ALERTAS
    if (spent >= limit) {
      if (settingsMap['last_100_alert_week'] !== currentWeekId) {
        const sent = await sendLimitNotification('exceeded', spent, limit, notificationEmail);
        if (sent) {
          await Setting.upsert({ key: 'last_100_alert_week', value: currentWeekId, user_id: userId });
          await Setting.upsert({ key: 'last_90_alert_week', value: currentWeekId, user_id: userId });
        }
      }
    } 
    else if (spent >= limit * 0.9) {
      if (settingsMap['last_90_alert_week'] !== currentWeekId) {
        const sent = await sendLimitNotification('warning', spent, limit, notificationEmail);
        if (sent) {
          await Setting.upsert({ key: 'last_90_alert_week', value: currentWeekId, user_id: userId });
        }
      }
    }

  } catch (error) {
    console.error('Error en checkAndNotifySpending:', error);
  }
};

module.exports = {
  checkAndNotifySpending
};
