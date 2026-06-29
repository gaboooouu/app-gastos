const { GoogleGenAI } = require('@google/genai');
const { Account, Category, Transaction, AiChatMessage, sequelize } = require('../models');
const { Op } = require('sequelize');

// Inicializar el cliente de Google Gen AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Tool 1: registrarTransacciones
const registrarTransaccionesTool = {
  name: 'registrarTransacciones',
  description: 'Registra uno o varios movimientos financieros (gastos o ingresos) en la base de datos.',
  parameters: {
    type: 'OBJECT',
    properties: {
      transacciones: {
        type: 'ARRAY',
        description: 'Lista de movimientos (gastos o ingresos) a registrar.',
        items: {
          type: 'OBJECT',
          properties: {
            monto: {
              type: 'NUMBER',
              description: 'El valor monetario de la transacción (número positivo).'
            },
            tipo: {
              type: 'STRING',
              description: 'El tipo de movimiento: "gasto" o "ingreso".'
            },
            cuenta_identificada: {
              type: 'STRING',
              description: 'Nombre de la cuenta bancaria del usuario asociada a esta transacción.'
            },
            categoria_sugerida: {
              type: 'STRING',
              description: 'Nombre de la categoría del usuario sugerida o mapeada.'
            },
            descripcion: {
              type: 'STRING',
              description: 'Detalle o comercio donde se realizó la transacción (ej: Uber, Sueldo, Starbucks).'
            },
            fecha: {
              type: 'STRING',
              description: 'La fecha de la transacción en formato YYYY-MM-DD. Opcional. Úsalo si el usuario menciona una fecha relativa (ej. ayer, el lunes de la semana pasada, etc.) calculando su fecha exacta.'
            },
            divisiones: {
              type: 'ARRAY',
              description: 'Opcional. Si el usuario indica dividir este gasto o transacción en múltiples conceptos, detalla los montos y descripciones de cada parte. La suma de estos montos debe ser exactamente igual al monto total. Todas las divisiones heredarán la categoría del gasto principal.',
              items: {
                type: 'OBJECT',
                properties: {
                  monto: {
                    type: 'NUMBER',
                    description: 'Monto de la parte dividida.'
                  },
                  descripcion: {
                    type: 'STRING',
                    description: 'Detalle descriptivo de esta parte (ej: "arriendo estacionamiento", "arriendo depto").'
                  }
                },
                required: ['monto', 'descripcion']
              }
            }
          },
          required: ['monto', 'tipo', 'cuenta_identificada', 'categoria_sugerida', 'descripcion']
        }
      }
    },
    required: ['transacciones']
  }
};

// Tool 2: modificarTransaccion
const modificarTransaccionTool = {
  name: 'modificarTransaccion',
  description: 'Modifica una transacción existente (gasto o ingreso) para corregir el monto, la cuenta, la categoría, la descripción o la fecha.',
  parameters: {
    type: 'OBJECT',
    properties: {
      transaccion_id: {
        type: 'NUMBER',
        description: 'ID de la transacción a modificar (si se conoce de turnos anteriores de la conversación).'
      },
      criterio_busqueda: {
        type: 'OBJECT',
        description: 'Criterio para buscar la transacción si no se conoce su ID.',
        properties: {
          descripcion: {
            type: 'STRING',
            description: 'Palabra clave de la descripción del comercio o transacción (ej: "starbucks").'
          },
          fecha: {
            type: 'STRING',
            description: 'Fecha aproximada del gasto en formato YYYY-MM-DD.'
          },
          monto: {
            type: 'NUMBER',
            description: 'Monto original de la transacción.'
          },
          es_ultimo: {
            type: 'BOOLEAN',
            description: 'Indica si se refiere al último movimiento financiero registrado por el usuario.'
          }
        }
      },
      modificaciones: {
        type: 'OBJECT',
        description: 'Campos a modificar en la transacción encontrada.',
        properties: {
          monto: {
            type: 'NUMBER',
            description: 'Nuevo monto de la transacción.'
          },
          categoria: {
            type: 'STRING',
            description: 'Nombre de la nueva categoría del usuario para este movimiento.'
          },
          cuenta: {
            type: 'STRING',
            description: 'Nombre de la nueva cuenta bancaria para este movimiento.'
          },
          descripcion: {
            type: 'STRING',
            description: 'Nueva descripción o comercio para la transacción.'
          },
          fecha: {
            type: 'STRING',
            description: 'Nueva fecha en formato YYYY-MM-DD.'
          }
        }
      }
    },
    required: ['modificaciones']
  }
};

