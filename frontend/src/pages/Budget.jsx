import React, { useState, useEffect } from 'react';
import apiClient from '../api/axios';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import ItemHistoryModal from '../components/ItemHistoryModal';

const PALETTES = [
  { color: 'bg-blue-100/50', textColor: 'text-blue-700' },
  { color: 'bg-orange-100/50', textColor: 'text-orange-700' },
  { color: 'bg-emerald-100/50', textColor: 'text-emerald-700' },
  { color: 'bg-purple-100/50', textColor: 'text-purple-700' },
  { color: 'bg-pink-100/50', textColor: 'text-pink-700' },
  { color: 'bg-cyan-100/50', textColor: 'text-cyan-700' },
  { color: 'bg-amber-100/50', textColor: 'text-amber-700' },
];

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Budget() {
  const [budgetData, setBudgetData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Convertir a formato YYYY-MM para la API
  const monthStr = `${currentMonth.getFullYear()}-${(currentMonth.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const [realCategories, setRealCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [commentingItem, setCommentingItem] = useState(null); // { group, item }
  const [tempComment, setTempComment] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentMonth.getFullYear());
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  const [formData, setFormData] = useState({
    id: null, concept: '', groupId: '', selectedCategoryIds: [], keyword: '', estimated: 0, real_manual: 0, status: 'Pendiente', notes: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [budgetRes, catsRes] = await Promise.all([
        apiClient.get(`/budget?month=${monthStr}`),
        apiClient.get('/categories')
      ]);
      setBudgetData(budgetRes.data);
      setRealCategories(catsRes.data);
    } catch (error) {
      console.error('Error loading budget:', error);
      toast.error('Error al cargar el presupuesto');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthStr]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [monthStr]);

  const openAddModal = (groupId = '') => {
    setEditingItem(null);
    setFormData({
      id: null, concept: '', groupId: groupId || (budgetData[0]?.id || ''),
      selectedCategoryIds: [], keyword: '', estimated: 0, real_manual: 0, status: 'Pendiente', notes: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (group, item) => {
    setEditingItem({ groupId: group.id, item });
    setFormData({
      id: item.id, 
      concept: item.concept, 
      groupId: group.id,
      selectedCategoryIds: item.categories?.map(c => c.id) || [], 
      keyword: item.keyword || '',
      estimated: item.estimated, 
      real_manual: item.real_manual || 0, 
      status: item.status,
      notes: item.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const randomPalette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
    try {
      const res = await apiClient.post('/budget/groups', {
        name: newGroupName.trim(),
        ...randomPalette,
        order: budgetData.length
      });
      fetchData();
      setFormData({ ...formData, groupId: res.data.id });
      setNewGroupName('');
      setIsGroupModalOpen(false);
      toast.success('Grupo creado');
    } catch (error) {
      toast.error('Error al crear grupo');
    }
  };

  const importPreviousMonth = async () => {
    const prevDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevStr = `${prevDate.getFullYear()}-${(prevDate.getMonth() + 1).toString().padStart(2, '0')}`;

    try {
      await apiClient.post('/budget/import', {
        currentMonth: monthStr,
        previousMonth: prevStr
      });
      fetchData();
      toast.success('Estructura importada correctamente');
    } catch (error) {
      toast.error('Error al importar mes anterior');
    }
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/budget/items', {
        id: formData.id,
        concept: formData.concept,
        budget_group_id: formData.groupId,
        estimated: formData.estimated,
        real_manual: formData.real_manual,
        status: formData.status,
        month: monthStr,
        keyword: formData.keyword,
        category_ids: formData.selectedCategoryIds,
        notes: formData.notes
      });
      fetchData();
      setIsModalOpen(false);
      toast.success('Guardado');
    } catch (error) {
      toast.error('Error al guardar item');
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem) return;
    if (window.confirm(`¿Eliminar "${formData.concept}"?`)) {
      try {
        await apiClient.delete(`/budget/items/${formData.id}`);
        fetchData();
        setIsModalOpen(false);
        toast.success('Eliminado');
      } catch (error) {
        toast.error('Error al eliminar');
      }
    }
  };

  const moveGroup = async (idx, dir) => {
    const newData = [...budgetData];
    const target = idx + dir;
    if (target < 0 || target >= newData.length) return;
    
    // Intercambiar orden en frontend
    const currentGroup = newData[idx];
    const targetGroup = newData[target];
    
    try {
      await Promise.all([
        apiClient.post('/budget/groups', { id: currentGroup.id, order: target }),
        apiClient.post('/budget/groups', { id: targetGroup.id, order: idx })
      ]);
      fetchData();
    } catch (error) {
      toast.error('Error al reordenar');
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

  const totals = (budgetData || []).reduce((acc, g) => {
    (g.items || []).forEach(i => { 
      acc.est += parseFloat(i.estimated || 0); 
      acc.real += parseFloat(i.real || 0); 
    });
    return acc;
  }, { est: 0, real: 0 });

  const monthLabel = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' }).format(currentMonth);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Presupuesto Mensual</h1>
          <div className="flex items-center gap-3 mt-1 bg-slate-100/50 p-1.5 rounded-full w-fit relative">
            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))} className="hover:bg-white p-1 rounded-full text-slate-400 transition-colors"><span className="material-symbols-outlined text-sm">arrow_back_ios</span></button>
            <div className="relative">
              <button 
                onClick={() => {
                  setIsMonthPickerOpen(!isMonthPickerOpen);
                  setPickerYear(currentMonth.getFullYear());
                }}
                className="text-[13px] font-black uppercase tracking-widest text-primary px-3 py-1 hover:bg-white rounded-full transition-all flex items-center gap-1.5 group"
              >
                {monthLabel}
                <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isMonthPickerOpen ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {isMonthPickerOpen && (
                <>
                  <div className="fixed inset-0 z-[90]" onClick={() => setIsMonthPickerOpen(false)}></div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-[#F0F2F5] rounded-[2.5rem] p-6 shadow-2xl z-[100] border border-white animate-in fade-in zoom-in duration-200">
                    <div className="flex justify-between items-center mb-6 px-2">
                      <button onClick={() => setPickerYear(v => v - 1)} className="neu-button p-2.5 rounded-xl text-slate-400"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                      <span className="text-sm font-black text-slate-700 tracking-[0.2em]">{pickerYear}</span>
                      <button onClick={() => setPickerYear(v => v + 1)} className="neu-button p-2.5 rounded-xl text-slate-400"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {MONTHS_SHORT.map((m, i) => {
                        const isSelected = currentMonth.getMonth() === i && currentMonth.getFullYear() === pickerYear;
                        const isToday = new Date().getMonth() === i && new Date().getFullYear() === pickerYear;
                        
                        return (
                          <button
                            key={m}
                            onClick={() => {
                              setCurrentMonth(new Date(pickerYear, i, 1));
                              setIsMonthPickerOpen(false);
                            }}
                            className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              isSelected 
                                ? 'neu-inset-panel text-primary shadow-inner bg-white/50' 
                                : 'neu-button text-slate-500 hover:text-primary active:scale-95'
                            } relative`}
                          >
                            {m}
                            {isToday && (
                              <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))} className="hover:bg-white p-1 rounded-full text-slate-400 transition-colors"><span className="material-symbols-outlined text-sm">arrow_forward_ios</span></button>
          </div>
        </div>
        <button onClick={() => openAddModal()} className="neu-button px-6 py-3 rounded-2xl bg-primary text-white font-black flex items-center gap-2 shadow-lg shadow-primary/30 border-none transition-transform hover:scale-105"><span className="material-symbols-outlined font-bold">add_task</span> Añadir Concepto</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[ { label: 'Estimado', val: totals.est, color: 'blue' }, { label: 'Real', val: totals.real, color: 'emerald' }, { label: 'Diferencia', val: totals.real - totals.est, color: totals.real > totals.est ? 'red' : 'primary' } ].map((card, i) => (
          <div key={i} className="neu-card rounded-3xl p-6 overflow-hidden">
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-3/4 mt-1" />
            ) : (
              <h3 className={`text-2xl font-black tracking-tight ${card.label === 'Diferencia' && totals.real > totals.est ? 'text-red-500' : 'text-slate-800'}`}>{formatCurrency(card.val)}</h3>
            )}
          </div>
        ))}
      </div>

      {budgetData.some(g => g.items.length > 0) ? (
        <div className="neu-inset-panel rounded-3xl border border-white bg-white/30">
          <div className="max-h-[70vh] overflow-y-auto overflow-x-auto sm:overflow-x-hidden rounded-3xl custom-scrollbar" style={{ scrollbarGutter: 'stable' }}>
            <table className="w-full text-left">
              <thead className="sticky top-0 z-30 bg-[#F8FAFC] shadow-sm">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60">
                  <th className="px-6 py-4 w-1/3 bg-[#F8FAFC]">Concepto</th>
                  <th className="px-6 py-4 text-center bg-[#F8FAFC]">Categorías</th>
                  <th className="px-6 py-4 text-right border-x border-slate-200/50 bg-[#F8FAFC]">Estimado</th>
                  <th className="px-6 py-4 text-right bg-[#F8FAFC]">Real</th>
                  <th className="px-6 py-4 text-center bg-[#F8FAFC]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td className="px-10 py-5"><Skeleton className="h-5 w-40" /></td>
                      <td className="px-6 py-5"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-5"><Skeleton className="h-5 w-20 ml-auto" /></td>
                      <td className="px-6 py-5"><Skeleton className="h-5 w-20 ml-auto" /></td>
                      <td className="px-6 py-5"><Skeleton className="h-8 w-20 mx-auto rounded-full" /></td>
                    </tr>
                  ))
                ) : (
                  budgetData.map((group, idx) => group.items.length > 0 && (
                  <React.Fragment key={group.id}>
                    <tr className="bg-slate-100/80 border-b-2 border-slate-200 sticky top-[47px] z-20 backdrop-blur-sm shadow-sm">
                      <td colSpan="4" className="px-6 py-2">
                        <span className={`${group.color} ${group.textColor} px-2 py-1 rounded-lg text-[11px] font-bold uppercase tracking-tighter`}>{group.name}</span>
                      </td>
                      <td className="px-6 py-2">
                         <div className="flex items-center justify-center gap-2">
                            <button onClick={() => moveGroup(idx, -1)} className="text-slate-300 hover:text-primary"><span className="material-symbols-outlined text-xl">expand_less</span></button>
                            <button onClick={() => moveGroup(idx, 1)} className="text-slate-300 hover:text-primary"><span className="material-symbols-outlined text-xl">expand_more</span></button>
                            <button onClick={() => openAddModal(group.id)} className="text-slate-300 hover:text-primary ml-1"><span className="material-symbols-outlined text-xl">add_circle</span></button>
                         </div>
                      </td>
                    </tr>
                    {group.items.map((item, iIndex) => (
                      <tr key={item.id} onClick={() => openEditModal(group, item)} className={`hover:bg-white/80 cursor-pointer transition-colors group ${iIndex % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/40'}`}>
                        <td className="px-10 py-4 font-bold text-slate-700 text-sm">
                          {item.concept}
                          {item.keyword && <span className="block text-[9px] text-primary font-medium italic mt-0.5">Filtro: "{item.keyword}"</span>}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {item.categories?.map((c, i) => <span key={i} className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px] font-bold uppercase">{c.name}</span>)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-400 border-x border-slate-100/30">{formatCurrency(item.estimated)}</td>
                        <td className={`px-6 py-4 text-right text-sm font-black ${item.real > item.estimated ? 'text-red-500' : 'text-slate-800'}`}>{formatCurrency(item.real)}</td>
                        <td className="px-6 py-4 min-w-[150px]">
                          <div className="flex items-center justify-center gap-2 relative group-actions">
                            {/* Botón de Estado Principal */}
                            <button 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                try {
                                  const newStatus = item.status === 'Pagado' ? 'Pendiente' : 'Pagado';
                                  await apiClient.post('/budget/items', { 
                                    id: item.id,
                                    concept: item.concept,
                                    budget_group_id: group.id,
                                    estimated: item.estimated,
                                    real_manual: item.real_manual,
                                    status: newStatus,
                                    month: item.month,
                                    keyword: item.keyword,
                                    category_ids: item.categories?.map(c => c.id) || [],
                                    notes: item.notes
                                  });
                                  fetchData();
                                  toast.success(`Marcado como ${newStatus}`);
                                } catch (err) { 
                                  toast.error('Error al actualizar estado'); 
                                }
                              }} 
                              className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 shrink-0 ${
                                item.status === 'Pagado' 
                                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-200' 
                                  : 'bg-white text-slate-400 border-slate-200 hover:border-primary hover:text-primary shadow-sm'
                              }`}
                            >
                              {item.status === 'Pagado' && (
                                <span className="material-symbols-outlined text-[14px]">
                                  {item.isAutoPaid ? 'auto_awesome' : 'check_circle'}
                                </span>
                              )}
                              {item.status}
                            </button>

                            {/* Iconos de Acción Secundarios */}
                            <div className="flex items-center gap-0.5 ml-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryItem({ concept: item.concept, groupId: group.id });
                                  setIsHistoryModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl text-slate-300 hover:text-primary hover:bg-slate-100 transition-all"
                                title="Ver evolución"
                              >
                                <span className="material-symbols-outlined text-lg">monitoring</span>
                              </button>
                              
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCommentingItem({ group, item });
                                    setTempComment(item.notes || '');
                                    setIsEditingNote(!item.notes);
                                  }}
                                  className={`p-1.5 rounded-xl transition-all relative ${
                                    item.notes 
                                      ? 'text-primary-dark bg-primary/10 shadow-inner border border-primary/20' 
                                      : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                  }`}
                                  title={item.notes ? 'Ver comentario' : 'Añadir comentario'}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {item.notes ? 'chat' : 'add_comment'}
                                  </span>
                                  {item.notes && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-white shadow-sm"></span>
                                  )}
                                </button>

                                {/* Tooltip / Notas flotantes */}
                                {commentingItem?.item.id === item.id && (
                                  <div 
                                    className={`absolute right-0 w-72 bg-[#F0F2F5] rounded-3xl p-5 shadow-2xl z-[50] border border-white animate-in fade-in duration-200 ${
                                      idx >= budgetData.filter(g => g.items.length > 0).length - 1
                                        ? 'bottom-full mb-2 slide-in-from-bottom-2' 
                                        : 'top-full mt-2 slide-in-from-top-2'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex justify-between items-center mb-3">
                                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Comentario / Guía</label>
                                      {!isEditingNote && item.notes && (
                                        <button 
                                          onClick={() => setIsEditingNote(true)}
                                          className="text-primary-dark hover:text-primary p-1 transition-colors"
                                          title="Editar nota"
                                        >
                                          <span className="material-symbols-outlined text-sm">edit</span>
                                        </button>
                                      )}
                                    </div>

                                    {isEditingNote || !item.notes ? (
                                      <>
                                        <textarea
                                          autoFocus
                                          value={tempComment}
                                          onChange={(e) => setTempComment(e.target.value)}
                                          placeholder="Escribe una nota aquí..."
                                          className="neu-input w-full h-24 p-4 rounded-2xl text-slate-700 text-xs font-bold outline-none resize-none bg-transparent"
                                        />
                                        <div className="flex justify-end gap-2 mt-3">
                                          <button 
                                            onClick={() => {
                                              if (!item.notes) {
                                                setCommentingItem(null);
                                              } else {
                                                setIsEditingNote(false);
                                                setTempComment(item.notes || '');
                                              }
                                            }}
                                            className="neu-button p-2.5 rounded-xl text-red-500 hover:bg-red-50"
                                          >
                                            <span className="material-symbols-outlined text-lg">close</span>
                                          </button>
                                          <button 
                                            onClick={async () => {
                                              try {
                                                await apiClient.post('/budget/items', { 
                                                  id: item.id,
                                                  concept: item.concept,
                                                  budget_group_id: group.id,
                                                  estimated: item.estimated,
                                                  real_manual: item.real_manual,
                                                  status: item.status,
                                                  month: item.month,
                                                  keyword: item.keyword,
                                                  category_ids: item.categories?.map(c => c.id) || [],
                                                  notes: tempComment 
                                                });
                                                fetchData();
                                                setCommentingItem(null);
                                                setIsEditingNote(false);
                                                toast.success('Comentario guardado');
                                              } catch (err) {
                                                toast.error('Error al guardar comentario');
                                              }
                                            }}
                                            className="neu-button p-2.5 rounded-xl text-emerald-600 hover:bg-emerald-50"
                                          >
                                            <span className="material-symbols-outlined text-lg">check</span>
                                          </button>
                                        </div>
                                      </>
                                    ) : (
                                      <div className="bg-white/40 p-4 rounded-2xl border border-white/60 min-h-[60px]">
                                        <p className="text-slate-600 text-[13px] font-medium leading-relaxed whitespace-pre-wrap italic">
                                          "{item.notes}"
                                        </p>
                                        <div className="flex justify-end mt-4">
                                          <button 
                                              onClick={() => setCommentingItem(null)}
                                              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                                          >
                                            Cerrar
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                )))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="neu-card rounded-[2.5rem] p-12 text-center animate-in zoom-in duration-300 flex flex-col items-center gap-6">
           <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
             <span className="material-symbols-outlined text-4xl text-slate-400">calendar_today</span>
           </div>
           <div>
             <h2 className="text-xl font-black text-slate-800 mb-2">No hay un presupuesto para {new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(currentMonth)}</h2>
             <p className="text-slate-500 max-w-sm mx-auto">Puedes crear tu estructura desde cero o usar el botón de abajo para importar todo lo del mes anterior.</p>
           </div>
           <button onClick={importPreviousMonth} className="px-8 py-4 bg-white/80 rounded-2xl font-black text-primary-dark shadow-xl hover:scale-105 transition-all flex items-center gap-3">
             <span className="material-symbols-outlined">content_copy</span>
             Importar del mes anterior
           </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#F0F2F5] w-full max-w-lg rounded-[2.5rem] p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl border border-white">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"><span className="material-symbols-outlined font-black text-2xl">close</span></button>
            <h2 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-primary">{editingItem ? 'edit_document' : 'add_circle'}</span>{editingItem ? 'Editar Concepto' : 'Nuevo Concepto'}</h2>
            <form onSubmit={handleSaveItem} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5"><label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Nombre</label><input required value={formData.concept} onChange={e => setFormData({...formData, concept: e.target.value})} className="neu-input w-full px-5 py-3.5 rounded-2xl text-slate-700 font-bold outline-none" /></div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Grupo</label>
                <div className="flex gap-2">
                  <select value={formData.groupId} onChange={e => setFormData({...formData, groupId: e.target.value})} className="neu-input flex-1 px-5 py-3.5 rounded-2xl text-slate-700 font-bold outline-none appearance-none cursor-pointer bg-transparent">{budgetData.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                  <button type="button" onClick={() => setIsGroupModalOpen(true)} className="neu-button w-14 h-14 rounded-2xl flex items-center justify-center text-primary-dark hover:scale-105 transition-transform shrink-0"><span className="material-symbols-outlined">library_add</span></button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5"><label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Vincular Categorías</label><div className="bg-white/50 p-4 rounded-2xl border border-slate-200/50 flex flex-wrap gap-2 max-h-32 overflow-y-auto">{realCategories.map(cat => ( <button key={cat.id} type="button" onClick={() => { const s = formData.selectedCategoryIds; setFormData({...formData, selectedCategoryIds: s.includes(cat.id) ? s.filter(id => id !== cat.id) : [...s, cat.id]}); }} className={`px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all ${formData.selectedCategoryIds.includes(cat.id) ? 'bg-primary text-slate-900 border border-primary-dark/20' : 'bg-white text-slate-400 border border-transparent'}`}>{cat.name}</button> ))}</div></div>
              {formData.selectedCategoryIds.length > 0 ? (
                <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300"><label className="text-[10px] uppercase font-black tracking-widest font-black text-primary ml-1">Filtro por palabra clave (Opcional)</label><input value={formData.keyword} onChange={e => setFormData({...formData, keyword: e.target.value.toUpperCase()})} placeholder="Ej: DEPTO, LUZ..." className="neu-input w-full px-5 py-3.5 rounded-2xl text-primary-dark font-black outline-none border-2 border-primary/20" /><p className="text-[9px] text-slate-400 italic ml-1">Solo suma movimientos que contengan este texto.</p></div>
              ) : (
                <div className="flex flex-col gap-1.5 animate-in slide-in-from-top-2 duration-300"><label className="text-[10px] uppercase font-black tracking-widest font-black text-emerald-600 ml-1">Monto Real (Manual)</label><input type="number" value={formData.real_manual} onChange={e => setFormData({...formData, real_manual: parseFloat(e.target.value) || 0})} className="neu-input w-full px-5 py-3.5 rounded-2xl text-emerald-700 font-black outline-none" /><p className="text-[9px] text-slate-400 italic ml-1">Para gastos que no están en el banco.</p></div>
              )}
              <div className="flex flex-col gap-1.5"><label className="text-[10px] uppercase font-black tracking-widest font-black text-slate-400 ml-1">Monto Estimado</label><input type="number" value={formData.estimated} onChange={e => setFormData({...formData, estimated: parseFloat(e.target.value) || 0})} className="neu-input w-full px-5 py-3.5 rounded-2xl text-slate-800 font-black outline-none" /></div>
             <div className="flex flex-col gap-1.5"><label className="text-[10px] uppercase font-black tracking-widest font-black text-slate-400 ml-1">Notas / Comentario</label><textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Ej: Este mes salió más caro por..." className="neu-input w-full h-24 px-5 py-3.5 rounded-2xl text-slate-700 font-bold outline-none resize-none bg-transparent" /></div>
              <div className="flex gap-4 mt-4">
                {editingItem && <button type="button" onClick={handleDeleteItem} className="neu-button w-14 h-14 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"><span className="material-symbols-outlined">delete</span></button>}
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-400">Cancelar</button>
                <button type="submit" className="flex-[2] bg-primary text-white px-6 py-4 rounded-2xl font-black shadow-lg shadow-primary/30 transition-all active:scale-95">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isGroupModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-slate-100">
             <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">Nuevo Grupo</h3>
             <div className="flex flex-col gap-1.5 mb-8">
               <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Nombre</label>
               <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ej: Inversiones..." className="neu-input w-full px-5 py-4 rounded-2xl text-slate-700 font-bold outline-none" />
               <p className="text-[10px] text-slate-400 mt-2 px-1">Se le asignará un color único aleatoriamente.</p>
             </div>
             <div className="flex gap-3">
               <button onClick={() => { setIsGroupModalOpen(false); setNewGroupName(''); }} className="flex-1 font-black text-slate-400 py-4">Cancelar</button>
               <button onClick={handleCreateGroup} className="flex-[2] bg-primary text-white py-4 rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Crear</button>
             </div>
          </div>
        </div>
      )}

      <ItemHistoryModal 
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryItem(null);
        }}
        concept={historyItem?.concept}
        budgetGroupId={historyItem?.groupId}
      />
    </div>
  );
}
