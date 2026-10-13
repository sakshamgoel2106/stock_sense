import React, { useState, useEffect } from 'react';
import { Search, BookOpen, Filter, ArrowDownToLine, ArrowUpFromLine, ArrowRightLeft, Sliders, X } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const StockLedger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [opFilter, setOpFilter] = useState('ALL');

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const res = await api.get('/inventory/ledger');
        setLedger(res.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load stock ledger transactions');
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, []);

  const filteredLedger = ledger.filter(entry => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      !searchTerm ||
      entry.product?.name?.toLowerCase().includes(search) ||
      entry.product?.sku?.toLowerCase().includes(search) ||
      entry.warehouse?.name?.toLowerCase().includes(search) ||
      entry.operation?.type?.toLowerCase().includes(search);

    const matchesOp = 
      opFilter === 'ALL' || 
      entry.operation?.type === opFilter;

    return matchesSearch && matchesOp;
  });

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BookOpen size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Immutable Stock Ledger
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete double-entry transactional audit trail for every physical unit entering, leaving, or moving between facilities.
          </p>
        </div>

        <FeatureGuide
          title="Immutable Stock Ledger & Audit Trail"
          subtitle="Double-entry perpetual inventory movement records"
          category="Governance & Compliance"
          whatItIs="An append-only historical journal recording every single inventory fluctuation. It captures the exact timestamp, operation reference, SKU, warehouse, quantity change, and resulting balance."
          whyItMatters="Prevents fraud, tracks shrinkage, and satisfies strict statutory audit requirements (such as GST e-way compliance and ISO inventory audits)."
          howToUse={[
            "Use the search box to trace specific SKUs or reference codes.",
            "Filter by operation type (RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT).",
            "Verify the resulting quantity against physical shelf balance."
          ]}
          proTip="Ledger records cannot be edited or deleted once written, guaranteeing mathematical audit integrity."
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
            placeholder="Search SKU, item, facility, or ref..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Operation Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'].map(op => (
            <button
              key={op}
              onClick={() => setOpFilter(op)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                opFilter === op 
                  ? 'bg-indigo-600 text-white shadow-2xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {op === 'ALL' ? 'All Transactions' : op}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Loading immutable ledger history...
        </div>
      ) : filteredLedger.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <BookOpen size={36} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800">No ledger transactions found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {searchTerm || opFilter !== 'ALL' ? 'Try clearing your filters to see full history.' : 'All stock operations write permanent ledger entries automatically.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-5 py-3.5">Product Item</th>
                  <th className="px-5 py-3.5">Facility Hub</th>
                  <th className="px-5 py-3.5">Operation Type</th>
                  <th className="px-5 py-3.5 text-right">Delta Change</th>
                  <th className="px-5 py-3.5 text-right">Resulting Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredLedger.map((entry) => {
                  const isPositive = entry.quantityChange > 0;
                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-500">
                        <div className="font-semibold text-slate-700">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900">{entry.product?.name || '-'}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{entry.product?.sku || '-'}</div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                        {entry.warehouse?.name || '-'}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${
                          entry.operation?.type === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          entry.operation?.type === 'DELIVERY' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          entry.operation?.type === 'TRANSFER' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {entry.operation?.type || 'ADJUSTMENT'}
                        </span>
                        {entry.operation?._id && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Ref: #{entry.operation._id.slice(-6).toUpperCase()}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-extrabold">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-mono font-bold ${
                          isPositive ? 'bg-emerald-50 text-emerald-700' : entry.quantityChange < 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isPositive ? `+${entry.quantityChange}` : entry.quantityChange}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900 text-sm">
                        {entry.newQuantity !== undefined ? entry.newQuantity : '-'}
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

export default StockLedger;
