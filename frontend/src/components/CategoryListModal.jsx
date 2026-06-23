import React, { useEffect, useState } from 'react';
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

import EditCategoryModal from './EditCategoryModal';

export default function CategoryListModal({ isOpen, onClose, onOpenNewCategory, updateHash }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States for deleting/editing
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState(null);

  const fetchCategories = () => {
    setLoading(true);
    apiClient.get('/categories')
      .then(res => setCategories(res.data))
      .catch(err => {
        console.error(err);
        toast.error('Error al cargar categorías');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen, updateHash]);

  const handleDeleteCategory = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría? Se desvinculará de los gastos que la usen.')) return;
    try {
      await apiClient.delete(`/categories/${id}`);
      toast.success('Categoría eliminada');
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar la categoría');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#F0F2F5] rounded-3xl p-8 relative max-h-[90vh] flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors z-10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="text-2xl font-black text-slate-800 mb-6 tracking-tight">Mis Categorías</h2>

        <div className="overflow-y-auto flex-1 pr-2 space-y-3 relative mb-6">
          {loading ? (
            <div className="flex justify-center p-10">
              <span className="material-symbols-outlined animate-spin text-slate-400 text-3xl">progress_activity</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-8 bg-white rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">category</span>
              <p className="text-sm font-bold text-slate-500">No tienes categorías aún.</p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm border border-slate-100/50 group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${cat.color}`}>
                    {iconMap[cat.icon] || <span className="material-symbols-outlined">category</span>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-400 font-medium">
                      {cat.budget_type === 'libre' ? 'Tipo: Libre (Ocio)' : 'Tipo: Necesario (Fijo)'}
                    </p>
                  </div>
                </div>
                  
                  {/* Dropdown Menu Toggle */}
                  <div className="relative">
                    <span 
                      className="material-symbols-outlined text-slate-300 cursor-pointer hover:text-slate-600 transition-colors p-1"
                      onClick={() => setActiveDropdown(activeDropdown === cat.id ? null : cat.id)}
                    >
                      more_vert
                    </span>

                    {/* Dropdown Box */}
                    {activeDropdown === cat.id && (
                      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 py-2 z-20 flex flex-col">
                        <button 
                          onClick={() => {
                            setCategoryToEdit(cat);
                            setIsEditModalOpen(true);
                            setActiveDropdown(null);
                          }}
                          className="text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-dark flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                          Editar
                        </button>
                        <button 
                          onClick={() => {
                            handleDeleteCategory(cat.id);
                            setActiveDropdown(null);
                          }}
                          className="text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 hover:text-red-700 flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={onOpenNewCategory}
          className="neu-button p-4 rounded-xl font-bold bg-primary text-slate-900 border-2 border-primary hover:border-primary-dark w-full flex items-center justify-center gap-2 mt-auto"
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
          Crear Nueva Categoría
        </button>
      </div>
      
      <EditCategoryModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        category={categoryToEdit}
        onSuccess={fetchCategories}
      />
    </div>
  );
}
