import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!email || !password) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      await login(response.data.token, response.data.user);
      toast.success(`¡Bienvenido de vuelta, ${response.data.user.name}!`);
      navigate('/');
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Credenciales incorrectas o error de servidor.';
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F0F2F5] flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
      <div className="w-full max-w-md p-8 rounded-3xl neu-card flex flex-col items-center">
        {/* Logo de FinVue */}
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
          <span className="material-symbols-outlined text-primary-dark text-3xl font-black">account_balance_wallet</span>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">FinVue</h2>
        <p className="text-xs font-semibold text-slate-500 mb-8 uppercase tracking-widest">Inicia Sesión en tu Panel</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
          {/* Input Email */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1">Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="ejemplo@correo.com"
                className="w-full h-12 pl-12 pr-4 rounded-xl text-slate-700 font-semibold neu-input focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider pl-1">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="••••••••"
                className="w-full h-12 pl-12 pr-12 rounded-xl text-slate-700 font-semibold neu-input focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Mensaje de Error en Rojo */}
          {errorMessage && (
            <div className="bg-red-50 text-red-500 border border-red-100 rounded-xl p-3 text-xs font-bold text-center animate-pulse">
              {errorMessage}
            </div>
          )}

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-4 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary-dark active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Iniciando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">login</span>
                <span>Ingresar</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-xs font-semibold text-slate-500">
          ¿No tienes una cuenta?{' '}
          <Link to="/register" className="text-primary font-black hover:underline">
            Regístrate aquí
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
