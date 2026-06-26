import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import CategoriesModal from '../components/CategoriesModal';
import CategoryListModal from '../components/CategoryListModal';
import AccountModal from '../components/AccountModal';
import EditAccountModal from '../components/EditAccountModal';
import TransactionModal from '../components/TransactionModal';
import EditTransactionModal from '../components/EditTransactionModal';
import { FaHamburger, FaCar, FaGamepad, FaHome, FaDog, FaGift, FaHeartbeat, FaCoffee, FaShoppingBag, FaPlane, FaUtensils, FaTshirt, FaGasPump, FaGraduationCap, FaDumbbell, FaBaby, FaBus, FaTools, FaPhone, FaWifi } from 'react-icons/fa';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [balance, setBalance] = useState({ total: 0 });
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Presupuesto Semanal Libre
  const [weeklyFreeLimit, setWeeklyFreeLimit] = useState(() => {
    return parseInt(localStorage.getItem('weeklyFreeLimit') || '50000', 10);
  });
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [tempLimit, setTempLimit] = useState(weeklyFreeLimit);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryListModalOpen, setIsCategoryListModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState(null);

  // Hash to force transaction modal to re-fetch categories inside
  const [categoryUpdateHash, setCategoryUpdateHash] = useState(0);

  // States for deleting/editing accounts
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);

  // Variable transitoria para almacenar el nombre de la cuenta hasta que Fintoc termine
  const [pendingAccountName, setPendingAccountName] = useState('');

  const handleOpenFintoc = (accountName) => {
    if (!window.Fintoc) {
      toast.error('Fintoc no está disponible todavía.');
      return;
    }
    setPendingAccountName(accountName);

    const widget = window.Fintoc.create({
      publicKey: import.meta.env.VITE_FINTOC_PUBLIC_KEY || 'pk_test_J6gJwbfDh-aKRRzEvoo16Ehoef_zHhv--AREgVtukr8',
      holderType: 'individual',
      product: 'movements',
      webhookUrl: import.meta.env.VITE_FINTOC_WEBHOOK_URL || 'https://webhook.site/707ee6e8-276d-4b8a-9abc-efbfb1154481',
      onSuccess: async (link) => {
        try {
          await apiClient.post('/accounts', {
            // Pasamos la variable pendiente del modal hacia nuestra API
            name: accountName,
            type: 'fintoc',
            fintoc_link_id: link.id,
            balance: 0,
          });
          toast.success(`¡Cuenta bancaria Fintoc vinculada con éxito!`);
          fetchData();
        } catch (error) {
          console.error(error);
          toast.error('Error al guardar la cuenta vinculada.');
        } finally {
          setPendingAccountName('');
        }
      },
      onExit: () => {
        toast('Proceso cancelado', { icon: 'ℹ️' });
        setPendingAccountName('');
      }
    });
    widget.open();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Obtener balance
      let total = 0;
      try {
        const statsRes = await apiClient.get('/balance/total');
        if (statsRes.data && statsRes.data.totalBalance !== undefined) {
          total = Number(statsRes.data.totalBalance);
        }
      } catch (err) {
        console.error('Error fetching balance:', err);
      }
      setBalance({ total });

      // 2. Obtener cuentas
      try {
        const accsRes = await apiClient.get('/accounts');
        setAccounts(accsRes.data || []);
      } catch (err) {
        setAccounts([]);
      }

      // 3. Obtener transacciones
      try {
        const transRes = await apiClient.get('/transactions');
        setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
      } catch (err) {
        console.error('Transactions failed:', err);
        setTransactions([]);
      }

      // 4. Obtener configuraciones del servidor (Límite Semanal)
      try {
        const settingsRes = await apiClient.get('/settings');
        if (settingsRes.data && settingsRes.data.weekly_free_limit) {
          const serverLimit = parseInt(settingsRes.data.weekly_free_limit, 10);
          setWeeklyFreeLimit(serverLimit);
          setTempLimit(serverLimit);
          localStorage.setItem('weeklyFreeLimit', serverLimit);
        }
      } catch (err) {
        console.error('Settings fetch failed:', err);
      }
    } catch (error) {
      console.error(error);
      toast.error('Error general cargando los datos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    const hasTransactions = transactions.some(t => t.account_id === id);
    if (hasTransactions) {
      toast.error('No se puede eliminar la cuenta porque tiene movimientos asociados.');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar esta cuenta? Se perderán sus registros.')) return;
    try {
      await apiClient.delete(`/accounts/${id}`);
      toast.success('Cuenta eliminada');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar la cuenta');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Lógica de Presupuesto Semanal Libre
  const { spentThisWeek, percentage, progressColor } = useMemo(() => {
    const now = new Date();
    // Obtener el lunes de la semana actual
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const startOfWeek = new Date(now.setDate(diff));
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const spent = transactions.reduce((sum, t) => {
      // Filtrar por categoría 'libre' y de la semana actual
      if (t.category?.budget_type === 'libre') {
        let tDateStr = t.date.split('T')[0];
        let tDate = new Date(tDateStr + 'T00:00:00');

        // AJUSTE FINTOC: Restar 1 día si viene de cuenta automática
        if (t.source === 'fintoc') {
          tDate.setDate(tDate.getDate() - 1);
        }

        if (tDate >= startOfWeek && tDate <= endOfWeek) {
          const amountVal = Math.abs(parseFloat(t.amount));
          if (t.type === 'gasto') {
            sum += amountVal;
          } else if (t.type === 'ingreso') {
            sum -= amountVal;
          }
        }
      }
      return sum;
    }, 0);

    let progress = (spent / weeklyFreeLimit) * 100;
    if (progress > 100) progress = 100;

    let color = 'bg-[#14b8a6]'; // Verde/Teal inicial
    if (progress > 60) color = 'bg-[#f59e0b]'; // Naranja/Amarillo
    if (progress > 90) color = 'bg-[#ef4444]'; // Rojo

    return { spentThisWeek: spent, percentage: progress, progressColor: color };
  }, [transactions, weeklyFreeLimit]);

  const saveWeeklyLimit = async () => {
    try {
      await apiClient.post('/settings', { weekly_free_limit: tempLimit });
      setWeeklyFreeLimit(tempLimit);
      localStorage.setItem('weeklyFreeLimit', tempLimit);
      setIsEditingLimit(false);
      toast.success('Límite semanal actualizado');
    } catch (error) {
      console.error('Error saving limit to server:', error);
      toast.error('Error al guardar el límite en el servidor');
    }
  };

  const totalBalanceStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(balance.total);

  return (
    <div className="max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">¡Hola, {user?.name || ''}!</h1>
          <p className="text-slate-500 font-medium">Aquí está el resumen de tu patrimonio para hoy.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsCategoryListModalOpen(true)}
            className="neu-button p-2.5 rounded-xl cursor-pointer text-slate-500"
            title="Categorías"
          >
            <span className="material-symbols-outlined">category</span>
          </button>
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="bg-primary text-slate-900 font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined font-bold">add</span>
            <span>Agregar Movimiento</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-10">
        <section>
          <div className="neu-card rounded-2xl p-8 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-primary-dark/70 text-sm font-bold uppercase tracking-widest mb-1">Saldo Total</p>
                {isLoading ? (
                  <Skeleton className="h-12 w-48 mb-2" />
                ) : (
                  <h2 className="text-5xl font-black tracking-tighter text-slate-800">{totalBalanceStr}</h2>
                )}
              </div>
            </div>

            {/* Presupuesto Libre Semanal Bar */}
            <div className="mt-8 border-t border-slate-200/60 pt-6 z-10 relative">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-sm text-primary-dark">celebration</span>
                    Límite Semanal para Ocio
                  </h3>
                  <div className="text-2xl font-black text-slate-700">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(spentThisWeek)}
                    <span className="text-sm font-bold text-slate-400 ml-1">
                      / {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(weeklyFreeLimit)}
                    </span>
                  </div>
                </div>

                {isEditingLimit ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tempLimit}
                      onChange={(e) => setTempLimit(Number(e.target.value))}
                      className="neu-input w-28 px-3 py-2 rounded-lg text-sm font-bold text-slate-700"
                    />
                    <button onClick={saveWeeklyLimit} className="text-primary-dark hover:text-primary transition-colors p-1">
                      <span className="material-symbols-outlined text-xl">check_circle</span>
                    </button>
                    <button onClick={() => setIsEditingLimit(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                      <span className="material-symbols-outlined text-xl">cancel</span>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setIsEditingLimit(true)} className="text-xs font-bold text-primary-dark hover:underline flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">edit</span>
                    Editar Límite
                  </button>
                )}
              </div>

              {/* Progress Bar Container */}
              <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden shadow-inner flex relative">
                <div
                  className={`h-full ${progressColor} transition-all duration-700 rounded-full relative z-10 shadow-sm`}
                  style={{ width: `${percentage}%` }}
                ></div>
                {/* Marcadores Visuales opcionales en el bg */}
                <div className="absolute top-0 bottom-0 left-[60%] w-px bg-white/50 z-20"></div>
                <div className="absolute top-0 bottom-0 left-[90%] w-px bg-red-500/50 z-20"></div>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 px-1 text-right">
                {percentage >= 100 ? '¡Límite Excedido!' : `Quedan ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.max(0, weeklyFreeLimit - spentThisWeek))}`}
              </p>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Cuentas</h3>
            <Link to="/cuentas" className="text-primary-dark text-sm font-bold flex items-center gap-1 hover:underline">
              <span>Ver todo</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-8 md:overflow-visible md:snap-none md:pb-0 md:mx-0 md:px-0 hide-scrollbar">
            {isLoading ? (
              <>
                <Skeleton className="h-40 rounded-2xl" />
                <Skeleton className="h-40 rounded-2xl hidden md:block" />
                <Skeleton className="h-40 rounded-2xl hidden lg:block" />
              </>
            ) : (
              accounts.map(acc => (
                <div key={acc.id} className="snap-center shrink-0 w-[85vw] sm:w-[320px] md:w-auto neu-card p-6 rounded-2xl flex flex-col gap-4 border-t-4 border-primary relative">
                  <div className="flex justify-between items-start relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary-dark">
                          {acc.type === 'fintoc' ? 'account_balance' : 'account_balance_wallet'}
                        </span>
                      </div>
                      {acc.type === 'fintoc' && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-md">Automática</span>
                      )}
                    </div>

                    {/* Dropdown Menu Toggle */}
                    <div className="relative">
                      <span
                        className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-700 transition-colors p-1"
                        onClick={() => setActiveDropdown(activeDropdown === acc.id ? null : acc.id)}
                      >
                        more_vert
                      </span>

                      {/* Dropdown Box */}
                      {activeDropdown === acc.id && (
                        <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-lg shadow-slate-200/50 border border-slate-100 py-2 z-20 flex flex-col">
                          {acc.type === 'manual' && (
                            <button
                              onClick={() => {
                                setAccountToEdit(acc);
                                setIsEditModalOpen(true);
                                setActiveDropdown(null);
                              }}
                              className="text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-dark flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                              Editar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              handleDeleteAccount(acc.id);
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
                  <div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{acc.name}</p>
                    <p className="text-2xl font-black mt-1 text-slate-800">
                      {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(acc.balance || 0)}
                    </p>
                  </div>
                </div>
              )))}

            <button
              onClick={() => setIsAccountModalOpen(true)}
              className="snap-center shrink-0 w-[85vw] sm:w-[320px] md:w-auto min-h-[160px] neu-card p-6 rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors group cursor-pointer"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <span className="material-symbols-outlined text-primary-dark">add</span>
              </div>
              <span className="text-sm font-bold text-slate-500 group-hover:text-primary-dark transition-colors">
                Vincular o Añadir Cuenta
              </span>
            </button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-800">Movimientos Recientes</h3>
            <Link to="/transacciones" className="text-primary-dark text-sm font-bold flex items-center gap-1 hover:underline">
              <span>Ver todo</span>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
              </>
            ) : (
              [...transactions].sort((a, b) => {
                const dateA = new Date(a.date.split('T')[0] + 'T00:00:00');
                const dateB = new Date(b.date.split('T')[0] + 'T00:00:00');

                // Ajuste visual para el sort si es fintoc
                if (a.source === 'fintoc') dateA.setDate(dateA.getDate() - 1);
                if (b.source === 'fintoc') dateB.setDate(dateB.getDate() - 1);

                if (dateA.getDate() === dateB.getDate() && dateA.getMonth() === dateB.getMonth() && dateA.getFullYear() === dateB.getFullYear()) {
                  const createdA = new Date(a.createdAt || a.date).getTime();
                  const createdB = new Date(b.createdAt || b.date).getTime();
                  if (createdA === createdB) {
                    return b.id > a.id ? 1 : -1;
                  }
                  return createdB - createdA;
                }
                return dateB - dateA;
              }).slice(0, 6).map(t => (
                <div key={t.id} className="neu-card p-4 rounded-2xl flex items-center justify-between hover:translate-y-[-2px] transition-transform group">
                  <div className="flex items-center gap-4">
                    <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${t.category?.color ? t.category.color : 'bg-primary/10 text-primary-dark grow-0 shrink-0'}`}>
                      {t.category?.icon && iconMap[t.category.icon] ? iconMap[t.category.icon] : <span className="material-symbols-outlined">work</span>}
                    </div>
                    <div className="cursor-pointer" onClick={() => { setTransactionToEdit(t); setIsEditTransactionModalOpen(true); }}>
                      <p className="font-bold text-slate-800">{t.custom_description || t.original_description}</p>
                      <p className="text-xs text-slate-500 font-medium">
                        {t.category?.name || 'General'} • {(() => {
                          const d = new Date(t.date.split('T')[0] + 'T00:00:00');
                          if (t.source === 'fintoc') d.setDate(d.getDate() - 1);
                          return d.toLocaleDateString();
                        })()} • {t.account?.name || 'Cuenta General'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className={`font-black ${t.type === 'ingreso' ? 'text-primary-dark' : 'text-slate-800'}`}>
                      {t.type === 'ingreso' ? '+' : '-'}{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.abs(t.amount))}
                    </p>
                    <button
                      onClick={() => { setTransactionToEdit(t); setIsEditTransactionModalOpen(true); }}
                      className="neu-button p-2 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-slate-600 hover:text-primary-dark"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                  </div>
                </div>
              )))}

            {transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500 font-bold bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                Aún no hay movimientos registrados.
              </div>
            ) : null}
          </div>
        </section>
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

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onFintocLink={handleOpenFintoc}
        onSuccess={fetchData}
      />

      <EditAccountModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        account={accountToEdit}
        onSuccess={fetchData}
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
    </div>
  );
}
