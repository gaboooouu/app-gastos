import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="w-full h-screen bg-[#F0F2F5] flex flex-col items-center justify-center select-none">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-t-primary rounded-full animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-500 tracking-wide animate-pulse">
          Verificando credenciales de administrador...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    // Redirigir al Dashboard principal si no es admin
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
