import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import { FaHamburger, FaCar, FaGamepad, FaHome, FaDog, FaGift, FaHeartbeat, FaCoffee, FaShoppingBag, FaPlane, FaUtensils, FaTshirt, FaGasPump, FaGraduationCap, FaDumbbell, FaBaby, FaBus, FaTools, FaPhone, FaWifi } from 'react-icons/fa';

const iconMap = {
  FaHamburger: <FaHamburger />,
  FaCar: <FaCar />,
  FaGamepad: <FaGamepad />,
  FaHome: <FaHome />,
  FaDog: <FaDog />,
  FaGift: <FaGift />,
  FaHeartbeat: <FaHeartbeat />,
  FaCoffee: <FaCoffee />,
  FaShoppingBag: <FaShoppingBag />,
  FaPlane: <FaPlane />,
  FaUtensils: <FaUtensils />,
  FaTshirt: <FaTshirt />,
  FaGasPump: <FaGasPump />,
  FaGraduationCap: <FaGraduationCap />,
  FaDumbbell: <FaDumbbell />,
  FaBaby: <FaBaby />,
  FaBus: <FaBus />,
  FaTools: <FaTools />,
  FaPhone: <FaPhone />,
  FaWifi: <FaWifi />
};

export default function SplitTransactionModal({ isOpen, onClose, transaction, categories, onSplitSuccess }) {
  const [splits, setSplits] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingSplits, setIsLoadingSplits] = useState(false);

  useEffect(() => {
    const initModal = async () => {
      if (!isOpen || !transaction) return;

      if (transaction.is_split) {
        setIsLoadingSplits(true);
        try {
          const res = await apiClient.get(`/transactions?parent_id=${transaction.id}`);
          if (res.data && res.data.length > 0) {
            setSplits(res.data.map(s => ({
              amount: Math.abs(s.amount),
              custom_description: s.custom_description,
              category_id: s.category_id || ''
            })));
          }
        } catch (error) {
          toast.error('Error al cargar las divisiones actuales.');
        } finally {
          setIsLoadingSplits(false);
        }
      } else {
        // Para nuevo movimiento, empezamos sin divisiones como pidió el usuario
        setSplits([]);
      }
    };

    initModal();
  }, [isOpen, transaction]);

  const totalAmount = Math.abs(transaction?.amount || 0);
  const currentTotal = splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
  const difference = totalAmount - currentTotal;

  const handleAddSplit = () => {
    setSplits([...splits, { amount: 0, custom_description: '', category_id: transaction.category_id || '' }]);
  };

  const handleRemoveSplit = (index) => {
    if (splits.length === 1) return;
    setSplits(splits.filter((_, i) => i !== index));
  };

  const handleSplitChange = (index, field, value) => {
    const newSplits = [...splits];
    newSplits[index][field] = value;
    setSplits(newSplits);
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await apiClient.get(`/transactions/history/splits?description=${transaction.original_description}`);
      if (res.data && res.data.length > 0) {
        setSplits(res.data.map(h => ({
          amount: Math.abs(h.amount),
          custom_description: h.custom_description,
          category_id: h.category_id || ''
        })));
        toast.success('Historia cargada exitosamente.');
      } else {
        toast.error('No se encontró historia para esta descripción.');
      }
    } catch (error) {
      toast.error('Error al cargar la historia.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    if (splits.length === 0) {
      toast.error('Debes añadir al menos una división.');
      return;
    }

    if (Math.abs(difference) > 0.01) {
      toast.error('El total de las divisiones debe coincidir con el monto original.');
      return;
    }

    try {
      await apiClient.post(`/transactions/${transaction.id}/split`, { splits });
      toast.success('Transacción dividida correctamente.');
      onSplitSuccess();
      onClose();
    } catch (error) {
      toast.error('Error al dividir la transacción.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm shadow-inner" onClick={onClose}></div>
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] relative z-10 flex flex-col max-h-[90vh] border border-white overflow-hidden animate-in fade-in zoom-in duration-200">
        
        <div className="p-8 pb-4">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Dividir Movimiento</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Repartición del gasto</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors"><span className="material-symbols-outlined">close</span></button>
          </div>

          {/* Información del Movimiento Original */}
          <div className="bg-slate-50/80 rounded-3xl p-5 border border-slate-100 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Movimiento Original</label>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm ${transaction?.category?.color || 'bg-slate-200 text-slate-400'}`}>
                  {transaction?.category?.icon && iconMap[transaction.category.icon] ? (
                    iconMap[transaction.category.icon]
                  ) : (
                    <span className="material-symbols-outlined text-xl">
                      {transaction?.category?.icon || 'payments'}
                    </span>
                  )}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm truncate max-w-[200px] leading-tight">
                    {transaction?.custom_description || transaction?.original_description}
                  </p>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                    {transaction?.category?.name || 'Sin Categoría'}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 block">Total a Repartir</label>
              <p className="text-xl font-black text-slate-800 tracking-tight leading-none">
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalAmount)}
              </p>
            </div>
          </div>

          <button 
            onClick={loadHistory}
            disabled={isLoadingHistory}
            className="w-full py-3.5 mb-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group"
          >
            <span className="material-symbols-outlined text-base group-hover:animate-spin">history</span>
            {isLoadingHistory ? 'Cargando...' : `Cargar última división (${transaction?.custom_description || transaction?.original_description})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-8 custom-scrollbar">
          <div className="flex flex-col gap-4 mb-8">
            {splits.length === 0 && !isLoadingSplits && (
              <div className="py-12 flex flex-col items-center justify-center text-slate-300 opacity-60">
                <span className="material-symbols-outlined text-5xl mb-3">account_tree</span>
                <p className="text-[10px] font-black uppercase tracking-widest">No hay divisiones aún</p>
              </div>
            )}
            {splits.map((split, index) => (
              <div key={index} className="p-5 rounded-[2rem] bg-white/50 border border-white flex flex-col gap-4 relative group">
                {splits.length > 1 && (
                  <button 
                    onClick={() => handleRemoveSplit(index)}
                    className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 text-red-400 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <span className="material-symbols-outlined text-sm">remove</span>
                  </button>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Monto</label>
                    <input 
                      type="number" 
                      value={split.amount}
                      onChange={(e) => handleSplitChange(index, 'amount', e.target.value)}
                      className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Categoría</label>
                    <select 
                      value={split.category_id}
                      onChange={(e) => handleSplitChange(index, 'category_id', e.target.value)}
                      className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold bg-transparent outline-none cursor-pointer"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Descripción (Palabra clave p. ej: LUZ)</label>
                  <input 
                    type="text" 
                    placeholder="Ej: ASSETPLAN LUZ"
                    value={split.custom_description}
                    onChange={(e) => handleSplitChange(index, 'custom_description', e.target.value)}
                    className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold outline-none"
                  />
                </div>
              </div>
            ))}
            
            <button 
              onClick={handleAddSplit}
              className="py-4 rounded-[2rem] bg-slate-50 border border-dashed border-slate-200 text-slate-400 font-bold hover:text-primary transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add</span>
              Añadir otra parte
            </button>
          </div>
        </div>

        <div className="p-8 pt-4 bg-slate-50/50 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Diferencia:</span>
            <span className={`text-lg font-black tracking-tight ${Math.abs(difference) < 0.01 ? 'text-emerald-500' : 'text-red-500'}`}>
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(difference)}
            </span>
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 px-6 rounded-2xl font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest text-[10px]"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              className="flex-[2] py-4 px-6 rounded-2xl bg-primary text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-[11px]"
            >
              Confirmar División
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
