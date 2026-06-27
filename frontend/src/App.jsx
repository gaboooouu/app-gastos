import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Budget from './pages/Budget';
import Info from './pages/Info';
import AiChat from './pages/AiChat';
import Login from './pages/Login';
import Register from './pages/Register';
import MobileNavbar from './components/MobileNavbar';
import PinLock from './components/PinLock';

function AppContent() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rutas Protegidas bajo Auth y PIN Lock */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <PinLock>
              <div className="flex w-full min-h-screen relative overflow-hidden">
                
                {/* Mobile Header Container */}
                <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-[#F0F2F5]/90 backdrop-blur-md z-40 px-6 flex items-center justify-between border-b border-slate-200">
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
                       <span className="material-symbols-outlined text-white font-bold text-[16px]">account_balance_wallet</span>
                     </div>
                     <h2 className="text-xl font-black tracking-tight text-slate-800">FinVue</h2>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(true)} className="neu-button p-2 text-slate-500 rounded-lg flex items-center justify-center">
                     <span className="material-symbols-outlined text-2xl">menu</span>
                  </button>
                </div>

                <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
                
                <main className="flex-1 h-screen overflow-y-auto bg-[#F0F2F5] pt-24 px-4 pb-28 lg:p-10 lg:pt-10">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/cuentas" element={<Accounts />} />
                    <Route path="/transacciones" element={<Transactions />} />
                    <Route path="/presupuesto" element={<Budget />} />
                    <Route path="/reportes" element={<Reports />} />
                    <Route path="/ajustes" element={<Settings />} />
                    <Route path="/info" element={<Info />} />
                  </Routes>
                </main>
                
                <MobileNavbar />
                
                <AiChat />
              </div>
            </PinLock>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

