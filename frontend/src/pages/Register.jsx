import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/axios';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage('Por favor completa todos los campos.');
      return;
    }

    // Validaciones de contraseña segura
    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setErrorMessage('La contraseña debe contener al menos una letra mayúscula.');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setErrorMessage('La contraseña debe contener al menos una letra minúscula.');
      return;
    }
    if (!/\d/.test(password)) {
      setErrorMessage('La contraseña debe contener al menos un número.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      await login(response.data.token, response.data.user);
      toast.success(`¡Bienvenido a FinVue, ${response.data.user.name}!`);
      navigate('/');
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'Error al procesar el registro.';
      setErrorMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F0F2F5] flex flex-col items-center justify-center p-6 select-none overflow-y-auto">
      <div className="w-full max-w-md p-8 my-auto rounded-3xl neu-card flex flex-col items-center">
        {/* Logo de FinVue */}
        <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 shadow-inner">
          <span className="material-symbols-outlined text-primary-dark text-2xl font-black">account_balance_wallet</span>
        </div>

        <h2 className="text-2xl font-black text-slate-800 mb-1 tracking-tight">FinVue</h2>
        <p className="text-xs font-semibold text-slate-500 mb-6 uppercase tracking-widest">Crea una Nueva Cuenta</p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          {/* Input Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Nombre Completo</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">person</span>
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Juan Pérez"
                className="w-full h-11 pl-11 pr-4 rounded-xl text-slate-700 font-semibold neu-input focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Input Email */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="ejemplo@correo.com"
                className="w-full h-11 pl-11 pr-4 rounded-xl text-slate-700 font-semibold neu-input focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                required
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">lock</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Mayúscula, minúscula y número"
                className="w-full h-11 pl-11 pr-11 rounded-xl text-slate-700 font-semibold neu-input focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">
                  {showPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Input Confirm Password */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider pl-1">Confirmar Contraseña</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base">lock_reset</span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrorMessage('');
                }}
                placeholder="Repite la contraseña"
                className="w-full h-11 pl-11 pr-11 rounded-xl text-slate-700 font-semibold neu-input focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-base">
                  {showConfirmPassword ? 'visibility' : 'visibility_off'}
                </span>
              </button>
            </div>
          </div>

          {/* Indicadores de Contraseña en tiempo real */}
          <div className="grid grid-cols-2 gap-2 mt-1 p-3 rounded-2xl bg-white/40 border border-slate-200/50 text-[10px] font-bold text-slate-500 select-none">
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[13px] ${password.length >= 8 ? 'text-emerald-500 font-bold' : 'text-slate-300'}`}>
                {password.length >= 8 ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={password.length >= 8 ? 'text-emerald-600' : ''}>Mín. 8 caracteres</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[13px] ${/[A-Z]/.test(password) ? 'text-emerald-500 font-bold' : 'text-slate-300'}`}>
                {/[A-Z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={/[A-Z]/.test(password) ? 'text-emerald-600' : ''}>Una mayúscula</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[13px] ${/[a-z]/.test(password) ? 'text-emerald-500 font-bold' : 'text-slate-300'}`}>
                {/[a-z]/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={/[a-z]/.test(password) ? 'text-emerald-600' : ''}>Una minúscula</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[13px] ${/\d/.test(password) ? 'text-emerald-500 font-bold' : 'text-slate-300'}`}>
                {/\d/.test(password) ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={/\d/.test(password) ? 'text-emerald-600' : ''}>Un número</span>
            </div>
            <div className="col-span-2 flex items-center gap-1.5 pt-1 border-t border-slate-200/50">
              <span className={`material-symbols-outlined text-[13px] ${(password === confirmPassword && confirmPassword.length > 0) ? 'text-emerald-500 font-bold' : 'text-slate-300'}`}>
                {(password === confirmPassword && confirmPassword.length > 0) ? 'check_circle' : 'radio_button_unchecked'}
              </span>
              <span className={(password === confirmPassword && confirmPassword.length > 0) ? 'text-emerald-600' : ''}>Coinciden</span>
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
            className="w-full h-11 mt-3 rounded-xl bg-primary text-white font-black text-sm hover:bg-primary-dark active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                <span>Creando Cuenta...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">how_to_reg</span>
                <span>Registrarme</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs font-semibold text-slate-500">
          ¿Ya tienes una cuenta?{' '}
          <Link to="/login" className="text-primary font-black hover:underline">
            Inicia sesión aquí
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
