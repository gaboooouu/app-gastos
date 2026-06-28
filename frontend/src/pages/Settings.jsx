import React, { useState } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadingDate, setLoadingDate] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  // Estados para las nuevas configuraciones
  const [weeklyLimit, setWeeklyLimit] = useState('50000');
  const [notiEmail, setNotiEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [loadingDeleteAccount, setLoadingDeleteAccount] = useState(false);

  const { logout } = useAuth();

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient.get('/settings');
      if (res.data) {
        if (res.data.weekly_free_limit) {
          setWeeklyLimit(res.data.weekly_free_limit);
          localStorage.setItem('weeklyFreeLimit', res.data.weekly_free_limit);
        }
        if (res.data.notification_email) setNotiEmail(res.data.notification_email);
        if (res.data.email_notifications_enabled) setEmailEnabled(res.data.email_notifications_enabled === 'true');
        if (res.data.pin_lock_enabled) setPinEnabled(res.data.pin_lock_enabled === 'true');
        if (res.data.pin_lock_code) setPinCode(res.data.pin_lock_code);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();

    if (pinEnabled && (!pinCode || pinCode.length !== 4)) {
      toast.error('El código PIN debe tener exactamente 4 dígitos.');
      return;
    }

    setSavingSettings(true);
    try {
      await apiClient.post('/settings', {
        weekly_free_limit: weeklyLimit,
        notification_email: notiEmail,
        email_notifications_enabled: String(emailEnabled),
        pin_lock_enabled: String(pinEnabled),
        pin_lock_code: pinCode
      });
      localStorage.setItem('weeklyFreeLimit', weeklyLimit);
      localStorage.setItem('pin_lock_enabled', String(pinEnabled));
      localStorage.setItem('pin_lock_code', pinCode);
      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar la configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteByDate = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Selecciona el rango de fechas');
      return;
    }
    if (!confirm('¿Estás seguro de eliminar TODOS los movimientos en este rango de fechas? Se reajustarán los saldos de tus cuentas y NO se puede deshacer.')) return;

    setLoadingDate(true);
    try {
      const res = await apiClient.post('/settings/delete-by-date', { startDate, endDate });
      toast.success(res.data.message || 'Movimientos eliminados correctamente');
      setStartDate('');
      setEndDate('');
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Error al eliminar movimientos');
    } finally {
      setLoadingDate(false);
    }
  };

  const handleResetData = async () => {
    if (!confirm('¡ADVERTENCIA CRÍTICA! Esto eliminará permanentemente TODAS tus Cuentas, Categorías y Movimientos. ¿Confirmas que quieres empezar desde cero?')) return;

    if (!confirm('¿Estás 100% seguro? Esta acción no se puede deshacer.')) return;

    setLoadingReset(true);
    try {
      const res = await apiClient.delete('/settings/reset');
      toast.success(res.data.message || 'La aplicación ha sido reseteada.');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error(error);
      toast.error('Error al resetear los datos');
    } finally {
      setLoadingReset(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('¿Estás SEGURO de eliminar permanentemente tu cuenta en FinVue? Esto borrará tu perfil, cuentas bancarias y todas tus transacciones para siempre de nuestros servidores.')) return;
    if (!confirm('Esta decisión es IRREVERSIBLE. Perderás todo acceso a la app inmediatamente. ¿Deseas proceder?')) return;

    setLoadingDeleteAccount(true);
    try {
      await apiClient.delete('/auth/delete-account');
      toast.success('Tu cuenta ha sido eliminada con éxito.');
      logout();
      window.location.href = '/login';
    } catch (error) {
      console.error(error);
      toast.error('Error al intentar eliminar la cuenta.');
    } finally {
      setLoadingDeleteAccount(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 animate-fade-in">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Ajustes del Sistema</h1>
        <p className="text-slate-500 font-medium">Administra la base de datos y la salud de tu cuenta.</p>
      </header>

      {loadingSettings ? (
        <div className="neu-card p-10 rounded-3xl mb-10 flex justify-center items-center">
          <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
        </div>
      ) : (
        <form onSubmit={handleSaveSettings} className="flex flex-col gap-10">
          {/* NUEVA SECCIÓN: LÍMITES Y NOTIFICACIONES */}
          <section className="neu-card p-6 md:p-8 rounded-3xl border-t-4 border-primary">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary-dark font-bold text-2xl">mail</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Presupuesto y Notificaciones</h2>
                <p className="text-sm text-slate-500">Configura tus límites semanales y alertas por correo electrónico.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Límite Semanal Libre (CLP)</label>
                <input
                  type="number"
                  value={weeklyLimit}
                  onChange={(e) => setWeeklyLimit(e.target.value)}
                  className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Ej. 50000"
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Emails para Alertas</label>
                <input
                  type="text"
                  value={notiEmail}
                  onChange={(e) => setNotiEmail(e.target.value)}
                  className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="ejemplo1@mail.com, ejemplo2@mail.com"
                />
              </div>

              <div className="col-span-1 md:col-span-2 flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-white">
                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out shrink-0">
                  <input
                    type="checkbox"
                    id="email-toggle"
                    checked={emailEnabled}
                    onChange={(e) => setEmailEnabled(e.target.checked)}
                    className="opacity-0 w-0 h-0"
                  />
                  <label
                    htmlFor="email-toggle"
                    className={`absolute cursor-pointer inset-0 rounded-full transition-colors duration-200 ${emailEnabled ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${emailEnabled ? 'translate-x-6' : 'translate-x-0'}`}></span>
                  </label>
                </div>
                <div onClick={() => setEmailEnabled(!emailEnabled)} className="cursor-pointer select-none">
                  <p className="font-bold text-slate-700 text-sm">Habilitar notificaciones por correo</p>
                  <p className="text-xs text-slate-500">Te avisaremos cuando alcances el 90% y el 100% de tu límite semanal. Puedes separar varios correos con comas.</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN: SEGURIDAD Y PIN */}
          <section className="neu-card p-6 md:p-8 rounded-3xl border-t-4 border-cyan-400">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-cyan-600 font-bold text-2xl">lock</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Seguridad y PIN de Acceso</h2>
                <p className="text-sm text-slate-500">Configura un código PIN numérico de 4 dígitos para proteger el acceso físico a la aplicación.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2 flex items-center gap-4 p-4 bg-white/50 rounded-2xl border border-white">
                <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out shrink-0">
                  <input
                    type="checkbox"
                    id="pin-toggle"
                    checked={pinEnabled}
                    onChange={(e) => setPinEnabled(e.target.checked)}
                    className="opacity-0 w-0 h-0"
                  />
                  <label
                    htmlFor="pin-toggle"
                    className={`absolute cursor-pointer inset-0 rounded-full transition-colors duration-200 ${pinEnabled ? 'bg-primary' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${pinEnabled ? 'translate-x-6' : 'translate-x-0'}`}></span>
                  </label>
                </div>
                <div onClick={() => setPinEnabled(!pinEnabled)} className="cursor-pointer select-none">
                  <p className="font-bold text-slate-700 text-sm">Habilitar código PIN de ingreso</p>
                  <p className="text-xs text-slate-500">Se te solicitará este PIN numérico cada vez que entres a la aplicación tras un inicio de sesión.</p>
                </div>
              </div>

              {pinEnabled && (
                <div className="col-span-1 md:col-span-2 animate-fade-in">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Código PIN de 4 dígitos</label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={pinCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setPinCode(val);
                    }}
                    className="neu-input w-48 p-4 rounded-xl text-center text-slate-700 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    placeholder="Ej: 1234"
                    required={pinEnabled}
                  />
                </div>
              )}
            </div>
          </section>

          <div className="flex justify-end mb-6">
            <button
              type="submit"
              disabled={savingSettings}
              className="neu-button px-10 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 text-primary-dark hover:bg-primary/10 transition-colors shadow-lg"
            >
              {savingSettings ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <span className="material-symbols-outlined">save</span>
              )}
              Guardar Configuración
            </button>
          </div>
        </form>
      )}

      <section className="neu-card p-6 md:p-8 rounded-3xl mb-10 border-t-4 border-orange-400">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-orange-600 font-bold text-2xl">date_range</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Limpieza por Rango de Fechas</h2>
            <p className="text-sm text-slate-500">Elimina movimientos masivos y recalcula los saldos automáticamente.</p>
          </div>
        </div>

        <form onSubmit={handleDeleteByDate} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Desde (Día Inicial)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              required
            />
          </div>
          <div className="w-full">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Hasta (Día Final)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="neu-input w-full p-4 rounded-xl text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loadingDate}
            className="neu-button p-4 rounded-xl font-bold w-full md:w-auto shrink-0 flex items-center justify-center gap-2 text-orange-600 hover:text-orange-800 bg-orange-50/50 transition-colors"
          >
            {loadingDate ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined">delete_sweep</span>
            )}
            Limpiar Fechas
          </button>
        </form>
      </section>

      {/* ZONA PELIGROSA */}
      <section className="neu-card p-6 md:p-8 rounded-3xl border-2 border-dashed border-red-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-red-600 font-bold text-2xl">warning</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Zona Peligrosa</h2>
              <p className="text-sm text-slate-500 hidden sm:block">Acciones destructivas que no se pueden deshacer.</p>
            </div>
          </div>
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="neu-button px-4 py-2 rounded-lg text-sm font-bold text-slate-500 shrink-0"
          >
            {showDangerZone ? 'Ocultar' : 'Revelar Opciones'}
          </button>
        </div>

        {showDangerZone && (
          <div className="flex flex-col gap-6">
            <div className="animate-fade-in p-6 bg-red-50/50 rounded-2xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Resetear Base de Datos Completa</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-md">Esto vaciará toda la base de datos: eliminará todas tus cuentas vinculadas, categorías personalizadas y tu historial completo de movimientos. Quedará en cero absoluto.</p>
              </div>
              <button
                onClick={handleResetData}
                disabled={loadingReset}
                className="bg-red-500 hover:bg-red-600 text-white font-black py-4 px-6 rounded-xl shadow-lg shadow-red-500/30 transition-all flex items-center justify-center gap-2 shrink-0 w-full md:w-auto"
              >
                {loadingReset ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">delete_forever</span>
                )}
                Destruir Datos
              </button>
            </div>

            <div className="animate-fade-in p-6 bg-red-50/50 rounded-2xl border border-red-100 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Eliminar Mi Cuenta Permanentemente</h3>
                <p className="text-sm text-slate-600 mt-1 max-w-md">Esto eliminará tu cuenta de usuario, tus datos, transacciones y configuraciones de forma irreversible. Perderás todo el acceso inmediatamente.</p>
              </div>
              <button
                onClick={handleDeleteAccount}
                disabled={loadingDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white font-black py-4 px-6 rounded-xl shadow-lg shadow-red-600/30 transition-all flex items-center justify-center gap-2 shrink-0 w-full md:w-auto"
              >
                {loadingDeleteAccount ? (
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined">person_remove</span>
                )}
                Eliminar Cuenta
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
