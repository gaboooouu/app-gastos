import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AiChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('finvue_chat_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        console.error('Error parsing saved chat messages:', e);
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: `¡Hola ${user?.name || ''}! Soy tu Asistente Financiero IA de FinVue. 🤖\n\nPuedes escribirme o presionar el micrófono para hablarme. Por ejemplo: \n*"Gasté 12.000 en el McDonalds de comida rápida con mi cuenta Santander"* o *"Registra 5.000 en locomoción pagado en Efectivo"*.\n\n¿En qué te puedo ayudar hoy?`,
        timestamp: new Date()
      }
    ];
  });
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Grabación de Audio
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const timerRef = useRef(null);
  const chatEndRef = useRef(null);

  // Auto-scroll al final del chat al recibir mensajes
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Guardar mensajes en localStorage cuando cambien
  useEffect(() => {
    localStorage.setItem('finvue_chat_messages', JSON.stringify(messages));
  }, [messages]);

  // Limpiar historial de chat
  const handleClearChat = () => {
    if (!confirm('¿Estás seguro de borrar todo el historial de conversación?')) return;
    const initialWelcome = [
      {
        id: 'welcome',
        sender: 'ai',
        text: `¡Hola ${user?.name || ''}! Soy tu Asistente Financiero IA de FinVue. 🤖\n\nPuedes escribirme o presionar el micrófono para hablarme. Por ejemplo: \n*"Gasté 12.000 en el McDonalds de comida rápida con mi cuenta Santander"* o *"Registra 5.000 en locomoción pagado en Efectivo"*.\n\n¿En qué te puedo ayudar hoy?`,
        timestamp: new Date()
      }
    ];
    setMessages(initialWelcome);
    localStorage.setItem('finvue_chat_messages', JSON.stringify(initialWelcome));
    toast.success('Historial de chat borrado');
  };

  // Manejador del cronómetro de grabación
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Iniciar Grabación de Voz
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Intentar usar un formato de audio soportado común
      let options = { mimeType: 'audio/webm' };
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/mp4' };
      }

      const recorder = new MediaRecorder(stream, options);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: chunks[0]?.type || 'audio/webm' });
        await sendChatRequest(null, audioBlob);
      };

      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error al acceder al micrófono:', err);
      toast.error('No se pudo acceder al micrófono. Por favor verifica tus permisos.');
    }
  };

  // Detener Grabación de Voz
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Apagar los tracks del micrófono
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Enviar mensaje de texto
  const handleSendText = async (e) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput;
    setTextInput('');
    await sendChatRequest(text, null);
  };

  // Enviar petición al Backend (con opcional de Texto o Audio)
  const sendChatRequest = async (text, audioBlob) => {
    setIsProcessing(true);

    // Agregar mensaje localmente
    const userMessageId = Date.now().toString();
    const newUserMessage = {
      id: userMessageId,
      sender: 'user',
      text: text || '🎤 Mensaje de voz enviado',
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newUserMessage]);

    try {
      const formData = new FormData();

      if (text) {
        formData.append('message', text);
      }

      if (audioBlob) {
        // Enviar con extensión webm/mp4 adecuada
        const fileExt = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
        formData.append('audio', audioBlob, `voice_input.${fileExt}`);
      }

      // Filtrar el historial del chat para enviarlo
      // Excluimos el mensaje de bienvenida inicial y simplificamos la estructura
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          sender: m.sender,
          text: m.text
        }));

      formData.append('history', JSON.stringify(historyPayload));

      const response = await apiClient.post('/ia/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const data = response.data;

      // Estructurar respuesta de la IA
      const aiResponse = {
        id: Date.now().toString(),
        sender: 'ai',
        text: data.message,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, aiResponse]);

      // Si la IA ejecutó una transacción con éxito
      if (data.type === 'action_completed') {
        toast.success('¡Gasto registrado automáticamente!', { icon: '💰' });

        // Disparar sonido sutil o feedback visual
        if (window.navigator?.vibrate) {
          window.navigator.vibrate([100, 50, 100]);
        }
      }

    } catch (error) {
      console.error('Error al chatear con la IA:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Ocurrió un error al procesar tu solicitud.';

      toast.error('Error en el asistente de IA');

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'ai',
          text: `Perdón, tuve un problema procesando tu mensaje: "${errorMessage}". ¿Podrías volver a intentarlo?`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-[#F0F2F5]">
      {/* Cabecera del Chat */}
      <div className="neu-card rounded-t-2xl p-4 flex items-center justify-between border-b border-slate-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-primary-dark text-2xl font-bold">smart_toy</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 leading-tight">Asistente Inteligente</h2>
            <p className="text-xs font-bold text-green-600 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
              En línea
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden md:block">
            FinVue AI Assistant
          </div>
          <button 
            type="button"
            onClick={handleClearChat}
            className="neu-button p-2 text-slate-400 hover:text-red-500 rounded-xl flex items-center justify-center cursor-pointer transition-colors"
            title="Borrar conversación"
          >
            <span className="material-symbols-outlined text-lg">delete_sweep</span>
          </button>
        </div>
      </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4 bg-slate-50/50 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] sm:max-w-[70%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'
                }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${isUser
                    ? 'bg-primary text-slate-900 border border-slate-200'
                    : 'bg-white text-primary-dark border border-slate-100'
                  }`}
              >
                {isUser ? (
                  user?.name ? user.name.slice(0, 2).toUpperCase() : 'YO'
                ) : (
                  <span className="material-symbols-outlined text-sm font-bold">smart_toy</span>
                )}
              </div>

              {/* Burbuja */}
              <div
                className={`p-4 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-primary text-slate-900 rounded-tr-none shadow-md'
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-md shadow-slate-200/50'
                  }`}
              >
                {msg.text}
                <div
                  className={`text-[9px] mt-2 font-bold uppercase tracking-wider text-right ${isUser ? 'text-slate-700/60' : 'text-slate-400'
                    }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Indicador de Escritura */}
        {isProcessing && (
          <div className="flex gap-3 self-start max-w-[70%]">
            <div className="w-8 h-8 rounded-full bg-white text-primary-dark border border-slate-100 flex items-center justify-center text-xs font-bold shadow-sm">
              <span className="material-symbols-outlined text-sm font-bold">smart_toy</span>
            </div>
            <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none shadow-md shadow-slate-200/50 flex items-center gap-1.5 min-w-[60px]">
              <span className="h-2 w-2 bg-primary-dark rounded-full animate-bounce delay-100"></span>
              <span className="h-2 w-2 bg-primary-dark rounded-full animate-bounce delay-200"></span>
              <span className="h-2 w-2 bg-primary-dark rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Panel de Inputs / Barra inferior de envío */}
      <div className="neu-card rounded-b-2xl p-4 border-t border-slate-200 bg-white flex flex-col gap-2">
        {isRecording ? (
          /* Interfaz de Grabación Activa */
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3 animate-pulse">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-ping"></span>
              <span className="text-sm font-bold text-red-700 uppercase tracking-widest">
                Grabando Audio...
              </span>
              <span className="text-sm font-black text-red-900 font-mono">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-md shadow-red-200"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
              Terminar y Enviar
            </button>
          </div>
        ) : (
          /* Formulario de Entrada de Texto / Micrófono */
          <form onSubmit={handleSendText} className="flex items-center gap-3">
            {/* Botón de Micrófono */}
            <button
              type="button"
              onClick={startRecording}
              disabled={isProcessing}
              className={`p-3 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${isProcessing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'neu-button text-slate-600 hover:text-red-500'
                }`}
              title="Grabar Audio"
            >
              <span className="material-symbols-outlined text-2xl font-bold">mic</span>
            </button>

            {/* Input de Texto */}
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Escribe tu mensaje o graba un audio..."
              disabled={isProcessing}
              className="flex-1 neu-input px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className={`p-3 rounded-xl flex items-center justify-center transition-colors ${!textInput.trim() || isProcessing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                  : 'bg-primary text-slate-900 hover:opacity-90 shadow-md shadow-primary/20 cursor-pointer'
                }`}
            >
              <span className="material-symbols-outlined text-2xl font-bold">send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
