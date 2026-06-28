import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';

import CategoriesModal from '../components/CategoriesModal';
import CategoryListModal from '../components/CategoryListModal';
import TransactionModal from '../components/TransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import SplitTransactionModal from '../components/SplitTransactionModal';
import Skeleton from '../components/Skeleton';

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

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination State
  const [visibleCount, setVisibleCount] = useState(15);

  // Modal States
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [transactionToSplit, setTransactionToSplit] = useState(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryListModalOpen, setIsCategoryListModalOpen] = useState(false);
  const [categoryUpdateHash, setCategoryUpdateHash] = useState(0);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transRes, accsRes, catsRes] = await Promise.all([
        apiClient.get('/transactions').catch(() => ({ data: [] })),
        apiClient.get('/accounts').catch(() => ({ data: [] })),
        apiClient.get('/categories').catch(() => ({ data: [] }))
      ]);
      setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
      setAccounts(Array.isArray(accsRes.data) ? accsRes.data : []);
      setCategoriesList(Array.isArray(catsRes.data) ? catsRes.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Error cargando los movimientos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [categoryUpdateHash]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, []);

  // Filtrado reactivo en el cliente
  const filteredTransactions = useMemo(() => {
    let result = transactions.filter(t => !t.parent_id).filter(t => {
      // Búsqueda
      const desc = (t.custom_description || t.original_description || '').toLowerCase();
      const catName = (t.category?.name || '').toLowerCase();
      const matchesSearch = desc.includes(searchTerm.toLowerCase()) || catName.includes(searchTerm.toLowerCase());

      // Tipo
      const matchesType = filterType === 'all' || t.type === filterType;

      // Cuenta
      const matchesAccount = filterAccount === 'all' || (t.account_id && t.account_id.toString() === filterAccount);

      // Categoría
      const matchesCategory = filterCategory === 'all'
        || (filterCategory === 'none' && !t.category_id)
        || (t.category_id && t.category_id.toString() === filterCategory);

      // Rango de Fechas
      const matchesDates = (() => {
        if (!t.date) return !startDate && !endDate;
        const tDate = t.date.split('T')[0];
        return (!startDate || tDate >= startDate) && (!endDate || tDate <= endDate);
      })();

      return matchesSearch && matchesType && matchesAccount && matchesCategory && matchesDates;
    });

    // Ordenamiento
    return result.sort((a, b) => {
      const aDateStr = (a.date && typeof a.date === 'string') ? a.date.split('T')[0] : '1970-01-01';
      const bDateStr = (b.date && typeof b.date === 'string') ? b.date.split('T')[0] : '1970-01-01';

      const dateA = new Date(aDateStr + 'T00:00:00');
      const dateB = new Date(bDateStr + 'T00:00:00');

      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
        return 0;
      }

      if (dateA.getTime() === dateB.getTime()) {
        const createdA = new Date(a.createdAt || a.date).getTime();
        const createdB = new Date(b.createdAt || b.date).getTime();
        return createdB - createdA;
      }
      return dateB - dateA;
    });
  }, [transactions, searchTerm, filterType, filterAccount, filterCategory, startDate, endDate]);

  const visibleTransactions = filteredTransactions.slice(0, visibleCount);

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
  const totalBalanceStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(totalBalance);

  return (
    <div className="max-w-7xl mx-auto pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Historial de Transacciones
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">
            {filteredTransactions.length !== transactions.length
              ? `Viendo ${filteredTransactions.length} movimientos que coinciden con tus filtros.`
              : "Gestiona y revisa todos tus movimientos bancarios."}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCategoryListModalOpen(true)}
            className="neu-button p-2.5 rounded-xl cursor-pointer text-slate-500 hidden sm:flex"
            title="Gestionar Categorías"
          >
            <span className="material-symbols-outlined">category</span>
          </button>
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="bg-primary text-white font-black py-3.5 px-6 rounded-2xl shadow-lg shadow-primary/20 flex items-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined font-black">add_circle</span>
            <span>Nuevo Movimiento</span>
          </button>
        </div>
      </header>

      {/* Saldo Combinado */}
      <div className="neu-card rounded-2xl p-6 mb-10 flex items-center gap-6 border border-white/50 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-dark shrink-0">
          <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Saldo Total</p>
          {isLoading ? (
            <Skeleton className="h-9 w-48 mt-1" />
          ) : (
            <p className="text-3xl font-black text-slate-800 mt-1">{totalBalanceStr}</p>
          )}
        </div>
      </div>

      {/* Control de Búsqueda y Filtros */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input
              type="text"
              placeholder="Buscar por descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neu-input w-full pl-12 pr-4 py-4 rounded-2xl text-slate-700 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 border-none appearance-none"
            />
          </div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`neu-button px-6 py-4 rounded-2xl font-black flex items-center gap-2 transition-all ${showAdvanced ? 'bg-primary/20 text-primary-dark shadow-inner' : 'text-slate-500'}`}
          >
            <span className="material-symbols-outlined">{showAdvanced ? 'keyboard_double_arrow_up' : 'tune'}</span>
            <span>Búsqueda avanzada</span>
          </button>
        </div>

        {/* Panel Avanzado */}
        {showAdvanced && (
          <div className="neu-card p-6 rounded-[2rem] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-4 duration-300">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Tipo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold bg-white outline-none cursor-pointer">
                <option value="all">Todos</option>
                <option value="gasto">Gastos</option>
                <option value="ingreso">Ingresos</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Cuenta</label>
              <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold bg-white outline-none cursor-pointer">
                <option value="all">Todas</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id.toString()}>{acc.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Categoría</label>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold bg-white outline-none cursor-pointer">
                <option value="all">Todas</option>
                <option value="none">Sin categoría</option>
                {categoriesList.map(cat => <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Desde</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold bg-white outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Hasta</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-bold bg-white outline-none" />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm(''); setFilterType('all'); setFilterAccount('all');
                  setFilterCategory('all'); setStartDate(''); setEndDate('');
                }}
                className="neu-button w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Movimientos */}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <>
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </>
        ) : (
          visibleTransactions.map(t => (
            <div key={t.id} className="neu-card p-4 sm:p-5 rounded-[2rem] flex flex-col sm:flex-row sm:items-center justify-between hover:translate-y-[-4px] transition-all group gap-4 relative border border-white/50">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${t.category?.color ? t.category.color : 'bg-slate-100 text-slate-400'}`}>
                  {t.category?.icon && iconMap[t.category.icon] ? iconMap[t.category.icon] : <span className="material-symbols-outlined text-3xl">payments</span>}
                </div>
                <div className="cursor-pointer flex-1 min-w-0" onClick={() => { setTransactionToEdit(t); setIsEditTransactionModalOpen(true); }}>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-slate-800 text-lg truncate tracking-tight">
                      {t.custom_description || t.original_description}
                    </p>

                    {t.is_split && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-black uppercase tracking-widest rounded-lg border border-blue-100 shrink-0">Dividido</span>
                    )}
                  </div>
                  <div className="flex items-start flex-col sm:flex-row sm:items-center gap-3 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">sell</span>
                      {t.category?.name || 'General'}
                    </span>
                    <span className="hidden sm:block text-slate-200">•</span>
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">event</span>
                      {t.date && typeof t.date === 'string' ? new Date(t.date.split('T')[0] + 'T00:00:00').toLocaleDateString() : 'N/A'}
                    </span>
                    <span className="hidden sm:block text-slate-200">•</span>
                    <span className="truncate flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                      {t.account?.name || 'Cuenta General'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 sm:w-64 pl-20 sm:pl-0">
                <p className={`font-black text-xl whitespace-nowrap tracking-tight ${t.type === 'ingreso' ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {t.type === 'ingreso' ? '+' : '-'}{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(Math.abs(t.amount))}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setTransactionToSplit(t); setIsSplitModalOpen(true); }}
                    title="Dividir transacción"
                    className="neu-button w-10 h-10 rounded-xl flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-primary"
                  >
                    <span className="material-symbols-outlined text-[20px]">content_cut</span>
                  </button>
                  <button
                    onClick={() => { setTransactionToEdit(t); setIsEditTransactionModalOpen(true); }}
                    className="neu-button w-10 h-10 rounded-xl flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all text-slate-400 hover:text-primary-dark"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          )))}

        {/* Empty State */}
        {filteredTransactions.length === 0 && (
          <div className="text-center py-20 text-slate-400 neu-card rounded-[2.5rem] flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
              <span className="material-symbols-outlined text-5xl">manage_search</span>
            </div>
            <div>
              <p className="font-black text-xl text-slate-500 mb-1">Nada por aquí</p>
              <p className="text-sm font-medium">No encontramos movimientos con esos filtros.</p>
            </div>
          </div>
        )}

        {/* Show More Button */}
        {visibleCount < filteredTransactions.length && (
          <div className="flex flex-col items-center gap-4 mt-8">
            <button
              onClick={() => setVisibleCount(prev => prev + 15)}
              className="px-10 py-4 bg-white/60 hover:bg-white rounded-2xl font-black text-slate-500 hover:text-primary-dark shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white"
            >
              <span className="material-symbols-outlined">expand_more</span>
              Ver más movimientos
            </button>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Mostrando {visibleCount} de {filteredTransactions.length} resultados
            </p>
          </div>
        )}
      </div>

      <CategoryListModal
        isOpen={isCategoryListModalOpen}
        onClose={() => setIsCategoryListModalOpen(false)}
        onOpenNewCategory={() => setIsCategoryModalOpen(true)}
        updateHash={categoryUpdateHash}
      />

      <CategoriesModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={() => setCategoryUpdateHash(prev => prev + 1)}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        accounts={accounts}
        onSuccess={fetchData}
        onOpenNewCategory={() => setIsCategoryModalOpen(true)}
        categoryUpdateHash={categoryUpdateHash}
      />

      <EditTransactionModal
        isOpen={isEditTransactionModalOpen}
        onClose={() => setIsEditTransactionModalOpen(false)}
        transaction={transactionToEdit}
        accounts={accounts}
        onSuccess={fetchData}
        onOpenNewCategory={() => setIsCategoryModalOpen(true)}
        categoryUpdateHash={categoryUpdateHash}
      />

      <SplitTransactionModal
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        transaction={transactionToSplit}
        categories={categoriesList}
        onSplitSuccess={fetchData}
      />
    </div>
  );
}
