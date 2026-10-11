import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Filter, Printer, CreditCard, 
  DollarSign, CheckCircle2, Clock, AlertTriangle, Eye, 
  ArrowUpRight, Building2, Truck, RefreshCw, Download,
  TrendingUp, Sparkles, ShieldCheck, Share2, Copy, ChevronRight,
  Calendar, Layers, Check, ArrowRight, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import { MNC_COUNTRIES, formatCurrency } from '../lib/countries';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalInvoices: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [countryFilter, setCountryFilter] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
    fetchWarehouses();
  }, [statusFilter, warehouseFilter, countryFilter]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data || []);
    } catch (e) {
      console.error('Failed to load warehouses for filter', e);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (warehouseFilter !== 'ALL') params.warehouse = warehouseFilter;
      if (countryFilter !== 'ALL') params.countryCode = countryFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/invoices', { params });
      setInvoices(res.data || []);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/invoices/stats');
      setStats(res.data || {});
    } catch (err) {
      console.error('Failed to fetch invoice stats', err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchInvoices();
  };

  const handleOpenDetail = (inv) => {
    setSelectedInvoice(inv);
    setShowDetailModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchInvoices();
    fetchStats();
  };

  const handleExportExcel = () => {
    if (!invoices.length) {
      toast.error('No invoices to export');
      return;
    }

    const exportRows = invoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Country': inv.country || 'India',
      'Country Code': inv.countryCode || 'IN',
      'Currency': inv.currency || 'INR',
      'Invoice Date': new Date(inv.invoiceDate).toLocaleDateString(),
      'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'On Receipt',
      'Customer Name': inv.customer?.name || '',
      'Customer Phone': inv.customer?.phone || '',
      'Customer Tax ID / GSTIN': inv.customer?.taxId || inv.customer?.gstin || '',
      'Fulfillment Hub': inv.sourceWarehouse?.name || '',
      'Linked Delivery': inv.operation ? `#${inv.operation._id?.slice(-6)?.toUpperCase()}` : 'Direct Sale',
      'Subtotal': inv.subtotal,
      'Total Tax': inv.taxBreakdown?.totalTax || 0,
      'Grand Total': inv.totalAmount,
      'Paid Amount': inv.paidAmount || 0,
      'Payment Status': inv.status,
      'Payment Method': inv.paymentMethod || 'PENDING'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `StockSense_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Invoices spreadsheet exported successfully!');
  };

  const getCustomerInitials = (name) => {
    if (!name) return 'CU';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarGradient = (name) => {
    const charCode = (name || 'A').charCodeAt(0);
    const gradients = [
      'from-indigo-500 to-purple-600',
      'from-emerald-500 to-teal-600',
      'from-blue-500 to-cyan-600',
      'from-amber-500 to-orange-600',
      'from-rose-500 to-pink-600',
      'from-violet-500 to-fuchsia-600'
    ];
    return gradients[charCode % gradients.length];
  };

  // Efficiency percentage
  const collectionRatio = stats.totalBilled > 0 
    ? Math.min(100, Math.round((stats.totalPaid / stats.totalBilled) * 100)) 
    : 100;

  return (
    <div className="space-y-7 pb-10">
      
      {/* ── Executive Hero Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-2xl border border-indigo-900/40">
        
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold backdrop-blur-md">
              <Sparkles size={13} className="text-amber-300" />
              <span>Enterprise Commercial Suite</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-300 font-bold">GST Compliance Ready</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Billing & Invoices
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Commercial invoicing engine seamlessly unified with physical warehouse fulfillment. 
              Dispatched customer deliveries generate tax invoices, while internal hub transfers remain strictly unbilled.
            </p>

            {/* Live Collection Progress Strip */}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Settlement Velocity:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">{collectionRatio}%</span>
              </div>
              <div className="w-36 sm:w-48 h-2 rounded-full bg-slate-800 overflow-hidden p-0.5 border border-slate-700/60">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700 shadow-sm"
                  style={{ width: `${collectionRatio}%` }}
                />
              </div>
              <span className="text-slate-400 hidden sm:inline">
                ₹{(stats.totalPaid || 0).toLocaleString('en-IN')} collected of ₹{(stats.totalBilled || 0).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <FeatureGuide
              title="Commercial Billing & Invoicing Engine"
              subtitle="Built-in GST billing connected directly to customer deliveries."
              category="Billing & Commerce"
              whatItIs="An enterprise-grade customer billing and GST tax invoice generation module that natively bridges logistics deliveries with commercial accounting."
              whyItMatters="Companies no longer need external billing software. Dispatched delivery orders can be converted into compliant GST tax invoices with automatic CGST, SGST, IGST calculations, payment recording, and physical inventory deduction in one click."
              howToUse={[
                "Click '+ New Customer Bill' to create an invoice for any buyer.",
                "Enable 'Deduct Stock Automatically' to generate a verified delivery order from the warehouse simultaneously.",
                "Alternatively, in the Deliveries page, click 'Generate Bill' on any customer delivery.",
                "Internal Transfers are strictly stock reallocations and never generate customer bills.",
                "Click on any invoice row to view or print the official Indian GST Tax Invoice."
              ]}
              proTip="Internal warehouse transfers are never billed. Invoicing is exclusively triggered for customer delivery dispatches."
            />

            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md shadow-sm transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Download size={15} /> Export Excel
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-950/40 transition-all flex items-center gap-2 hover:scale-[1.02] border border-emerald-400/30"
            >
              <Plus size={18} /> New Customer Bill
            </button>
          </div>

        </div>

      </div>

      {/* ── Executive Metric KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Billed */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/70 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Billed Volume</span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Receipt size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            ₹{(stats.totalBilled || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold text-indigo-600 font-mono">{stats.totalInvoices || 0}</span>
            <span>total tax invoices generated</span>
          </div>
        </div>

        {/* Collected Revenue */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-emerald-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/70 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Collected Revenue</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
            ₹{(stats.totalPaid || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
            <span className="font-bold font-mono">{stats.paidCount || 0}</span>
            <span>bills fully settled via UPI / Bank</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-amber-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/70 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">Receivables Pending</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono tracking-tight">
            ₹{(stats.totalOutstanding || 0).toLocaleString('en-IN')}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
            <span className="font-bold font-mono">{stats.pendingCount || 0}</span>
            <span>invoices awaiting clearance</span>
          </div>
        </div>

        {/* Overdue Risk */}
        <div className="relative overflow-hidden bg-white rounded-3xl p-6 border border-red-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50/70 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-red-600">Overdue Invoices</span>
            <div className="p-2.5 rounded-2xl bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-tight">
            {stats.overdueCount || 0}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
            <span>deadline passed • follow-up required</span>
          </div>
        </div>

      </div>

      {/* ── Search, Hub Filter & Tab Hub ── */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
            {[
              { id: 'ALL', label: 'All Invoices', count: stats.totalInvoices },
              { id: 'SENT', label: 'Unpaid / Sent', count: stats.pendingCount },
              { id: 'PAID', label: 'Paid in Full', count: stats.paidCount },
              { id: 'PARTIALLY_PAID', label: 'Partial', count: null },
              { id: 'DRAFT', label: 'Drafts', count: null }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== null && tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    statusFilter === tab.id ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* MNC Country / Jurisdiction Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs">
              <Globe size={14} className="text-indigo-600" />
              <span className="text-slate-400 font-semibold">Country:</span>
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">🌐 All Jurisdictions</option>
                {MNC_COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.currency})
                  </option>
                ))}
              </select>
            </div>

            {/* Warehouse Hub Filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs">
              <span className="text-slate-400 font-semibold">Hub:</span>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Regional Hubs</option>
                {warehouses.map(w => (
                  <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Invoice #, Customer, Tax ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 w-52 sm:w-64 font-medium transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all shadow-sm"
              >
                Search
              </button>
            </form>

          </div>

        </div>

      </div>

      {/* ── Premium Invoices Table ── */}
      {loading ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-500 space-y-3">
          <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-600 animate-spin">
            <RefreshCw size={28} />
          </div>
          <p className="text-sm font-bold text-slate-800">Refreshing billing ledger...</p>
          <p className="text-xs text-slate-400">Loading customer tax invoices & settlement statuses.</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-5 rounded-3xl bg-slate-100 text-slate-400">
            <Receipt size={48} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Invoices Match Current Filter</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Create a direct customer tax bill or dispatch a verified delivery order from the warehouse to generate a bill automatically.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setWarehouseFilter('ALL');
                setCountryFilter('ALL');
                setSearch('');
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Create Customer Bill
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-5 text-left">Invoice No / Jurisdiction</th>
                  <th className="py-4 px-5 text-left">Customer / Consignee</th>
                  <th className="py-4 px-5 text-left">Fulfillment Hub</th>
                  <th className="py-4 px-5 text-left">Stock Delivery</th>
                  <th className="py-4 px-5 text-right">Invoice Amount</th>
                  <th className="py-4 px-5 text-center">Settlement Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isPartiallyPaid = inv.status === 'PARTIALLY_PAID';
                  const isOverdue = inv.status === 'OVERDUE' || (!isPaid && inv.dueDate && new Date(inv.dueDate) < new Date());
                  const initials = getCustomerInitials(inv.customer?.name);
                  const avatarGrad = getAvatarGradient(inv.customer?.name);
                  const flag = inv.countryCode === 'US' ? '🇺🇸' : inv.countryCode === 'GB' ? '🇬🇧' : inv.countryCode === 'DE' ? '🇩🇪' : inv.countryCode === 'AE' ? '🇦🇪' : inv.countryCode === 'SG' ? '🇸🇬' : '🇮🇳';

                  return (
                    <tr 
                      key={inv._id} 
                      className="hover:bg-indigo-50/30 transition-colors group"
                    >
                      
                      {/* Invoice # & Date */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDetail(inv)}
                            className="font-black text-indigo-600 hover:text-indigo-800 font-mono tracking-wide text-xs text-left flex items-center gap-1.5 group-hover:translate-x-0.5 transition-transform"
                          >
                            <Receipt size={14} className="text-indigo-500 shrink-0" />
                            <span>{inv.invoiceNumber}</span>
                          </button>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold flex items-center gap-1 border border-slate-200">
                            <span>{flag}</span>
                            <span>{inv.countryCode || 'IN'}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                          <Calendar size={12} />
                          <span>{new Date(inv.invoiceDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-slate-500">{inv.currency || 'INR'}</span>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-2xl bg-gradient-to-tr ${avatarGrad} flex items-center justify-center text-white font-extrabold text-[11px] shadow-sm shrink-0`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{inv.customer?.name}</div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2.5 mt-0.5">
                              {inv.customer?.phone && <span>{inv.customer.phone}</span>}
                              {(inv.customer?.taxId || inv.customer?.gstin) && (
                                <span className="font-mono text-indigo-700 font-semibold bg-indigo-50 px-1 rounded">
                                  ID: {inv.customer?.taxId || inv.customer?.gstin}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse Hub */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-800">{inv.sourceWarehouse?.name || 'Central Hub'}</div>
                        {inv.sourceWarehouse?.code && (
                          <div className="text-[10px] text-slate-400 font-mono">{inv.sourceWarehouse.code}</div>
                        )}
                      </td>

                      {/* Linked Delivery */}
                      <td className="py-4 px-5">
                        {inv.operation ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-mono text-[11px] font-bold">
                            <Truck size={12} className="text-emerald-600" />
                            DEL #{inv.operation._id?.slice(-6)?.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Direct Sale</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-5 text-right">
                        <div className="font-black text-slate-900 font-mono text-sm">
                          {formatCurrency(inv.totalAmount, inv.currency, inv.currencySymbol)}
                        </div>
                        {inv.paidAmount > 0 && !isPaid && (
                          <div className="text-[10px] text-emerald-600 font-bold font-mono mt-0.5">
                            Recd: {formatCurrency(inv.paidAmount, inv.currency, inv.currencySymbol)}
                          </div>
                        )}
                        {!isPaid && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Due: {formatCurrency(inv.totalAmount - (inv.paidAmount || 0), inv.currency, inv.currencySymbol)}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100/80 text-emerald-800 border border-emerald-300 shadow-sm">
                            <CheckCircle2 size={12} /> Settled
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-300 shadow-sm">
                            <Clock size={12} /> Partial
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100/80 text-red-800 border border-red-300 shadow-sm animate-pulse">
                            <AlertTriangle size={12} /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                            <Clock size={12} /> Payment Due
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(inv)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs transition-colors flex items-center gap-1"
                            title="View official GST Tax Invoice"
                          >
                            <Eye size={13} /> View Bill
                          </button>
                          
                          <button
                            onClick={() => handleOpenDetail(inv)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                            title="Print / Save PDF"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer Summary */}
          <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              Showing <strong className="text-slate-800 font-mono">{invoices.length}</strong> tax invoices
            </div>
            <div className="flex items-center gap-4 font-mono">
              <span>Billed Total: <strong className="text-slate-900">₹{invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0).toLocaleString('en-IN')}</strong></span>
            </div>
          </div>

        </div>
      )}

      {/* ── High-Fidelity Tax Invoice Modal ── */}
      <InvoiceDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* ── Create Invoice Modal ── */}
      <CreateInvoiceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchInvoices();
          fetchStats();
        }}
      />

    </div>
  );
};

export default Invoices;
