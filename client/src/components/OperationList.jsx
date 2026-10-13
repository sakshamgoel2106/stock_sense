import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, CheckCircle, Clock, Receipt, FileText, Search, 
  Filter, CheckCircle2, AlertCircle, ArrowRightLeft, 
  ArrowDownToLine, ArrowUpFromLine, Sliders, ChevronRight
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FeatureGuide from './FeatureGuide';
import InvoiceDetailModal from './InvoiceDetailModal';
import toast from 'react-hot-toast';

const OperationList = ({ title, type, newLink }) => {
  const { user, role } = useAuth();
  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;

  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validating, setValidating] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [billingId, setBillingId] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleViewInvoice = async (invoiceRef) => {
    try {
      const invId = typeof invoiceRef === 'object' ? invoiceRef._id : invoiceRef;
      const res = await api.get(`/invoices/${invId}`);
      setSelectedInvoice(res.data);
      setShowInvoiceModal(true);
    } catch (err) {
      toast.error('Failed to load invoice details');
    }
  };

  const handleGenerateInvoice = async (op) => {
    try {
      setBillingId(op._id);
      const res = await api.post(`/invoices/from-delivery/${op._id}`);
      toast.success(`Tax Invoice generated for Delivery #${op._id.slice(-6).toUpperCase()}!`);
      setSelectedInvoice(res.data);
      setShowInvoiceModal(true);
      fetchOperations();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setBillingId(null);
    }
  };

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/operations');
      const filtered = res.data.filter(op => op.type === type);
      setOperations(filtered);
      setError(null);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to fetch operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, [type]);

  const handleValidate = async (id, isPendingTransfer = false) => {
    const confirmMsg = isPendingTransfer
      ? 'Authorize and dispatch this inter-warehouse transfer? This will move stock between hubs.'
      : 'Are you sure you want to validate this operation? This will affect physical stock balance.';
    if (!window.confirm(confirmMsg)) return;
    
    try {
      setValidating(id);
      if (isPendingTransfer) {
        await api.put(`/inventory/operations/${id}/approve`);
      }
      await api.post(`/inventory/operations/${id}/validate`);
      toast.success(isPendingTransfer ? 'Transfer authorized & stock reallocated!' : 'Operation validated successfully!');
      fetchOperations();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to validate operation');
    } finally {
      setValidating(null);
    }
  };

  const getGuideProps = () => {
    switch (type) {
      case 'RECEIPT':
        return {
          title: "Inbound Goods Receipts (PO Receiving)",
          subtitle: "Vendor goods arrival, inspection & FIFO layer creation",
          category: "Inbound Logistics",
          icon: <ArrowDownToLine size={24} className="text-indigo-600" />,
          whatItIs: "Logs physical deliveries arriving from vendors into a specific warehouse. Each receipt generates an immutable StockLayer with procurement price and timestamp.",
          whyItMatters: "Forms the bedrock of FIFO valuation. Every batch must be received before it can be assigned to customer orders or moved between hubs.",
          howToUse: [
            "Click 'New Receipt' to record supplier arrivals.",
            "Select destination warehouse, product SKU, and verified received quantity.",
            "Click 'Validate' to finalize the receipt and credit physical on-hand stock."
          ],
          proTip: "Worker accounts can record receipts for their assigned facility."
        };
      case 'DELIVERY':
        return {
          title: "Outbound Customer Deliveries",
          subtitle: "Sales order dispatches & FIFO layer consumption",
          category: "Outbound Fulfillment",
          icon: <ArrowUpFromLine size={24} className="text-blue-600" />,
          whatItIs: "Dispatches stock from the warehouse for client delivery. Automatically burns through the oldest active FIFO layers first.",
          whyItMatters: "Calculates precise Cost of Goods Sold (COGS) and updates stock ledgers in real-time, preventing inventory discrepancies.",
          howToUse: [
            "Create a delivery operation referencing the customer order.",
            "Verify requested quantities against Available-To-Promise (ATP) balances.",
            "Validate to deduct stock and generate outbound shipping ledgers."
          ],
          proTip: "Deliveries automatically respect client reservations, locking reserved units for designated buyers."
        };
      case 'TRANSFER':
        return {
          title: "Inter-Warehouse Transfers",
          subtitle: "Domestic hub-to-hub stock rebalancing",
          category: "Network Logistics",
          icon: <ArrowRightLeft size={24} className="text-purple-600" />,
          whatItIs: "Moves physical inventory between your regional hubs to prevent emergency stockouts without spending capital on new supplier purchases.",
          whyItMatters: "Saves massive working capital and reduces lead times (1-2 days inter-hub vs 15-30 days supplier lead time).",
          howToUse: [
            "Select source warehouse (with surplus) and destination hub (in shortage).",
            "Transfer enters PENDING approval state to comply with company transfer policies.",
            "Once approved by Company Admin or Manager, validating moves stock into transit and reassigns FIFO layers."
          ],
          proTip: "Our Transfer Optimizer only recommends transfers when the source warehouse holds surplus strictly above its own safety buffer."
        };
      default:
        return {
          title: "Inventory Stock Adjustments",
          subtitle: "Shrinkage, scrap & physical count reconciliation",
          category: "Stock Assurance",
          icon: <Sliders size={24} className="text-amber-600" />,
          whatItIs: "Manually re-aligns computer records with physical warehouse quantities when goods are damaged, expired, or misplaced.",
          whyItMatters: "Maintains financial reporting integrity and prevents phantom stock from blocking orders.",
          howToUse: [
            "Choose warehouse and SKU requiring adjustment.",
            "Enter positive or negative quantity offset with an audit reason.",
            "Validate to update on-hand positions and write ledger entries."
          ],
          proTip: "Always use Smart Audits for multi-SKU cycle counts rather than individual manual adjustments."
        };
    }
  };

  const guide = getGuideProps();

  // Filtered operations
  const filteredOps = operations.filter(op => {
    const matchesStatus = 
      statusFilter === 'ALL' ? true :
      statusFilter === 'PENDING' ? (op.approvalStatus === 'PENDING' || op.status === 'DRAFT') :
      op.status === statusFilter;

    const searchLower = search.toLowerCase();
    const matchesSearch = 
      !search ||
      op._id.toLowerCase().includes(searchLower) ||
      op.sourceWarehouse?.name?.toLowerCase().includes(searchLower) ||
      op.destinationWarehouse?.name?.toLowerCase().includes(searchLower) ||
      op.items?.some(i => i.product?.name?.toLowerCase().includes(searchLower) || i.product?.sku?.toLowerCase().includes(searchLower));

    return matchesStatus && matchesSearch;
  });

  const totalCount = operations.length;
  const validatedCount = operations.filter(o => o.status === 'VALIDATED').length;
  const pendingCount = operations.filter(o => o.status === 'DRAFT' || o.approvalStatus === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Top Heading Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            {guide.icon}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{guide.subtitle}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <FeatureGuide
            title={guide.title}
            subtitle={guide.subtitle}
            category={guide.category}
            whatItIs={guide.whatItIs}
            whyItMatters={guide.whyItMatters}
            howToUse={guide.howToUse}
            proTip={guide.proTip}
          />
          <Link 
            to={newLink} 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98"
          >
            <Plus size={16} /> New {title.slice(0, -1)}
          </Link>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Recorded</p>
            <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
            {totalCount}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Validated & Posted</p>
            <p className="text-xl font-extrabold text-emerald-700 mt-0.5">{validatedCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Pending Authorization</p>
            <p className="text-xl font-extrabold text-amber-700 mt-0.5">{pendingCount}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search reference, hub, or product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto">
          {['ALL', 'VALIDATED', 'PENDING'].map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === tab
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200/70 text-slate-600'
              }`}
            >
              {tab === 'ALL' ? 'All Operations' : tab === 'VALIDATED' ? 'Validated' : 'Draft / Pending'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Operations Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Loading {title.toLowerCase()} telemetry...
        </div>
      ) : filteredOps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <FileText size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No {title.toLowerCase()} found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search ? 'Try adjusting your search terms or filter criteria.' : `Click 'New ${title.slice(0, -1)}' to record your first operation.`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-5 py-3.5">Ref / Date</th>
                  {type !== 'RECEIPT' && type !== 'ADJUSTMENT' && <th className="px-5 py-3.5">Source Facility</th>}
                  {type !== 'DELIVERY' && <th className="px-5 py-3.5">Destination Hub</th>}
                  <th className="px-5 py-3.5">SKU & Quantity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOps.map((op) => (
                  <tr key={op._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900 font-mono">
                        #{op._id.slice(-6).toUpperCase()}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(op.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </td>

                    {type !== 'RECEIPT' && type !== 'ADJUSTMENT' && (
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                        {op.sourceWarehouse?.name || '-'}
                      </td>
                    )}

                    {type !== 'DELIVERY' && (
                      <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                        {op.destinationWarehouse?.name || '-'}
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-slate-700">
                      <div className="space-y-1">
                        {op.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{item.product?.name || 'Item'}</span>
                            <span className="text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono">
                              {type === 'ADJUSTMENT' ? 'Counted: ' : 'Qty: '}{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {op.type === 'TRANSFER' && op.approvalStatus === 'PENDING' ? (
                        <span className="px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock size={12} /> Pending Approval
                        </span>
                      ) : (
                        <span className={`px-2.5 py-1 inline-flex items-center gap-1 text-[11px] font-extrabold rounded-full ${
                          op.status === 'VALIDATED' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {op.status === 'VALIDATED' ? <CheckCircle size={12} /> : <Clock size={12} />}
                          {op.status}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-2">
                      {/* Customer Delivery Invoicing */}
                      {op.type === 'DELIVERY' && (
                        op.invoice ? (
                          <button
                            onClick={() => handleViewInvoice(op.invoice)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                            title="View & Print Customer GST Tax Invoice"
                          >
                            <Receipt size={13} className="text-emerald-600" />
                            Bill: {op.invoice.invoiceNumber || 'View'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateInvoice(op)}
                            disabled={billingId === op._id}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1 shadow-2xs transition-colors disabled:opacity-50"
                            title="Generate Customer GST Tax Invoice"
                          >
                            <Receipt size={13} />
                            {billingId === op._id ? 'Billing...' : 'Generate Bill'}
                          </button>
                        )
                      )}

                      {op.status === 'DRAFT' && (
                        op.type === 'TRANSFER' && op.approvalStatus === 'PENDING' ? (
                          isManager ? (
                            <button
                              onClick={() => handleValidate(op._id, true)}
                              disabled={validating === op._id}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
                            >
                              {validating === op._id ? 'Processing...' : 'Approve & Validate'}
                            </button>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium italic">
                              Awaiting Approval
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => handleValidate(op._id, false)}
                            disabled={validating === op._id}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm transition-all disabled:opacity-50"
                          >
                            {validating === op._id ? 'Validating...' : 'Validate'}
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Linked Invoice Modal */}
      <InvoiceDetailModal
        isOpen={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        invoice={selectedInvoice}
        onPaymentSuccess={fetchOperations}
      />
    </div>
  );
};

export default OperationList;
