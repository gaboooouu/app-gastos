import React, { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';

export default function AccountModal({ isOpen, onClose, onFintocLink, onSuccess }) {
  const [accountType, setAccountType] = useState('fintoc'); // 'fintoc' | 'manual'
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre de la cuenta es requerido');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/accounts', {
        name: name.trim(),
        type: 'manual',
        balance: parseFloat(balance) || 0,
      });
      toast.success('Cuenta manual creada exitosamente');
      setName('');
      setBalance('');
      onSuccess(); // Para refrescar datos del Dashboard
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear cuenta manual');
    } finally {
      setLoading(false);
    }
  };

  const handleFintocSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Asigna un nombre para tu cuenta bancaria');
      return;
    }
    // Pasamos el nombre para que el componente padre lo use al vincular
    onFintocLink(name.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#F0F2F5] rounded-3xl p-8 relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Vincular Cuenta</h2>

        {/* Custom Toggle Switch */}
        <div className="bg-slate-200/50 p-1.5 rounded-xl flex mb-8">
          <button
            onClick={() => setAccountType('fintoc')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              accountType === 'fintoc' 
                ? 'bg-white text-primary-dark shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Fintoc (Automática)
          </button>
          <button
            onClick={() => setAccountType('manual')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              accountType === 'manual' 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Añadir Manual
          </button>
        </div>

        {accountType === 'fintoc' ? (
          <form onSubmit={handleFintocSubmit} className="flex flex-col gap-6">
            <div className="bg-primary/10 border border-primary/20 text-primary-dark p-4 rounded-xl text-sm font-medium mb-2">
              <span className="material-symbols-outlined align-middle mr-2 text-xl">security</span>
              Tus credenciales están protegidas y encriptadas por Fintoc.
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Nombre visible de la cuenta</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ej. Cuenta Corriente Banco Estado"
              />
            </div>

            <button 
              type="submit" 
              className="neu-button mt-2 p-4 rounded-xl font-bold bg-primary text-slate-900 border-2 border-primary hover:border-primary-dark w-full flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm font-bold">link</span>
              Abrir Widget de Fintoc
            </button>
          </form>
        ) : (
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Nombre de la cuenta</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Ej. Billetera Efectivo"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Saldo Inicial (Opcional)</label>
              <input 
                type="number" 
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
                placeholder="Ej. 50000"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="neu-button mt-4 p-4 rounded-xl font-bold text-slate-800 hover:text-primary-dark w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">save</span>
              )}
              {loading ? 'Guardando...' : 'Guardar Cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
