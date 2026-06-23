import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          const response = await apiClient.get('/auth/me');
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));

          // Sincronizar configuraciones locales
          const settingsRes = await apiClient.get('/settings');
          let isPinLockActive = false;
          if (settingsRes.data) {
            isPinLockActive = settingsRes.data.pin_lock_enabled === 'true';
            localStorage.setItem('pin_lock_enabled', settingsRes.data.pin_lock_enabled || 'false');
            localStorage.setItem('pin_lock_code', settingsRes.data.pin_lock_code || '2101');
            localStorage.setItem('weeklyFreeLimit', settingsRes.data.weekly_free_limit || '50000');
          }

          // Verificar expiración de 24 horas si el PIN no está activado
          if (!isPinLockActive) {
            const loginTimestamp = localStorage.getItem('login_timestamp');
            if (loginTimestamp) {
              const elapsed = Date.now() - parseInt(loginTimestamp);
              const oneDayMs = 24 * 60 * 60 * 1000;
              if (elapsed > oneDayMs) {
                console.log('Sesión expirada (límite de 24 horas sin PIN de seguridad).');
                logout();
                setLoading(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Error al inicializar sesión o token expirado:', error);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('login_timestamp', Date.now().toString());

    // Sincronizar configuraciones inmediatamente al hacer login
    try {
      const settingsRes = await apiClient.get('/settings');
      if (settingsRes.data) {
        localStorage.setItem('pin_lock_enabled', settingsRes.data.pin_lock_enabled || 'false');
        localStorage.setItem('pin_lock_code', settingsRes.data.pin_lock_code || '2101');
        localStorage.setItem('weeklyFreeLimit', settingsRes.data.weekly_free_limit || '50000');
      }
    } catch (e) {
      console.error('Error al sincronizar ajustes tras login:', e);
      localStorage.setItem('pin_lock_enabled', 'false');
    }

    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('pin_lock_enabled');
    localStorage.removeItem('pin_lock_code');
    localStorage.removeItem('weeklyFreeLimit');
    localStorage.removeItem('login_timestamp');
    sessionStorage.removeItem('isAppUnlocked'); // Reiniciar PinLock
    setUser(null);
  };

  // Intervalo periódico de verificación de expiración de sesión (24 horas sin PIN)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      const isPinLockActive = localStorage.getItem('pin_lock_enabled') === 'true';
      if (!isPinLockActive) {
        const loginTimestamp = localStorage.getItem('login_timestamp');
        if (loginTimestamp) {
          const elapsed = Date.now() - parseInt(loginTimestamp);
          const oneDayMs = 24 * 60 * 60 * 1000;
          if (elapsed > oneDayMs) {
            console.log('Cierre automático de sesión: pasaron 24 horas sin PIN de bloqueo.');
            logout();
          }
        }
      }
    }, 60000); // Ejecutar revisión cada minuto

    return () => clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