/**
 * Procesa la interacción del chat con la IA (Gemini).
 * Soporta texto y archivo de audio en req.file (mimetype: audio/webm, audio/mp3, etc.).
 */
const chatIA = async (req, res) => {
  try {
    const userId = req.user.id;
    let { message } = req.body;

    // A. Obtener historial de chat del usuario desde la base de datos (últimos 15 mensajes)
    const dbHistory = await AiChatMessage.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit: 15
    });
    const history = dbHistory.reverse();

    // B. Registrar el mensaje actual del usuario en la base de datos
    let userMsgText = message || '';
    if (req.file) {
      userMsgText = userMsgText ? `${userMsgText} (🎤 Audio)` : '🎤 Mensaje de voz';
    }
    if (userMsgText) {
      await AiChatMessage.create({
        user_id: userId,
        sender: 'user',
        text: userMsgText
      });
    }

    // 1. Obtener contexto de cuentas y categorías del usuario
    const accounts = await Account.findAll({ where: { user_id: userId } });
    const categories = await Category.findAll({ where: { user_id: userId } });

    // 2. Construir la systemInstruction dinámica con datos reales del usuario
    const today = new Date();
    const todayStr = today.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = today.toISOString().split('T')[0];

    const systemInstruction = `
Eres un asistente de finanzas personales inteligente y amigable para la aplicación FinVue.
Tu misión es ayudar al usuario a registrar, clasificar y modificar sus movimientos financieros (gastos o ingresos) a través de texto o mensajes de voz.

La fecha y hora de hoy es: ${todayStr} (formato YYYY-MM-DD: ${todayISO}).

Cuentas reales disponibles para este usuario (ID = ${userId}):
${accounts.length > 0 ? accounts.map(a => `- "${a.name}" (Saldo: ${a.balance} ${a.currency})`).join('\n') : '(El usuario no tiene cuentas creadas aún)'}

Categorías de gastos reales disponibles:
${categories.length > 0 ? categories.map(c => `- "${c.name}" (Presupuesto: ${c.budget_type})`).join('\n') : '(El usuario no tiene categorías creadas aún)'}

REGLAS DE OPERACIÓN:
1. Registro de Gastos e Ingresos:
   - Identifica si el usuario reporta un "gasto" (ej: pagué, compré, gasté) o un "ingreso" (ej: gané, recibí, sueldo, me depositaron, me pagaron).
   - Llama a la herramienta 'registrarTransacciones' asignando el parámetro 'tipo' como "gasto" o "ingreso" respectivamente.
   - Clasificación Semántica Inteligente: Mapea cualquier comercio o detalle que mencione el usuario (ej: "Starbucks", "Sueldo", "Transferencia recibida") de forma semántica a una de las categorías REALES listadas arriba. Si la transacción no encaja de manera lógica, directa u obvia en ninguna de las categorías reales del usuario (por ejemplo, un viaje de Uber cuando el usuario no tiene ninguna categoría parecida a "Transporte", "Automóvil" o "Viajes"), NO asumas una categoría inapropiada como "Comidas" ni asocies una incorrecta al azar. Considera esto como una falta de categoría adecuada.

2. Modificación/Edición de Transacciones (¡NUEVO!):
   - Si el usuario te pide explícitamente editar, corregir, modificar o cambiar una transacción (ej: "cámbiame la categoría del último gasto a Comidas", "edita la transacción de Starbucks del lunes pasado, en realidad costó 5000 pesos no 3000", "corrige el monto de ayer a 12000"), debes llamar a la herramienta 'modificarTransaccion'.
   - Si se refiere al último movimiento recién registrado en esta conversación o en general, pon 'criterio_busqueda.es_ultimo: true'.
   - Si se refiere a una transacción específica del pasado, define la búsqueda en 'criterio_busqueda' (ej: 'descripcion: "starbucks"', 'fecha: "2026-06-22"').
   - Pasa los nuevos valores a corregir dentro del objeto 'modificaciones' (monto, cuenta, categoria, descripcion o fecha).

3. Regla de Aclaración / Confirmación (¡CRÍTICA!):
   - Para registrar o modificar necesitas: monto, cuenta bancaria (que coincida con una real) y categoría.
   - Si te falta la cuenta bancaria (y el usuario tiene más de una cuenta activa), o si no existe una categoría obvia y adecuada en la lista real de categorías para este movimiento, NO ejecutes la herramienta.
   - En su lugar, responde en texto plano de manera amigable haciendo la pregunta correspondiente. Explica que detectaste la transacción pero que no encuentras una categoría apropiada en su lista actual. Sugiérele guardarlo en una existente (como "Otros" si existe) o crear una nueva categoría. Ejemplo: "Detecté un gasto de $5.000 en un viaje de Uber. Sin embargo, no tienes una categoría de 'Transporte' en tu cuenta. ¿Te gustaría registrarlo en otra categoría existente, o prefieres crear una nueva categoría para tus viajes primero?"

4. Regla de Cuenta Única:
   ${accounts.length === 1 ? `* El usuario tiene SOLO una cuenta bancaria llamada "${accounts[0].name}". Por lo tanto, NO le preguntes qué cuenta usar; asume automáticamente "${accounts[0].name}" para todas las transacciones de registro y modificación y colócala en los parámetros correspondientes.` : `* El usuario tiene múltiples cuentas. Si el usuario no especifica explícitamente cuál cuenta usar, debes preguntarle por texto plano antes de ejecutar la herramienta.`}

5. Regla de Fechas Relativas:
   - Si el usuario indica que la transacción ocurrió en una fecha específica en el pasado (ej: "ayer", "el lunes pasado", "hace 4 días"), calcula la fecha exacta basándote en la fecha de hoy (${todayISO}) y pásala en formato YYYY-MM-DD en el parámetro "fecha".

6. Registro Masivo:
   - Si el usuario indica múltiples transacciones en un solo mensaje (ej: "Ayer gasté 8000 en almuerzo y recibí 15000 de regalo"), pasa todos los movimientos como un arreglo a la función 'registrarTransacciones'.

7. División de Gastos (Split Expenses):
   - Si el usuario indica que desea registrar un gasto y dividirlo en múltiples conceptos (ej: "Gasté 650000 pesos en Assetplan y de esos 650000, 150000 fueron del estacionamiento y el resto fue para el arriendo"), debes:
     1. Pasar el total de la compra (ej: 650000) como el 'monto' principal de la transacción.
     2. Identificar la categoría principal del gasto (ej: "Arriendo" o "Gastos Comunes") y asignarla a 'categoria_sugerida' de la transacción principal.
     3. Mapear cada parte en el arreglo 'divisiones' enviando únicamente 'monto' y 'descripcion' (no se requiere categoría para los splits).
     4. Calcular los montos individuales. Si dice "y el resto", resta la parte conocida al monto total (ej: 650000 - 150000 = 500000).
     5. Asegurarte de que la suma de los montos de 'divisiones' dé exactamente el monto total principal.
     6. Todas las partes divididas heredarán de forma automática la misma categoría de la transacción principal.
     7. En tu respuesta narrativa final al usuario, debes detallar amigablemente el desglose completo de la división indicando los montos y detalles correspondientes de cada parte.
`;

    // 3. Estructurar el historial de contenidos para Gemini
    const contents = [];
    if (Array.isArray(history)) {
      for (const msg of history) {
        const role = msg.sender === 'user' ? 'user' : 'model';
        if (msg.text) {
          contents.push({
            role,
            parts: [{ text: msg.text }]
          });
        }
      }
    }

    // 4. Agregar el mensaje actual del usuario (puede ser texto y/o audio)
    const currentParts = [];
    
    // Si viene un archivo de audio procesado por multer
    if (req.file) {
      currentParts.push({
        inlineData: {
          data: req.file.buffer.toString('base64'),
          mimeType: req.file.mimetype
        }
      });
    }

    // Si viene texto adicional o primario
    if (message) {
      currentParts.push({ text: message });
    }

    // En caso de que no haya audio ni texto (seguridad)
    if (currentParts.length === 0) {
      return res.status(400).json({ error: 'Debes enviar un mensaje de texto o un archivo de audio.' });
    }

    contents.push({
      role: 'user',
      parts: currentParts
    });

    // 5. Llamar a la API de Gemini
    // Usamos el modelo gemini-3.1-flash-lite ya que soporta audio nativo e instrucciones del sistema
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [registrarTransaccionesTool, modificarTransaccionTool] }]
      }
    });

    const functionCall = response.functionCalls?.[0];

    // 6. Verificar si la IA decidió llamar a registrarTransacciones
    if (functionCall && functionCall.name === 'registrarTransacciones') {
      const { transacciones } = functionCall.args;
      const t = await sequelize.transaction();
      let isCommitted = false;
      const registeredTransactions = [];

      try {
        for (const g of transacciones) {
          // Buscar cuenta coincidente (case-insensitive)
          let matchedAccount = accounts.find(
            acc => acc.name.toLowerCase().trim() === (g.cuenta_identificada || '').toLowerCase().trim()
          );

          // Si no hace match y el usuario solo tiene una cuenta, la asignamos por defecto
          if (!matchedAccount && accounts.length === 1) {
            matchedAccount = accounts[0];
          }

          if (!matchedAccount) {
            throw new Error(`No se encontró la cuenta '${g.cuenta_identificada}' del usuario.`);
          }

          // Buscar categoría coincidente (case-insensitive)
          const matchedCategory = categories.find(
            cat => cat.name.toLowerCase().trim() === g.categoria_sugerida.toLowerCase().trim()
          );

          // Mapear fecha (si Gemini calculó una fecha relativa, la usamos a mediodía local)
          const txDate = g.fecha ? new Date(g.fecha + 'T12:00:00') : new Date();

          // Validar tipo: 'gasto' o 'ingreso'. Por defecto 'gasto'.
          const txType = g.tipo === 'ingreso' ? 'ingreso' : 'gasto';

          const hasSplits = g.divisiones && g.divisiones.length > 0;

          if (hasSplits) {
            const sumSplits = g.divisiones.reduce((sum, s) => sum + Math.abs(parseFloat(s.monto)), 0);
            if (Math.abs(sumSplits - Math.abs(parseFloat(g.monto))) > 0.01) {
              throw new Error(`La suma de las partes divididas ($${sumSplits}) no coincide con el monto total de la transacción ($${g.monto}).`);
            }
          }

          // Crear la transacción principal (padre)
          const newTx = await Transaction.create({
            account_id: matchedAccount.id,
            amount: Math.abs(parseFloat(g.monto)),
            date: txDate,
            original_description: g.descripcion,
            category_id: matchedCategory ? matchedCategory.id : null,
            type: txType,
            source: 'manual',
            is_split: hasSplits,
            user_id: userId
          }, { transaction: t });

          // Actualizar saldo de la cuenta
          // Gasto -> Resta balance. Ingreso -> Suma balance. (Se descuenta una sola vez el monto total del padre)
          const balanceOffset = txType === 'gasto' ? -Math.abs(parseFloat(g.monto)) : Math.abs(parseFloat(g.monto));
          const newBalance = parseFloat(matchedAccount.balance) + balanceOffset;
          await matchedAccount.update({ balance: newBalance }, { transaction: t });

          // Crear las sub-transacciones asociadas (hijos) si aplica división
          const childTransactionsInfo = [];
          if (hasSplits) {
            const childrenData = [];
            for (const s of g.divisiones) {
              childrenData.push({
                account_id: matchedAccount.id,
                amount: Math.abs(parseFloat(s.monto)),
                date: txDate,
                original_description: g.descripcion,
                custom_description: s.descripcion,
                category_id: newTx.category_id, // Hereda la categoría del padre
                type: txType,
                source: 'manual',
                parent_id: newTx.id,
                is_split: false,
                user_id: userId
              });

              childTransactionsInfo.push({
                monto: s.monto,
                categoria: matchedCategory ? matchedCategory.name : 'General',
                descripcion: s.descripcion
              });
            }
            await Transaction.bulkCreate(childrenData, { transaction: t });
          }

          registeredTransactions.push({
            id: newTx.id,
            monto: g.monto,
            tipo: txType,
            cuenta: matchedAccount.name,
            categoria: matchedCategory ? matchedCategory.name : 'General',
            descripcion: g.descripcion,
            fecha: txDate.toISOString().split('T')[0],
            is_split: hasSplits,
            divisiones: childTransactionsInfo
          });
        }

        await t.commit();
        isCommitted = true;

      } catch (dbError) {
        if (!isCommitted) {
          await t.rollback();
        }
        console.error('Error procesando el registro de transacciones en base de datos:', dbError);
        return res.status(400).json({ 
          error: 'Error al registrar las transacciones en base de datos', 
          message: dbError.message 
        });
      }

      // Alertas de presupuesto/notificaciones (fuera de la transacción de DB)
      try {
        const { checkAndNotifySpending } = require('../services/notificationService');
        if (typeof checkAndNotifySpending === 'function') {
          checkAndNotifySpending(userId);
        }
      } catch (err) {
        console.warn('Servicio de notificaciones de presupuesto no disponible:', err.message);
      }

      // Enviar la respuesta de la función de vuelta a Gemini para obtener el resumen narrativo final
      contents.push({
        role: 'model',
        parts: [{ functionCall: functionCall }]
      });
      
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: 'registrarTransacciones',
            response: { success: true, message: 'Movimientos financieros guardados en base de datos.', registeredTransactions }
          }
        }]
      });

      let finalResponseText = '';
      try {
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [registrarTransaccionesTool, modificarTransaccionTool] }]
          }
        });
        finalResponseText = finalResponse.text;
      } catch (geminiError) {
        console.error('Error al generar respuesta narrativa final en Gemini:', geminiError);
        finalResponseText = `¡Listo! He registrado con éxito los siguientes movimientos:\n` +
          registeredTransactions.map(e => {
            let line = `- [${e.tipo.toUpperCase()}] ${e.descripcion}: $${new Intl.NumberFormat('es-CL').format(e.monto)} en tu cuenta ${e.cuenta} (${e.fecha})`;
            if (e.is_split && e.divisiones && e.divisiones.length > 0) {
              line += `\n  Desglose de divisiones:\n` +
                e.divisiones.map(d => `    • ${d.descripcion}: $${new Intl.NumberFormat('es-CL').format(d.monto)} (Categoría: ${d.categoria})`).join('\n');
            }
            return line;
          }).join('\n');
      }

      const responseMsg = finalResponseText || 'He registrado tus movimientos exitosamente.';
      await AiChatMessage.create({
        user_id: userId,
        sender: 'ai',
        text: responseMsg
      });

      return res.json({
        type: 'action_completed',
        message: responseMsg,
        expenses: registeredTransactions
      });
    }

    // 7. Verificar si la IA decidió llamar a modificarTransaccion
    if (functionCall && functionCall.name === 'modificarTransaccion') {
      const { transaccion_id, criterio_busqueda, modificaciones } = functionCall.args;
      const t = await sequelize.transaction();
      let isCommitted = false;
      let modifiedTransaction = null;

      try {
        // Buscar la transacción a modificar
        let tx = null;
        if (transaccion_id) {
          tx = await Transaction.findOne({ where: { id: transaccion_id, user_id: userId }, transaction: t });
        } else if (criterio_busqueda) {
          if (criterio_busqueda.es_ultimo) {
            tx = await Transaction.findOne({ 
              where: { user_id: userId }, 
              order: [['date', 'DESC'], ['id', 'DESC']],
              transaction: t
            });
          } else {
            const whereClause = { user_id: userId };
            if (criterio_busqueda.descripcion) {
              whereClause.original_description = { [Op.like]: `%${criterio_busqueda.descripcion}%` };
            }
            if (criterio_busqueda.monto) {
              whereClause.amount = Math.abs(parseFloat(criterio_busqueda.monto));
            }
            if (criterio_busqueda.fecha) {
              const startDate = new Date(criterio_busqueda.fecha + 'T00:00:00');
              const endDate = new Date(criterio_busqueda.fecha + 'T23:59:59');
              whereClause.date = { [Op.between]: [startDate, endDate] };
            }
            tx = await Transaction.findOne({ 
              where: whereClause, 
              order: [['date', 'DESC'], ['id', 'DESC']],
              transaction: t
            });
          }
        } else {
          // Por defecto buscar el último movimiento
          tx = await Transaction.findOne({ 
            where: { user_id: userId }, 
            order: [['date', 'DESC'], ['id', 'DESC']],
            transaction: t
          });
        }

        if (!tx) {
          throw new Error('No se encontró ninguna transacción que coincida con los criterios indicados.');
        }

        const oldAccount = await Account.findByPk(tx.account_id, { transaction: t });
        if (!oldAccount) {
          throw new Error('La cuenta asociada a la transacción original no fue encontrada.');
        }

        let newAccount = oldAccount;
        if (modificaciones.cuenta) {
          const matchedAcc = accounts.find(
            acc => acc.name.toLowerCase().trim() === modificaciones.cuenta.toLowerCase().trim()
          );
          if (!matchedAcc) {
            throw new Error(`La cuenta bancaria '${modificaciones.cuenta}' no fue encontrada.`);
          }
          if (matchedAcc.id !== oldAccount.id) {
            newAccount = await Account.findByPk(matchedAcc.id, { transaction: t });
          }
        }

        // Reversar saldo en cuenta anterior
        const oldBalanceOffset = tx.type === 'gasto' ? parseFloat(tx.amount) : -parseFloat(tx.amount);
        oldAccount.balance = parseFloat(oldAccount.balance) + oldBalanceOffset;

        // Obtener nuevos valores
        const newAmount = modificaciones.monto !== undefined ? Math.abs(parseFloat(modificaciones.monto)) : parseFloat(tx.amount);
        const newBalanceOffset = tx.type === 'gasto' ? -newAmount : newAmount;

        // Aplicar nuevos saldos
        if (oldAccount.id !== newAccount.id) {
          await oldAccount.save({ transaction: t });
          newAccount.balance = parseFloat(newAccount.balance) + newBalanceOffset;
          await newAccount.save({ transaction: t });
        } else {
          oldAccount.balance = parseFloat(oldAccount.balance) + newBalanceOffset;
          await oldAccount.save({ transaction: t });
        }

        // Aplicar cambios a la transacción
        if (modificaciones.categoria) {
          const matchedCategory = categories.find(
            cat => cat.name.toLowerCase().trim() === modificaciones.categoria.toLowerCase().trim()
          );
          if (!matchedCategory) {
            throw new Error(`La categoría '${modificaciones.categoria}' no existe en tus categorías.`);
          }
          tx.category_id = matchedCategory.id;
        }

        tx.original_description = modificaciones.descripcion || tx.original_description;
        tx.amount = newAmount;
        tx.account_id = newAccount.id;
        if (modificaciones.fecha) {
          tx.date = new Date(modificaciones.fecha + 'T12:00:00');
        }

        await tx.save({ transaction: t });

        modifiedTransaction = {
          id: tx.id,
          descripcion: tx.original_description,
          monto: tx.amount,
          cuenta: newAccount.name,
          categoria: modificaciones.categoria || (await Category.findByPk(tx.category_id, { transaction: t }))?.name || 'General',
          fecha: tx.date.toISOString().split('T')[0]
        };

        await t.commit();
        isCommitted = true;

      } catch (dbError) {
        if (!isCommitted) {
          await t.rollback();
        }
        console.error('Error modificando la transacción en base de datos:', dbError);
        return res.status(400).json({ 
          error: 'Error al modificar la transacción en la base de datos', 
          message: dbError.message 
        });
      }

      // Enviar la respuesta de la función de vuelta a Gemini para obtener el resumen narrativo final
      contents.push({
        role: 'model',
        parts: [{ functionCall: functionCall }]
      });
      
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: 'modificarTransaccion',
            response: { success: true, message: 'Transacción modificada con éxito en base de datos.', modifiedTransaction }
          }
        }]
      });

      let finalResponseText = '';
      try {
        const finalResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: contents,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [registrarTransaccionesTool, modificarTransaccionTool] }]
          }
        });
        finalResponseText = finalResponse.text;
      } catch (geminiError) {
        console.error('Error al generar respuesta de modificación en Gemini:', geminiError);
        finalResponseText = `¡Modificado! He editado con éxito la transacción "${modifiedTransaction.descripcion}". El nuevo monto es $${new Intl.NumberFormat('es-CL').format(modifiedTransaction.monto)} en tu cuenta ${modifiedTransaction.cuenta} (Categoría: ${modifiedTransaction.categoria}).`;
      }

      const responseMsg = finalResponseText || 'Transacción modificada con éxito.';
      await AiChatMessage.create({
        user_id: userId,
        sender: 'ai',
        text: responseMsg
      });

      return res.json({
        type: 'action_completed',
        message: responseMsg,
        expenses: [modifiedTransaction]
      });
    }

    // 8. Si la IA respondió con texto plano (preguntando o conversando)
    const responseMsg = response.text || 'No logré entender completamente la instrucción. ¿Podrías repetirla o darme más detalles?';
    await AiChatMessage.create({
      user_id: userId,
      sender: 'ai',
      text: responseMsg
    });

    return res.json({
      type: 'text',
      message: responseMsg
    });

  } catch (error) {
    console.error('Error general en el Asistente de IA:', error);
    res.status(500).json({ 
      error: 'Error interno en el asistente de IA', 
      details: error.message 
    });
  }
};

// GET /api/ia/chat/history
const getHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const dbMessages = await AiChatMessage.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'ASC']],
      limit: 50
    });

    const messages = dbMessages.map(msg => ({
      id: msg.id.toString(),
      sender: msg.sender,
      text: msg.text,
      timestamp: msg.createdAt
    }));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error al obtener el historial de chat:', error);
    res.status(500).json({ error: 'Error al obtener el historial de chat' });
  }
};

// DELETE /api/ia/chat/history
const deleteHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    await AiChatMessage.destroy({
      where: { user_id: userId }
    });
    res.json({ success: true, message: 'Historial de chat borrado correctamente' });
  } catch (error) {
    console.error('Error al borrar el historial de chat:', error);
    res.status(500).json({ error: 'Error al borrar el historial de chat' });
  }
};

module.exports = {
  chatIA,
  getHistory,
  deleteHistory
};
