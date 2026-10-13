import React, { useState, useEffect } from 'react';
import { TrendingUp, Box, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const StockForecasting = () => {
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [window, setWindow] = useState('30');

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/forecast?window=${window}`);
      setForecastData(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch forecasting data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [window]);

  const getStatusBadge = (status, days) => {
    if (status === 'Critical' || status === 'Stock out' || (days !== null && days <= 7)) {
      return { label: 'Urgent Reorder', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    }
    if (status === 'Warning' || (days !== null && days <= 14)) {
      return { label: 'Replenishment Warning', bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' };
    }
    return { label: 'Adequate Runway', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
  };

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <TrendingUp size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Demand Forecasting & Runways
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Average Daily Usage (ADU) regression and automated replenishment runway projections.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <FeatureGuide
            title="Demand Forecasting & Reorder Automation"
            subtitle="Consumption velocity and stockout runway projections"
            category="Predictive Analytics"
            whatItIs="Analyzes historical daily sales and delivery series to calculate Average Daily Usage (ADU). It calculates exactly how many days of stock remain before a stockout occurs."
            whyItMatters="Eliminates guesswork in purchasing. Automatically signals when On-Hand stock falls below (Lead-Time Demand + Safety Stock), avoiding catastrophic production stoppages."
            howToUse={[
              "Select 7, 30, or 90 days historical consumption window from the dropdown.",
              "Look at Days of Runway: Under 7 days triggers an urgent reorder requirement.",
              "Review Suggested Replenishment quantity to balance economic order quantities (EOQ)."
            ]}
            proTip="When a stockout is projected, check the Transfer Optimizer before issuing a vendor PO to see if surplus can be relocated from another Indian hub!"
          />

          <select
            value={window}
            onChange={(e) => setWindow(e.target.value)}
            className="border border-slate-200/80 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-100 p-2 bg-white text-slate-700 shadow-2xs"
          >
            <option value="7">7-Day Velocity Window</option>
            <option value="30">30-Day Velocity Window</option>
            <option value="90">90-Day Velocity Window</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Calculating consumption velocity regressions...
        </div>
      ) : forecastData.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Box size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No historical deliveries to project</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Once outbound customer dispatches occur, consumption velocity and runway graphs will populate automatically.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-6 py-3.5">Product Item</th>
                  <th className="px-6 py-3.5">Warehouse Location</th>
                  <th className="px-6 py-3.5 text-right">Available Stock</th>
                  <th className="px-6 py-3.5 text-right">Avg Daily Usage (ADU)</th>
                  <th className="px-6 py-3.5 text-right">Days of Runway</th>
                  <th className="px-6 py-3.5 text-center">Supply Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {forecastData.map((item, index) => {
                  const days = item.estimatedDaysRemaining;
                  const badge = getStatusBadge(item.status, days);
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
                        {item.availableStock?.toLocaleString()}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-mono text-slate-600 font-bold">
                        {item.averageDailyUsage ? item.averageDailyUsage.toFixed(2) : '0.00'} / day
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900 text-sm">
                        {days !== null ? (
                          <span className={days <= 7 ? 'text-rose-600' : days <= 14 ? 'text-amber-600' : 'text-slate-900'}>
                            {Math.ceil(days)} days
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">Indefinite</span>
                        )}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-center">
                        <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-[11px] font-extrabold rounded-full border ${badge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></span>
                          {badge.label}
                        </span>
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

export default StockForecasting;
