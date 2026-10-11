import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, CheckCircle, XCircle, Package, Database, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useCountry } from '../context/CountryContext';
import FeatureGuide from '../components/FeatureGuide';

const StockOverview = () => {
  const { selectedCountry, countryMeta, changeCountry } = useCountry();
  const [stockLevels, setStockLevels] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
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
      setStockLevels(res.data);
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
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedWarehouse]);

  const displayedWarehouses = selectedCountry === 'ALL'
    ? warehouses
    : warehouses.filter(w => (w.countryCode || 'IN').toUpperCase() === selectedCountry.toUpperCase());

  const displayedStock = stockLevels.filter(item => {
    if (selectedCountry === 'ALL') return true;
    const cc = item.warehouse?.countryCode || 'IN';
    return cc.toUpperCase() === selectedCountry.toUpperCase();
  });

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity <= 0) {
      return { label: 'Out of Stock', icon: XCircle, variant: 'destructive', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-200' };
    }
    if (quantity <= (reorderLevel || 0)) {
      return { label: 'Low Stock', icon: AlertTriangle, variant: 'warning', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'In Stock', icon: CheckCircle, variant: 'success', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' };
  };

  // KPI Calculations based on displayedStock
  const totalItems = displayedStock.length;
  const totalQuantity = displayedStock.reduce((acc, item) => acc + item.quantity, 0);
  const outOfStockCount = displayedStock.filter(item => item.quantity <= 0).length;
  const lowStockCount = displayedStock.filter(item => item.quantity > 0 && item.quantity <= (item.product?.reorderLevel || 0)).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">Multi-Hub Inventory Matrix</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Real-time On-Hand, Reserved, and Available-To-Promise (ATP) stock balances across India.</p>
        </div>
        <FeatureGuide
          title="Multi-Hub Inventory Matrix"
          subtitle="Real-time stock balances & Available-To-Promise (ATP) tracking"
          category="Inventory Control"
          whatItIs="The central matrix of all SKU positions across all active warehouses. It tracks On-Hand Stock (physical inventory), Reserved Stock (allocated to pending client orders), and Available-To-Promise (ATP = On Hand - Reserved)."
          whyItMatters="Prevents critical stockouts and double-selling. Having multi-hub visibility allows managers to detect shortages in one city and balance stock from surplus hubs."
          howToUse={[
            "Filter by warehouse dropdown (Mumbai, Delhi-NCR, Bengaluru, Chennai) to inspect regional distribution.",
            "Search by product SKU or name to instantly verify stock across facilities.",
            "Check the status badge: Green (Healthy), Amber (Below Reorder Point), Red (Depleted stockout)."
          ]}
          proTip="Workers only see stock records for facilities assigned to their profile, protecting sensitive cross-hub operations."
        />
      </div>

      {/* Active Country Scope Banner */}
      <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">{countryMeta.flag}</span>
          <span className="font-semibold text-gray-700">
            {selectedCountry === 'ALL'
              ? 'Showing inventory matrix across Global Enterprise'
              : `Scoped to ${countryMeta.name} (${displayedStock.length} SKU locations)`}
          </span>
        </div>
        {selectedCountry !== 'ALL' && (
          <button
            onClick={() => changeCountry('ALL')}
            className="text-indigo-600 hover:text-indigo-800 font-bold underline"
          >
            Show All Countries
          </button>
        )}
      </div>

      {/* Premium KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-950">Total Stock Items</h3>
            <Package className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-950 tabular-nums">{totalItems}</div>
            <p className="text-xs text-gray-500">Unique product locations</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-950">Overall Quantity</h3>
            <Database className="h-4 w-4 text-gray-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-950 tabular-nums">{totalQuantity.toLocaleString()}</div>
            <p className="text-xs text-gray-500">Total physical units</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-950">Low Stock Alerts</h3>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-950 tabular-nums">{lowStockCount}</div>
            <p className="text-xs text-gray-500">Items below reorder level</p>
          </div>
        </div>
        
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-6 pb-2">
            <h3 className="tracking-tight text-sm font-medium text-gray-950">Out of Stock</h3>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="p-6 pt-0">
            <div className="text-2xl font-bold text-gray-950 tabular-nums">{outOfStockCount}</div>
            <p className="text-xs text-gray-500">Items requiring immediate attention</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="pl-9 block w-full border-gray-200 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border bg-white"
              placeholder="Filter by product name or SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="block w-full md:w-64 border-gray-200 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border bg-white text-gray-700"
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
          >
            <option value="">{selectedCountry === 'ALL' ? 'All Warehouses' : `All ${countryMeta.name} Warehouses`}</option>
            {displayedWarehouses.map(w => (
              <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>

        {error && (
          <div className="m-4 p-4 text-sm text-red-700 bg-red-50 rounded-md border border-red-100">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center h-48 text-gray-500 text-sm">
              Loading inventory data...
            </div>
          ) : displayedStock.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <AlertTriangle className="h-8 w-8 text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-900">No stock records found in {countryMeta.name}</p>
              <p className="text-xs mt-1">Adjust your filters or switch jurisdiction from the top dropdown.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 bg-gray-50/50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-medium">Product</th>
                  <th className="px-6 py-3 font-medium">Location</th>
                  <th className="px-6 py-3 font-medium text-right">Stock Level</th>
                  <th className="px-6 py-3 font-medium text-right">Reorder Point</th>
                  <th className="px-6 py-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedStock.map((record) => {
                  const product = record.product || {};
                  const warehouse = record.warehouse || {};
                  const status = getStockStatus(record.quantity, product.reorderLevel);
                  
                  return (
                    <tr key={record._id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-md bg-indigo-50 flex items-center justify-center border border-indigo-100 shrink-0">
                            <span className="text-indigo-600 font-semibold text-xs">
                              {product.name?.substring(0, 2).toUpperCase() || 'NA'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-950">{product.name || 'Unknown'}</div>
                            <div className="text-xs text-gray-500">{product.sku || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-950 font-medium">{warehouse.name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[150px]">{warehouse.location || 'No location set'}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-semibold text-gray-950 tabular-nums">
                          {record.quantity}
                        </div>
                        <div className="text-xs text-gray-500">{product.unitOfMeasure || 'Units'}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-500 tabular-nums">
                        {product.reorderLevel || 0}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${status.bg}`}>
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
