import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import apiClient from '../api/axios';
import Skeleton from './Skeleton';

export default function ItemHistoryModal({ isOpen, onClose, concept, budgetGroupId }) {
  const [historyData, setHistoryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && concept && budgetGroupId) {
      fetchHistory();
    }
  }, [isOpen, concept, budgetGroupId]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/budget/items/history?concept=${encodeURIComponent(concept)}&budget_group_id=${budgetGroupId}`);
      setHistoryData(res.data);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(val);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white text-xs">
          <p className="font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between gap-8">
              <span className="font-bold text-slate-500">Estimado:</span>
              <span className="font-black text-slate-700">{formatCurrency(payload[0].value)}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="font-bold text-emerald-500">Real:</span>
              <span className="font-black text-emerald-600">{formatCurrency(payload[1].value)}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm shadow-inner" onClick={onClose}></div>
      <div className="bg-[#F0F2F5] w-full max-w-3xl rounded-[2.5rem] relative z-10 flex flex-col max-h-[90vh] border border-white overflow-hidden animate-in fade-in zoom-in duration-200 shadow-2xl">
        
        <div className="p-5 sm:p-8 pb-4">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Evolución de Gasto</h2>
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Historial para: <span className="text-primary">{concept}</span></p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50 transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-5 sm:p-8 pt-0">
          <div className="w-full h-[280px] sm:h-[350px] bg-white/40 rounded-3xl sm:rounded-[2.5rem] p-3 sm:p-6 border border-white/60 relative">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Analizando historial...</p>
                </div>
              </div>
            ) : historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEst" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fontWeight: 900, fill: '#94A3B8' }}
                    tickFormatter={(val) => {
                      const [y, m] = val.split('-');
                      const date = new Date(y, m - 1);
                      return date.toLocaleDateString('es-CL', { month: 'short' }).toUpperCase();
                    }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fontWeight: 900, fill: '#94A3B8' }}
                    tickFormatter={(val) => `$${val/1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="estimated" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorEst)" 
                    name="Estimado"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="real" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorReal)" 
                    name="Real"
                    dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-300">
                <span className="material-symbols-outlined text-6xl mb-4">analytics</span>
                <p className="text-[10px] font-black uppercase tracking-widest text-center px-4">No hay datos suficientes para proyectar</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-8 pt-4 pb-8 sm:pb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest sm:tracking-[0.2em] text-slate-400">
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span>Estimado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Gasto Real</span>
            </div>
          </div>
          <p className="italic text-[8px] sm:text-[10px]">Evolución histórica detectada</p>
        </div>

      </div>
    </div>
  );
}
