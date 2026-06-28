const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true para puerto 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envía un correo de notificación de límite semanal
 * @param {string} toEmail - Correo o lista de correos de destino
 */
const sendLimitNotification = async (type, spent, limit, toEmail) => {
  const percentage = Math.round((spent / limit) * 100);
  const formattedSpent = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(spent);
  const formattedLimit = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(limit);

  const isWarning = type === 'warning';
  const title = isWarning ? '⚠️ Advertencia: Estás cerca de tu límite' : '🚨 Límite Semanal Excedido';
  const color = isWarning ? '#f59e0b' : '#ef4444';
  const message = isWarning 
    ? `Has alcanzado el ${percentage}% de tu presupuesto semanal libre.`
    : `Has superado tu presupuesto semanal libre por ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(spent - limit)}.`;

  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; width: 60px; height: 60px; background-color: ${color}; border-radius: 12px; line-height: 60px; color: white; font-size: 30px; margin-bottom: 15px;">
          ${isWarning ? '⚠️' : '🚨'}
        </div>
        <h2 style="color: #1e293b; margin: 0; font-size: 24px;">${title}</h2>
      </div>

      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 0;">Hola,</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">${message}</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #f1f5f9; border-radius: 10px; text-align: center;">
          <div style="margin-bottom: 10px;">
            <span style="color: #64748b; font-size: 14px; font-weight: bold; text-transform: uppercase;">Gastado esta semana:</span><br/>
            <span style="color: ${color}; font-size: 24px; font-weight: 800;">${formattedSpent}</span>
          </div>
          <div style="width: 100%; height: 8px; background-color: #cbd5e1; border-radius: 4px; overflow: hidden; margin: 15px 0;">
            <div style="width: ${Math.min(percentage, 100)}%; height: 100%; background-color: ${color};"></div>
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 0;">Presupuesto semanal: <b>${formattedLimit}</b></p>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6;">Te recomendamos revisar tus últimos movimientos para mantener tus finanzas bajo control.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app-gastos.raydot.cl" style="background-color: #14b8a6; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">Ir a la App</a>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
        Este es un correo automático de tu asistente FinVue.<br/>
        Puedes desactivar estas alertas en los ajustes de la aplicación.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"FinVue Alerts" <noreply@app-gastos.raydot.cl>',
      to: toEmail || process.env.NOTIFICATION_EMAIL,
      subject: title,
      html: html,
    });
    console.log(`Email de ${type} enviado con éxito a ${toEmail || process.env.NOTIFICATION_EMAIL}`);
    return true;
  } catch (error) {
    console.error('Error enviando email:', error);
    return false;
  }
};

const sendSyncNotification = async (count, toEmail) => {
  const title = `🔄 Movimientos sincronizados (${count})`;
  
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc;">
      <div style="text-align: center; margin-bottom: 30px;">
        <div style="display: inline-block; width: 60px; height: 60px; background-color: #3b82f6; border-radius: 12px; line-height: 60px; color: white; font-size: 30px; margin-bottom: 15px;">
          🔄
        </div>
        <h2 style="color: #1e293b; margin: 0; font-size: 24px;">Nuevos movimientos detectados</h2>
      </div>

      <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-top: 0;">Hola,</p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">Hemos detectado <b>${count}</b> nuevos movimientos en tus cuentas vinculadas.</p>
        
        <div style="margin: 30px 0; padding: 20px; background-color: #eff6ff; border-radius: 10px; text-align: center; border: 1px dashed #3b82f6;">
          <span style="color: #1e40af; font-size: 15px; font-weight: bold;">Tus transacciones ya están actualizadas.</span>
        </div>

        <p style="color: #475569; font-size: 14px; line-height: 1.6;">Te recomendamos entrar a la aplicación para categorizar estos nuevos movimientos y mantener tu presupuesto al día.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="https://app-gastos.raydot.cl" style="background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 15px;">Ver Movimientos</a>
        </div>
      </div>

      <div style="text-align: center; margin-top: 30px; color: #94a3b8; font-size: 12px;">
        Este es un correo automático de tu asistente FinVue.<br/>
        Puedes gestionar las alertas en los ajustes de la aplicación.
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"FinVue Sync" <noreply@app-gastos.raydot.cl>',
      to: toEmail || process.env.NOTIFICATION_EMAIL,
      subject: title,
      html: html,
    });
    console.log(`Email de sincronización enviado a ${toEmail || process.env.NOTIFICATION_EMAIL}`);
    return true;
  } catch (error) {
    console.error('Error enviando email de sync:', error);
    return false;
  }
};

module.exports = {
  sendLimitNotification,
  sendSyncNotification
};
