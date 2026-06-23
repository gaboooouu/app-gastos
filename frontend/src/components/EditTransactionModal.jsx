import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
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
  FaWifi: <FaWifi />,
};
import apiClient from '../api/axios';

export default function EditTransactionModal({ isOpen, onClose, transaction, accounts, onSuccess, onOpenNewCategory, categoryUpdateHash }) {
  const [type, setType] = useState('gasto');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [budgetMonth, setBudgetMonth] = useState('');
  const [useManualBudgetMonth, setUseManualBudgetMonth] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [dropdownDirection, setDropdownDirection] = useState('down');
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtrar solo las cuentas manuales (para el caso en que se pueda editar la cuenta)
  const manualAccounts = accounts.filter(acc => acc.type === 'manual');

  useEffect(() => {
    if (isOpen) {
      // Cargar categorías al abrir el modal (y cuando categoryUpdateHash cambie)
      apiClient.get('/categories')
        .then(res => setCategories(res.data))
        .catch(err => console.error('Error fetching categories:', err));
    }
  }, [isOpen, categoryUpdateHash]);

  useEffect(() => {
    if (isOpen && transaction) {
      setType(transaction.type || 'gasto');
      setAmount(transaction.amount ? Math.abs(transaction.amount) : '');
      setDate(transaction.date ? transaction.date.split('T')[0] : '');
      setDescription(transaction.custom_description || transaction.original_description || '');
      setAccountId(transaction.account_id ? transaction.account_id.toString() : '');
      setCategoryId(transaction.category_id ? transaction.category_id.toString() : '');
      setBudgetMonth(transaction.budget_month || '');
      setUseManualBudgetMonth(!!transaction.budget_month);
    }
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isFintoc = transaction.source === 'fintoc';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('La descripción es obligatoria.');
      return;
    }
    
    if (!isFintoc) {
      if (!accountId) {
        toast.error('Debes seleccionar una cuenta manual.');
        return;
      }
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Ingresa un monto válido mayor a 0.');
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        custom_description: description.trim(),
        category_id: categoryId ? parseInt(categoryId) : null,
        budget_month: budgetMonth || null,
      };

      payload.date = date; // Siempre permitir actualizar la fecha

      if (!isFintoc) {
        payload.account_id = parseInt(accountId);
        payload.amount = parseFloat(amount);
        payload.type = type;
      }

      await apiClient.put(`/transactions/${transaction.id}`, payload);
      
      toast.success('Movimiento actualizado con éxito');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar el movimiento.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento? Se ajustará el saldo de tu cuenta.')) return;
    
    setLoading(true);
    try {
      await apiClient.delete(`/transactions/${transaction.id}`);
      toast.success('Movimiento eliminado');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar el movimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[10px] bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#F0F2F5] rounded-3xl p-8 relative max-h-[95vh] overflow-y-auto custom-scrollbar">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Editar Movimiento {isFintoc && <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded ml-2 font-bold uppercase tracking-widest align-middle">Automático</span>}</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Tipo de Movimiento (Solo manual) */}
          {!isFintoc && (
            <div className="bg-slate-200/50 p-1.5 rounded-xl flex mb-2">
              <button
                type="button"
                onClick={() => setType('gasto')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  type === 'gasto' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Gasto (-)
              </button>
              <button
                type="button"
                onClick={() => setType('ingreso')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  type === 'ingreso' 
                    ? 'bg-primary-dark text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Ingreso (+)
              </button>
            </div>
          )}

          {/* Cuenta (Solo manual) */}
          {!isFintoc && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Cuenta (Solo Manuales)</label>
              <select 
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="neu-input w-full p-[10px] rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
              >
                {manualAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} - {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(acc.balance || 0)}</option>
                ))}
              </select>
            </div>
          )}

          {/* Monto (Solo manual) */}
          {!isFintoc && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Monto</label>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="neu-input w-full p-[10px] rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Ej. 15000"
              />
            </div>
          )}

          {/* Variables siempre editables (Descripción y Categoría) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Descripción</label>
            <input 
              type="text" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="neu-input w-full p-[10px] rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej. Supermercado, Cine, etc."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Categoría (Opcional)</label>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1" ref={dropdownRef}>
                  <button 
                    type="button"
                    onClick={() => {
                      if (!isCategoryDropdownOpen) {
                        const rect = dropdownRef.current.getBoundingClientRect();
                        // Si nos quedan menos de 250px hacia abajo, lo abrimos hacia arriba
                        if (window.innerHeight - rect.bottom < 250) {
                          setDropdownDirection('up');
                        } else {
                          setDropdownDirection('down');
                        }
                      }
                      setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                    }}
                    className="neu-input w-full p-[10px] rounded-xl text-left text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      {categoryId && categories.find(c => c.id.toString() === categoryId.toString()) ? (
                        <>
                          <div className={`w-6 h-6 rounded flex items-center justify-center text-xs ${categories.find(c => c.id.toString() === categoryId.toString()).color || 'bg-slate-200 text-slate-700'}`}>
                            {categories.find(c => c.id.toString() === categoryId.toString()).icon && iconMap[categories.find(c => c.id.toString() === categoryId.toString()).icon] 
                              ? iconMap[categories.find(c => c.id.toString() === categoryId.toString()).icon] 
                              : <span className="material-symbols-outlined text-[14px]">category</span>}
                          </div>
                          <span>{categories.find(c => c.id.toString() === categoryId.toString()).name}</span>
                        </>
                      ) : (
                        <span>-- Sin Categoría --</span>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-slate-400">expand_more</span>
                  </button>
                  
                  {isCategoryDropdownOpen && (
                    <div className={`absolute z-50 mt-2 bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-100 max-h-60 overflow-y-auto py-2 ${dropdownDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'}`} style={{ width: 'calc(100% + 3.5rem + 0.5rem)' }}>
                       <button
                         type="button"
                         className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors text-slate-700 font-medium"
                         onClick={() => { setCategoryId(''); setIsCategoryDropdownOpen(false); }}
                       >
                         -- Sin Categoría --
                       </button>
                       {categories.map(cat => (
                         <button
                           key={cat.id}
                           type="button"
                           className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex flex-row items-center justify-between border-t border-slate-50"
                           onClick={() => { setCategoryId(cat.id.toString()); setIsCategoryDropdownOpen(false); }}
                         >
                           <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm opacity-100 ${cat.color || 'bg-slate-200 text-slate-700'}`}>
                               {iconMap[cat.icon] || <span className="material-symbols-outlined text-sm">category</span>}
                             </div>
                             <span className="font-medium text-slate-700">{cat.name}</span>
                           </div>
                           <span className="text-[11px] font-bold tracking-wider text-slate-400/80">
                             {cat.budget_type === 'libre' ? 'Libre (Ocio)' : 'Necesario (Fijo)'}
                           </span>
                         </button>
                       ))}
                    </div>
                  )}
                </div>
              <button
                type="button"
                onClick={onOpenNewCategory}
                className="shrink-0 neu-button w-14 h-14 rounded-xl flex items-center justify-center bg-primary/20 text-primary-dark hover:bg-primary/40 transition-colors"
                title="Nueva Categoría"
              >
                <span className="material-symbols-outlined text-2xl font-bold">add</span>
              </button>
            </div>
          </div>

          {/* Fecha (Siempre editable) */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Fecha Movimiento</label>
            <input 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="neu-input w-full p-[10px] rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            />
          </div>

          {/* Mes de Presupuesto Toggle */}
          <div className="flex flex-col gap-3 mt-2 border-t border-slate-200/50 pt-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={useManualBudgetMonth} 
                  onChange={(e) => {
                    setUseManualBudgetMonth(e.target.checked);
                    if (!e.target.checked) setBudgetMonth('');
                  }} 
                />
                <div className={`w-10 h-5 rounded-full shadow-inner transition-colors ${useManualBudgetMonth ? 'bg-primary' : 'bg-slate-300'}`}></div>
                <div className={`absolute left-0.5 top-0.5 bg-white w-4 h-4 rounded-full shadow-md transition-transform ${useManualBudgetMonth ? 'translate-x-5' : 'translate-x-0'}`}></div>
              </div>
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest group-hover:text-primary transition-colors">¿Asignar a otro mes de presupuesto?</span>
            </label>

            {useManualBudgetMonth && (
              <div className="animate-in slide-in-from-top-2 duration-300 flex flex-col gap-2 bg-white/50 p-4 rounded-2xl border border-white">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Seleccionar Mes Objetivo</label>
                <select 
                  value={budgetMonth}
                  onChange={(e) => setBudgetMonth(e.target.value)}
                  className="neu-input w-full p-3 rounded-xl text-slate-700 font-bold focus:outline-none bg-transparent"
                >
                  <option value="">-- Seleccionar --</option>
                  {(() => {
                    const options = [];
                    const now = new Date();
                    for (let i = -3; i <= 3; i++) {
                      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                      const val = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                      const label = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(d);
                      options.push(<option key={val} value={val}>{label}</option>);
                    }
                    return options;
                  })()}
                </select>
                <p className="text-[9px] text-slate-400 italic font-medium">Esto hará que el gasto cuente para las metas de ahorro del mes elegido.</p>
              </div>
            )}
          </div>


          <div className="flex gap-4 mt-4">
            {!isFintoc && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="neu-button p-4 rounded-xl font-bold flex items-center justify-center gap-2 text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-100 transition-colors w-1/4 shrink-0"
                title="Eliminar Movimiento"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            )}
            <button 
              type="submit" 
              disabled={loading}
              className={`neu-button flex-1 p-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                 isFintoc || type === 'ingreso' ? 'bg-primary hover:bg-primary-dark text-slate-900 shadow-primary/20' : 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20 shadow-lg'
              }`}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined text-sm">
                  save
                </span>
              )}
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
