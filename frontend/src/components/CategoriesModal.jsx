import React, { useState } from 'react';
import { FaHamburger, FaCar, FaGamepad, FaHome, FaDog, FaGift, FaHeartbeat, FaCoffee, FaShoppingBag, FaPlane, FaUtensils, FaTshirt, FaGasPump, FaGraduationCap, FaDumbbell, FaBaby, FaBus, FaTools, FaPhone, FaWifi } from 'react-icons/fa';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';

const ICONS = [
  { id: 'FaHamburger', component: <FaHamburger /> },
  { id: 'FaCar', component: <FaCar /> },
  { id: 'FaGamepad', component: <FaGamepad /> },
  { id: 'FaHome', component: <FaHome /> },
  { id: 'FaDog', component: <FaDog /> },
  { id: 'FaGift', component: <FaGift /> },
  { id: 'FaHeartbeat', component: <FaHeartbeat /> },
  { id: 'FaCoffee', component: <FaCoffee /> },
  { id: 'FaShoppingBag', component: <FaShoppingBag /> },
  { id: 'FaPlane', component: <FaPlane /> },
  { id: 'FaUtensils', component: <FaUtensils /> },
  { id: 'FaTshirt', component: <FaTshirt /> },
  { id: 'FaGasPump', component: <FaGasPump /> },
  { id: 'FaGraduationCap', component: <FaGraduationCap /> },
  { id: 'FaDumbbell', component: <FaDumbbell /> },
  { id: 'FaBaby', component: <FaBaby /> },
  { id: 'FaBus', component: <FaBus /> },
  { id: 'FaTools', component: <FaTools /> },
  { id: 'FaPhone', component: <FaPhone /> },
  { id: 'FaWifi', component: <FaWifi /> },
];

const COLORS = [
  { id: 'bg-red-200', text: 'text-red-700' },
  { id: 'bg-orange-200', text: 'text-orange-700' },
  { id: 'bg-yellow-200', text: 'text-yellow-700' },
  { id: 'bg-green-200', text: 'text-green-700' },
  { id: 'bg-teal-200', text: 'text-teal-700' },
  { id: 'bg-blue-200', text: 'text-blue-700' },
  { id: 'bg-indigo-200', text: 'text-indigo-700' },
  { id: 'bg-purple-200', text: 'text-purple-700' },
  { id: 'bg-pink-200', text: 'text-pink-700' },
  { id: 'bg-slate-200', text: 'text-slate-700' },
];

export default function CategoriesModal({ isOpen, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(ICONS[0].id);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [budgetType, setBudgetType] = useState('libre');
  const [showAllIcons, setShowAllIcons] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre de la categoría es requerido');
      return;
    }
    setLoading(true);
    try {
      await apiClient.post('/categories', {
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor.id,
        budget_type: budgetType,
      });
      toast.success('Categoría creada exitosamente');
      setName('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Error al crear categoría');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#F0F2F5] rounded-3xl p-8 relative">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Nueva Categoría</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="neu-input w-full p-[10px] rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="Ej. Almuerzos"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Tipo de Gasto (Presupuesto)</label>
            <div className="bg-slate-200/50 p-1.5 rounded-xl flex">
              <button
                type="button"
                onClick={() => setBudgetType('fijo')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                  budgetType === 'fijo' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">lock</span>
                Fijo (Necesario)
              </button>
              <button
                type="button"
                onClick={() => setBudgetType('libre')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                  budgetType === 'libre' 
                    ? 'bg-primary-dark text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-sm">celebration</span>
                Libre (Ocio)
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Seleccionar Ícono</label>
              <button 
                type="button" 
                onClick={() => setShowAllIcons(!showAllIcons)}
                className="text-xs font-bold text-primary-dark hover:underline flex items-center gap-1"
              >
                {showAllIcons ? 'Mostrar menos' : 'Mostrar más'}
                <span className="material-symbols-outlined text-[14px]">
                  {showAllIcons ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
            <div className={`grid grid-cols-5 gap-3 overflow-hidden transition-all duration-300 ${showAllIcons ? 'max-h-96' : 'max-h-[104px]'}`}>
              {ICONS.map((ico) => {
                const isSelected = selectedIcon === ico.id;
                return (
                  <button
                    key={ico.id}
                    type="button"
                    onClick={() => setSelectedIcon(ico.id)}
                    className={`h-12 w-full flex flex-shrink-0 items-center justify-center rounded-xl text-[22px] transition-all ${
                      isSelected 
                        ? `${selectedColor.id} ${selectedColor.text} shadow-md scale-105` 
                        : 'bg-white text-slate-400 hover:bg-slate-100 hover:text-slate-600 shadow-sm'
                    }`}
                  >
                    {ico.component}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-500 uppercase tracking-wide">Color de Fondo</label>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((col) => {
                const isSelected = selectedColor.id === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`w-10 h-10 rounded-full transition-all flex border-2 items-center justify-center ${col.id} ${
                      isSelected ? `border-slate-800 scale-110 shadow-md` : 'border-transparent opacity-80 hover:opacity-100'
                    }`}
                  >
                     {isSelected && <span className={`material-symbols-outlined text-sm font-bold ${col.text}`}>check</span>}
                  </button>
                );
              })}
            </div>
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
            {loading ? 'Guardando...' : 'Guardar Categoría'}
          </button>
        </form>
      </div>
    </div>
  );
}
