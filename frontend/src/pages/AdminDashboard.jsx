import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import Skeleton from '../components/Skeleton';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user: currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    activeUsersThisWeek: 0,
    totalSystemBalance: 0
  });
  const [users, setUsers] = useState([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const res = await apiClient.get('/admin/stats');
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      toast.error('Error al cargar métricas globales');
    } finally {
      setIsLoadingStats(false);
    }
  };

  const fetchUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await apiClient.get('/admin/users');
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      toast.error('Error al cargar listado de usuarios');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === currentUser.id) {
      toast.error('No puedes cambiar tu propio rol de administrador.');
      return;
    }

    const confirmMsg = `¿Estás seguro de cambiar el rol de "${targetUser.name}" a "${newRole === 'admin' ? 'Administrador' : 'Usuario Común'}"?`;
    if (!window.confirm(confirmMsg)) return;

    setUpdatingUserId(targetUser.id);
    try {
      await apiClient.put(`/admin/users/${targetUser.id}/role`, { role: newRole });
      toast.success('Rol actualizado con éxito');
      // Actualizar localmente
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole } : u));
      fetchStats(); // Las estadísticas de actividad podrían cambiar
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Error al actualizar el rol');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === currentUser.id) {
      toast.error('No puedes eliminar tu propia cuenta desde el panel.');
      return;
    }

    const confirm1 = `🚨 ¡ADVERTENCIA CRÍTICA! ¿Estás seguro de eliminar al usuario "${targetUser.name}" (${targetUser.email})?\n\nEsta acción borrará permanentemente su cuenta, TODAS sus cuentas bancarias, categorías y su historial de movimientos.`;
    if (!window.confirm(confirm1)) return;

    const confirm2 = `¿Confirmas 100% que quieres eliminar el usuario? Esta acción es COMPLETAMENTE IRREVERSIBLE.`;
    if (!window.confirm(confirm2)) return;

    setUpdatingUserId(targetUser.id);
    try {
      await apiClient.delete(`/admin/users/${targetUser.id}`);
      toast.success('Usuario eliminado permanentemente');
      setUsers(prev => prev.filter(u => u.id !== targetUser.id));
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Error al eliminar usuario');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filtrar usuarios
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(u => 
      (u.name || '').toLowerCase().includes(term) || 
      (u.email || '').toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
          <span className="material-symbols-outlined text-primary-dark font-black text-4xl">admin_panel_settings</span>
          Panel de Administración
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Gestiona los usuarios de la plataforma, monitorea métricas globales y administra los privilegios.
        </p>
      </header>

      {/* Tarjetas de Estadísticas Globales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Card 1: Usuarios Registrados */}
        <div className="neu-card p-6 rounded-3xl border-t-4 border-indigo-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Usuarios Totales</p>
          {isLoadingStats ? (
            <Skeleton className="h-9 w-24 mt-1" />
          ) : (
            <h3 className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.totalUsers}</h3>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">group</span>
            Cuentas registradas
          </p>
        </div>

        {/* Card 2: Activos Semanales */}
        <div className="neu-card p-6 rounded-3xl border-t-4 border-emerald-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Activos esta Semana</p>
          {isLoadingStats ? (
            <Skeleton className="h-9 w-24 mt-1" />
          ) : (
            <h3 className="text-3xl font-black text-emerald-600 tracking-tight mt-1">{stats.activeUsersThisWeek}</h3>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs text-emerald-500">bolt</span>
            Movimientos en los últimos 7 días
          </p>
        </div>

        {/* Card 3: Transacciones Totales */}
        <div className="neu-card p-6 rounded-3xl border-t-4 border-purple-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Transacciones Registradas</p>
          {isLoadingStats ? (
            <Skeleton className="h-9 w-24 mt-1" />
          ) : (
            <h3 className="text-3xl font-black text-slate-800 tracking-tight mt-1">{stats.totalTransactions}</h3>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">payments</span>
            En todo el sistema
          </p>
        </div>

        {/* Card 4: Saldo Combinado del Sistema */}
        <div className="neu-card p-6 rounded-3xl border-t-4 border-orange-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Saldo del Sistema</p>
          {isLoadingStats ? (
            <Skeleton className="h-9 w-36 mt-1" />
          ) : (
            <h3 className="text-2xl font-black text-slate-800 tracking-tight mt-1.5">{formatCurrency(stats.totalSystemBalance)}</h3>
          )}
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
            Fondos combinados manuales
          </p>
        </div>
      </div>

      {/* Buscador de Usuarios */}
      <div className="mb-6">
        <div className="relative w-full max-w-md">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Buscar usuario por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="neu-input w-full pl-12 pr-4 py-4 rounded-2xl text-slate-700 font-bold bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 border-none appearance-none"
          />
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="neu-inset-panel rounded-3xl border border-white bg-white/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200/60 bg-[#F8FAFC]">
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4 text-center">Registrado</th>
                <th className="px-6 py-4 text-center">Cuentas / Movimientos</th>
                <th className="px-6 py-4 text-center">Rol</th>
                <th className="px-6 py-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/50 bg-white/50">
              {isLoadingUsers ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-5"><Skeleton className="h-5 w-40" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-5 w-24 mx-auto" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-5 w-20 mx-auto" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-6 w-20 mx-auto rounded-lg" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-8 w-24 mx-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map(u => {
                  const isSelf = u.id === currentUser.id;
                  const isUpdating = updatingUserId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-white/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 text-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-500 uppercase select-none">
                            {u.name ? u.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{u.name}</p>
                            {isSelf && (
                              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Tú</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm font-medium">{u.email}</td>
                      <td className="px-6 py-4 text-center text-slate-400 text-[11px] font-bold">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 text-xs font-bold">
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2.5 py-1 bg-slate-100/80 rounded-lg text-slate-600" title="Cuentas bancarias creadas">
                            📁 {u.accountsCount}
                          </span>
                          <span className="px-2.5 py-1 bg-slate-100/80 rounded-lg text-slate-600" title="Transacciones creadas">
                            📝 {u.transactionsCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {isSelf ? (
                          <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                            Super Admin
                          </span>
                        ) : (
                          <select 
                            value={u.role} 
                            disabled={isUpdating}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none cursor-pointer focus:ring-1 focus:ring-primary"
                          >
                            <option value="user">Usuario</option>
                            <option value="admin">Administrador</option>
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isSelf ? (
                            <span className="text-slate-300 text-[10px] font-black uppercase tracking-widest italic select-none">
                              Protegido
                            </span>
                          ) : (
                            <button
                              disabled={isUpdating}
                              onClick={() => handleDeleteUser(u)}
                              className="neu-button px-3 py-2 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50/50 transition-colors flex items-center justify-center gap-1 font-bold disabled:opacity-50"
                              title="Eliminar usuario permanentemente"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                              <span className="text-xs hidden sm:inline">Eliminar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-20 text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                      <span className="material-symbols-outlined text-4xl text-slate-300">group_off</span>
                      <p className="font-bold text-sm">No se encontraron usuarios coincidentes.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
