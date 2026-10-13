import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Package, AlertTriangle, AlertCircle, Clock, TrendingUp, DollarSign, 
  ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Sparkles, Building2,
  CheckCircle2, ArrowUpRight, BarChart3, ChevronRight, RefreshCw, ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FeatureGuide from '../components/FeatureGuide';

const Dashboard = () => {
  const { user, role, company } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const requests = [
        api.get('/products'),
        api.get('/inventory/stock'),
        api.get('/inventory/operations'),
        api.get('/warehouses')
      ];

      if (isManager) {
        requests.push(api.get('/inventory/ledger'));
        requests.push(api.get('/inventory/valuation'));
      }

      const responses = await Promise.all(requests);

      const products = responses[0].data || [];
      const stock = responses[1].data || [];
      const operations = responses[2].data || [];
      const warehouses = responses[3].data || [];
      
      let ledger = [];
      let valuation = [];
      if (isManager) {
        ledger = responses[4]?.data || [];
        valuation = responses[5]?.data || [];
      }

      // KPI Calculations
      const totalPortfolioValue = valuation.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
      const totalProducts = products.length;
      
      let totalStockQuantity = 0;
      const stockByProduct = {};
      const stockByWarehouse = {};
      
      warehouses.forEach(w => stockByWarehouse[w.name] = 0);

      stock.forEach(s => {
        totalStockQuantity += (s.quantity || 0);
        if (s.product?._id) {
          stockByProduct[s.product._id] = (stockByProduct[s.product._id] || 0) + s.quantity;
        }
        if (s.warehouse?.name) {
          stockByWarehouse[s.warehouse.name] = (stockByWarehouse[s.warehouse.name] || 0) + s.quantity;
        }
      });

      let lowStockCount = 0;
      let outOfStockCount = 0;
      const lowStockItems = [];

      products.forEach(p => {
        const qty = stockByProduct[p._id] || 0;
        if (qty === 0) outOfStockCount++;
        else if (qty <= (p.reorderLevel || 10)) {
          lowStockCount++;
          lowStockItems.push({ ...p, currentStock: qty });
        }
      });

      const pendingOperations = operations.filter(op => op.status === 'DRAFT');

      // Chart Data
      const warehouseChartData = Object.keys(stockByWarehouse).map(name => ({
        name: name.split(' ')[0], // Short name for clean axis
        fullName: name,
        quantity: stockByWarehouse[name]
      }));

      setStats({
        totalProducts,
        totalStockQuantity,
        totalPortfolioValue,
        lowStockCount,
        outOfStockCount,
        pendingOperationsCount: pendingOperations.length,
        warehouseChartData,
        recentOperations: operations.slice(0, 5),
        lowStockItems: lowStockItems.slice(0, 5),
        recentLedger: ledger.slice(0, 5),
        totalWarehouses: warehouses.length
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-200/80 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200/80 rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200/80 rounded-2xl"></div>
          <div className="h-80 bg-slate-200/80 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 text-rose-700 rounded-2xl border border-rose-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle size={22} className="text-rose-600" />
          <span className="font-bold text-sm">{error}</span>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-white text-rose-700 font-bold text-xs rounded-xl border border-rose-200 shadow-2xs hover:bg-rose-100 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold tracking-wide">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Live Telemetry Active
              </span>
              <span className="text-slate-400 text-xs font-medium">
                • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Supply Chain Command Center
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Real-time multi-hub stock telemetry, FIFO balance sheet asset valuation, and predictive replenishment tracking across India.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <FeatureGuide
              title="Supply Chain Command Center"
              subtitle="Real-time multi-hub intelligence & inventory telemetry"
              category="Executive Dashboard"
              whatItIs="The central mission control for your multi-warehouse network. It aggregates live stock quantities, total portfolio balance sheet valuation in INR (₹), low-stock warnings, and real-time ledger movements across Indian facilities."
              whyItMatters="Enables managers and executives to identify inventory bottlenecks, prevent critical stockouts, and monitor stock turnover without manually consolidating disparate warehouse spreadsheets."
              howToUse={[
                "Monitor Total Valuation & Units across the top KPI metric cards.",
                "Inspect the Low Stock Warning banner to trigger purchase orders or inter-hub transfers.",
                "Analyze the Facility Breakdown chart to see inventory concentration across zones.",
                "Review Recent Stock Movements to track real-time receipt, delivery, and transfer operations."
              ]}
              proTip="Restricted workers only see operational KPIs for their assigned facility, while managers see enterprise-wide metrics."
            />

            <Link
              to="/intelligence"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-600/30 transition-all hover:scale-102 active:scale-98"
            >
              <Sparkles size={16} />
              <span>AI Insights</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 6 Key Performance Indicator (KPI) Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Catalog SKUs</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.totalProducts}</p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Active Master Items</p>
          </div>
        </div>

        {/* Portfolio Valuation (Managers/Admin only) */}
        {isManager ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">FIFO Assets</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <DollarSign size={18} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight truncate">
                ₹{stats.totalPortfolioValue >= 10000000 
                  ? `${(stats.totalPortfolioValue / 10000000).toFixed(2)} Cr` 
                  : stats.totalPortfolioValue >= 100000 
                    ? `${(stats.totalPortfolioValue / 100000).toFixed(2)} L` 
                    : stats.totalPortfolioValue?.toLocaleString('en-IN')}
              </p>
              <p className="text-[11px] font-medium text-emerald-600 mt-0.5 flex items-center gap-1 font-semibold">
                GAAP Balance Sheet
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hub Network</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Building2 size={18} />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">{stats.totalWarehouses}</p>
              <p className="text-[11px] font-medium text-slate-400 mt-0.5">Assigned Facilities</p>
            </div>
          </div>
        )}

        {/* Total Stock Units */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">On-Hand Units</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.totalStockQuantity.toLocaleString()}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Physical Inventory</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Low Stock</span>
            <div className={`p-2 rounded-xl ${stats.lowStockCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-extrabold tracking-tight ${stats.lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {stats.lowStockCount}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Below Safety Buffer</p>
          </div>
        </div>

        {/* Out of Stock Items */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Depleted</span>
            <div className={`p-2 rounded-xl ${stats.outOfStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className={`text-2xl font-extrabold tracking-tight ${stats.outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {stats.outOfStockCount}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Zero Balance Stockouts</p>
          </div>
        </div>

        {/* Pending Operations */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Ops</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Clock size={18} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {stats.pendingOperationsCount}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Draft / Authorization</p>
          </div>
        </div>
      </div>

      {/* Main Charts & Alert Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Warehouse Stock Distribution Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Facility Distribution Matrix</h2>
              <p className="text-xs text-slate-500 mt-0.5">Inventory unit allocation across regional warehouse hubs</p>
            </div>
            <Link to="/stock-overview" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View Matrix <ChevronRight size={14} />
            </Link>
          </div>

          <div className="h-72 w-full">
            {stats.warehouseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.warehouseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    formatter={(val, name, item) => [`${val} Units`, item.payload.fullName]}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 600 }}
                  />
                  <Bar dataKey="quantity" fill="#6366f1" radius={[8, 8, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No active stock reported across facilities
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts & Urgent Actions (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Critical Reorder Alerts
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">SKUs at or below safety stock threshold</p>
            </div>
            <Link to="/products" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              All SKUs <ChevronRight size={14} />
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {stats.lowStockItems.length > 0 ? (
              <div className="space-y-2.5">
                {stats.lowStockItems.map((item) => (
                  <div 
                    key={item._id}
                    className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="text-xs font-bold text-slate-900 truncate">{item.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono bg-white border border-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                          {item.sku}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Reorder Point: {item.reorderLevel || 10}
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-rose-600 bg-rose-50 border border-rose-200/60 px-2.5 py-1 rounded-full">
                        {item.currentStock} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <CheckCircle2 size={36} className="text-emerald-500 mb-2" />
                <p className="text-sm font-bold text-slate-800">Healthy Buffer Position</p>
                <p className="text-xs text-slate-400 max-w-xs mt-0.5">
                  All catalog products currently hold stock strictly above their assigned safety buffers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Movements Ledger */}
      {isManager && (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Recent Real-Time Ledger Movements</h2>
              <p className="text-xs text-slate-500 mt-0.5">Granular audit trail of physical inbound, outbound, and inter-hub transfers</p>
            </div>
            <Link to="/ledger" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Full Ledger <ChevronRight size={14} />
            </Link>
          </div>

          {stats.recentLedger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-extrabold">
                    <th className="pb-3 px-3">Timestamp</th>
                    <th className="pb-3 px-3">Operation</th>
                    <th className="pb-3 px-3">Product Name</th>
                    <th className="pb-3 px-3">Facility Hub</th>
                    <th className="pb-3 px-3 text-right">Quantity Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {stats.recentLedger.map((entry) => {
                    const isPositive = entry.quantityChange > 0;
                    return (
                      <tr key={entry._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                            entry.operation?.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            entry.operation?.type === 'DELIVERY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            entry.operation?.type === 'TRANSFER' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {entry.operation?.type || 'ADJUSTMENT'}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                          {entry.product?.name || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {entry.warehouse?.name || '-'}
                        </td>
                        <td className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${
                          isPositive ? 'text-emerald-600' : entry.quantityChange < 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          {isPositive ? `+${entry.quantityChange}` : entry.quantityChange}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-slate-400 text-xs">
              No recent stock transactions recorded today
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
