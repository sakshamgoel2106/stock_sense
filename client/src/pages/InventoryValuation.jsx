import React, { useState, useEffect } from 'react';
import { DollarSign, Box, ShieldCheck, TrendingUp, Layers, CheckCircle2 } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const InventoryValuation = () => {
  const [valuationData, setValuationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchValuation = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/valuation');
      setValuationData(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch valuation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValuation();
  }, []);

  const totalPortfolioValue = valuationData.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
  const totalUnits = valuationData.reduce((acc, curr) => acc + (curr.totalQuantity || 0), 0);

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-2xl">
              <DollarSign size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Perpetual FIFO Inventory Valuation
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Asset balance sheet tracking powered by granular First-In-First-Out procurement cost layers.
          </p>
        </div>

        <FeatureGuide
          title="FIFO Perpetual Inventory Valuation"
          subtitle="GAAP / Ind AS compliant asset reporting"
          category="Financial Accounting"
          whatItIs="Calculates the real financial value of all physical inventory held in stock across warehouses. Evaluated using First-In-First-Out (FIFO) perpetual cost layers."
          whyItMatters="Essential for corporate balance sheets, P&L reporting, working capital audits, and insurance coverage. Eliminates distortion caused by price inflation."
          howToUse={[
            "Check the total portfolio valuation card in Indian Rupees (₹).",
            "Review the table to see unit cost layers and extended total values per SKU and hub.",
            "Track how outgoing deliveries consume the oldest cost layers first to calculate accurate COGS."
          ]}
          proTip="Valuation accurately excludes reserved units from unencumbered liquidity while preserving asset totals on balance sheets."
        />
      </div>

      {/* Portfolio Value Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-tr from-emerald-600 to-teal-700 rounded-3xl p-6 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-200 uppercase tracking-wider block">
              Total Corporate Inventory Assets
            </span>
            <p className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
              ₹{totalPortfolioValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-emerald-100 mt-1">
              GAAP & Ind AS compliant perpetual FIFO balance
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 border border-white/20">
            <DollarSign size={30} className="text-white" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Valued Physical Units
            </span>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1 tracking-tight">
              {totalUnits.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Spread across {valuationData.length} SKU positions
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
            <Layers size={28} />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Aggregating perpetual FIFO batch layers...
        </div>
      ) : valuationData.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Box size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No inventory valuation records found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Inbound PO receipts generate perpetual FIFO batch cost layers automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-6 py-3.5">Product Item</th>
                  <th className="px-6 py-3.5">Warehouse Hub</th>
                  <th className="px-6 py-3.5 text-right">Physical Quantity</th>
                  <th className="px-6 py-3.5 text-right">Avg Batch Cost</th>
                  <th className="px-6 py-3.5 text-right">Extended Asset Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {valuationData.map((item, index) => {
                  const avgCost = item.totalQuantity > 0 ? (item.totalValue / item.totalQuantity) : 0;
                  return (
                    <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{item.product?.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{item.product?.sku}</div>
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                        {item.warehouse?.name}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900">
                        {item.totalQuantity?.toLocaleString()}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-slate-500 font-semibold">
                        ₹{avgCost.toFixed(2)}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-extrabold text-emerald-700 font-mono text-sm">
                        ₹{item.totalValue?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryValuation;
