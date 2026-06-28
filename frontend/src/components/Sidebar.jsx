import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navLinkClasses = ({ isActive }) =>
  `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
    isActive
      ? 'neu-inset-panel text-primary-dark font-bold'
      : 'text-slate-500 hover:text-primary-dark font-semibold'
  }`;

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const displayName = user?.name || 'Usuario';
  const displayEmail = user?.email || 'Plan Pro';

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 z-40 md:z-30 h-[100dvh] w-[280px] lg:w-72 flex-col border-r border-slate-200 bg-[#F0F2F5] p-6 shrink-0 transition-transform duration-300 ease-in-out flex ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-12 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-white font-bold">account_balance_wallet</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-800">FinVue</h2>
              <p className="text-xs text-primary-dark font-medium uppercase tracking-wider">Premium Finance</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-800 p-1">
             <span className="material-symbols-outlined font-bold">close</span>
          </button>
        </div>
        <nav className="flex flex-col gap-6 flex-1 overflow-y-auto hide-scrollbar">
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-3 mb-2">Menú Principal</p>
            <NavLink to="/" className={navLinkClasses} end onClick={onClose}>
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm">Dashboard</span>
            </NavLink>
            <NavLink to="/cuentas" className={navLinkClasses} onClick={onClose}>
              <span className="material-symbols-outlined">payments</span>
              <span className="text-sm">Cuentas</span>
            </NavLink>
            <button 
              type="button"
              onClick={() => {
                window.dispatchEvent(new Event('open-ai-chat'));
                onClose();
              }} 
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-slate-500 hover:text-primary-dark font-semibold text-left w-full cursor-pointer"
            >
              <span className="material-symbols-outlined">smart_toy</span>
              <span className="text-sm">Asistente IA</span>
            </button>
            <NavLink to="/reportes" className={navLinkClasses} onClick={onClose}>
              <span className="material-symbols-outlined">bar_chart</span>
              <span className="text-sm">Reportes</span>
            </NavLink>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-3 mb-2">Gestión</p>
            <NavLink to="/transacciones" className={navLinkClasses} onClick={onClose}>
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="text-sm">Transacciones</span>
            </NavLink>
            <NavLink to="/presupuesto" className={navLinkClasses} onClick={onClose}>
              <span className="material-symbols-outlined">calendar_today</span>
              <span className="text-sm">Presupuesto</span>
            </NavLink>
            <NavLink to="/ajustes" className={navLinkClasses} onClick={onClose}>
              <span className="material-symbols-outlined">settings</span>
              <span className="text-sm">Ajustes</span>
            </NavLink>
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navLinkClasses} onClick={onClose}>
                <span className="material-symbols-outlined">admin_panel_settings</span>
                <span className="text-sm">Administración</span>
              </NavLink>
            )}
            <NavLink to="/info" className={navLinkClasses} onClick={onClose}>
              <span className="material-symbols-outlined">help</span>
              <span className="text-sm">Información</span>
            </NavLink>
          </div>
        </nav>
        <div className="mt-auto pt-6 border-t border-slate-200">
          <div className="neu-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-primary overflow-hidden shrink-0">
              <img 
                alt="User Profile" 
                className="w-full h-full object-cover" 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random`} 
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate text-slate-800">{displayName}</p>
              <p className="text-xs text-slate-500 truncate">{displayEmail}</p>
            </div>
            <button 
              onClick={handleLogout} 
              className="text-slate-400 hover:text-red-500 transition-colors shrink-0 flex items-center justify-center p-1 rounded-lg hover:bg-slate-200/50"
              title="Cerrar Sesión"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

