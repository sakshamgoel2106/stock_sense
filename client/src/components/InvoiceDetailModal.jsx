import React, { useState } from 'react';
import { 
  X, Printer, CheckCircle2, Clock, AlertTriangle, 
  Building2, Phone, Mail, MapPin, Receipt, CreditCard, 
  DollarSign, ArrowUpRight, ShieldCheck, QrCode, Copy, Check,
  Share2, FileText, Send, Sparkles, ExternalLink
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
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !invoice) return null;

  const isPaid = invoice.status === 'PAID';
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';
  const isOverdue = invoice.status === 'OVERDUE' || (!isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date());

  const handlePrint = () => {
    window.print();
  };

  const handleCopyInvoiceNumber = () => {
    navigator.clipboard.writeText(invoice.invoiceNumber);
    setCopiedLink(true);
    toast.success(`Copied ${invoice.invoiceNumber} to clipboard!`);
    setTimeout(() => setCopiedLink(false), 2000);
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

  // Generate UPI QR URI for real scan-to-pay
  const companyName = invoice.company?.name || 'StockSense Logistics';
  const upiString = `upi://pay?pa=stocksense@hdfcbank&pn=${encodeURIComponent(companyName)}&am=${invoice.totalAmount}&cu=INR&tn=${invoice.invoiceNumber}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(upiString)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:max-h-none print:w-full print:rounded-none">
        
        {/* ── Top Executive Action Bar (Hidden when printed) ── */}
        <div className="px-6 py-4 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white font-mono tracking-wider">{invoice.invoiceNumber}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold uppercase">
                  Tax Invoice
                </span>
              </div>
              <p className="text-xs text-slate-400">{invoice.customer?.name} • Issued {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            <button
              onClick={handleCopyInvoiceNumber}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            >
              {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copied' : 'Copy Ref'}</span>
            </button>

            {!isPaid && !recordingPayment && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.totalAmount - (invoice.paidAmount || 0));
                  setRecordingPayment(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <CreditCard size={14} /> Record Payment
              </button>
            )}

            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X size={20} />
            </button>
          </div>

        </div>

        {/* ── Inline Record Payment Drawer (Hidden when printed) ── */}
        {recordingPayment && (
          <div className="bg-emerald-50/90 border-b border-emerald-200 p-4 print:hidden animate-in slide-in-from-top-2 duration-200">
            <form onSubmit={handleRecordPaymentSubmit} className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                <CreditCard size={15} className="text-emerald-600" /> Collect Settlement:
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-700 font-semibold">Amount (₹):</label>
                <input
                  type="number"
                  min="1"
                  max={invoice.totalAmount - (invoice.paidAmount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-28 px-2.5 py-1 text-xs border rounded-lg bg-white font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-700 font-semibold">Channel:</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="px-2.5 py-1 text-xs border rounded-lg bg-white text-slate-800 font-medium"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">NEFT / RTGS (Direct Bank)</option>
                  <option value="CASH">Cash in Hand</option>
                  <option value="CREDIT_CARD">Credit / Debit Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-700 font-semibold">UTR / Ref #:</label>
                <input
                  type="text"
                  placeholder="e.g. UPI-281920"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-32 px-2.5 py-1 text-xs border rounded-lg bg-white text-slate-800 font-mono"
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1 text-xs font-bold rounded-lg shadow disabled:opacity-50"
                >
                  {submittingPayment ? 'Settling...' : 'Confirm Received'}
                </button>
                <button
                  type="button"
                  onClick={() => setRecordingPayment(false)}
                  className="text-slate-500 hover:text-slate-800 text-xs px-2 py-1 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Official High-Fidelity Tax Invoice Body ── */}
        <div className="flex-1 overflow-y-auto p-8 sm:p-12 bg-white text-slate-800 space-y-6 print:p-0 print:overflow-visible">
          
          {/* Header Bar */}
          <div className="border-b-2 border-slate-900 pb-5">
            
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              
              {/* Company Logo & Address */}
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-900 flex items-center justify-center text-white font-black text-lg shadow-sm border border-slate-800">
                    S
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      {invoice.company?.name || 'StockSense Logistics Pvt Ltd'}
                    </h1>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
                      Inventory Logistics & Multi-Hub Supply Chain
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-600 max-w-sm mt-2 leading-relaxed">
                  {invoice.company?.address || 'Plot 42, Logistics Park'}, {invoice.company?.city || 'Thane'}, {invoice.company?.state || 'Maharashtra'} - {invoice.company?.pincode || '421302'}
                </p>

                <div className="text-[11px] text-slate-600 mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
                  <span><strong>GSTIN:</strong> <span className="font-mono text-slate-900">{invoice.company?.gstin || '27AABCS1429B1Z1'}</span></span>
                  <span><strong>PAN:</strong> <span className="font-mono text-slate-900">AABCS1429B</span></span>
                  <span><strong>State Code:</strong> 27 (Maharashtra)</span>
                </div>
              </div>

              {/* Invoice Meta Block */}
              <div className="sm:text-right flex flex-col items-start sm:items-end">
                
                <div className="inline-block px-3 py-1 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-md mb-2">
                  TAX INVOICE (ORIGINAL FOR RECIPIENT)
                </div>

                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {invoice.invoiceNumber}
                </div>

                <div className="text-xs text-slate-600 mt-1 space-y-0.5">
                  <div>Invoice Date: <strong className="text-slate-900 font-mono">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></div>
                  <div>Payment Due: <strong className="text-slate-900 font-mono">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Due on Receipt'}</strong></div>
                  <div>Place of Supply: <strong className="text-slate-900">{invoice.customer?.address?.state || 'Maharashtra (27)'}</strong></div>
                </div>

                {/* Rubber Stamp Graphic */}
                <div className="mt-3">
                  {isPaid ? (
                    <div className="transform -rotate-6 inline-block border-2 border-emerald-600 text-emerald-700 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-emerald-50/80 shadow-sm">
                      ✓ PAID & SETTLED
                    </div>
                  ) : isPartiallyPaid ? (
                    <div className="transform -rotate-6 inline-block border-2 border-amber-600 text-amber-700 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-amber-50/80 shadow-sm">
                      PARTIALLY PAID (₹{invoice.paidAmount})
                    </div>
                  ) : isOverdue ? (
                    <div className="transform -rotate-6 inline-block border-2 border-red-600 text-red-700 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-red-50/80 shadow-sm animate-pulse">
                      OVERDUE FOR PAYMENT
                    </div>
                  ) : (
                    <div className="transform -rotate-6 inline-block border-2 border-slate-700 text-slate-800 px-3 py-1 rounded-md text-[11px] font-black uppercase tracking-widest bg-slate-50/80 shadow-sm">
                      PAYMENT DUE
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>

          {/* ── Bill To & Dispatch Hub Details Grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            
            {/* Customer Details */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Building2 size={12} className="text-indigo-600" /> Billed To (Buyer / Consignee)
              </div>
              <div className="text-sm font-black text-slate-900">{invoice.customer?.name}</div>
              
              {invoice.customer?.gstin && (
                <div className="text-xs text-indigo-700 font-bold font-mono mt-0.5">
                  Buyer GSTIN: {invoice.customer.gstin}
                </div>
              )}

              <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                {invoice.customer?.address?.street && <div>{invoice.customer.address.street}</div>}
                {(invoice.customer?.address?.city || invoice.customer?.address?.state) && (
                  <div>
                    {invoice.customer.address.city}, {invoice.customer.address.state} - {invoice.customer.address.pincode}
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
                {invoice.customer?.phone && <span>📞 {invoice.customer.phone}</span>}
                {invoice.customer?.email && <span>✉️ {invoice.customer.email}</span>}
              </div>
            </div>

            {/* Warehouse Fulfillment Node */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <MapPin size={12} className="text-indigo-600" /> Dispatch Fulfillment Node
              </div>
              <div className="text-sm font-black text-slate-900">
                {invoice.sourceWarehouse?.name || 'Central Distribution Hub'}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Hub Code: <strong className="font-mono text-slate-700">{invoice.sourceWarehouse?.code || 'WH-01'}</strong>
              </div>

              {invoice.operation && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Verified Stock Delivery Order: #{invoice.operation._id?.slice(-6)?.toUpperCase()}
                </div>
              )}

              {invoice.paymentReference && (
                <div className="text-xs text-slate-600 mt-1 font-mono">
                  Settlement Ref: <strong>{invoice.paymentReference}</strong> ({invoice.paymentMethod})
                </div>
              )}
            </div>

          </div>

          {/* ── Line Items Table ── */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-black uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-10">#</th>
                  <th className="py-3 px-4">Item & SKU Description</th>
                  <th className="py-3 px-3 text-center">HSN/SAC</th>
                  <th className="py-3 px-3 text-center">Qty</th>
                  <th className="py-3 px-3 text-right">Unit Rate (₹)</th>
                  <th className="py-3 px-3 text-center">GST %</th>
                  <th className="py-3 px-3 text-right">Tax (₹)</th>
                  <th className="py-3 px-4 text-right">Net Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      {item.sku && <div className="text-[11px] text-slate-400 font-mono">SKU: {item.sku}</div>}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {8471 + (idx % 5)}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-800 font-mono">{item.quantity}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700 font-mono">
                      ₹{item.unitPrice?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-slate-700">{item.taxRate}%</td>
                    <td className="py-3 px-3 text-right text-slate-600 font-mono">
                      ₹{item.taxAmount?.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-slate-900 font-mono">
                      ₹{item.lineTotal?.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Financial Summary & QR Code Settlement ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            
            {/* Left: Words, Bank Details & UPI QR Code */}
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Invoice Amount in Words:
                </div>
                <div className="text-xs font-bold text-slate-900 italic mt-0.5 leading-relaxed">
                  {numberToIndianWords(invoice.totalAmount)}
                </div>
              </div>

              {/* Bank Details & Scannable QR Code */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-white flex items-center justify-between gap-4">
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-600" /> Electronic Settlement
                  </div>
                  <div><strong>Bank:</strong> HDFC Bank Ltd • Bhiwandi Industrial</div>
                  <div><strong>Account:</strong> <span className="font-mono text-slate-900">50200088912344</span></div>
                  <div><strong>IFSC:</strong> <span className="font-mono text-slate-900">HDFC0001892</span></div>
                  <div className="text-indigo-700 font-semibold font-mono"><strong>UPI:</strong> stocksense@hdfcbank</div>
                </div>

                {/* Scannable Dynamic UPI QR Code */}
                <div className="flex flex-col items-center shrink-0 border border-slate-200 p-2 rounded-xl bg-slate-50">
                  <img 
                    src={qrUrl} 
                    alt="Scan UPI to Pay" 
                    className="w-20 h-20 rounded"
                  />
                  <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mt-1">
                    Scan UPI
                  </span>
                </div>
              </div>

            </div>

            {/* Right: Calculations */}
            <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200 space-y-2 text-xs">
              
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value (Subtotal):</span>
                <span className="font-bold text-slate-800 font-mono">₹{invoice.subtotal?.toLocaleString('en-IN')}</span>
              </div>

              {invoice.isInterState ? (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (Integrated Tax):</span>
                  <span className="font-bold text-slate-800 font-mono">₹{invoice.taxBreakdown?.igst?.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (Central Tax):</span>
                    <span className="font-bold text-slate-800 font-mono">₹{invoice.taxBreakdown?.cgst?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (State Tax):</span>
                    <span className="font-bold text-slate-800 font-mono">₹{invoice.taxBreakdown?.sgst?.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              {invoice.shippingCharge > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Logistics & Freight:</span>
                  <span className="font-bold text-slate-800 font-mono">₹{invoice.shippingCharge?.toLocaleString('en-IN')}</span>
                </div>
              )}

              {invoice.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount Total:</span>
                  <span className="font-mono">- ₹{invoice.discountTotal?.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline text-base font-black text-slate-900">
                <span>Total Invoice Value:</span>
                <span className="text-xl font-black text-indigo-700 font-mono">
                  ₹{invoice.totalAmount?.toLocaleString('en-IN')}
                </span>
              </div>

              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold pt-1">
                  <span>Amount Cleared:</span>
                  <span className="font-mono">₹{invoice.paidAmount?.toLocaleString('en-IN')}</span>
                </div>
              )}

              {!isPaid && (
                <div className="flex justify-between text-red-600 font-black pt-1 border-t border-dashed border-red-200">
                  <span>Balance Outstanding:</span>
                  <span className="font-mono">₹{(invoice.totalAmount - (invoice.paidAmount || 0))?.toLocaleString('en-IN')}</span>
                </div>
              )}

            </div>

          </div>

          {/* ── Footer Terms & Signatory ── */}
          <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-500">
            <div>
              <div className="font-bold text-slate-800 mb-0.5">Statutory Declaration:</div>
              <p className="leading-relaxed text-[11px]">
                We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. 
                {invoice.terms}
              </p>
            </div>
            <div className="sm:text-right flex flex-col justify-end items-start sm:items-end pt-4 sm:pt-0">
              <div className="w-40 border-b border-slate-400 mb-1"></div>
              <div className="font-black text-slate-900">Authorized Signatory</div>
              <div className="text-[11px] text-slate-500">For {invoice.company?.name || 'StockSense Logistics'}</div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

export default InvoiceDetailModal;
