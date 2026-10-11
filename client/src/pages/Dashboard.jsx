import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, AlertCircle, Clock, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FeatureGuide from '../components/FeatureGuide';

const Dashboard = () => {
  const { user, role } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;

  useEffect(() => {
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

        const products = responses[0].data;
        const stock = responses[1].data;
        const operations = responses[2].data;
        const warehouses = responses[3].data;
        
        let ledger = [];
        let valuation = [];
        if (isManager) {
          ledger = responses[4].data;
          valuation = responses[5].data;
        }

        // KPI Calculations
        const totalPortfolioValue = valuation.reduce((acc, curr) => acc + curr.totalValue, 0);
        const totalProducts = products.length;
        
        let totalStockQuantity = 0;
        const stockByProduct = {};
        const stockByWarehouse = {};
        
        warehouses.forEach(w => stockByWarehouse[w.name] = 0);

        stock.forEach(s => {
          totalStockQuantity += s.quantity;
          stockByProduct[s.product._id] = (stockByProduct[s.product._id] || 0) + s.quantity;
          if (s.warehouse?.name) {
            stockByWarehouse[s.warehouse.name] += s.quantity;
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
          name,
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
          recentLedger: ledger.slice(0, 5)
        });
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-gray-500">Loading Dashboard...</div>;
  }

  if (error) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5">Real-time supply chain telemetry across Indian regional distribution hubs</p>
        </div>
        <FeatureGuide
          title="Supply Chain Command Center"
          subtitle="Real-time multi-hub intelligence & inventory telemetry"
          category="Executive Dashboard"
          whatItIs="The central mission control for your multi-warehouse network. It aggregates live stock quantities, total portfolio balance sheet valuation in INR (₹), low-stock warnings, and real-time ledger movements across Mumbai, Delhi-NCR, Bengaluru, and Chennai."
          whyItMatters="Enables managers and executives to identify inventory bottlenecks, prevent critical stockouts, and monitor stock turnover without manually consolidating disparate warehouse spreadsheets."
          howToUse={[
            "Monitor Total Valuation & Units across the top KPI metric cards.",
            "Inspect the Low Stock Warning banner to trigger purchase orders or inter-hub transfers.",
            "Analyze the Facility Breakdown chart to see inventory concentration across zones.",
            "Review Recent Stock Movements to track real-time receipt, delivery, and transfer operations."
          ]}
          proTip="Restricted workers only see operational KPIs for their assigned facility, while managers see enterprise-wide metrics."
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Package size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Products</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
          </div>
        </div>
        {isManager ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={24} /></div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">₹{stats.totalPortfolioValue?.toLocaleString('en-IN')}</p>
            </div>
          </div>
        ) : null}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Stock Qty</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStockQuantity}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Low Stock</p>
            <p className="text-2xl font-bold text-gray-900">{stats.lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertCircle size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Out of Stock</p>
            <p className="text-2xl font-bold text-gray-900">{stats.outOfStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Clock size={24} /></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Ops</p>
            <p className="text-2xl font-bold text-gray-900">{stats.pendingOperationsCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Stock by Warehouse</h2>
          <div className="h-72">
            {stats.warehouseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.warehouseChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="quantity"
                    label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {stats.warehouseChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Units']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">No stock data available</div>
            )}
          </div>
        </div>

        {/* Low Stock Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Low Stock Alerts</h2>
          {stats.lowStockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Product</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">SKU</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Current Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.lowStockItems.map(item => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="py-3 text-sm text-gray-500">{item.sku}</td>
                      <td className="py-3 text-sm text-right font-medium text-red-600">{item.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">All products are adequately stocked</div>
          )}
        </div>
      </div>

      {/* Recent Ledger / Activity */}
      {isManager && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Stock Movements</h2>
          {stats.recentLedger.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Date</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Operation</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Product</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Warehouse</th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-3">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentLedger.map(entry => (
                    <tr key={entry._id} className="hover:bg-gray-50">
                      <td className="py-3 text-sm text-gray-500">{new Date(entry.timestamp).toLocaleString()}</td>
                      <td className="py-3 text-sm font-medium text-gray-900">{entry.operation?.type || 'UNKNOWN'}</td>
                      <td className="py-3 text-sm text-gray-500">{entry.product?.name || '-'}</td>
                      <td className="py-3 text-sm text-gray-500">{entry.warehouse?.name || '-'}</td>
                      <td className={`py-3 text-sm text-right font-medium ${entry.quantityChange > 0 ? 'text-green-600' : entry.quantityChange < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400">No recent activities</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
