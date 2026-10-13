import React, { useState, useEffect } from 'react';
import { 
  Search, AlertTriangle, CheckCircle, XCircle, Package, Database, 
  AlertCircle, Building2, Layers, ArrowRightLeft, X 
} from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const StockOverview = () => {
  const [stockLevels, setStockLevels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data || []);
    } catch (err) {
      console.error('Failed to fetch warehouses', err);
    }
  };

  const fetchStock = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedWarehouse) params.append('warehouse', selectedWarehouse);
      
      const res = await api.get(`/inventory/stock?${params.toString()}`);
      setStockLevels(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch stock overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStock();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedWarehouse]);

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity <= 0) {
      return { 
        label: 'Out of Stock', 
        icon: XCircle, 
        dot: 'bg-rose-500', 
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        progress: 0,
        progressColor: 'bg-rose-500'
      };
    }
    const target = (reorderLevel || 10);
    if (quantity <= target) {
      const pct = Math.min(100, Math.round((quantity / target) * 100));
      return { 
        label: 'Low Stock', 
        icon: AlertTriangle, 
        dot: 'bg-amber-500', 
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        progress: pct,
        progressColor: 'bg-amber-500'
      };
    }
    return { 
      label: 'Optimal Buffer', 
      icon: CheckCircle, 
      dot: 'bg-emerald-500', 
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      progress: 100,
      progressColor: 'bg-emerald-500'
    };
  };

  // KPI Calculations
  const totalItems = stockLevels.length;
  const totalQuantity = stockLevels.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const outOfStockCount = stockLevels.filter(item => item.quantity <= 0).length;
  const lowStockCount = stockLevels.filter(item => item.quantity > 0 && item.quantity <= (item.product?.reorderLevel || 10)).length;

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Layers size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Multi-Hub Inventory Matrix
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time On-Hand, Reserved, and Available-To-Promise (ATP) stock balances across India.
          </p>
        </div>

        <FeatureGuide
          title="Multi-Hub Inventory Matrix"
          subtitle="Real-time stock balances & Available-To-Promise (ATP) tracking"
          category="Inventory Control"
          whatItIs="The central matrix of all SKU positions across all active warehouses. It tracks On-Hand Stock (physical inventory), Reserved Stock (allocated to pending client orders), and Available-To-Promise (ATP = On Hand - Reserved)."
          whyItMatters="Prevents critical stockouts and double-selling. Having multi-hub visibility allows managers to detect shortages in one city and balance stock from surplus hubs."
          howToUse={[
            "Filter by warehouse dropdown to inspect regional distribution.",
            "Search by product SKU or name to instantly verify stock across facilities.",
            "Check the status badge: Green (Healthy), Amber (Below Reorder Point), Red (Depleted stockout)."
          ]}
          proTip="Workers only see stock records for facilities assigned to their profile, protecting sensitive cross-hub operations."
        />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Position Records</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{totalItems}</div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Unique SKU Hub Locations</p>
          </div>
        </div>
        
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Physical Units</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Database size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-slate-900">{totalQuantity.toLocaleString()}</div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Aggregate On-Hand Count</p>
          </div>
        </div>
        
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Below Safety Buffer</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {lowStockCount}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Items needing replenishment</p>
          </div>
        </div>
        
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Stockout Positions</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-extrabold ${outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {outOfStockCount}
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">Zero balance items</p>
          </div>
        </div>
      </div>

      {/* Filter and Matrix Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 bg-slate-50/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 font-medium"
              placeholder="Filter by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="block w-full md:w-72 border border-slate-200 rounded-2xl text-xs font-bold p-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">All Warehouses ({warehouses.length} Hubs)</option>
            {warehouses.map(w => (
              <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="m-4 p-4 text-xs font-bold text-rose-700 bg-rose-50 rounded-2xl border border-rose-200">
            {error}
          </div>
        )}

        {/* Matrix Table */}
        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-48 text-slate-400 text-xs animate-pulse">
              Loading inventory balance positions...
            </div>
          ) : stockLevels.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Package className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-800">No stock records found</p>
              <p className="text-xs text-slate-400 mt-1">Adjust your filters to see active warehouse balances.</p>
            </div>
          ) : (
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/75 border-b border-slate-100">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold">
                  <th className="px-6 py-3.5">Product & SKU</th>
                  <th className="px-6 py-3.5">Warehouse Location</th>
                  <th className="px-6 py-3.5 text-right">Physical On-Hand</th>
                  <th className="px-6 py-3.5 text-right">Reorder Threshold</th>
                  <th className="px-6 py-3.5">Inventory Health Gauge</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {stockLevels.map((record) => {
                  const product = record.product || {};
                  const warehouse = record.warehouse || {};
                  const status = getStockStatus(record.quantity, product.reorderLevel);
                  
                  return (
                    <tr key={record._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-extrabold text-xs shrink-0">
                            {product.name?.substring(0, 2).toUpperCase() || 'SK'}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900">{product.name || 'Unknown Item'}</div>
                            <div className="text-[11px] font-mono text-slate-400 mt-0.5">{product.sku || 'N/A'}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-3.5">
                        <div className="text-slate-900 font-bold">{warehouse.name || 'Unknown Hub'}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[180px]">{warehouse.location || 'India'}</div>
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {record.quantity}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{product.unitOfMeasure || 'Units'}</div>
                      </td>

                      <td className="px-6 py-3.5 text-right text-slate-500 font-bold">
                        {product.reorderLevel || 10}
                      </td>

                      <td className="px-6 py-3.5 min-w-[140px]">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full ${status.progressColor}`} 
                            style={{ width: `${Math.min(100, Math.max(8, (record.quantity / (product.reorderLevel || 10)) * 50))}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-3.5 text-center whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold border ${status.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                          {status.label}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockOverview;
