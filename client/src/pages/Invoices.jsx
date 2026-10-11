import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Filter, Printer, CreditCard, 
  DollarSign, CheckCircle2, Clock, AlertTriangle, Eye, 
  ArrowUpRight, Building2, Truck, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';
import InvoiceDetailModal from '../components/InvoiceDetailModal';
import CreateInvoiceModal from '../components/CreateInvoiceModal';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    totalInvoices: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
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

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Receipt className="text-indigo-600" size={30} /> Billing & Invoices
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Customer tax invoicing, delivery dispatch billing, GST calculations & revenue tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all"
          >
            <Plus size={18} /> New Customer Bill
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Billed</div>
            <div className="text-2xl font-black text-gray-900 font-mono mt-1">
              ₹{(stats.totalBilled || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">{stats.totalInvoices || 0} total invoices</div>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <Receipt size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Collected Revenue</div>
            <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
              ₹{(stats.totalPaid || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-0.5">{stats.paidCount || 0} fully settled</div>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Receivables</div>
            <div className="text-2xl font-black text-amber-600 font-mono mt-1">
              ₹{(stats.totalOutstanding || 0).toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-600 font-medium mt-0.5">{stats.pendingCount || 0} pending payments</div>
          </div>
          <div className="p-3 rounded-2xl bg-amber-50 text-amber-600">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overdue Bills</div>
            <div className="text-2xl font-black text-red-600 font-mono mt-1">
              {stats.overdueCount || 0}
            </div>
            <div className="text-[11px] text-red-500 font-medium mt-0.5">Payment deadline passed</div>
          </div>
          <div className="p-3 rounded-2xl bg-red-50 text-red-600">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'SENT', label: 'Unpaid / Sent' },
            { id: 'PAID', label: 'Paid in Full' },
            { id: 'PARTIALLY_PAID', label: 'Partially Paid' },
            { id: 'DRAFT', label: 'Draft' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search invoice #, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Search
          </button>
        </form>

      </div>

      {/* Invoices Data Table */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-500">
          <RefreshCw size={32} className="animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-semibold">Loading billing invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 flex flex-col items-center justify-center text-gray-500">
          <Receipt size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-bold text-gray-800">No invoices found</p>
          <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
            Generate your first customer bill or dispatch a delivery order to start tracking revenue.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Create First Invoice
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead className="bg-slate-50 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 text-left">Invoice No / Date</th>
                  <th className="py-3.5 px-4 text-left">Customer / Consignee</th>
                  <th className="py-3.5 px-4 text-left">Fulfillment Hub</th>
                  <th className="py-3.5 px-4 text-left">Stock Delivery</th>
                  <th className="py-3.5 px-4 text-right">Grand Total (₹)</th>
                  <th className="py-3.5 px-4 text-center">Payment Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoices.map((inv) => {
                  const isPaid = inv.status === 'PAID';
                  const isPartiallyPaid = inv.status === 'PARTIALLY_PAID';
                  const isOverdue = inv.status === 'OVERDUE' || (!isPaid && inv.dueDate && new Date(inv.dueDate) < new Date());

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/70 transition-colors">
                      
                      {/* Invoice # & Date */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="font-black text-indigo-600 hover:text-indigo-800 font-mono tracking-wide text-xs text-left"
                        >
                          {inv.invoiceNumber}
                        </button>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{inv.customer?.name}</div>
                        <div className="text-[11px] text-gray-500 flex gap-2 mt-0.5">
                          {inv.customer?.phone && <span>{inv.customer.phone}</span>}
                          {inv.customer?.gstin && <span className="font-mono text-indigo-600">GST: {inv.customer.gstin}</span>}
                        </div>
                      </td>

                      {/* Warehouse Hub */}
                      <td className="py-3 px-4 text-gray-600">
                        <div className="font-medium text-gray-800">{inv.sourceWarehouse?.name || 'All Warehouses'}</div>
                        {inv.sourceWarehouse?.code && (
                          <div className="text-[10px] text-gray-400 font-mono">{inv.sourceWarehouse.code}</div>
                        )}
                      </td>

                      {/* Linked Delivery */}
                      <td className="py-3 px-4">
                        {inv.operation ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono text-[11px] font-semibold">
                            <Truck size={12} className="text-emerald-600" />
                            DEL #{inv.operation._id?.slice(-6)?.toUpperCase()}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Direct Counter Sale</span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-black text-gray-900 font-mono text-sm">
                          ₹{inv.totalAmount?.toLocaleString('en-IN')}
                        </div>
                        {inv.paidAmount > 0 && !isPaid && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Paid: ₹{inv.paidAmount?.toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 size={11} /> Paid
                          </span>
                        ) : isPartiallyPaid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={11} /> Partial
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                            <AlertTriangle size={11} /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                            <Clock size={11} /> Unpaid
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View & Print Tax Invoice"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Print / Save PDF"
                        >
                          <Printer size={16} />
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Detail / Printable Modal */}
      <InvoiceDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Create Invoice Modal */}
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
