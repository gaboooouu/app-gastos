import React, { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#10b981', '#3b82f6', '#f97316', '#64748b'];

export default function Reports() {
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de fecha
  const [dateFilter, setDateFilter] = useState('30days'); // all, 7days, 30days, 1year, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, accsRes] = await Promise.all([
        apiClient.get('/transactions').catch(() => ({ data: [] })),
        apiClient.get('/accounts').catch(() => ({ data: [] }))
      ]);
      setTransactions(Array.isArray(transRes.data) ? transRes.data : []);
      setAccounts(Array.isArray(accsRes.data) ? accsRes.data : []);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar los datos para los reportes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, []);

  // FILTRADO MAESTRO DE TRANSACCIONES POR FECHA
  const filteredTransactions = useMemo(() => {
    if (dateFilter === 'all') return transactions;

    const now = new Date();
    let start = new Date(0);
    let end = new Date();

    if (dateFilter === '7days') {
      start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === '30days') {
      start = new Date();
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === '1year') {
      start = new Date();
      start.setFullYear(now.getFullYear() - 1);
      start.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'custom') {
      start = startDate ? new Date(startDate + 'T00:00:00') : new Date(0);
      end = endDate ? new Date(endDate + 'T23:59:59') : new Date();
    }

    return transactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= start && txDate <= end;
    });
  }, [transactions, dateFilter, startDate, endDate]);

  // 1. GASTOS POR CATEGORÍA
  const expensesByCategory = useMemo(() => {
    const expenses = filteredTransactions.filter(t => t.type === 'gasto');
    const grouped = expenses.reduce((acc, current) => {
      const catName = current.category?.name || 'General';
      acc[catName] = (acc[catName] || 0) + Math.abs(current.amount);
      return acc;
    }, {});
    
    return Object.keys(grouped).map(key => ({
      name: key,
      value: grouped[key]
    })).sort((a, b) => b.value - a.value); // Ordenar de mayor a menor
  }, [filteredTransactions]);

  // 2. CUENTAS MÁS USADAS (Por cantidad de transacciones)
  const mostUsedAccounts = useMemo(() => {
    const grouped = filteredTransactions.reduce((acc, current) => {
      const accName = current.account?.name || 'Indefinido';
      acc[accName] = (acc[accName] || 0) + 1;
      return acc;
    }, {});

    // Completar con las que tienen 0 también
    accounts.forEach(a => {
      if (!grouped[a.name]) grouped[a.name] = 0;
    });

    return Object.keys(grouped).map(key => ({
      name: key,
      cantidad: grouped[key]
    })).sort((a, b) => b.cantidad - a.cantidad);
  }, [filteredTransactions, accounts]);

  // 3. INGRESOS VS GASTOS GENERAL (Resumen)
  const incomeVsExpensesCount = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach(t => {
      if (t.type === 'ingreso') income += t.amount;
      if (t.type === 'gasto') expense += Math.abs(t.amount);
    });
    return [
      { name: 'Ingresos', valor: income, fill: '#14b8a6' }, // Teal
      { name: 'Gastos',   valor: expense, fill: '#ef4444' }  // Red
    ];
  }, [filteredTransactions]);

  // Formateador moneda para los tooltips
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Reportes y Estadísticas</h1>
        <p className="text-slate-500 font-medium">Analiza tus patrones de gastos y el uso de tus cuentas.</p>
      </header>

      {/* Rango de Fechas Panel */}
      <div className="neu-card p-6 rounded-2xl mb-8 flex flex-col md:flex-row gap-4 items-end z-10 relative">
        <div className="w-full md:w-64 shrink-0">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Rango de Tiempo</label>
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="all">Histórico (Todo)</option>
            <option value="7days">Últimos 7 días</option>
            <option value="30days">Últimos 30 días</option>
            <option value="1year">Último año</option>
            <option value="custom">Rango Personalizado...</option>
          </select>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex flex-col md:flex-row gap-4 w-full animate-fade-in">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Desde</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1 block">Hasta</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="neu-input w-full px-4 py-3 rounded-xl text-slate-700 font-medium bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>
        )}
      </div>

      {filteredTransactions.length === 0 ? (
        <div className="neu-card rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-primary-dark">bar_chart</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">Aún no hay suficientes datos</h2>
          <p className="text-slate-500 max-w-md">Para el período de fechas seleccionado no existen movimientos o no has generado historial todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Panel: Gastos por Categoría */}
          <div className="neu-card rounded-2xl p-6 lg:p-8 flex flex-col border-t-4 border-indigo-500">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800">Gastos por Categoría</h3>
              <p className="text-sm text-slate-500">Distribución global de todos tus gastos registrados.</p>
            </div>
            
            {expensesByCategory.length > 0 ? (
              <div className="flex-1 w-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius="60%"
                      outerRadius="100%"
                      paddingAngle={5}
                      dataKey="value"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                        return percent > 0.05 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 font-bold">Sin gastos registrados todavía.</div>
            )}
          </div>

          {/* Panel: Cuentas más Usadas */}
          <div className="neu-card rounded-2xl p-6 lg:p-8 flex flex-col border-t-4 border-teal-500">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800">Cuentas más Usadas</h3>
              <p className="text-sm text-slate-500">Volumen de transacciones asociadas por cuenta (Ingresos y Gastos).</p>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostUsedAccounts} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <XAxis type="number" allowDecimals={false} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={13} fontWeight="bold" width={100} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{fill: 'rgba(20, 184, 166, 0.1)'}} formatter={(value) => [`${value} Movimiento(s)`, 'Frecuencia']} />
                  <Bar dataKey="cantidad" fill="#14b8a6" radius={[0, 8, 8, 0]}>
                    {mostUsedAccounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#14b8a6' : '#99f6e4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Panel: Comparativa General de Ingresos vs Gastos */}
          <div className="neu-card rounded-2xl p-6 lg:p-8 flex flex-col lg:col-span-2 border-t-4 border-primary">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800">Flujo Total: Ingresos vs Gastos</h3>
              <p className="text-sm text-slate-500">Resumen monetario simple de tus entradas y salidas históricas.</p>
            </div>

            <div className="flex-1 w-full min-h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpensesCount} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barSize={80}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={14} fontWeight="bold" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                  <Tooltip cursor={{fill: 'transparent'}} formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="valor" radius={[10, 10, 0, 0]}>
                    {incomeVsExpensesCount.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
