import React, { useState, useEffect } from 'react';
import { Clock, Box, AlertTriangle, ShieldCheck, Filter, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const StockAging = () => {
  const [agingData, setAgingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTier, setSelectedTier] = useState('ALL');

  const fetchAging = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/aging');
      setAgingData(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch aging data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAging();
  }, []);

  // Compute tier unit quantities
  const tiers = ['0-30 days', '31-60 days', '61-90 days', '91-180 days', '180+ days'];
  const tierSummary = {};
  tiers.forEach(t => tierSummary[t] = 0);
  agingData.forEach(item => {
    if (tierSummary[item.category] !== undefined) {
      tierSummary[item.category] += (item.quantity || 0);
    }
  });

  const filteredData = selectedTier === 'ALL' 
    ? agingData 
    : agingData.filter(d => d.category === selectedTier);

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Clock size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Stock Aging Analysis
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Perpetual FIFO batch layer age classification and dead-stock depreciation risk alerts.
          </p>
        </div>

        <FeatureGuide
          title="Stock Aging & Dead-Stock Liquidation"
          subtitle="FIFO batch layer duration across 5 aging tiers"
          category="Working Capital Optimization"
          whatItIs="Breaks down inventory across 5 chronological tiers based on the exact inbound timestamp of each batch layer."
          whyItMatters="Carrying obsolete or slow-moving stock ties up expensive working capital and risks total write-offs from expiry or tech obsolescence. Identifying batches >90 days old triggers transfer to high-demand hubs or clearance sales."
          howToUse={[
            "Filter items by Age Category to see products sitting stagnant on warehouse racks.",
            "Items in 91–180d or 180+d should be prioritized for inter-hub transfer to active hubs.",
            "Compare quantity vs daily demand velocity to project liquidation timelines."
          ]}
          proTip="Our FIFO engine automatically routes the oldest batches first on customer deliveries to minimize aging."
        />
      </div>

      {/* Tier Summary Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {tiers.map((tier) => {
          const qty = tierSummary[tier] || 0;
          const isSelected = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(isSelected ? 'ALL' : tier)}
              className={`p-4 rounded-3xl border text-left transition-all duration-200 ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-900'
              }`}
            >
              <span className={`text-[11px] font-extrabold uppercase tracking-wider block ${
                isSelected ? 'text-indigo-200' : 'text-slate-400'
              }`}>
                {tier}
              </span>
              <p className="text-xl font-extrabold mt-1">
                {qty.toLocaleString()} <span className="text-xs font-normal opacity-80">units</span>
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Calculating FIFO layer batch durations...
        </div>
      ) : filteredData.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Box size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No aging batches recorded</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {selectedTier !== 'ALL' ? `No inventory positions match tier '${selectedTier}'.` : 'Inventory is fully fresh and recently acquired.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold bg-slate-50/50">
            <span>Showing <strong className="text-slate-900">{filteredData.length}</strong> active batch layers</span>
            {selectedTier !== 'ALL' && (
              <button onClick={() => setSelectedTier('ALL')} className="text-indigo-600 hover:text-indigo-800 font-bold">
                Clear Tier Filter
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-6 py-3.5">Product Item</th>
                  <th className="px-6 py-3.5">Warehouse Location</th>
                  <th className="px-6 py-3.5">FIFO Aging Tier</th>
                  <th className="px-6 py-3.5 text-right">Physical Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredData.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{item.product?.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{item.product?.sku}</div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                      {item.warehouse?.name}
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-[11px] font-extrabold rounded-full ${
                        item.category === '0-30 days' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        item.category === '31-60 days' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        item.category === '61-90 days' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {item.category}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900 text-sm">
                      {item.quantity?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockAging;
