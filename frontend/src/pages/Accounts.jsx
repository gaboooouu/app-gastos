import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import AccountModal from '../components/AccountModal';
import EditAccountModal from '../components/EditAccountModal';
import Skeleton from '../components/Skeleton';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/accounts');
      setAccounts(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar las cuentas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, []);

  const handleDeleteAccount = async (id) => {
    if (!confirm('⚠ ¡ATENCIÓN! ¿Estás seguro de eliminar esta cuenta? Esta acción es irreversible y ELIMINARÁ PERMANENTEMENTE todas las transacciones asociadas a ella. ¿Deseas continuar?')) return;
    try {
      await apiClient.delete(`/accounts/${id}`);
      toast.success('Cuenta eliminada');
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar la cuenta');
    }
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance || 0), 0);
  const totalBalanceStr = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(totalBalance);

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Mis Cuentas</h1>
          <p className="text-slate-500 font-medium">Gestiona tus cuentas bancarias, billeteras o efectivo.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAccountModalOpen(true)}
            className="bg-primary text-slate-900 font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined font-bold">add</span>
            <span>Añadir Cuenta</span>
          </button>
        </div>
      </header>

      <div className="neu-card rounded-2xl p-6 mb-10 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary-dark shrink-0">
          <span className="material-symbols-outlined text-3xl">account_balance</span>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Saldo Combinado</p>
          {isLoading ? (
            <Skeleton className="h-9 w-48 mt-1" />
          ) : (
            <p className="text-3xl font-black text-slate-800 mt-1">{totalBalanceStr}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {isLoading ? (
          <>
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </>
        ) : (
          accounts.map(acc => (
          <div key={acc.id} className="neu-card p-6 rounded-2xl flex flex-col gap-4 border-t-4 border-primary relative">
            <div className="flex justify-between items-start relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 border border-slate-100">
                  <span className="material-symbols-outlined text-primary-dark">
                    account_balance_wallet
                  </span>
                </div>
                <div>
                  <p className="font-bold text-slate-700">{acc.name}</p>
                </div>
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
            
            <div className="pt-2 border-t border-slate-100/60 flex justify-between items-end">
              <div>
                 <p className="text-2xl font-black mt-1 text-slate-800">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(acc.balance || 0)}
                  </p>
              </div>
            </div>
          </div>
        )))}

        <button
          onClick={() => setIsAccountModalOpen(true)}
          className="neu-card p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-primary/30 hover:border-primary/60 transition-colors group cursor-pointer min-h-[160px]"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <span className="material-symbols-outlined text-primary-dark">add</span>
          </div>
          <span className="text-sm font-bold text-slate-500 group-hover:text-primary-dark transition-colors">
            Vincular o Añadir Cuenta
          </span>
        </button>
      </div>

      <AccountModal 
        isOpen={isAccountModalOpen} 
        onClose={() => setIsAccountModalOpen(false)} 
        onSuccess={fetchData}
      />
      
      <EditAccountModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        account={accountToEdit}
        onSuccess={fetchData}
      />
    </div>
  );
}
