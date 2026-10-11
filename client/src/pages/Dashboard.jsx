import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, AlertCircle, Clock, TrendingUp, DollarSign, 
  Globe, Building2, Receipt, ArrowRight, CheckCircle2, ShieldCheck 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useCountry } from '../context/CountryContext';
import { formatCurrency } from '../lib/countries';
import FeatureGuide from '../components/FeatureGuide';

const Dashboard = () => {
  const { user, role } = useAuth();
  const { selectedCountry, changeCountry, countryMeta, availableCountries } = useCountry();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const invoiceParams = selectedCountry !== 'ALL' ? { countryCode: selectedCountry } : {};

        const requests = [
          api.get('/products'),
          api.get('/inventory/stock'),
          api.get('/inventory/operations'),
          api.get('/warehouses'),
          api.get('/invoices', { params: invoiceParams })
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
        const invoices = responses[4].data || [];
        
        let ledger = [];
        let valuation = [];
        if (isManager) {
          ledger = responses[5].data || [];
          valuation = responses[6].data || [];
        }

        // Filter Warehouses by Active Country
        const scopedWarehouses = selectedCountry === 'ALL'
          ? warehouses
          : warehouses.filter(w => (w.countryCode || 'IN').toUpperCase() === selectedCountry.toUpperCase());

        const scopedWarehouseIds = new Set(scopedWarehouses.map(w => (w._id || w).toString()));

        // Filter Stock by Scoped Warehouses
        const scopedStock = selectedCountry === 'ALL'
          ? stock
          : stock.filter(s => s.warehouse && scopedWarehouseIds.has((s.warehouse._id || s.warehouse).toString()));

        // Filter Valuation by Scoped Warehouses
        const scopedValuation = selectedCountry === 'ALL'
          ? valuation
          : valuation.filter(v => v.warehouse && scopedWarehouseIds.has((v.warehouse._id || v.warehouse).toString()));

        // Filter Operations by Scoped Warehouses
        const scopedOperations = selectedCountry === 'ALL'
          ? operations
          : operations.filter(op => {
              const srcId = (op.sourceWarehouse?._id || op.sourceWarehouse)?.toString();
              const destId = (op.destinationWarehouse?._id || op.destinationWarehouse)?.toString();
              return (srcId && scopedWarehouseIds.has(srcId)) || (destId && scopedWarehouseIds.has(destId));
            });

        // Filter Ledger by Scoped Warehouses
        const scopedLedger = selectedCountry === 'ALL'
          ? ledger
          : ledger.filter(l => l.warehouse && scopedWarehouseIds.has((l.warehouse._id || l.warehouse).toString()));

        // Filter Invoices by Active Country
        const scopedInvoices = selectedCountry === 'ALL'
          ? invoices
          : invoices.filter(inv => (inv.countryCode || 'IN').toUpperCase() === selectedCountry.toUpperCase());

        // KPI Calculations
        const totalPortfolioValue = scopedValuation.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
        
        // Invoiced Revenue for this jurisdiction
        const invoicedRevenue = scopedInvoices
          .filter(inv => inv.status !== 'CANCELLED')
          .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

        let totalStockQuantity = 0;
        const stockByProduct = {};
        const stockByWarehouse = {};
        
        scopedWarehouses.forEach(w => stockByWarehouse[w.name] = 0);

        scopedStock.forEach(s => {
          totalStockQuantity += (s.quantity || 0);
          const pId = s.product?._id || s.product;
          if (pId) {
            stockByProduct[pId] = (stockByProduct[pId] || 0) + s.quantity;
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
          if (qty === 0) {
            outOfStockCount++;
          } else if (qty <= (p.reorderLevel || 10)) {
            lowStockCount++;
            lowStockItems.push({ ...p, currentStock: qty });
          }
        });

        const pendingOperations = scopedOperations.filter(op => op.status === 'DRAFT');

        // Chart Data (Warehouse Breakdown)
        const warehouseChartData = Object.keys(stockByWarehouse).map(name => ({
          name,
          quantity: stockByWarehouse[name]
        }));

        setStats({
          totalProducts: selectedCountry === 'ALL' ? products.length : Object.keys(stockByProduct).length,
          totalStockQuantity,
          totalPortfolioValue,
          invoicedRevenue,
          invoicesCount: scopedInvoices.length,
          activeWarehousesCount: scopedWarehouses.length,
          lowStockCount,
          outOfStockCount,
          pendingOperationsCount: pendingOperations.length,
          warehouseChartData,
          recentOperations: scopedOperations.slice(0, 5),
          lowStockItems: lowStockItems.slice(0, 5),
          recentLedger: scopedLedger.slice(0, 5),
          recentInvoices: scopedInvoices.slice(0, 5)
        });
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard telemetry');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedCountry, isManager]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (loading) {
    return (
      <div className="flex flex-col h-72 items-center justify-center text-gray-500 gap-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-semibold">Synchronizing {countryMeta.name} Telemetry...</p>
      </div>
    );
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Feature Guide */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Executive Command Center
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
              {countryMeta.flag} {selectedCountry === 'ALL' ? 'Global' : countryMeta.code}
            </span>
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
            Real-time supply chain & billing telemetry across multinational operational hubs
          </p>
        </div>
        <FeatureGuide
          title="Supply Chain Command Center"
          subtitle="Real-time multi-hub intelligence & country scoping"
          category="Executive Dashboard"
          whatItIs="The mission control for your multinational corporate network. It aggregates live stock quantities, perpetual FIFO valuation, low-stock warnings, and statutory invoices filtered strictly to your active operating country."
          whyItMatters="Enables executives to isolate individual country subsidiaries (e.g. US, UK, India, Germany, UAE, Singapore) without data bleeding across international borders."
          howToUse={[
            "Switch the Operating Jurisdiction using the quick selector pills or header dropdown.",
            "Inspect Local Inventory Valuation and Invoiced Revenue formatted in the country's legal currency.",
            "Analyze the Facility Breakdown chart to audit physical distribution within that jurisdiction.",
            "Review Recent Statutory Invoices to track customer deliveries and tax compliance."
          ]}
          proTip="Switching the country on the dashboard automatically synchronizes your entire session across warehouses, billing, and inventory."
        />
      </div>

      {/* MNC Country Jurisdiction Switcher Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shrink-0">
              {countryMeta.flag}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Jurisdiction:</span>
                <span className="text-sm font-extrabold text-gray-900">{countryMeta.name}</span>
                {selectedCountry !== 'ALL' && (
                  <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.2 rounded-md font-mono font-bold">
                    {countryMeta.currencySymbol} {countryMeta.currency} ({countryMeta.taxSystem})
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedCountry === 'ALL' 
                  ? '🌐 Displaying consolidated global enterprise data across all international subsidiaries.'
                  : `📍 Scoped strictly to ${countryMeta.name}. Showing only local facilities, inventory, valuations, and billing.`}
              </p>
            </div>
          </div>

          {/* Country Selection Chips */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {availableCountries.map((c) => {
              const isSelected = selectedCountry === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => changeCountry(c.code)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  <span>{c.code === 'ALL' ? 'Global' : c.code}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white ml-0.5"></span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Total Products */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Package size={22} /></div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Active SKUs</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Inventory Value */}
        {isManager && (
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><DollarSign size={22} /></div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Inventory Value</p>
              <p className="text-xl font-bold text-gray-900 truncate" title={stats.totalPortfolioValue}>
                {formatCurrency(stats.totalPortfolioValue, countryMeta.currency, countryMeta.currencySymbol)}
              </p>
            </div>
          </div>
        )}

        {/* Local Invoiced Revenue */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Receipt size={22} /></div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Billed Revenue</p>
            <p className="text-xl font-bold text-gray-900 truncate" title={stats.invoicedRevenue}>
              {formatCurrency(stats.invoicedRevenue, countryMeta.currency, countryMeta.currencySymbol)}
            </p>
          </div>
        </div>

        {/* Total Stock Qty */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><TrendingUp size={22} /></div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Stock Units</p>
            <p className="text-xl font-bold text-gray-900">{stats.totalStockQuantity?.toLocaleString()}</p>
          </div>
        </div>

        {/* Facilities Count */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Building2 size={22} /></div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Warehouses</p>
            <p className="text-xl font-bold text-gray-900">{stats.activeWarehousesCount} Hubs</p>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle size={22} /></div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Low Stock</p>
            <p className="text-xl font-bold text-amber-600">{stats.lowStockCount}</p>
          </div>
        </div>
      </div>

      {/* Charts & Alerts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock by Warehouse Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Stock by Facility ({selectedCountry === 'ALL' ? 'Global' : countryMeta.name})
              </h2>
              <p className="text-xs text-gray-400">Distribution of on-hand units across regional distribution hubs</p>
            </div>
            <Link to="/warehouses" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              View Hubs <ArrowRight size={14} />
            </Link>
          </div>
          <div className="h-72">
            {stats.warehouseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.warehouseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="quantity"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.warehouseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Units`, 'Inventory']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                <Building2 size={36} className="text-gray-300" />
                <p className="text-sm">No warehouses configured in {countryMeta.name}</p>
                <Link to="/warehouses/new" className="text-xs text-indigo-600 font-bold hover:underline">
                  + Add warehouse in {countryMeta.name}
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Low Stock Warnings</h2>
              <p className="text-xs text-gray-400">SKUs below reorder point in {countryMeta.name}</p>
            </div>
            <Link to="/stock-overview" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Stock Matrix <ArrowRight size={14} />
            </Link>
          </div>
          {stats.lowStockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Product</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">SKU</th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">On-Hand Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.lowStockItems.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 text-sm font-bold text-gray-900">{item.name}</td>
                      <td className="py-3 text-sm text-gray-500 font-mono text-xs">{item.sku}</td>
                      <td className="py-3 text-sm text-right font-bold text-amber-600">{item.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400 gap-2">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <p className="text-sm font-medium text-gray-600">All inventory levels healthy in {countryMeta.name}</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices & Billing for this Country */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Receipt size={18} className="text-indigo-600" />
              Recent Statutory Invoices ({selectedCountry === 'ALL' ? 'Global' : countryMeta.name})
            </h2>
            <p className="text-xs text-gray-400">Latest deliveries billed under {countryMeta.taxSystem || 'statutory'} regime</p>
          </div>
          <Link to="/invoices" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            All Invoices <ArrowRight size={14} />
          </Link>
        </div>

        {stats.recentInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Invoice #</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Customer</th>
                  <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Jurisdiction</th>
                  <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Total Amount</th>
                  <th className="text-center text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentInvoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-3 text-sm font-mono font-bold text-indigo-600">{inv.invoiceNumber}</td>
                    <td className="py-3 text-sm font-semibold text-gray-900">{inv.customer?.name || 'Walk-in Client'}</td>
                    <td className="py-3 text-sm text-gray-500">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-gray-100 font-semibold">
                        <span>{inv.countryCode === 'US' ? '🇺🇸' : inv.countryCode === 'GB' ? '🇬🇧' : inv.countryCode === 'DE' ? '🇩🇪' : inv.countryCode === 'AE' ? '🇦🇪' : inv.countryCode === 'SG' ? '🇸🇬' : '🇮🇳'}</span>
                        <span>{inv.country || 'India'}</span>
                      </span>
                    </td>
                    <td className="py-3 text-sm text-right font-bold text-gray-900 font-mono">
                      {formatCurrency(inv.totalAmount, inv.currency, inv.currencySymbol)}
                    </td>
                    <td className="py-3 text-sm text-center">
                      <span className={`inline-block px-2.5 py-0.5 text-xs font-extrabold rounded-full ${
                        inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        inv.status === 'SENT' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        inv.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-1">
            <Receipt size={30} className="text-gray-300" />
            <p className="text-sm">No statutory invoices issued yet for {countryMeta.name}</p>
            <Link to="/invoices" className="text-xs text-indigo-600 font-bold hover:underline">
              Create new tax invoice
            </Link>
          </div>
        )}
      </div>

      {/* Recent Ledger / Activity */}
      {isManager && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Recent Movements in {selectedCountry === 'ALL' ? 'Global Network' : countryMeta.name}
              </h2>
              <p className="text-xs text-gray-400">Real-time receipts, deliveries, and adjustments</p>
            </div>
            <Link to="/ledger" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
              Full Ledger <ArrowRight size={14} />
            </Link>
          </div>

          {stats.recentLedger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Operation</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Product</th>
                    <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Warehouse</th>
                    <th className="text-right text-xs font-medium text-gray-400 uppercase tracking-wider pb-3">Quantity Delta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentLedger.map(entry => (
                    <tr key={entry._id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 text-sm text-gray-500">{new Date(entry.timestamp || entry.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-sm font-bold text-gray-900">{entry.operation?.type || 'MOVEMENT'}</td>
                      <td className="py-3 text-sm text-gray-600 font-medium">{entry.product?.name || '-'}</td>
                      <td className="py-3 text-sm text-gray-500">{entry.warehouse?.name || '-'}</td>
                      <td className={`py-3 text-sm text-right font-extrabold font-mono ${
                        entry.quantityChange > 0 ? 'text-emerald-600' : entry.quantityChange < 0 ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-1">
              <Clock size={30} className="text-gray-300" />
              <p className="text-sm">No stock movements recorded in {countryMeta.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
