import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  BookOpen, 
  Filter, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowRightLeft, 
  Sliders, 
  X, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Package, 
  Hash, 
  RefreshCw 
} from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const StockLedger = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [opFilter, setOpFilter] = useState('ALL');

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

  useEffect(() => {
    fetchLedger();
  }, []);

  const formatTimestamp = (entry) => {
    const raw = entry.createdAt || entry.timestamp || entry.updatedAt;
    if (!raw) return { time: '--:--', date: 'Invalid Date', full: '' };
    const d = new Date(raw);
    if (isNaN(d.getTime())) return { time: '--:--', date: 'Invalid Date', full: '' };
    return {
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
      full: d.toLocaleString()
    };
  };

  const filteredLedger = useMemo(() => {
    return ledger.filter(entry => {
      const search = searchTerm.toLowerCase().trim();
      const opType = (entry.operationType || entry.operation?.type || 'ADJUSTMENT').toUpperCase();
      const refCode = (entry.operation?._id || entry._id || '').toString().toLowerCase();
      
      const prodName = entry.product?.name?.toLowerCase() || '';
      const prodSku = entry.product?.sku?.toLowerCase() || '';
      const whName = entry.warehouse?.name?.toLowerCase() || '';
      const whCode = entry.warehouse?.code?.toLowerCase() || '';
      const userName = entry.user?.name?.toLowerCase() || '';

      const matchesSearch = 
        !search ||
        prodName.includes(search) ||
        prodSku.includes(search) ||
        whName.includes(search) ||
        whCode.includes(search) ||
        opType.toLowerCase().includes(search) ||
        refCode.includes(search) ||
        userName.includes(search);

      const matchesOp = 
        opFilter === 'ALL' || 
        opType === opFilter;

      return matchesSearch && matchesOp;
    });
  }, [ledger, searchTerm, opFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;
    let receiptsCount = 0;
    let deliveriesCount = 0;

    ledger.forEach(entry => {
      const change = Number(entry.quantityChange) || 0;
      if (change > 0) totalInflow += change;
      if (change < 0) totalOutflow += Math.abs(change);

      const opType = (entry.operationType || entry.operation?.type || 'ADJUSTMENT').toUpperCase();
      if (opType === 'RECEIPT') receiptsCount++;
      if (opType === 'DELIVERY') deliveriesCount++;
    });

    return {
      totalTransactions: ledger.length,
      totalInflow,
      totalOutflow,
      receiptsCount,
      deliveriesCount
    };
  }, [ledger]);

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <BookOpen size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Immutable Stock Ledger
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Complete double-entry transactional audit trail for every physical unit entering, leaving, or moving between facilities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLedger}
            disabled={loading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            title="Refresh Ledger"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <FeatureGuide
            title="Immutable Stock Ledger & Audit Trail"
            subtitle="Double-entry perpetual inventory movement records"
            category="Governance & Compliance"
            whatItIs="An append-only historical journal recording every single inventory fluctuation. It captures the exact timestamp, operation reference, SKU, warehouse, quantity change, and resulting balance."
            whyItMatters="Prevents fraud, tracks shrinkage, and satisfies strict statutory audit requirements (such as GST e-way compliance and ISO inventory audits)."
            howToUse={[
              "Use the search box to trace specific SKUs, facilities, or reference codes.",
              "Filter by operation type (RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT).",
              "Verify opening stock, delta movement, and resulting closing balance."
            ]}
            proTip="Ledger records cannot be edited or deleted once written, guaranteeing mathematical audit integrity."
          />
        </div>
      </div>

      {/* Overview Stat Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Records</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Hash size={14} /></span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">
            {stats.totalTransactions.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Immutable ledger logs</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Inward</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><ArrowDownToLine size={14} /></span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 mt-2 font-mono">
            +{stats.totalInflow.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{stats.receiptsCount} receipt actions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Total Outward</span>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><ArrowUpFromLine size={14} /></span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 mt-2 font-mono">
            -{stats.totalOutflow.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{stats.deliveriesCount} dispatch actions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtered View</span>
            <span className="p-1.5 bg-slate-100 text-slate-600 rounded-lg"><Filter size={14} /></span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-2 font-mono">
            {filteredLedger.length.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Matching current filters</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-8 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium transition-all"
            placeholder="Search SKU, item, facility, ref, or user..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')} 
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Operation Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Operations' },
            { id: 'RECEIPT', label: 'Receipts' },
            { id: 'DELIVERY', label: 'Deliveries' },
            { id: 'TRANSFER', label: 'Transfers' },
            { id: 'ADJUSTMENT', label: 'Adjustments' }
          ].map(op => (
            <button
              key={op.id}
              onClick={() => setOpFilter(op.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                opFilter === op.id 
                  ? 'bg-indigo-600 text-white shadow-2xs' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {op.label}
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
        <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs font-semibold">
          Loading immutable stock ledger audit logs...
        </div>
      ) : filteredLedger.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center flex flex-col items-center justify-center">
          <BookOpen size={40} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800">No ledger transactions found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {searchTerm || opFilter !== 'ALL' 
              ? 'Try clearing search terms or switching operation filter to view entries.' 
              : 'All inventory movements automatically write permanent ledger transactions.'}
          </p>
          {(searchTerm || opFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setOpFilter('ALL'); }}
              className="mt-4 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[1050px]">
              <thead className="bg-slate-50/90 border-b border-slate-100">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-[11px]">
                  <th className="px-5 py-4 w-44">Timestamp</th>
                  <th className="px-5 py-4 w-32">Txn Ref</th>
                  <th className="px-5 py-4 min-w-[200px]">Product / SKU</th>
                  <th className="px-5 py-4 min-w-[180px]">Facility Hub</th>
                  <th className="px-5 py-4 w-36">Movement Type</th>
                  <th className="px-5 py-4 w-36">Performed By</th>
                  <th className="px-5 py-4 w-28 text-right">Opening Qty</th>
                  <th className="px-5 py-4 w-32 text-right">Delta Change</th>
                  <th className="px-5 py-4 w-32 text-right">Closing Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLedger.map((entry) => {
                  const isPositive = Number(entry.quantityChange) > 0;
                  const isNegative = Number(entry.quantityChange) < 0;
                  const ts = formatTimestamp(entry);
                  const opType = (entry.operationType || entry.operation?.type || 'ADJUSTMENT').toUpperCase();

                  const refCode = entry.operation?._id 
                    ? `REF-${entry.operation._id.slice(-6).toUpperCase()}`
                    : `TXN-${entry._id.slice(-6).toUpperCase()}`;

                  return (
                    <tr key={entry._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Timestamp */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400 shrink-0" />
                          <span>{ts.date}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                          <Clock size={11} className="text-slate-400 shrink-0" />
                          <span>{ts.time}</span>
                        </div>
                      </td>

                      {/* Transaction Reference */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {refCode}
                        </span>
                      </td>

                      {/* Product Name & SKU */}
                      <td className="px-5 py-3.5">
                        <div className="font-extrabold text-slate-900 leading-snug">
                          {entry.product?.name || 'Unspecified SKU'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50/80 px-1.5 py-0.2 rounded border border-indigo-100">
                            {entry.product?.sku || '-'}
                          </span>
                          {entry.product?.unitOfMeasure && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              ({entry.product.unitOfMeasure})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Facility Warehouse */}
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <Building2 size={13} className="text-slate-400 shrink-0" />
                          <span>{entry.warehouse?.name || 'All Facilities'}</span>
                        </div>
                        {entry.warehouse?.code && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            Code: {entry.warehouse.code}
                          </div>
                        )}
                      </td>

                      {/* Operation Type */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] tracking-wide inline-flex items-center gap-1 border ${
                          opType === 'RECEIPT' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          opType === 'DELIVERY' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          opType === 'TRANSFER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {opType === 'RECEIPT' && <ArrowDownToLine size={11} />}
                          {opType === 'DELIVERY' && <ArrowUpFromLine size={11} />}
                          {opType === 'TRANSFER' && <ArrowRightLeft size={11} />}
                          {opType === 'ADJUSTMENT' && <Sliders size={11} />}
                          {opType}
                        </span>
                      </td>

                      {/* Performed By User */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <User size={13} className="text-slate-400 shrink-0" />
                          <span>{entry.user?.name || 'Automated Bot'}</span>
                        </div>
                        {entry.user?.role && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {entry.user.role}
                          </div>
                        )}
                      </td>

                      {/* Opening Balance */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono text-slate-500 font-semibold text-xs">
                        {entry.previousQuantity !== undefined ? entry.previousQuantity.toLocaleString() : '-'}
                      </td>

                      {/* Delta Change */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono">
                        <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold inline-block border ${
                          isPositive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : isNegative 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {isPositive ? `+${entry.quantityChange.toLocaleString()}` : entry.quantityChange?.toLocaleString()}
                        </span>
                      </td>

                      {/* Closing Resulting Balance */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right font-mono font-black text-slate-900 text-sm">
                        {entry.newQuantity !== undefined ? entry.newQuantity.toLocaleString() : '-'}
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
