import React, { useState } from 'react';
import { 
  X, Printer, CheckCircle2, Clock, AlertTriangle, 
  Building2, Phone, Mail, MapPin, Receipt, CreditCard, 
  DollarSign, ArrowUpRight, ShieldCheck, QrCode, Copy, Check,
  Share2, FileText, Send, Sparkles, ExternalLink, Truck,
  BadgeCheck, Stamp, Plus, Calendar, UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import PaymentReceiptModal from './PaymentReceiptModal';

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

// Generate realistic 8-digit HSN code based on product category or name
function getProductHSN(name, sku) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('cable') || lower.includes('wire') || lower.includes('tie')) return '8544.49.90';
  if (lower.includes('bolt') || lower.includes('nut') || lower.includes('screw') || lower.includes('fastener')) return '7318.15.00';
  if (lower.includes('electronic') || lower.includes('sensor') || lower.includes('pcb')) return '8542.31.00';
  if (lower.includes('box') || lower.includes('tape') || lower.includes('pack')) return '4819.10.10';
  if (lower.includes('plastic') || lower.includes('strap')) return '3926.90.99';
  if (lower.includes('steel') || lower.includes('rod') || lower.includes('metal')) return '7214.20.90';
  return '8471.30.10';
}

const InvoiceDetailModal = ({ isOpen, onClose, invoice, onPaymentSuccess }) => {
  const [copyType, setCopyType] = useState('ORIGINAL'); // ORIGINAL, DUPLICATE, TRIPLICATE
  const [recordingPayment, setRecordingPayment] = useState(false);
  
  // Payment form states
  const remainingDue = Math.max(0, (invoice?.totalAmount || 0) - (invoice?.paidAmount || 0));
  const [paymentAmount, setPaymentAmount] = useState(remainingDue);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [transactionReference, setTransactionReference] = useState('');
  const [bankName, setBankName] = useState('');
  const [payerDetails, setPayerDetails] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await api.post(`/invoices/${invoice._id}/payment`, {
        amount: Number(paymentAmount),
        paymentMethod,
        transactionReference,
        bankName,
        payerDetails,
        paymentDate: new Date(paymentDate),
        notes: paymentNotes
      });
      toast.success(`Payment Receipt ${res.data.receiptNumber || ''} generated successfully!`);
      setRecordingPayment(false);
      setTransactionReference('');
      setBankName('');
      setPayerDetails('');
      setPaymentNotes('');
      if (onPaymentSuccess) onPaymentSuccess(res.data.invoice || res.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleOpenReceipt = (payment) => {
    setSelectedReceipt(payment);
    setShowReceiptModal(true);
  };

  // Generate UPI QR URI for real scan-to-pay
  const companyName = invoice.company?.name || 'StockSense Logistics Pvt Ltd';
  const upiString = `upi://pay?pa=stocksense@hdfcbank&pn=${encodeURIComponent(companyName)}&am=${invoice.totalAmount}&cu=INR&tn=${invoice.invoiceNumber}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(upiString)}`;

  // Realistic NIC e-Invoice QR code payload
  const eInvoiceString = `GSTIN:27AABCS1429B1Z1;INV:${invoice.invoiceNumber};DT:${new Date(invoice.invoiceDate).toISOString().slice(0,10)};VAL:${invoice.totalAmount};IRN:4f8b912a7d6e5c83912a7d6e5c83109a823b4912a7d6e5c83210;POS:${invoice.isInterState ? '07' : '27'}`;
  const eInvoiceQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(eInvoiceString)}`;

  // Group line items by HSN for statutory HSN tax summary table
  const hsnGroups = {};
  (invoice.items || []).forEach(item => {
    const hsn = getProductHSN(item.name, item.sku);
    if (!hsnGroups[hsn]) {
      hsnGroups[hsn] = {
        hsn,
        taxableValue: 0,
        taxRate: item.taxRate || 18,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalTax: 0
      };
    }
    const taxable = (item.quantity * item.unitPrice) - (item.discount || 0);
    hsnGroups[hsn].taxableValue += taxable;
    if (invoice.isInterState) {
      hsnGroups[hsn].igst += item.taxAmount || 0;
    } else {
      hsnGroups[hsn].cgst += (item.taxAmount || 0) / 2;
      hsnGroups[hsn].sgst += (item.taxAmount || 0) / 2;
    }
    hsnGroups[hsn].totalTax += item.taxAmount || 0;
  });

  const paymentList = invoice.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:max-h-none print:w-full print:rounded-none">
        
        {/* ── Top Executive Action Bar (Hidden when printed) ── */}
        <div className="px-6 py-3.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30">
              <Receipt size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white font-mono tracking-wider">{invoice.invoiceNumber}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold uppercase">
                  Rule 46 Compliant
                </span>
                {isPaid ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-extrabold uppercase">
                    Paid in Full
                  </span>
                ) : isPartiallyPaid ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300 font-extrabold uppercase">
                    Partially Paid
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-400">{invoice.customer?.name} • Issued {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            
            {/* Copy Type Selector */}
            <div className="flex items-center p-0.5 bg-slate-800 rounded-lg border border-slate-700 text-[11px] font-bold">
              <button 
                onClick={() => setCopyType('ORIGINAL')}
                className={`px-2 py-1 rounded ${copyType === 'ORIGINAL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Original
              </button>
              <button 
                onClick={() => setCopyType('DUPLICATE')}
                className={`px-2 py-1 rounded ${copyType === 'DUPLICATE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Duplicate
              </button>
              <button 
                onClick={() => setCopyType('TRIPLICATE')}
                className={`px-2 py-1 rounded ${copyType === 'TRIPLICATE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Triplicate
              </button>
            </div>

            <button
              onClick={handleCopyInvoiceNumber}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>

            {!isPaid && !recordingPayment && (
              <button
                onClick={() => {
                  setPaymentAmount(remainingDue);
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
              <Printer size={14} /> Print / PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

        </div>

        {/* ── Rich Record Payment Drawer (Hidden when printed) ── */}
        {recordingPayment && (
          <div className="bg-emerald-50/95 border-b border-emerald-200 p-4 sm:p-5 print:hidden animate-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                    <CreditCard size={15} />
                  </div>
                  <h3 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wide">
                    Record Customer Payment & Issue Official Receipt
                  </h3>
                </div>
                <div className="text-xs font-mono font-bold text-slate-600">
                  Remaining Balance: <strong className="text-emerald-700">₹{remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Quick Fill:</span>
                <button
                  type="button"
                  onClick={() => setPaymentAmount(remainingDue)}
                  className="px-2.5 py-0.5 rounded-md bg-white border border-emerald-300 text-emerald-800 font-mono text-[11px] font-bold hover:bg-emerald-100"
                >
                  Full Balance (₹{remainingDue.toFixed(2)})
                </button>
                {remainingDue > 100 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(Math.round(remainingDue / 2))}
                    className="px-2.5 py-0.5 rounded-md bg-white border border-slate-300 text-slate-700 font-mono text-[11px] font-bold hover:bg-slate-100"
                  >
                    50% (₹{Math.round(remainingDue / 2)})
                  </button>
                )}
              </div>

              {/* Input Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Amount (INR ₹)*</label>
                  <input
                    type="number"
                    min="1"
                    max={remainingDue}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-emerald-300 rounded-xl bg-white font-mono font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Method*</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="UPI">UPI / QR Transfer</option>
                    <option value="BANK_TRANSFER">NEFT / RTGS Bank Transfer</option>
                    <option value="NET_BANKING">Net Banking (IMPS)</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash Deposit</option>
                    <option value="DEMAND_DRAFT">Demand Draft (DD)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Ref / UTR / Cheque #</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-987410293"
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white font-mono text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank / Institution</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payer Details / VPA</label>
                  <input
                    type="text"
                    placeholder="e.g. buyer@okaxis"
                    value={payerDetails}
                    onChange={(e) => setPayerDetails(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Remarks / Ledger Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Advance payment for batch #1"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200">
                <button
                  type="button"
                  onClick={() => setRecordingPayment(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-1.5 text-xs font-bold rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  {submittingPayment ? 'Settling Payment...' : 'Confirm & Generate Receipt'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Hyper-Realistic Indian GST Tax Invoice Body (A4 Form Factor) ── */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          
          <div className="border-2 border-slate-900 text-[11px] leading-tight">
            
            {/* 1. Official Header & E-Invoice Authentication Banner */}
            <div className="border-b-2 border-slate-900 p-4 bg-slate-50/50">
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                
                {/* Seller Legal Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                      SS
                    </div>
                    <div>
                      <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                        {invoice.company?.name || 'StockSense India Logistics Private Limited'}
                      </h1>
                      <div className="text-[10px] text-slate-600 font-medium">
                        CIN: <span className="font-mono font-bold text-slate-800">U72900MH2022PTC389140</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 max-w-sm leading-snug">
                    {invoice.company?.address || 'Regd. Office: Hub #4, Bhiwandi Logistics Corridor, Mankoli Phata, Thane, Maharashtra - 421302'}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono">
                    <div>GSTIN / UIN: <strong className="text-slate-900 font-bold">{invoice.company?.gstin || '27AABCS1429B1Z1'}</strong></div>
                    <div>State: <strong className="text-slate-900 font-bold">Maharashtra (Code: 27)</strong></div>
                  </div>
                </div>

                {/* Statutory Title Block */}
                <div className="text-right sm:border-l-2 sm:border-slate-900 sm:pl-4">
                  <div className="text-base font-black tracking-wider uppercase text-slate-900">
                    TAX INVOICE
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">
                    ({copyType} FOR RECIPIENT)
                  </div>
                  <div className="text-[9px] text-slate-400 italic">
                    Issued under Section 31 of CGST Act
                  </div>
                  
                  <div className="mt-3 p-1.5 border border-slate-800 bg-white inline-block text-left rounded shadow-2xs">
                    <div className="text-[9px] font-mono text-slate-600">INVOICE NO:</div>
                    <div className="text-sm font-black text-indigo-700 font-mono tracking-wider">{invoice.invoiceNumber}</div>
                    <div className="text-[9px] font-mono text-slate-600 mt-1">DATE OF ISSUE:</div>
                    <div className="text-xs font-bold font-mono text-slate-900">
                      {new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* 2. Buyer & Consignee Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-2 divide-slate-900 border-b-2 border-slate-900">
              
              {/* Bill To */}
              <div className="p-3 bg-white">
                <div className="font-black uppercase text-[10px] text-slate-700 mb-1">
                  Details of Receiver (Billed To):
                </div>
                <div className="text-xs font-black text-slate-900 uppercase">
                  {invoice.customer?.name}
                </div>
                <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                  {invoice.customer?.address?.street || 'Commercial Delivery Point'}, {invoice.customer?.address?.city || ''} {invoice.customer?.address?.state || 'India'}
                </div>
                {invoice.customer?.phone && (
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    Phone: <span className="font-mono text-slate-900">{invoice.customer.phone}</span>
                  </div>
                )}
                <div className="mt-2 text-[10px] font-mono">
                  <span>GSTIN / Unique ID: </span>
                  <strong className="text-indigo-900 font-black">
                    {invoice.customer?.gstin || 'UNREGISTERED (B2C)'}
                  </strong>
                </div>
              </div>

              {/* Dispatch & Transportation Metadata */}
              <div className="p-3 bg-slate-50/40 space-y-1">
                <div className="font-black uppercase text-[10px] text-slate-700 mb-1">
                  Dispatch & Transportation Details:
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div>
                    <span className="text-slate-500">Dispatch Facility: </span>
                    <strong className="text-slate-900 font-bold block">{invoice.sourceWarehouse?.name || 'Regional Hub'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Place of Supply: </span>
                    <strong className="text-slate-900 font-bold block">
                      {invoice.isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                    </strong>
                  </div>
                  {invoice.operation && (
                    <div className="col-span-2 mt-1">
                      <span className="text-slate-500">Linked Delivery Order: </span>
                      <strong className="text-emerald-800 font-mono block">DEL-{invoice.operation._id?.slice(-6)?.toUpperCase()}</strong>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 3. Line Items Table */}
            <div className="border-b-2 border-slate-900 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 font-black text-[10px] uppercase text-slate-800">
                    <th className="p-2 border-r border-slate-900 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-900">Description of Goods</th>
                    <th className="p-2 border-r border-slate-900 text-center w-20">HSN/SAC</th>
                    <th className="p-2 border-r border-slate-900 text-right w-16">Qty</th>
                    <th className="p-2 border-r border-slate-900 text-right w-20">Rate (₹)</th>
                    <th className="p-2 border-r border-slate-900 text-right w-24">Taxable Val</th>
                    <th className="p-2 border-r border-slate-900 text-center w-16">GST %</th>
                    <th className="p-2 text-right w-24">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(invoice.items || []).map((item, idx) => {
                    const hsn = getProductHSN(item.name, item.sku);
                    const taxable = (item.quantity * item.unitPrice) - (item.discount || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 border-r border-slate-900 text-center font-mono">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-900">
                          <div className="font-black text-slate-900">{item.name}</div>
                          {item.sku && <div className="text-[9px] font-mono text-slate-500">SKU: {item.sku}</div>}
                        </td>
                        <td className="p-2 border-r border-slate-900 text-center font-mono text-[10px]">{hsn}</td>
                        <td className="p-2 border-r border-slate-900 text-right font-bold font-mono">{item.quantity}</td>
                        <td className="p-2 border-r border-slate-900 text-right font-mono">₹{item.unitPrice?.toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-900 text-right font-mono font-semibold">₹{taxable?.toFixed(2)}</td>
                        <td className="p-2 border-r border-slate-900 text-center font-mono">{item.taxRate || 18}%</td>
                        <td className="p-2 text-right font-black font-mono">₹{item.lineTotal?.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 4. Financial Calculations & Summary Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x-2 divide-slate-900 border-b-2 border-slate-900">
              
              {/* Left Column: Bank & Words */}
              <div className="p-3 space-y-3 bg-white">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-500">Invoice Amount in Words:</span>
                  <div className="text-xs font-black text-slate-900 italic mt-0.5">
                    {numberToIndianWords(invoice.totalAmount)}
                  </div>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-0.5">
                  <div className="font-black text-slate-800 uppercase text-[9px]">Company Remittance Bank Account:</div>
                  <div>Bank Name: <strong className="text-slate-900">HDFC Bank Limited</strong></div>
                  <div>A/C Name: <strong className="text-slate-900">StockSense India Logistics Pvt Ltd</strong></div>
                  <div>Account No: <strong className="font-mono text-slate-900">50200084920194</strong></div>
                  <div>IFSC Code: <strong className="font-mono text-slate-900">HDFC0000128</strong> (Corporate Branch)</div>
                </div>
              </div>

              {/* Right Column: Ledger Totals & Calculations */}
              <div className="p-3 space-y-1.5 font-mono text-[11px] bg-slate-50/50">
                <div className="flex justify-between text-slate-700">
                  <span>Total Taxable Subtotal:</span>
                  <span className="font-bold text-slate-900">₹{invoice.subtotal?.toFixed(2)}</span>
                </div>

                {!invoice.isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>Add: CGST (Central Tax 9%):</span>
                      <span className="font-bold text-slate-900">₹{(invoice.taxBreakdown?.cgst || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Add: SGST (State Tax 9%):</span>
                      <span className="font-bold text-slate-900">₹{(invoice.taxBreakdown?.sgst || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <span>Add: IGST (Integrated Tax 18%):</span>
                    <span className="font-bold text-slate-900">₹{(invoice.taxBreakdown?.igst || 0).toFixed(2)}</span>
                  </div>
                )}

                {invoice.shippingCharge > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Add: Shipping & Logistics:</span>
                    <span className="font-bold text-slate-900">₹{(invoice.shippingCharge || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-xs font-black text-slate-950">
                  <span className="uppercase tracking-wider">Grand Total (INR):</span>
                  <span className="text-base font-black text-slate-950">
                    ₹{invoice.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-dashed border-slate-300">
                  <span>Total Amount Received:</span>
                  <span>₹{(invoice.paidAmount || 0)?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>

                {!isPaid && (
                  <div className="flex justify-between text-red-700 font-black pt-1">
                    <span>Balance Due:</span>
                    <span>₹{remainingDue?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

            </div>

            {/* 5. ── Payment History & Receipts Ledger Section ── */}
            <div className="p-4 bg-slate-50 border-b-2 border-slate-900">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CreditCard size={15} className="text-emerald-700" />
                  <span className="font-black uppercase text-[10px] tracking-wider text-slate-900">
                    Settlement Ledger & Official Money Receipts ({paymentList.length})
                  </span>
                </div>
                {!isPaid && (
                  <button
                    onClick={() => {
                      setPaymentAmount(remainingDue);
                      setRecordingPayment(true);
                    }}
                    className="text-[10px] font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors print:hidden flex items-center gap-1"
                  >
                    <Plus size={11} /> Record Settlement
                  </button>
                )}
              </div>

              {paymentList.length > 0 ? (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-[10px] divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                      <tr>
                        <th className="py-2 px-3">Receipt No</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Payment Channel</th>
                        <th className="py-2 px-3">Transaction / UTR #</th>
                        <th className="py-2 px-3 text-right">Amount (₹)</th>
                        <th className="py-2 px-3 text-right print:hidden">Receipt Voucher</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {paymentList.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-bold text-indigo-700">
                            {p.receiptNumber}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="py-2 px-3 font-sans font-semibold text-slate-800">
                            {p.paymentMethod}
                            {p.bankName && <span className="text-slate-400 font-normal"> ({p.bankName})</span>}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {p.transactionReference || 'Direct'}
                          </td>
                          <td className="py-2 px-3 text-right font-black text-emerald-700 text-xs">
                            ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 px-3 text-right print:hidden">
                            <button
                              onClick={() => handleOpenReceipt(p)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 text-indigo-700 border border-slate-300 rounded font-sans font-bold text-[10px] transition-colors"
                            >
                              Print Voucher
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 text-center text-slate-400 text-[10px] bg-white rounded-xl border border-dashed border-slate-200">
                  No payment vouchers recorded yet for this invoice.
                </div>
              )}
            </div>

            {/* 6. Terms & Official Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 p-3 text-[10px] bg-white">
              <div className="sm:col-span-2 pr-3 space-y-1">
                <div className="font-black uppercase text-slate-800 text-[9px]">Terms & Conditions:</div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-tight">
                  <li>Goods once sold will not be taken back without valid RMA confirmation.</li>
                  <li>Interest @ 18% per annum will be levied on delayed payments beyond due date.</li>
                  <li>Subject to Thane / Mumbai Judicial Jurisdiction only. E. & O.E.</li>
                </ol>
              </div>

              <div className="pl-3 flex flex-col justify-between items-end text-right space-y-4 pt-2 sm:pt-0">
                <div>
                  <div className="font-black text-slate-950 uppercase text-[10px]">
                    For {invoice.company?.name || 'StockSense India Logistics Pvt Ltd'}
                  </div>
                  <div className="text-[9px] text-slate-500">Corporate Fulfillment Division</div>
                </div>

                <div className="border border-slate-400 p-1.5 rounded text-center w-36 bg-slate-50/50">
                  <div className="text-[8px] text-emerald-800 font-mono font-bold">DIGITALLY VERIFIED</div>
                  <div className="text-[9px] font-black text-slate-800">Authorized Signatory</div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Payment Receipt Voucher Modal */}
      <PaymentReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        payment={selectedReceipt}
        invoice={invoice}
      />

    </div>
  );
};

export default InvoiceDetailModal;
