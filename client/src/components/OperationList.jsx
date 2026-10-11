import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, CheckCircle, Clock, Receipt, FileText } from 'lucide-react';
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
      : 'Are you sure you want to validate this operation? This will affect stock.';
    if (!window.confirm(confirmMsg)) return;
    
    try {
      setValidating(id);
      if (isPendingTransfer) {
        await api.put(`/inventory/operations/${id}/approve`);
      }
      await api.post(`/inventory/operations/${id}/validate`);
      alert(isPendingTransfer ? 'Transfer approved and validated successfully!' : 'Operation validated successfully!');
      fetchOperations();
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to validate operation');
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
          whatItIs: "Moves physical inventory between your regional hubs (e.g. from Delhi-NCR to Mumbai Bhiwandi) to prevent emergency stockouts without spending capital on new supplier purchases.",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">{title}</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{guide.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          <FeatureGuide
            title={guide.title}
            subtitle={guide.subtitle}
            category={guide.category}
            whatItIs={guide.whatItIs}
            whyItMatters={guide.whyItMatters}
            howToUse={guide.howToUse}
            proTip={guide.proTip}
          />
          <Link to={newLink} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all">
            <Plus size={18} /> New {title.slice(0, -1)}
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading {title.toLowerCase()}...
        </div>
      ) : operations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg font-medium">No {title.toLowerCase()} found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID / Date</th>
                  {type !== 'RECEIPT' && type !== 'ADJUSTMENT' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>}
                  {type !== 'DELIVERY' && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {operations.map((op) => (
                  <tr key={op._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{op._id.slice(-6).toUpperCase()}</div>
                      <div className="text-sm text-gray-500">{new Date(op.createdAt).toLocaleDateString()}</div>
                    </td>
                    {type !== 'RECEIPT' && type !== 'ADJUSTMENT' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {op.sourceWarehouse?.name || '-'}
                      </td>
                    )}
                    {type !== 'DELIVERY' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {op.destinationWarehouse?.name || '-'}
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {op.items.map(item => (
                        <div key={item.product?._id}>{item.product?.name} ({type === 'ADJUSTMENT' ? 'Counted: ' : ''}{item.quantity})</div>
                      ))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {op.type === 'TRANSFER' && op.approvalStatus === 'PENDING' ? (
                        <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <Clock size={13} className="mr-1 inline mt-0.5" />
                          Pending Approval
                        </span>
                      ) : (
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          op.status === 'VALIDATED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {op.status === 'VALIDATED' ? <CheckCircle size={14} className="mr-1 inline" /> : <Clock size={14} className="mr-1 inline" />}
                          {op.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {/* Customer Delivery Invoicing (Strictly for DELIVERY, never for TRANSFER) */}
                      {op.type === 'DELIVERY' && (
                        op.invoice ? (
                          <button
                            onClick={() => handleViewInvoice(op.invoice)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-colors"
                            title="View & Print Customer GST Tax Invoice"
                          >
                            <Receipt size={13} className="text-emerald-600" />
                            Bill: {op.invoice.invoiceNumber || 'View'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGenerateInvoice(op)}
                            disabled={billingId === op._id}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1 shadow-sm transition-colors disabled:opacity-50"
                            title="Generate Customer GST Tax Invoice for this delivery"
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
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all disabled:opacity-50"
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
                            className="text-indigo-600 hover:text-indigo-900 font-medium disabled:opacity-50"
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
