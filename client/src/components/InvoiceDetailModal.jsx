import React, { useState } from 'react';
import { 
  X, Printer, CheckCircle2, Clock, AlertTriangle, 
  Building2, Phone, Mail, MapPin, Receipt, CreditCard, 
  DollarSign, ArrowUpRight, ShieldCheck, QrCode
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

// Helper to convert number to Indian words
function numberToIndianWords(num) {
  if (!num || isNaN(num)) return 'Zero Rupees Only';
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = Math.floor(num);
  if (n === 0) return 'Zero Rupees Only';

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
  }

  return (inWords(n).trim() + ' Rupees Only').replace(/\s+/g, ' ');
}

const InvoiceDetailModal = ({ isOpen, onClose, invoice, onPaymentSuccess }) => {
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(invoice?.totalAmount - (invoice?.paidAmount || 0) || 0);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  if (!isOpen || !invoice) return null;

  const isPaid = invoice.status === 'PAID';
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';
  const isOverdue = invoice.status === 'OVERDUE' || (!isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date());

  const handlePrint = () => {
    window.print();
  };

  const handleRecordPaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingPayment(true);
      const res = await api.post(`/invoices/${invoice._id}/payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
        paymentReference,
        paymentDate: new Date()
      });
      toast.success('Payment recorded successfully!');
      setRecordingPayment(false);
      if (onPaymentSuccess) onPaymentSuccess(res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:max-h-none print:w-full">
        
        {/* Top Control Bar (Hidden on print) */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2.5">
            <Receipt className="text-emerald-400" size={22} />
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Customer Tax Invoice</h2>
              <p className="text-xs text-slate-400">{invoice.invoiceNumber} • {invoice.customer?.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isPaid && !recordingPayment && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.totalAmount - (invoice.paidAmount || 0));
                  setRecordingPayment(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
              >
                <CreditCard size={14} /> Record Payment
              </button>
            )}

            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Inline Record Payment Form */}
        {recordingPayment && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-4 print:hidden">
            <form onSubmit={handleRecordPaymentSubmit} className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                <CreditCard size={16} /> Collect Payment:
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">Amount (₹):</label>
                <input
                  type="number"
                  min="1"
                  max={invoice.totalAmount - (invoice.paidAmount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-28 px-2.5 py-1 text-xs border rounded-lg bg-white font-bold text-gray-800"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">Mode:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-2.5 py-1 text-xs border rounded-lg bg-white text-gray-800"
                >
                  <option value="UPI">UPI / QR</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 font-medium">Ref / UTR:</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-123891"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-32 px-2.5 py-1 text-xs border rounded-lg bg-white text-gray-800"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {submittingPayment ? 'Saving...' : 'Confirm Received'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingPayment(false)}
                  className="text-gray-500 hover:text-gray-700 text-xs px-2 py-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Printable Invoice Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-gray-800 space-y-6 print:p-0 print:overflow-visible">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-gray-200 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-base shadow-sm">
                  S
                </div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  {invoice.company?.name || 'StockSense Logistics Pvt Ltd'}
                </h1>
              </div>
              <p className="text-xs text-gray-500 max-w-sm">
                {invoice.company?.address || 'Plot 42, Logistics Hub'}, {invoice.company?.city || 'Mumbai'}, {invoice.company?.state || 'Maharashtra'} - {invoice.company?.pincode || '421302'}
              </p>
              <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                <span><strong>GSTIN:</strong> {invoice.company?.gstin || '27AABCS1429B1Z1'}</span>
                <span><strong>Phone:</strong> {invoice.company?.phone || '+91 98200 12345'}</span>
                <span><strong>Email:</strong> {invoice.company?.email || 'billing@stocksense.in'}</span>
              </div>
            </div>

            <div className="sm:text-right flex flex-col items-start sm:items-end">
              <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold uppercase tracking-widest rounded-md mb-2">
                Tax Invoice
              </div>
              <div className="text-xl font-black text-gray-900 font-mono">
                {invoice.invoiceNumber}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Date: <strong className="text-gray-700">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
              </div>
              <div className="text-xs text-gray-500">
                Due: <strong className="text-gray-700">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Due on Receipt'}</strong>
              </div>

              {/* Status Stamp */}
              <div className="mt-3">
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 size={13} /> Paid in Full
                  </span>
                ) : isPartiallyPaid ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    <Clock size={13} /> Partially Paid (₹{invoice.paidAmount})
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-300">
                    <AlertTriangle size={13} /> Overdue Payment
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                    <Clock size={13} /> Payment Due
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Billed To & Dispatched From Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Billed To (Customer / Consignee)
              </div>
              <div className="text-sm font-black text-gray-900">{invoice.customer?.name}</div>
              {invoice.customer?.gstin && (
                <div className="text-xs text-indigo-700 font-semibold mt-0.5">
                  GSTIN: {invoice.customer.gstin}
                </div>
              )}
              <div className="text-xs text-gray-600 mt-1">
                {invoice.customer?.address?.street && <div>{invoice.customer.address.street}</div>}
                {(invoice.customer?.address?.city || invoice.customer?.address?.state) && (
                  <div>
                    {invoice.customer.address.city}, {invoice.customer.address.state} - {invoice.customer.address.pincode}
                  </div>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex gap-3">
                {invoice.customer?.phone && <span>📞 {invoice.customer.phone}</span>}
                {invoice.customer?.email && <span>✉️ {invoice.customer.email}</span>}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Fulfillment & Dispatch Node
              </div>
              <div className="text-sm font-black text-gray-900">
                {invoice.sourceWarehouse?.name || 'Central Distribution Hub'}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Hub Code: <strong>{invoice.sourceWarehouse?.code || 'WH-01'}</strong>
              </div>
              {invoice.operation && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Linked Stock Delivery: #{invoice.operation._id?.slice(-6)?.toUpperCase() || 'DELIVERY'}
                </div>
              )}
              {invoice.paymentReference && (
                <div className="text-xs text-gray-500 mt-1">
                  Payment Ref: <strong>{invoice.paymentReference}</strong> ({invoice.paymentMethod})
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-slate-100 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Description / Product</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price (₹)</th>
                  <th className="py-3 px-3 text-center">GST %</th>
                  <th className="py-3 px-4 text-right">Tax (₹)</th>
                  <th className="py-3 px-4 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900">{item.name}</div>
                      {item.sku && <div className="text-[11px] text-gray-500 font-mono">SKU: {item.sku}</div>}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-gray-800">{item.quantity}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-700">₹{item.unitPrice?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3 text-center text-gray-600">{item.taxRate}%</td>
                    <td className="py-3 px-4 text-right text-gray-600">₹{item.taxAmount?.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 font-mono">₹{item.lineTotal?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            
            {/* Left: Amount in Words & Bank Details */}
            <div className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Amount in Words:</div>
                <div className="text-xs font-bold text-gray-900 italic mt-0.5">
                  {numberToIndianWords(invoice.totalAmount)}
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> Bank & Settlement Details
                </div>
                <div className="text-gray-700"><strong>Bank:</strong> HDFC Bank Ltd • Industrial Branch</div>
                <div className="text-gray-700"><strong>A/C No:</strong> 50200088912344 (Current Account)</div>
                <div className="text-gray-700"><strong>IFSC:</strong> HDFC0001892</div>
                <div className="text-indigo-700 font-semibold"><strong>UPI ID:</strong> stocksense@hdfcbank</div>
              </div>
            </div>

            {/* Right: Calculations */}
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Taxable Subtotal:</span>
                <span className="font-semibold text-gray-800 font-mono">₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between text-gray-600">
                  <span>IGST (Integrated GST):</span>
                  <span className="font-semibold text-gray-800 font-mono">₹{invoice.taxBreakdown?.igst?.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST (Central GST):</span>
                    <span className="font-semibold text-gray-800 font-mono">₹{invoice.taxBreakdown?.cgst?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST (State GST):</span>
                    <span className="font-semibold text-gray-800 font-mono">₹{invoice.taxBreakdown?.sgst?.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              {invoice.shippingCharge > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Delivery & Freight:</span>
                  <span className="font-semibold text-gray-800 font-mono">₹{invoice.shippingCharge?.toLocaleString('en-IN')}</span>
                </div>
              )}

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount Applied:</span>
                  <span className="font-semibold font-mono">- ₹{invoice.discountTotal?.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="border-t border-slate-300 pt-2 flex justify-between items-baseline text-base font-black text-gray-900">
                <span>Grand Total (INR):</span>
                <span className="text-lg font-black text-indigo-700 font-mono">₹{invoice.totalAmount?.toLocaleString('en-IN')}</span>
              </div>

              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                  <span>Paid Amount:</span>
                  <span className="font-mono">₹{invoice.paidAmount?.toLocaleString('en-IN')}</span>
                </div>
              )}

              {!isPaid && (
                <div className="flex justify-between text-red-600 font-bold pt-1 border-t border-dashed border-red-200">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono">₹{(invoice.totalAmount - (invoice.paidAmount || 0))?.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Terms & Signatory */}
          <div className="pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <div className="font-bold text-gray-700 mb-0.5">Terms & Conditions:</div>
              <p className="leading-relaxed">{invoice.terms}</p>
            </div>
            <div className="sm:text-right flex flex-col justify-end items-start sm:items-end pt-4 sm:pt-0">
              <div className="w-36 border-b border-gray-400 mb-1"></div>
              <div className="font-bold text-gray-800">Authorized Signatory</div>
              <div className="text-[11px] text-gray-500">For {invoice.company?.name || 'StockSense'}</div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default InvoiceDetailModal;
