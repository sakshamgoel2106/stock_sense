import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Filter, Printer, CreditCard, 
  DollarSign, CheckCircle2, Clock, AlertTriangle, Eye, 
  ArrowUpRight, Building2, Truck, RefreshCw, Download,
  TrendingUp, Sparkles, ShieldCheck, Share2, Copy, ChevronRight,
  Calendar, Layers, Check, ArrowRight, UserCheck, Tag, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import CreateInvoiceModal from '../components/CreateInvoiceModal';
import PaymentReceiptModal from '../components/PaymentReceiptModal';

const Invoices = () => {
  // Primary Navigation View: 'invoices' or 'payments'
  const [activeView, setActiveView] = useState('invoices');

  // Invoices State
  const [invoices, setInvoices] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalInvoices: 0,
    totalPaymentTransactions: 0,
    paidCount: 0,
    pendingCount: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  // Payments State
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
    fetchWarehouses();
  }, [statusFilter, warehouseFilter]);

  useEffect(() => {
    if (activeView === 'payments') {
      fetchPayments();
    }
  }, [activeView, paymentMethodFilter]);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data || []);
    } catch (e) {
      console.error('Failed to load warehouses', e);
    }
  };

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (warehouseFilter !== 'ALL') params.warehouse = warehouseFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/invoices', { params });
      setInvoices(res.data || []);
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoadingPayments(true);
      const params = {};
      if (paymentMethodFilter !== 'ALL') params.paymentMethod = paymentMethodFilter;
      if (paymentSearch.trim()) params.search = paymentSearch.trim();

      const res = await api.get('/invoices/payments/all', { params });
      setPayments(res.data || []);
    } catch (err) {
      toast.error('Failed to load payment transactions');
    } finally {
      setLoadingPayments(false);
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

  const handlePaymentSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayments();
  };

  const handleOpenDetail = (inv) => {
    setSelectedInvoice(inv);
    setShowDetailModal(true);
  };

  const handleOpenReceiptFromPayment = (p) => {
    setSelectedReceipt(p);
    setShowReceiptModal(true);
  };

  const handlePaymentSuccess = () => {
    fetchInvoices();
    fetchStats();
    if (activeView === 'payments') fetchPayments();
  };

  const handleExportInvoicesExcel = () => {
    if (!invoices.length) {
      toast.error('No invoices to export');
      return;
    }

    const exportRows = invoices.map(inv => ({
      'Invoice Number': inv.invoiceNumber,
      'Invoice Date': new Date(inv.invoiceDate).toLocaleDateString('en-IN'),
      'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : 'On Receipt',
      'Customer Name': inv.customer?.name || '',
      'Customer Phone': inv.customer?.phone || '',
      'Customer GSTIN': inv.customer?.gstin || '',
      'Fulfillment Hub': inv.sourceWarehouse?.name || '',
      'Linked Delivery': inv.operation ? `#${inv.operation._id?.slice(-6)?.toUpperCase()}` : 'Direct Sale',
      'Subtotal (₹)': inv.subtotal,
      'Total Tax (₹)': inv.taxBreakdown?.totalTax || 0,
      'Grand Total (₹)': inv.totalAmount,
      'Paid Amount (₹)': inv.paidAmount || 0,
      'Payment Status': inv.status,
      'Payment Method': inv.paymentMethod || 'PENDING'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `StockSense_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Invoices spreadsheet exported successfully!');
  };

  const handleExportPaymentsExcel = () => {
    if (!payments.length) {
      toast.error('No payment records to export');
      return;
    }

    const exportRows = payments.map(p => ({
      'Receipt Number': p.receiptNumber,
      'Payment Date': new Date(p.paymentDate).toLocaleDateString('en-IN'),
      'Invoice Number': p.invoiceNumber,
      'Customer Name': p.customerName,
      'Payment Channel': p.paymentMethod,
      'Transaction Ref / UTR': p.transactionReference || 'N/A',
      'Bank Name': p.bankName || 'N/A',
      'Amount Received (₹)': p.amount,
      'Status': p.status,
      'Recorded By': p.recordedBy?.name || 'Staff'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payment Receipts');
    XLSX.writeFile(wb, `StockSense_Payment_Receipts_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Payment receipts spreadsheet exported successfully!');
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

  // Payments calculations
  const totalPaymentsAmount = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const upiPaymentsAmount = payments.filter(p => p.paymentMethod === 'UPI').reduce((acc, p) => acc + (p.amount || 0), 0);
  const bankPaymentsAmount = payments.filter(p => p.paymentMethod === 'BANK_TRANSFER' || p.paymentMethod === 'NET_BANKING').reduce((acc, p) => acc + (p.amount || 0), 0);

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
              <span>Commercial Billing & Payment Center</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-300 font-bold">GST Compliance Ready</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Billing & Payment Records
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Commercial invoicing and payment settlement ledger unified with warehouse fulfillment. 
              Track GST tax invoices, record multi-channel payments, and issue official money receipts.
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
              whatItIs="An enterprise customer billing and GST tax invoice generation module that natively bridges logistics deliveries with commercial accounting and payment tracking."
              whyItMatters="Companies no longer need external billing software. Dispatched deliveries generate tax invoices, payments can be tracked across UPI, Bank Transfer, Card, and Cheque, and verified money receipts are generated on the spot."
              howToUse={[
                "Toggle between 'Invoices & Bills' and 'Payment Records & Receipts' to inspect collections.",
                "Click '+ New Customer Bill' to create an invoice for any buyer.",
                "Record full or partial customer payments directly with transaction reference, bank details, and remarks.",
                "Print official Rule 46 GST tax invoices or standalone Payment Receipt Vouchers."
              ]}
              proTip="Internal warehouse transfers are never billed. Invoicing is exclusively triggered for customer delivery dispatches."
            />

            <button
              onClick={activeView === 'invoices' ? handleExportInvoicesExcel : handleExportPaymentsExcel}
              className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/15 backdrop-blur-md shadow-sm transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Download size={15} /> Export {activeView === 'invoices' ? 'Invoices' : 'Payments'}
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

      {/* ── Master Section Switcher Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveView('invoices')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all ${
            activeView === 'invoices'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <Receipt size={16} />
          <span>Invoices & Bills</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeView === 'invoices' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {stats.totalInvoices || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveView('payments')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-extrabold transition-all ${
            activeView === 'payments'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <CreditCard size={16} />
          <span>Payment Records & Receipts</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
            activeView === 'payments' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 text-emerald-700'
          }`}>
            {stats.totalPaymentTransactions || payments.length || 0}
          </span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────────────────
          VIEW 1: INVOICES & BILLS
      ────────────────────────────────────────────────────────── */}
      {activeView === 'invoices' && (
        <div className="space-y-6">
          {/* Executive Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* Total Billed */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">Total Billed Volume</span>
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Receipt size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                ₹{(stats.totalBilled || 0).toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                <span className="font-bold text-indigo-600 font-mono">{stats.totalInvoices || 0}</span> tax invoices generated
              </div>
            </div>

            {/* Collected Revenue */}
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600">Collected Revenue</span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                ₹{(stats.totalPaid || 0).toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-xs text-emerald-700">
                <span className="font-bold font-mono">{stats.paidCount || 0}</span> bills fully settled
              </div>
            </div>

            {/* Outstanding Receivables */}
            <div className="bg-white rounded-3xl p-6 border border-amber-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-600">Receivables Pending</span>
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                  <Clock size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono tracking-tight">
                ₹{(stats.totalOutstanding || 0).toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-xs text-amber-700">
                <span className="font-bold font-mono">{stats.pendingCount || 0}</span> awaiting clearance
              </div>
            </div>

            {/* Overdue Risk */}
            <div className="bg-white rounded-3xl p-6 border border-red-200/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-red-600">Overdue Invoices</span>
                <div className="p-2.5 rounded-2xl bg-red-50 text-red-600">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-red-600 font-mono tracking-tight">
                {stats.overdueCount || 0}
              </div>
              <div className="mt-2 text-xs text-red-700 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                <span>deadline passed • follow-up required</span>
              </div>
            </div>

          </div>

          {/* Search, Hub Filter & Tab Hub */}
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

              {/* Search & Warehouse Filter */}
              <div className="flex flex-wrap items-center gap-3">
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

                <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Invoice #, Customer, GSTIN..."
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

          {/* Invoices Table */}
          {loading ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <div className="p-4 rounded-3xl bg-indigo-50 text-indigo-600 animate-spin">
                <RefreshCw size={28} />
              </div>
              <p className="text-sm font-bold text-slate-800">Refreshing billing ledger...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-5 rounded-3xl bg-slate-100 text-slate-400">
                <Receipt size={48} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">No Invoices Match Current Filter</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Create a direct customer tax bill or dispatch a verified delivery order from the warehouse.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-5 text-left">Invoice No / Date</th>
                      <th className="py-4 px-5 text-left">Customer / Consignee</th>
                      <th className="py-4 px-5 text-left">Fulfillment Hub</th>
                      <th className="py-4 px-5 text-left">Stock Delivery</th>
                      <th className="py-4 px-5 text-right">Amount (₹)</th>
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

                      return (
                        <tr key={inv._id} className="hover:bg-indigo-50/30 transition-colors group">
                          {/* Invoice # */}
                          <td className="py-4 px-5">
                            <button
                              onClick={() => handleOpenDetail(inv)}
                              className="font-black text-indigo-600 hover:text-indigo-800 font-mono tracking-wide text-xs text-left flex items-center gap-1.5"
                            >
                              <Receipt size={14} className="text-indigo-500 shrink-0" />
                              <span>{inv.invoiceNumber}</span>
                            </button>
                            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                              <Calendar size={12} />
                              <span>{new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
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
                                  {inv.customer?.gstin && (
                                    <span className="font-mono text-indigo-700 font-semibold bg-indigo-50 px-1 rounded">
                                      GST: {inv.customer.gstin}
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
                              ₹{inv.totalAmount?.toLocaleString('en-IN')}
                            </div>
                            {inv.paidAmount > 0 && !isPaid && (
                              <div className="text-[10px] text-emerald-600 font-bold font-mono mt-0.5">
                                Recd: ₹{inv.paidAmount?.toLocaleString('en-IN')}
                              </div>
                            )}
                            {!isPaid && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Due: ₹{(inv.totalAmount - (inv.paidAmount || 0)).toLocaleString('en-IN')}
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

              <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <div>Showing <strong className="text-slate-800 font-mono">{invoices.length}</strong> tax invoices</div>
                <div className="flex items-center gap-4 font-mono">
                  <span>Billed Total: <strong className="text-slate-900">₹{invoices.reduce((acc, i) => acc + (i.totalAmount || 0), 0).toLocaleString('en-IN')}</strong></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────
          VIEW 2: PAYMENT RECORDS & RECEIPTS (THE MASTER SETTLEMENT LEDGER)
      ────────────────────────────────────────────────────────── */}
      {activeView === 'payments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Payment Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <div className="bg-white rounded-3xl p-6 border border-emerald-200/80 shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 block">Total Collections</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight mt-1">
                ₹{totalPaymentsAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Verified funds received across all channels</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-indigo-200/80 shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 block">Payment Receipts</span>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-1">
                {payments.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Individual authenticated receipts issued</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-blue-200/80 shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 block">UPI / QR Collections</span>
              <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono tracking-tight mt-1">
                ₹{upiPaymentsAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Instant real-time mobile settlements</p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-purple-200/80 shadow-sm">
              <span className="text-[11px] font-black uppercase tracking-wider text-purple-600 block">NEFT / RTGS Wire</span>
              <div className="text-2xl sm:text-3xl font-black text-purple-700 font-mono tracking-tight mt-1">
                ₹{bankPaymentsAmount.toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Corporate bank-to-bank transfers</p>
            </div>
          </div>

          {/* Payment Search & Filter Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar w-full md:w-auto">
              {['ALL', 'UPI', 'BANK_TRANSFER', 'NET_BANKING', 'CREDIT_CARD', 'CHEQUE', 'CASH'].map(m => (
                <button
                  key={m}
                  onClick={() => setPaymentMethodFilter(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    paymentMethodFilter === m
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {m === 'ALL' ? 'All Channels' : m.replace('_', ' ')}
                </button>
              ))}
            </div>

            <form onSubmit={handlePaymentSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Receipt #, UTR, Customer, Bank..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-2xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 w-full font-medium"
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

          {/* Payments Records Table */}
          {loadingPayments ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-20 flex flex-col items-center justify-center text-slate-500 space-y-3">
              <div className="p-4 rounded-3xl bg-emerald-50 text-emerald-600 animate-spin">
                <RefreshCw size={28} />
              </div>
              <p className="text-sm font-bold text-slate-800">Loading payment transactions...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-16 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-4 rounded-3xl bg-slate-100 text-slate-400">
                <CreditCard size={40} />
              </div>
              <h3 className="text-base font-bold text-slate-900">No Payment Records Found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Record customer payments from any invoice to generate verifiable receipts in this ledger.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-xs">
                  <thead className="bg-slate-50/80 text-slate-500 font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-4 px-5 text-left">Receipt No / Date</th>
                      <th className="py-4 px-5 text-left">Customer / Consignee</th>
                      <th className="py-4 px-5 text-left">Tax Invoice Ref</th>
                      <th className="py-4 px-5 text-left">Channel & Institution</th>
                      <th className="py-4 px-5 text-left">Transaction UTR / Ref</th>
                      <th className="py-4 px-5 text-right">Amount Received (₹)</th>
                      <th className="py-4 px-5 text-center">Status</th>
                      <th className="py-4 px-5 text-right">Receipt Voucher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-emerald-50/25 transition-colors">
                        
                        {/* Receipt No */}
                        <td className="py-4 px-5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenReceiptFromPayment(p)}
                            className="font-black text-emerald-700 hover:text-emerald-900 font-mono text-xs flex items-center gap-1.5"
                          >
                            <Receipt size={14} className="text-emerald-600" />
                            <span>{p.receiptNumber}</span>
                          </button>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 font-mono">
                            <Calendar size={12} />
                            <span>{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-slate-900">{p.customerName}</div>
                          {p.customerGstin && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">GST: {p.customerGstin}</div>
                          )}
                        </td>

                        {/* Invoice Ref */}
                        <td className="py-4 px-5">
                          <button
                            onClick={async () => {
                              try {
                                const res = await api.get(`/invoices/${p.invoiceId}`);
                                setSelectedInvoice(res.data);
                                setShowDetailModal(true);
                              } catch (e) {
                                toast.error('Failed to load linked invoice');
                              }
                            }}
                            className="font-mono font-extrabold text-indigo-600 hover:text-indigo-800 underline decoration-indigo-300"
                          >
                            {p.invoiceNumber}
                          </button>
                          {p.warehouseName && (
                            <div className="text-[10px] text-slate-400">{p.warehouseName}</div>
                          )}
                        </td>

                        {/* Method & Bank */}
                        <td className="py-4 px-5">
                          <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-[11px]">
                            {p.paymentMethod?.replace('_', ' ')}
                          </span>
                          {p.bankName && (
                            <div className="text-[11px] text-slate-500 font-medium mt-1">
                              {p.bankName}
                            </div>
                          )}
                        </td>

                        {/* Transaction Ref / UTR */}
                        <td className="py-4 px-5">
                          <div className="font-mono text-slate-700 font-semibold text-[11px]">
                            {p.transactionReference || 'Direct Cash / Handover'}
                          </div>
                          {p.payerDetails && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {p.payerDetails}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <div className="font-black text-emerald-700 font-mono text-sm">
                            ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          {p.recordedBy?.name && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              by {p.recordedBy.name}
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={11} /> Credited
                          </span>
                        </td>

                        {/* Action: Print Receipt */}
                        <td className="py-4 px-5 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleOpenReceiptFromPayment(p)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                          >
                            <Printer size={13} /> Voucher
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
                <div>Total <strong className="text-slate-800 font-mono">{payments.length}</strong> authenticated transactions</div>
                <div className="font-mono">
                  Aggregate Sum: <strong className="text-emerald-700 font-bold">₹{totalPaymentsAmount.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>
          )}

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

      {/* ── Standalone Payment Receipt Voucher Modal ── */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        payment={selectedReceipt}
      />

    </div>
  );
};

export default Invoices;
