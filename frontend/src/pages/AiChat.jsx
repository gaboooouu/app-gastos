import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function AiChat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Cargar historial de chat desde la base de datos al montar o cambiar usuario
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await apiClient.get('/ia/chat/history');
        if (response.data && response.data.success && response.data.messages && response.data.messages.length > 0) {
          setMessages(response.data.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
          return;
        }
      } catch (error) {
        console.error('Error fetching chat history from DB:', error);
      }
      
      // Si falla o no hay mensajes, ponemos el de bienvenida por defecto
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `¡Hola ${user?.name || ''}! Soy tu Asistente Financiero IA de FinVue. 🤖\n\nPuedes escribirme o presionar el micrófono para hablarme. Por ejemplo: \n*"Gasté 12.000 en el McDonalds de comida rápida con mi cuenta Santander"* o *"Registra 5.000 en locomoción pagado en Efectivo"*.\n\n¿En qué te puedo ayudar hoy?`,
          timestamp: new Date()
        }
      ]);
    };

    if (user) {
      fetchChatHistory();
    }
  }, [user]);

  // Escuchar evento global para abrir el chat
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-ai-chat', handleOpen);
    return () => window.removeEventListener('open-ai-chat', handleOpen);
  }, []);

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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  // Limpiar historial de chat
  const handleClearChat = async () => {
    if (!confirm('¿Estás seguro de borrar todo el historial de conversación?')) return;
    try {
      await apiClient.delete('/ia/chat/history');
      const initialWelcome = [
        {
          id: 'welcome',
          sender: 'ai',
          text: `¡Hola ${user?.name || ''}! Soy tu Asistente Financiero IA de FinVue. 🤖\n\nPuedes escribirme o presionar el micrófono para hablarme. Por ejemplo: \n*"Gasté 12.000 en el McDonalds de comida rápida con mi cuenta Santander"* o *"Registra 5.000 en locomoción pagado en Efectivo"*.\n\n¿En qué te puedo ayudar hoy?`,
          timestamp: new Date()
        }
      ];
      setMessages(initialWelcome);
      toast.success('Historial de chat borrado');
    } catch (error) {
      console.error('Error al borrar el historial de chat:', error);
      toast.error('No se pudo borrar el historial del chat');
    }
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
        
        // Notificar a otras páginas para que actualicen sus datos en tiempo real
        window.dispatchEvent(new Event('transaction-updated'));

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

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-6 lg:bottom-8 lg:right-8 w-14 h-14 rounded-full bg-primary hover:bg-primary-dark text-white flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 z-50 cursor-pointer border border-white/20 active:scale-95 hover:scale-105"
        title="Asistente Financiero IA"
      >
        <span className="material-symbols-outlined text-3xl animate-pulse text-white">smart_toy</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 w-full h-full sm:w-[400px] sm:h-[600px] bg-[#F0F2F5] sm:rounded-2xl sm:shadow-2xl border border-slate-200/80 flex flex-col z-50 overflow-hidden transition-all duration-300">
      {/* Cabecera del Chat */}
      <div className="neu-card p-4 flex items-center justify-between border-b border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-primary-dark text-2xl font-bold">smart_toy</span>
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 leading-tight">Asistente Inteligente</h2>
            <p className="text-[10px] font-bold text-green-600 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
              En línea
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Botón Borrar Historial */}
          <button 
            type="button"
            onClick={handleClearChat}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            title="Borrar conversación"
          >
            <span className="material-symbols-outlined text-lg">delete_sweep</span>
          </button>
          {/* Botón Cerrar Chat */}
          <button 
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            title="Cerrar chat"
          >
            <span className="material-symbols-outlined text-lg font-bold">close</span>
          </button>
        </div>
      </div>

      {/* Historial de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-slate-50/50 shadow-inner">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-[85%] sm:max-w-[80%] ${isUser ? 'self-end flex-row-reverse' : 'self-start'
                }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold shadow-sm ${isUser
                    ? 'bg-primary text-slate-900 border border-slate-200'
                    : 'bg-white text-primary-dark border border-slate-100'
                  }`}
              >
                {isUser ? (
                  user?.name ? user.name.slice(0, 2).toUpperCase() : 'YO'
                ) : (
                  <span className="material-symbols-outlined text-xs font-bold">smart_toy</span>
                )}
              </div>

              {/* Burbuja */}
              <div
                className={`p-3 rounded-xl text-xs font-medium leading-relaxed whitespace-pre-wrap ${isUser
                    ? 'bg-primary text-slate-900 rounded-tr-none shadow-sm'
                    : 'bg-white text-slate-700 rounded-tl-none border border-slate-100 shadow-sm shadow-slate-200/30'
                  }`}
              >
                {msg.text}
                <div
                  className={`text-[8px] mt-1.5 font-bold uppercase tracking-wider text-right ${isUser ? 'text-slate-700/60' : 'text-slate-400'
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
          <div className="flex gap-3 self-start max-w-[80%]">
            <div className="w-8 h-8 rounded-full bg-white text-primary-dark border border-slate-100 flex items-center justify-center text-xs font-bold shadow-sm">
              <span className="material-symbols-outlined text-xs font-bold">smart_toy</span>
            </div>
            <div className="bg-white border border-slate-100 p-3 rounded-xl rounded-tl-none shadow-sm shadow-slate-200/30 flex items-center gap-1.5 min-w-[50px]">
              <span className="h-1.5 w-1.5 bg-primary-dark rounded-full animate-bounce delay-100"></span>
              <span className="h-1.5 w-1.5 bg-primary-dark rounded-full animate-bounce delay-200"></span>
              <span className="h-1.5 w-1.5 bg-primary-dark rounded-full animate-bounce delay-300"></span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Panel de Inputs / Barra inferior de envío */}
      <div className="p-3 border-t border-slate-200 bg-white flex flex-col gap-2 shadow-sm">
        {isRecording ? (
          /* Interfaz de Grabación Activa */
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-2.5 animate-pulse">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider">
                Grabando...
              </span>
              <span className="text-xs font-black text-red-900 font-mono">
                {formatDuration(recordingDuration)}
              </span>
            </div>
            <button
              type="button"
              onClick={stopRecording}
              className="bg-red-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-red-700 transition-colors flex items-center gap-1 shadow-md shadow-red-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">stop</span>
              Enviar
            </button>
          </div>
        ) : (
          /* Formulario de Entrada de Texto / Micrófono */
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            {/* Botón de Micrófono */}
            <button
              type="button"
              onClick={startRecording}
              disabled={isProcessing}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${isProcessing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'neu-button text-slate-600 hover:text-red-500'
                }`}
              title="Grabar Audio"
            >
              <span className="material-symbols-outlined text-xl font-bold">mic</span>
            </button>

            {/* Input de Texto */}
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Pregúntame o graba un audio..."
              disabled={isProcessing}
              className="flex-1 neu-input px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
            />

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={!textInput.trim() || isProcessing}
              className={`p-2.5 rounded-xl flex items-center justify-center transition-colors ${!textInput.trim() || isProcessing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/50'
                  : 'bg-primary text-slate-900 hover:opacity-90 shadow-md shadow-primary/20 cursor-pointer'
                }`}
            >
              <span className="material-symbols-outlined text-xl font-bold">send</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
