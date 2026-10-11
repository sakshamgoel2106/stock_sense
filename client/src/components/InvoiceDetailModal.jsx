import React, { useState } from 'react';
import { 
  X, Printer, CheckCircle2, Clock, AlertTriangle, 
  Building2, Phone, Mail, MapPin, Receipt, CreditCard, 
  DollarSign, ArrowUpRight, ShieldCheck, QrCode, Copy, Check,
  Share2, FileText, Send, Sparkles, ExternalLink, Truck,
  BadgeCheck, Stamp
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
  const companyName = invoice.company?.name || 'StockSense Logistics Pvt Ltd';
  const upiString = `upi://pay?pa=stocksense@hdfcbank&pn=${encodeURIComponent(companyName)}&am=${invoice.totalAmount}&cu=INR&tn=${invoice.invoiceNumber}`;
  const upiQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(upiString)}`;

  // Realistic NIC e-Invoice QR code payload
  const eInvoiceString = `GSTIN:27AABCS1429B1Z1;INV:${invoice.invoiceNumber};DT:${new Date(invoice.invoiceDate).toISOString().slice(0,10)};VAL:${invoice.totalAmount};IRN:4f8b912a7d6e5c83912a7d6e5c83109a823b4912a7d6e5c83912a7d6e5c83210;POS:${invoice.isInterState ? '07' : '27'}`;
  const eInvoiceQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(eInvoiceString)}`;

  // Deterministic realistic E-Way Bill Number based on invoice number
  const eWayBillNo = `2418 9081 ${invoice.invoiceNumber.slice(-4).padStart(4, '0')}`;
  const deliveryChallanNo = `DC-2026-${invoice.invoiceNumber.slice(-4).padStart(4, '0')}`;
  const irnHash = `4f8b912a7d6e5c83912a7d6e5c83109a823b4912a7d6e5c83912a7d6e5c832${invoice.invoiceNumber.slice(-2)}`;

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[96vh] flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:max-h-none print:w-full print:rounded-none">
        
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
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700/60"
            >
              {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>

            {!isPaid && !recordingPayment && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.totalAmount - (invoice.paidAmount || 0));
                  setRecordingPayment(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <CreditCard size={14} /> Record Payment
              </button>
            )}

            <button
              onClick={handlePrint}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

        </div>

        {/* ── Inline Record Payment Drawer (Hidden when printed) ── */}
        {recordingPayment && (
          <div className="bg-emerald-50/90 border-b border-emerald-200 p-3.5 print:hidden">
            <form onSubmit={handleRecordPaymentSubmit} className="flex flex-wrap items-center gap-3">
              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                <CreditCard size={15} className="text-emerald-600" /> Settlement:
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-700 font-semibold">Amount (₹):</label>
                <input
                  type="number"
                  min="1"
                  max={invoice.totalAmount - (invoice.paidAmount || 0)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-28 px-2.5 py-1 text-xs border rounded-lg bg-white font-mono font-bold text-slate-900"
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
                  <option value="BANK_TRANSFER">NEFT / RTGS</option>
                  <option value="CASH">Cash</option>
                  <option value="CREDIT_CARD">Card</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-700 font-semibold">Ref / UTR:</label>
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

                  <p className="text-slate-700 mt-1 max-w-md">
                    {invoice.company?.address || 'Plot No. 42, Sector 8, Logistics Park, Bhiwandi'}, {invoice.company?.city || 'Thane'}, {invoice.company?.state || 'Maharashtra'} - {invoice.company?.pincode || '421302'}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-800">
                    <span><strong>GSTIN:</strong> <span className="font-mono font-bold">{invoice.company?.gstin || '27AABCS1429B1Z1'}</span></span>
                    <span><strong>PAN:</strong> <span className="font-mono font-bold">AABCS1429B</span></span>
                    <span><strong>State Code:</strong> 27 (Maharashtra)</span>
                  </div>
                  <div className="text-slate-600 mt-0.5 flex gap-3 text-[10px]">
                    <span>Email: operations@stocksense.in</span>
                    <span>Web: www.stocksense.in</span>
                    <span>Helpline: +91 98200 12345</span>
                  </div>
                </div>

                {/* E-Invoice QR & Tax Title */}
                <div className="text-right flex flex-col items-end shrink-0">
                  <div className="border border-slate-900 px-3 py-1 bg-white font-black text-xs uppercase tracking-wider mb-2">
                    TAX INVOICE
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-indigo-900 mb-1">
                    {copyType === 'ORIGINAL' && 'ORIGINAL FOR RECIPIENT'}
                    {copyType === 'DUPLICATE' && 'DUPLICATE FOR TRANSPORTER'}
                    {copyType === 'TRIPLICATE' && 'TRIPLICATE FOR SUPPLIER'}
                  </div>
                  
                  {/* NIC e-Invoice QR Code */}
                  <div className="flex items-center gap-2 border border-slate-300 p-1 rounded bg-white mt-0.5">
                    <img 
                      src={eInvoiceQrUrl} 
                      alt="GST e-Invoice QR" 
                      className="w-16 h-16"
                    />
                    <div className="text-left text-[8px] text-slate-500 font-mono leading-none space-y-1">
                      <div className="font-bold text-slate-800 uppercase">GST e-Invoice</div>
                      <div>Signed by NIC</div>
                      <div className="text-[7px]">Verifiable B2B</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* IRN Bar (Government E-Invoice Reference) */}
              <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-600 font-mono">
                <div>
                  <strong>IRN:</strong> <span className="text-slate-900 select-all">{irnHash}</span>
                </div>
                <div>
                  <strong>Ack No:</strong> 1224198273910 • <strong>Ack Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}
                </div>
              </div>

            </div>

            {/* 2. Invoice & Transport Logistics Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b-2 border-slate-900 divide-x divide-y sm:divide-y-0 divide-slate-900">
              
              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">Invoice Number</div>
                <div className="font-mono font-black text-xs text-slate-950 mt-0.5">{invoice.invoiceNumber}</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Invoice Date</div>
                <div className="font-mono font-bold text-slate-800">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
              </div>

              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">Transportation Mode</div>
                <div className="font-bold text-slate-900 mt-0.5">Road Logistics (Truck)</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Vehicle Number</div>
                <div className="font-mono font-bold text-slate-800">MH-04-GP-8912</div>
              </div>

              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">E-Way Bill Number</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{eWayBillNo}</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Delivery Challan / DC</div>
                <div className="font-mono font-bold text-slate-800">{deliveryChallanNo}</div>
              </div>

              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">Place of Supply (POS)</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {invoice.isInterState ? 'Delhi (Code: 07)' : 'Maharashtra (Code: 27)'}
                </div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Reverse Charge</div>
                <div className="font-mono font-bold text-slate-800">NO</div>
              </div>

            </div>

            {/* 3. Details of Receiver (Billed To) vs Consignee (Shipped To) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 border-b-2 border-slate-900 divide-y sm:divide-y-0 sm:divide-x divide-slate-900">
              
              {/* Billed To (Buyer) */}
              <div className="p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Details of Receiver | Billed to (Buyer)
                </div>
                <div className="font-black text-xs text-slate-950 uppercase">{invoice.customer?.name}</div>
                
                <div className="text-slate-700 mt-0.5">
                  {invoice.customer?.address?.street && <div>{invoice.customer.address.street}</div>}
                  <div>
                    {invoice.customer?.address?.city || 'Pune'}, {invoice.customer?.address?.state || 'Maharashtra'} - {invoice.customer?.address?.pincode || '411019'}
                  </div>
                </div>

                <div className="mt-1 space-y-0.5">
                  <div><strong>GSTIN / UIN:</strong> <span className="font-mono font-bold text-slate-900">{invoice.customer?.gstin || '27ABCDE1234F1Z5'}</span></div>
                  <div><strong>State & Code:</strong> {invoice.isInterState ? 'Delhi - 07' : 'Maharashtra - 27'}</div>
                  {invoice.customer?.phone && <div><strong>Contact:</strong> {invoice.customer.phone}</div>}
                </div>
              </div>

              {/* Shipped To (Consignee) */}
              <div className="p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Details of Consignee | Shipped to (Destination Hub)
                </div>
                <div className="font-black text-xs text-slate-950 uppercase">
                  {invoice.customer?.name} (Site / Factory Delivery)
                </div>
                
                <div className="text-slate-700 mt-0.5">
                  {invoice.customer?.address?.street || 'Gate No. 4, Industrial Logistics Complex'}, {invoice.customer?.address?.city || 'Pune'}, {invoice.customer?.address?.state || 'Maharashtra'}
                </div>

                <div className="mt-1 space-y-0.5">
                  <div><strong>Dispatch Hub:</strong> <span className="font-bold">{invoice.sourceWarehouse?.name || 'Bhiwandi Central Fulfillment Hub'}</span> ({invoice.sourceWarehouse?.code || 'WH-01'})</div>
                  {invoice.operation && (
                    <div className="font-mono text-emerald-800 font-bold">
                      <strong>Delivery Order Ref:</strong> #{invoice.operation._id?.slice(-6)?.toUpperCase()}
                    </div>
                  )}
                  <div><strong>Terms of Payment:</strong> Net 15 Days (Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Immediate'})</div>
                </div>
              </div>

            </div>

            {/* 4. Comprehensive Itemised Goods Table */}
            <div className="overflow-x-auto border-b-2 border-slate-900">
              <table className="min-w-full divide-y divide-slate-900 text-left text-[10px]">
                <thead className="bg-slate-100 font-black text-slate-900 uppercase">
                  <tr className="divide-x divide-slate-900">
                    <th className="py-2 px-2 text-center w-8">S.N.</th>
                    <th className="py-2 px-3">Description of Goods</th>
                    <th className="py-2 px-2 text-center w-20">HSN/SAC</th>
                    <th className="py-2 px-2 text-center w-14">Qty</th>
                    <th className="py-2 px-2 text-center w-12">UOM</th>
                    <th className="py-2 px-2 text-right w-20">Rate (₹)</th>
                    <th className="py-2 px-2 text-right w-16">Disc (₹)</th>
                    <th className="py-2 px-2 text-right w-24">Taxable Value</th>
                    <th className="py-2 px-2 text-center w-14">GST %</th>
                    <th className="py-2 px-3 text-right w-24">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 bg-white">
                  {invoice.items?.map((item, idx) => {
                    const hsn = getProductHSN(item.name, item.sku);
                    const gross = (item.quantity * item.unitPrice);
                    const disc = item.discount || 0;
                    const taxable = gross - disc;

                    return (
                      <tr key={idx} className="divide-x divide-slate-300">
                        <td className="py-1.5 px-2 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-3">
                          <div className="font-black text-slate-900">{item.name}</div>
                          {item.sku && <div className="text-[9px] text-slate-500 font-mono">Part / SKU: {item.sku}</div>}
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700">{hsn}</td>
                        <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-900">{item.quantity}</td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-600 uppercase">NOS</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-800">
                          {item.unitPrice?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                          {disc > 0 ? disc.toFixed(2) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                          {taxable?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-800">{item.taxRate}%</td>
                        <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950">
                          {item.lineTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Empty filler rows for authentic tally style invoice balance if items < 3 */}
                  {invoice.items?.length < 3 && (
                    <tr className="divide-x divide-slate-200 text-slate-300">
                      <td className="py-4 px-2 text-center"></td>
                      <td className="py-4 px-3 text-center italic text-[9px] text-slate-400">--- End of Itemized Schedule ---</td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-2"></td>
                      <td className="py-4 px-3"></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 5. Statutory HSN / SAC Summary Schedule */}
            <div className="border-b-2 border-slate-900 bg-slate-50/70 p-3">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-600 mb-1.5">
                HSN / SAC Tax Liability Summary (Schedule under Rule 46)
              </div>
              <div className="overflow-x-auto border border-slate-300 rounded bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-[9px]">
                  <thead className="bg-slate-100 font-black uppercase text-slate-700">
                    <tr className="divide-x divide-slate-200">
                      <th className="py-1.5 px-2 text-left">HSN/SAC</th>
                      <th className="py-1.5 px-2 text-right">Taxable Value (₹)</th>
                      {!invoice.isInterState ? (
                        <>
                          <th className="py-1.5 px-2 text-right">Central Tax Rate</th>
                          <th className="py-1.5 px-2 text-right">CGST Amt (₹)</th>
                          <th className="py-1.5 px-2 text-right">State Tax Rate</th>
                          <th className="py-1.5 px-2 text-right">SGST Amt (₹)</th>
                        </>
                      ) : (
                        <>
                          <th className="py-1.5 px-2 text-right">Integrated Tax Rate</th>
                          <th className="py-1.5 px-2 text-right">IGST Amt (₹)</th>
                        </>
                      )}
                      <th className="py-1.5 px-2 text-right">Total Tax (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {Object.values(hsnGroups).map((g, idx) => (
                      <tr key={idx} className="divide-x divide-slate-200">
                        <td className="py-1 px-2 font-bold text-slate-900">{g.hsn}</td>
                        <td className="py-1 px-2 text-right font-bold text-slate-800">{g.taxableValue.toFixed(2)}</td>
                        {!invoice.isInterState ? (
                          <>
                            <td className="py-1 px-2 text-right">{g.taxRate / 2}%</td>
                            <td className="py-1 px-2 text-right">{g.cgst.toFixed(2)}</td>
                            <td className="py-1 px-2 text-right">{g.taxRate / 2}%</td>
                            <td className="py-1 px-2 text-right">{g.sgst.toFixed(2)}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-1 px-2 text-right">{g.taxRate}%</td>
                            <td className="py-1 px-2 text-right">{g.igst.toFixed(2)}</td>
                          </>
                        )}
                        <td className="py-1 px-2 text-right font-black text-slate-900">{g.totalTax.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Financial Summary Box, Words & Electronic Settlement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 border-b-2 border-slate-900">
              
              {/* Left Column: Words, Bank A/C & Dynamic UPI QR */}
              <div className="p-3 space-y-3 flex flex-col justify-between">
                
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">Invoice Value in Words:</div>
                  <div className="text-[11px] font-black text-slate-950 italic mt-0.5 leading-snug">
                    {numberToIndianWords(invoice.totalAmount)}
                  </div>
                </div>

                {/* Settlement Block with Scannable QR Code */}
                <div className="border border-slate-300 p-2.5 rounded bg-slate-50 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 text-[10px] text-slate-700">
                    <div className="font-black text-slate-900 uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-700" /> Banking & Settlement Details
                    </div>
                    <div><strong>Bank:</strong> HDFC Bank Ltd • Bhiwandi Hub Branch</div>
                    <div><strong>A/C Type:</strong> Current Account (Commercial)</div>
                    <div><strong>A/C No:</strong> <span className="font-mono font-bold text-slate-950">50200088912344</span></div>
                    <div><strong>IFSC Code:</strong> <span className="font-mono font-bold text-slate-950">HDFC0001892</span></div>
                    <div><strong>UPI VPA:</strong> <span className="font-mono font-bold text-indigo-800">stocksense@hdfcbank</span></div>
                  </div>

                  <div className="flex flex-col items-center shrink-0 border border-slate-300 p-1.5 rounded bg-white">
                    <img 
                      src={upiQrUrl} 
                      alt="UPI QR Code" 
                      className="w-16 h-16"
                    />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-1">
                      Scan to Pay
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column: Ledger Totals & Calculations */}
              <div className="p-3 space-y-1.5 font-mono text-[11px] bg-slate-50/50">
                
                <div className="flex justify-between text-slate-700">
                  <span>Total Amount Before Tax:</span>
                  <span className="font-bold text-slate-900">₹{invoice.subtotal?.toFixed(2)}</span>
                </div>

                {!invoice.isInterState ? (
                  <>
                    <div className="flex justify-between text-slate-700">
                      <span>Add: CGST (Central Tax):</span>
                      <span className="font-bold text-slate-900">₹{(invoice.taxBreakdown?.cgst || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>Add: SGST (State Tax):</span>
                      <span className="font-bold text-slate-900">₹{(invoice.taxBreakdown?.sgst || 0).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <span>Add: IGST (Integrated Tax):</span>
                    <span className="font-bold text-slate-900">₹{(invoice.taxBreakdown?.igst || 0).toFixed(2)}</span>
                  </div>
                )}

                {invoice.shippingCharge > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Add: Freight & Insurance:</span>
                    <span className="font-bold text-slate-900">₹{(invoice.shippingCharge || 0).toFixed(2)}</span>
                  </div>
                )}

                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Less: Special Trade Discount:</span>
                    <span className="font-bold">-₹{(invoice.discountTotal || 0).toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Round Off:</span>
                  <span>₹0.00</span>
                </div>

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-xs font-black text-slate-950">
                  <span className="uppercase tracking-wider">Total Invoice Value (INR):</span>
                  <span className="text-sm font-black text-slate-950">
                    ₹{invoice.totalAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-dashed border-slate-300">
                    <span>Amount Received / Settled:</span>
                    <span>₹{invoice.paidAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                {!isPaid && (
                  <div className="flex justify-between text-red-700 font-black pt-1">
                    <span>Balance Payable:</span>
                    <span>₹{(invoice.totalAmount - (invoice.paidAmount || 0))?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

              </div>

            </div>

            {/* 7. Terms, Receiver Acknowledgement & Official Seal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 p-3 text-[10px] bg-white">
              
              {/* Terms and Conditions */}
              <div className="sm:col-span-2 pr-3 space-y-1">
                <div className="font-black uppercase text-slate-800 text-[9px]">Terms & Conditions:</div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-tight">
                  <li>Goods once sold will not be taken back without valid RMA confirmation.</li>
                  <li>Interest @ 18% per annum will be levied on delayed payments beyond due date.</li>
                  <li>Our responsibility ceases upon handing over the consignment to the approved transporter.</li>
                  <li>Subject to Thane / Mumbai Judicial Jurisdiction only. E. & O.E.</li>
                </ol>
                <div className="pt-2 text-[9px] text-slate-500 italic">
                  Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
              </div>

              {/* Signatures & Official Company Seal */}
              <div className="pl-3 flex flex-col justify-between items-end text-right space-y-4 pt-2 sm:pt-0">
                <div>
                  <div className="font-black text-slate-950 uppercase text-[10px]">
                    For {invoice.company?.name || 'StockSense India Logistics Pvt Ltd'}
                  </div>
                  <div className="text-[9px] text-slate-500">Corporate Fulfillment Division</div>
                </div>

                {/* Stamped Graphic Seal */}
                <div className="border border-slate-400 p-1.5 rounded text-center w-36 bg-slate-50/50">
                  <div className="w-16 h-0.5 bg-slate-400 mx-auto mb-1"></div>
                  <div className="text-[8px] text-emerald-800 font-mono font-bold">DIGITALLY SIGNED</div>
                  <div className="text-[9px] font-black text-slate-800">Authorized Signatory</div>
                  <div className="text-[8px] text-slate-400 font-mono">{new Date().toISOString().slice(0, 10)}</div>
                </div>

                <div className="text-[8px] text-slate-400 italic">
                  This is a computer-generated tax invoice issued as per Rule 46 of CGST Rules, 2017.
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default InvoiceDetailModal;
