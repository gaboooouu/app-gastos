import React from 'react';
import { NavLink } from 'react-router-dom';

const navLinkClasses = ({ isActive }) =>
  `flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all duration-300 ${
    isActive
      ? 'text-[#0ccd6d] scale-110 active-tab'
      : 'text-slate-500 hover:text-slate-600'
  }`;

export default function MobileNavbar() {
  return (
    <nav className="lg:hidden fixed bottom-6 left-6 right-6 h-16 bg-[#F0F2F5]/80 backdrop-blur-xl z-39 flex items-center justify-around px-2 rounded-2xl border border-white shadow-[20px_20px_60px_#d1d9e6,-20px_-20px_60px_#ffffff]">
      <NavLink to="/" className={navLinkClasses} end>
        <span className="material-symbols-outlined text-[24px]">dashboard</span>
        <span className="text-[10px] uppercase tracking-tighter">Inicio</span>
      </NavLink>
      <NavLink to="/cuentas" className={navLinkClasses}>
        <span className="material-symbols-outlined text-[24px]">payments</span>
        <span className="text-[10px] uppercase tracking-tighter">Cuentas</span>
      </NavLink>
      <NavLink to="/transacciones" className={navLinkClasses}>
        <span className="material-symbols-outlined text-[24px]">receipt_long</span>
        <span className="text-[10px] uppercase tracking-tighter">Movs</span>
      </NavLink>
      <NavLink to="/presupuesto" className={navLinkClasses}>
        <span className="material-symbols-outlined text-[24px]">calendar_today</span>
        <span className="text-[10px] uppercase tracking-tighter">Plan</span>
      </NavLink>
      <NavLink to="/ajustes" className={navLinkClasses}>
        <span className="material-symbols-outlined text-[24px]">settings</span>
        <span className="text-[10px] uppercase tracking-tighter">Ajustes</span>
      </NavLink>

      <style dangerouslySetInnerHTML={{ __html: `
        .active-tab {
          position: relative;
        }
        .active-tab::after {
          content: '';
          position: absolute;
          top: -4px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 3px;
          background: #13ec80;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(20, 184, 166, 0.4);
        }
      `}} />
    </nav>
  );
}

