import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PinLock = ({ children }) => {
  const [pin, setPin] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [error, setError] = useState(false);

  const isPinEnabled = localStorage.getItem('pin_lock_enabled') === 'true';
  const correctPin = localStorage.getItem('pin_lock_code') || '2101';

  // Verificar si el PIN está activado o ya fue ingresado en esta sesión
  useEffect(() => {
    const authSession = sessionStorage.getItem('isAppUnlocked');
    if (!isPinEnabled || authSession === 'true') {
      setIsLocked(false);
    }
  }, [isPinEnabled]);

  // Soporte para teclado físico en Desktop
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e) => {
      // Números 0-9
      if (/^[0-9]$/.test(e.key)) {
        handleNumberClick(e.key);
      }
      
      // Borrar (Backspace)
      if (e.key === 'Backspace') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin, error]);

  const handleNumberClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      if (newPin.length === 4) {
        if (newPin === correctPin) {
          sessionStorage.setItem('isAppUnlocked', 'true');
          setTimeout(() => setIsLocked(false), 300);
        } else {
          setTimeout(() => {
            setError(true);
            setPin('');
          }, 300);
        }
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
  };

  if (!isLocked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F0F2F5] overflow-y-auto py-8 px-6 select-none flex flex-col items-center justify-start sm:justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-10 mt-auto sm:mt-0"
      >
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner">
          <span className="material-symbols-outlined text-primary-dark text-3xl sm:text-4xl font-bold">lock</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-1 leading-tight">FinVue Secure</h2>
        <p className="text-xs sm:text-sm text-slate-500 font-medium">Ingresa tu código de acceso secreto</p>
      </motion.div>

      {/* Indicadores de PIN */}
      <div className="flex gap-4 mb-8 sm:mb-12">
        {[0, 1, 2, 3].map((i) => (
          <motion.div
            key={i}
            animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full transition-all duration-300 ${
              pin.length > i 
                ? 'bg-primary scale-110 shadow-[0_0_12px_rgba(20,184,166,0.5)]' 
                : 'bg-slate-300 shadow-inner'
            }`}
          />
        ))}
      </div>

      {/* Teclado Numérico Neumórfico */}
      <div className="grid grid-cols-3 gap-4 sm:gap-6 max-w-[280px] sm:max-w-xs w-full mb-auto sm:mb-0">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="neu-button w-full aspect-square rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-slate-700 active:scale-95 transition-transform"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="neu-button w-full aspect-square rounded-2xl flex items-center justify-center text-slate-400 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-xl sm:text-2xl">backspace</span>
        </button>
        <button
          onClick={() => handleNumberClick('0')}
          className="neu-button w-full aspect-square rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black text-slate-700 active:scale-95 transition-transform"
        >
          0
        </button>
        <div className="w-full aspect-square flex items-center justify-center opacity-20">
          <span className="material-symbols-outlined text-xl sm:text-2xl">fingerprint</span>
        </div>
      </div>

      {error && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-red-500 font-black text-sm mt-6 sm:mt-8 pb-4"
        >
          PIN incorrecto. Inténtalo de nuevo.
        </motion.p>
      )}
    </div>
  );
};

export default PinLock;
