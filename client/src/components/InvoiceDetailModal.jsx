import React, { useState } from 'react';
import { 
  X, Printer, CheckCircle2, Clock, AlertTriangle, 
  Building2, Phone, Mail, MapPin, Receipt, CreditCard, 
  DollarSign, ArrowUpRight, ShieldCheck, QrCode, Copy, Check,
  Share2, FileText, Send, Sparkles, ExternalLink, Truck,
  BadgeCheck, Stamp, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { formatCurrency, getCountryByCode } from '../lib/countries';

// Helper to convert number to words localized to currency / region
function numberToCurrencyWords(num, currency = 'INR') {
  if (!num || isNaN(num)) return `Zero ${currency} Only`;
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(num);
  if (n === 0) return `Zero ${currency} Only`;

  if (currency === 'INR') {
    function inIndianWords(n) {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inIndianWords(n % 100) : '');
      if (n < 100000) return inIndianWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inIndianWords(n % 1000) : '');
      if (n < 10000000) return inIndianWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inIndianWords(n % 100000) : '');
      return inIndianWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inIndianWords(n % 10000000) : '');
    }
    return (inIndianWords(n).trim() + ' Rupees Only').replace(/\s+/g, ' ');
  }

  function inWesternWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWesternWords(n % 100) : '');
    if (n < 1000000) return inWesternWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWesternWords(n % 1000) : '');
    if (n < 1000000000) return inWesternWords(Math.floor(n / 1000000)) + 'Million ' + (n % 1000000 !== 0 ? inWesternWords(n % 1000000) : '');
    return inWesternWords(Math.floor(n / 1000000000)) + 'Billion ' + (n % 1000000000 !== 0 ? inWesternWords(n % 1000000000) : '');
  }

  const currencyUnit = currency === 'USD' ? 'US Dollars Only' : currency === 'GBP' ? 'Pounds Sterling Only' : currency === 'EUR' ? 'Euros Only' : currency === 'AED' ? 'UAE Dirhams Only' : currency === 'SGD' ? 'Singapore Dollars Only' : `${currency} Only`;
  return (inWesternWords(n).trim() + ' ' + currencyUnit).replace(/\s+/g, ' ');
}

// Statutory MNC Jurisdiction Profiles
const JURISDICTION_PROFILES = {
  IN: {
    country: 'India',
    flag: '🇮🇳',
    legalName: 'StockSense India Logistics Private Limited',
    cin: 'CIN: U72900MH2022PTC389140',
    address: 'Plot No. 42, Sector 8, Logistics Park, Bhiwandi, Thane, Maharashtra - 421302',
    taxTitle: 'TAX INVOICE',
    statutoryRule: 'Rule 46 CGST Rules, 2017',
    registrationIds: [
      { label: 'GSTIN', value: '27AABCS1429B1Z1' },
      { label: 'PAN', value: 'AABCS1429B' },
      { label: 'State Code', value: '27 (Maharashtra)' }
    ],
    customerTaxIdLabel: 'GSTIN / UIN',
    transportMode: 'Road Logistics (Freightliner)',
    transportVehicle: 'MH-04-GP-8912',
    transitDocLabel: 'E-Way Bill Number',
    dispatchDocLabel: 'Delivery Challan / DC',
    bank: 'HDFC Bank Ltd • Bhiwandi Hub Branch',
    acType: 'Current Commercial A/C',
    acNo: '50200088912344',
    routingCode: 'IFSC: HDFC0001892',
    channelLabel: 'UPI VPA: stocksense@hdfcbank',
    qrTitle: 'Scan & Pay UPI',
    declaration: 'This is a computer-generated tax invoice issued as per Rule 46 of CGST Rules, 2017.'
  },
  US: {
    country: 'United States',
    flag: '🇺🇸',
    legalName: 'StockSense Americas Logistics Inc.',
    cin: 'Delaware Entity #7829104',
    address: '800 West Olympic Blvd, Suite 400, Los Angeles, CA 90015, United States',
    taxTitle: 'COMMERCIAL SALES INVOICE',
    statutoryRule: 'Federal Tax & UCC Article 2 Compliant',
    registrationIds: [
      { label: 'Federal EIN', value: '12-8941029' },
      { label: 'D-U-N-S', value: '08-192-3401' },
      { label: 'State Tax ID', value: 'CA-94102-1' }
    ],
    customerTaxIdLabel: 'Federal EIN / Tax ID',
    transportMode: 'Domestic Motor Freight (Interstate)',
    transportVehicle: 'DOT# 3891024 • Rig US-44',
    transitDocLabel: 'Bill of Lading (BOL #)',
    dispatchDocLabel: 'Delivery Receipt (DR #)',
    bank: 'JPMorgan Chase Bank N.A. • New York Commercial Hub',
    acType: 'Commercial Treasury Account',
    acNo: '8820 1928 4102',
    routingCode: 'ABA Routing: 021000021',
    channelLabel: 'Fedwire / ACH: Live Domestic Transfer',
    qrTitle: 'ACH Fedwire QR',
    declaration: 'Commercial sales invoice compliant with US GAAP and Federal trade laws.'
  },
  GB: {
    country: 'United Kingdom',
    flag: '🇬🇧',
    legalName: 'StockSense UK Distribution Ltd',
    cin: 'Companies House No: 09812401',
    address: '25 Bank Street, Canary Wharf, London, E14 5JP, United Kingdom',
    taxTitle: 'VAT INVOICE',
    statutoryRule: 'HMRC Value Added Tax Act 1994 (VATA)',
    registrationIds: [
      { label: 'HMRC VAT Reg', value: 'GB 123 4567 89' },
      { label: 'Company No', value: '09812401' },
      { label: 'EORI', value: 'GB123456789000' }
    ],
    customerTaxIdLabel: 'HMRC VAT Number',
    transportMode: 'UK Road Haulage (Palletways Express)',
    transportVehicle: 'Fleet Reg: LD23 XYZ',
    transitDocLabel: 'CMR Consignment Note',
    dispatchDocLabel: 'Warehouse Waybill',
    bank: 'Barclays Bank UK PLC • London Corporate Hub',
    acType: 'Sterling Commercial A/C',
    acNo: '33491028',
    routingCode: 'Sort Code: 20-04-15',
    channelLabel: 'IBAN: GB29 BUKB 2004 1533 4910 28',
    qrTitle: 'BACS / Faster Pay',
    declaration: 'Official VAT invoice issued under Regulation 13 of the VAT Regulations 1995.'
  },
  DE: {
    country: 'Germany (EU)',
    flag: '🇩🇪',
    legalName: 'StockSense Deutschland GmbH',
    cin: 'HRB: Amtsgericht Frankfurt 10492',
    address: 'Westhafen Tower, Speicherstraße 55, 60327 Frankfurt am Main, Germany',
    taxTitle: 'RECHNUNG / VAT INVOICE',
    statutoryRule: 'Umsatzsteuergesetz (UStG) § 14 Compliant',
    registrationIds: [
      { label: 'USt-IdNr', value: 'DE 123456789' },
      { label: 'HRB', value: 'Frankfurt 10492' },
      { label: 'DE-EORI', value: 'DE1234567890000' }
    ],
    customerTaxIdLabel: 'USt-IdNr / VAT ID',
    transportMode: 'Euro Spedition (Dachser Logistics)',
    transportVehicle: 'LKW: F-SS 4821',
    transitDocLabel: 'CMR Frachtbrief',
    dispatchDocLabel: 'Lieferschein / DC',
    bank: 'Deutsche Bank AG • Frankfurt Corporate Banking',
    acType: 'Geschäftskonto (SEPA)',
    acNo: '0440532013',
    routingCode: 'BIC: DEUTDEDDFXX',
    channelLabel: 'IBAN: DE89 3704 0044 0532 0130 00',
    qrTitle: 'SEPA EPC-QR',
    declaration: 'Elektronisch erstellte Rechnung gemäß § 14 UStG.'
  },
  AE: {
    country: 'United Arab Emirates',
    flag: '🇦🇪',
    legalName: 'StockSense Middle East FZ-LLC',
    cin: 'Dubai DED Commercial Reg #892102',
    address: 'Dubai CommerCity, Umm Ramool, P.O. Box 38491, Dubai, UAE',
    taxTitle: 'TAX INVOICE / فاتورة ضريبية',
    statutoryRule: 'FTA Decree-Law No. 8 of 2017 on VAT',
    registrationIds: [
      { label: 'FTA TRN', value: '100 2489 1928 00003' },
      { label: 'License No', value: 'DED-892102' },
      { label: 'Jurisdiction', value: 'Dubai CommerCity' }
    ],
    customerTaxIdLabel: 'Customer TRN (Tax Reg No)',
    transportMode: 'GCC Overland Freight (Aramex Logistics)',
    transportVehicle: 'Plate: DXB-78210',
    transitDocLabel: 'Dubai Customs Declaration',
    dispatchDocLabel: 'Bayan Cargo Waybill',
    bank: 'Emirates NBD • Corporate Banking Dubai',
    acType: 'AED Corporate Account',
    acNo: '102948201948',
    routingCode: 'SWIFT: EBILAEAD',
    channelLabel: 'IBAN: AE44 0260 0010 2948 2019 48',
    qrTitle: 'FTA Compliant QR',
    declaration: 'Tax invoice generated in compliance with UAE Federal Tax Authority (FTA) guidelines.'
  },
  SG: {
    country: 'Singapore',
    flag: '🇸🇬',
    legalName: 'StockSense Asia Pacific Pte Ltd',
    cin: 'ACRA Reg UEN: 201928374G',
    address: '10 Collyer Quay, Ocean Financial Centre, Singapore 049315',
    taxTitle: 'TAX INVOICE',
    statutoryRule: 'IRAS Goods and Services Tax Act 1993',
    registrationIds: [
      { label: 'GST Reg / UEN', value: '201928374G' },
      { label: 'ACRA Reg', value: 'UEN 201928374G' },
      { label: 'Jurisdiction', value: 'Singapore Hub' }
    ],
    customerTaxIdLabel: 'Customer UEN / GST Reg',
    transportMode: 'Singapore Port & Ground Cargo',
    transportVehicle: 'Plate: SGX-4820-T',
    transitDocLabel: 'TradeNet Inward Permit',
    dispatchDocLabel: 'Consignment Delivery Order',
    bank: 'DBS Bank Ltd • Marina Bay Financial Centre',
    acType: 'SGD Corporate Business A/C',
    acNo: '003-918291-0',
    routingCode: 'SWIFT: DBSSSGSG',
    channelLabel: 'PayNow Corporate UEN: 201928374G',
    qrTitle: 'PayNow Corporate UEN',
    declaration: 'Tax invoice issued under Singapore GST regulations administered by IRAS.'
  }
};

// Generate realistic HSN/Tariff code based on product category or name
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
  const [paymentMethod, setPaymentMethod] = useState(invoice?.countryCode === 'US' ? 'ACH' : invoice?.countryCode === 'GB' ? 'BACS' : 'UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen || !invoice) return null;

  const isPaid = invoice.status === 'PAID';
  const isPartiallyPaid = invoice.status === 'PARTIALLY_PAID';
  const isOverdue = invoice.status === 'OVERDUE' || (!isPaid && invoice.dueDate && new Date(invoice.dueDate) < new Date());

  const countryCode = invoice.countryCode || 'IN';
  const jurisdiction = JURISDICTION_PROFILES[countryCode] || JURISDICTION_PROFILES.IN;
  const currency = invoice.currency || 'INR';
  const symbol = invoice.currencySymbol || (currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'AED' ? 'د.إ' : currency === 'SGD' ? 'S$' : '₹');

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

  // Generate Dynamic Settlement QR Code
  const companyName = invoice.company?.name || jurisdiction.legalName;
  const settlementQrString = countryCode === 'IN'
    ? `upi://pay?pa=stocksense@hdfcbank&pn=${encodeURIComponent(companyName)}&am=${invoice.totalAmount}&cu=INR&tn=${invoice.invoiceNumber}`
    : `https://pay.stocksense.io/settle?inv=${invoice.invoiceNumber}&amt=${invoice.totalAmount}&curr=${currency}&entity=${encodeURIComponent(jurisdiction.legalName)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(settlementQrString)}`;

  // Statutory E-Invoice verification payload QR
  const eInvoiceString = `${jurisdiction.registrationIds[0]?.label}:${jurisdiction.registrationIds[0]?.value};INV:${invoice.invoiceNumber};DT:${new Date(invoice.invoiceDate).toISOString().slice(0,10)};VAL:${invoice.totalAmount};CC:${countryCode}`;
  const eInvoiceQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(eInvoiceString)}`;

  // Realistic Transit Document Numbers
  const transitDocNo = `${countryCode}-2418-9081-${invoice.invoiceNumber.slice(-4).padStart(4, '0')}`;
  const dispatchChallanNo = `DC-${countryCode}-${new Date().getFullYear()}-${invoice.invoiceNumber.slice(-4).padStart(4, '0')}`;
  const irnHash = `4f8b912a7d6e5c83912a7d6e5c83109a823b4912a7d6e5c83912a7d6e5c832${invoice.invoiceNumber.slice(-2)}`;

  // Group line items by HSN / Tariff
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
    if (countryCode === 'IN' && invoice.isInterState) {
      hsnGroups[hsn].igst += item.taxAmount || 0;
    } else if (countryCode === 'IN') {
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold uppercase flex items-center gap-1">
                  <span>{jurisdiction.flag}</span>
                  <span>{jurisdiction.statutoryRule}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {invoice.customer?.name} • Issued {new Date(invoice.invoiceDate).toLocaleDateString()} • {currency} ({symbol})
              </p>
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
                <label className="text-xs text-slate-700 font-semibold">Amount ({symbol}):</label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
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
                  <option value="WIRE_TRANSFER">Bank Wire / Transfer</option>
                  <option value="ACH">ACH Direct</option>
                  <option value="BACS">BACS Transfer</option>
                  <option value="SEPA">SEPA Transfer</option>
                  <option value="UPI">UPI / QR</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Company Check / Cheque</option>
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <label className="text-xs text-slate-700 font-semibold">Ref / UTR / Trace #:</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-281920"
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

        {/* ── Official Multinational Statutory Tax Invoice Document (A4 Form Factor) ── */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          
          <div className="border-2 border-slate-900 text-[11px] leading-tight">
            
            {/* 1. Official Header & Statutory Tax Identification Banner */}
            <div className="border-b-2 border-slate-900 p-4 bg-slate-50/50">
              
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                
                {/* Seller Legal Entity Details */}
                <div className="flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-8 h-8 rounded bg-slate-900 text-white font-black flex items-center justify-center text-sm">
                      {countryCode}
                    </div>
                    <div>
                      <h1 className="text-lg font-black uppercase tracking-tight text-slate-900">
                        {invoice.company?.name || jurisdiction.legalName}
                      </h1>
                      <div className="text-[10px] text-slate-600 font-medium">
                        {jurisdiction.cin}
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-700 mt-1 max-w-md">
                    {invoice.company?.address ? `${invoice.company.address}, ${invoice.company.city || ''}, ${invoice.company.state || ''}` : jurisdiction.address}
                  </p>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-slate-800">
                    {jurisdiction.registrationIds.map((reg, idx) => (
                      <span key={idx}>
                        <strong>{reg.label}:</strong> <span className="font-mono font-bold">{reg.value}</span>
                      </span>
                    ))}
                  </div>
                  <div className="text-slate-600 mt-0.5 flex gap-3 text-[10px]">
                    <span>Email: operations@stocksense.io</span>
                    <span>Web: www.stocksense.io</span>
                    <span>Global Support: +1 (800) 555-0199</span>
                  </div>
                </div>

                {/* E-Invoice / Regulatory Stamp & Title */}
                <div className="text-right flex flex-col items-end shrink-0">
                  <div className="border border-slate-900 px-3 py-1 bg-white font-black text-xs uppercase tracking-wider mb-2">
                    {jurisdiction.taxTitle}
                  </div>
                  <div className="text-[9px] font-black uppercase tracking-widest text-indigo-900 mb-1">
                    {copyType === 'ORIGINAL' && 'ORIGINAL FOR RECIPIENT'}
                    {copyType === 'DUPLICATE' && 'DUPLICATE FOR TRANSPORTER'}
                    {copyType === 'TRIPLICATE' && 'TRIPLICATE FOR SUPPLIER'}
                  </div>
                  
                  {/* Digital Authentication QR Code */}
                  <div className="flex items-center gap-2 border border-slate-300 p-1 rounded bg-white mt-0.5">
                    <img 
                      src={eInvoiceQrUrl} 
                      alt="Statutory QR" 
                      className="w-16 h-16"
                    />
                    <div className="text-left text-[8px] text-slate-500 font-mono leading-none space-y-1">
                      <div className="font-bold text-slate-800 uppercase">{jurisdiction.country}</div>
                      <div>Statutory e-Doc</div>
                      <div className="text-[7px]">Verifiable B2B</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Digital Reference Bar */}
              <div className="mt-3 pt-2 border-t border-dashed border-slate-300 flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-600 font-mono">
                <div>
                  <strong>Digital IRN / Reference:</strong> <span className="text-slate-900 select-all">{irnHash}</span>
                </div>
                <div>
                  <strong>Ack / Ref:</strong> {countryCode}-98273910 • <strong>Issuance Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString()}
                </div>
              </div>

            </div>

            {/* 2. Invoice & Transport Logistics Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b-2 border-slate-900 divide-x divide-y sm:divide-y-0 divide-slate-900">
              
              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">Invoice Number</div>
                <div className="font-mono font-black text-xs text-slate-950 mt-0.5">{invoice.invoiceNumber}</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Invoice Date</div>
                <div className="font-mono font-bold text-slate-800">
                  {new Date(invoice.invoiceDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">Transportation Mode</div>
                <div className="font-bold text-slate-900 mt-0.5">{jurisdiction.transportMode}</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Vehicle / Carrier No</div>
                <div className="font-mono font-bold text-slate-800">{jurisdiction.transportVehicle}</div>
              </div>

              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">{jurisdiction.transitDocLabel}</div>
                <div className="font-mono font-bold text-slate-900 mt-0.5">{transitDocNo}</div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">{jurisdiction.dispatchDocLabel}</div>
                <div className="font-mono font-bold text-slate-800">{dispatchChallanNo}</div>
              </div>

              <div className="p-2.5">
                <div className="text-[9px] text-slate-500 uppercase font-black">Jurisdiction / POS</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {invoice.customer?.address?.city || jurisdiction.country} ({countryCode})
                </div>
                <div className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Currency & Regime</div>
                <div className="font-mono font-bold text-slate-800">{currency} • {invoice.taxSystem || 'STANDARD'}</div>
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
                    {invoice.customer?.address?.city || 'Regional Hub'}, {invoice.customer?.address?.state || jurisdiction.country} {invoice.customer?.address?.pincode ? `- ${invoice.customer.address.pincode}` : ''}
                  </div>
                </div>

                <div className="mt-1 space-y-0.5">
                  <div>
                    <strong>{jurisdiction.customerTaxIdLabel}:</strong>{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {invoice.customer?.taxId || invoice.customer?.gstin || 'NOT REGISTERED'}
                    </span>
                  </div>
                  <div><strong>Country / Jurisdiction:</strong> {invoice.country || jurisdiction.country}</div>
                  {invoice.customer?.phone && <div><strong>Contact:</strong> {invoice.customer.phone}</div>}
                </div>
              </div>

              {/* Shipped To (Consignee) */}
              <div className="p-3">
                <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Details of Consignee | Shipped to (Destination Hub)
                </div>
                <div className="font-black text-xs text-slate-950 uppercase">
                  {invoice.customer?.name} (Consignment Hub Delivery)
                </div>
                
                <div className="text-slate-700 mt-0.5">
                  {invoice.customer?.address?.street || 'Regional Distribution Centre'}, {invoice.customer?.address?.city || jurisdiction.country}
                </div>

                <div className="mt-1 space-y-0.5">
                  <div>
                    <strong>Dispatch Hub:</strong>{' '}
                    <span className="font-bold">{invoice.sourceWarehouse?.name || `${jurisdiction.country} Central Hub`}</span>{' '}
                    ({invoice.sourceWarehouse?.code || 'HUB-01'})
                  </div>
                  {invoice.operation && (
                    <div className="font-mono text-emerald-800 font-bold">
                      <strong>Delivery Order Ref:</strong> #{invoice.operation._id?.slice(-6)?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <strong>Terms of Payment:</strong> Net 15 Days (Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Immediate'})
                  </div>
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
                    <th className="py-2 px-2 text-center w-20">HSN/Tariff</th>
                    <th className="py-2 px-2 text-center w-14">Qty</th>
                    <th className="py-2 px-2 text-center w-12">UOM</th>
                    <th className="py-2 px-2 text-right w-24">Rate ({symbol})</th>
                    <th className="py-2 px-2 text-right w-16">Disc ({symbol})</th>
                    <th className="py-2 px-2 text-right w-24">Taxable Value</th>
                    <th className="py-2 px-2 text-center w-14">{invoice.taxSystem || 'TAX'} %</th>
                    <th className="py-2 px-3 text-right w-24">Total Amount ({symbol})</th>
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
                        <td className="py-1.5 px-2 text-center font-bold text-slate-600 uppercase">PCS</td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-800">
                          {formatCurrency(item.unitPrice, currency, symbol)}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-slate-600">
                          {disc > 0 ? formatCurrency(disc, currency, symbol) : '-'}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(taxable, currency, symbol)}
                        </td>
                        <td className="py-1.5 px-2 text-center font-bold text-slate-800">{item.taxRate}%</td>
                        <td className="py-1.5 px-3 text-right font-mono font-black text-slate-950">
                          {formatCurrency(item.lineTotal, currency, symbol)}
                        </td>
                      </tr>
                    );
                  })}
                  
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

            {/* 5. Statutory Tax Summary Schedule */}
            <div className="border-b-2 border-slate-900 bg-slate-50/70 p-3">
              <div className="text-[9px] font-black uppercase tracking-wider text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Statutory Tax Assessment Schedule ({jurisdiction.statutoryRule})</span>
                <span className="font-mono text-[9px] font-bold text-indigo-900">Currency: {currency} ({symbol})</span>
              </div>
              <div className="overflow-x-auto border border-slate-300 rounded bg-white">
                <table className="min-w-full divide-y divide-slate-200 text-[9px]">
                  <thead className="bg-slate-100 font-black uppercase text-slate-700">
                    <tr className="divide-x divide-slate-200">
                      <th className="py-1.5 px-2 text-left">HSN / Tariff Code</th>
                      <th className="py-1.5 px-2 text-right">Taxable Value ({symbol})</th>
                      {countryCode === 'IN' && !invoice.isInterState ? (
                        <>
                          <th className="py-1.5 px-2 text-right">Central Tax Rate</th>
                          <th className="py-1.5 px-2 text-right">CGST Amt ({symbol})</th>
                          <th className="py-1.5 px-2 text-right">State Tax Rate</th>
                          <th className="py-1.5 px-2 text-right">SGST Amt ({symbol})</th>
                        </>
                      ) : (
                        <>
                          <th className="py-1.5 px-2 text-right">Applicable Rate</th>
                          <th className="py-1.5 px-2 text-right">{invoice.taxSystem || 'TAX'} Amt ({symbol})</th>
                        </>
                      )}
                      <th className="py-1.5 px-2 text-right">Total Statutory Tax ({symbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {Object.values(hsnGroups).map((g, idx) => (
                      <tr key={idx} className="divide-x divide-slate-200">
                        <td className="py-1 px-2 font-bold text-slate-900">{g.hsn}</td>
                        <td className="py-1 px-2 text-right font-bold text-slate-800">{formatCurrency(g.taxableValue, currency, symbol)}</td>
                        {countryCode === 'IN' && !invoice.isInterState ? (
                          <>
                            <td className="py-1 px-2 text-right">{g.taxRate / 2}%</td>
                            <td className="py-1 px-2 text-right">{formatCurrency(g.cgst, currency, symbol)}</td>
                            <td className="py-1 px-2 text-right">{g.taxRate / 2}%</td>
                            <td className="py-1 px-2 text-right">{formatCurrency(g.sgst, currency, symbol)}</td>
                          </>
                        ) : (
                          <>
                            <td className="py-1 px-2 text-right">{g.taxRate}%</td>
                            <td className="py-1 px-2 text-right">{formatCurrency(g.totalTax, currency, symbol)}</td>
                          </>
                        )}
                        <td className="py-1 px-2 text-right font-black text-slate-900">{formatCurrency(g.totalTax, currency, symbol)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 6. Financial Summary Box, Words & Electronic Settlement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 border-b-2 border-slate-900">
              
              {/* Left Column: Words, Bank A/C & Dynamic Settlement QR */}
              <div className="p-3 space-y-3 flex flex-col justify-between">
                
                <div>
                  <div className="text-[9px] font-black uppercase text-slate-500">Invoice Value in Words:</div>
                  <div className="text-[11px] font-black text-slate-950 italic mt-0.5 leading-snug">
                    {numberToCurrencyWords(invoice.totalAmount, currency)}
                  </div>
                </div>

                {/* Settlement Block with Scannable QR Code */}
                <div className="border border-slate-300 p-2.5 rounded bg-slate-50 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 text-[10px] text-slate-700">
                    <div className="font-black text-slate-900 uppercase tracking-wider text-[9px] flex items-center gap-1">
                      <ShieldCheck size={12} className="text-emerald-700" /> Banking & Settlement ({jurisdiction.country})
                    </div>
                    <div><strong>Bank:</strong> {jurisdiction.bank}</div>
                    <div><strong>A/C Type:</strong> {jurisdiction.acType}</div>
                    <div><strong>A/C No:</strong> <span className="font-mono font-bold text-slate-950">{jurisdiction.acNo}</span></div>
                    <div><strong>Routing / Codes:</strong> <span className="font-mono font-bold text-slate-950">{jurisdiction.routingCode}</span></div>
                    <div><strong>Direct Channel:</strong> <span className="font-mono font-bold text-indigo-800">{jurisdiction.channelLabel}</span></div>
                  </div>

                  <div className="flex flex-col items-center shrink-0 border border-slate-300 p-1.5 rounded bg-white">
                    <img 
                      src={qrCodeUrl} 
                      alt="Payment QR" 
                      className="w-16 h-16"
                    />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-600 mt-1">
                      {jurisdiction.qrTitle}
                    </span>
                  </div>
                </div>

              </div>

              {/* Right Column: Ledger Totals & Calculations */}
              <div className="p-3 space-y-1.5 font-mono text-[11px] bg-slate-50/50">
                
                <div className="flex justify-between text-slate-700">
                  <span>Total Amount Before Tax:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(invoice.subtotal, currency, symbol)}</span>
                </div>

                {countryCode === 'IN' ? (
                  !invoice.isInterState ? (
                    <>
                      <div className="flex justify-between text-slate-700">
                        <span>Add: CGST (Central Tax):</span>
                        <span className="font-bold text-slate-900">{formatCurrency(invoice.taxBreakdown?.cgst || 0, currency, symbol)}</span>
                      </div>
                      <div className="flex justify-between text-slate-700">
                        <span>Add: SGST (State Tax):</span>
                        <span className="font-bold text-slate-900">{formatCurrency(invoice.taxBreakdown?.sgst || 0, currency, symbol)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-700">
                      <span>Add: IGST (Integrated Tax):</span>
                      <span className="font-bold text-slate-900">{formatCurrency(invoice.taxBreakdown?.igst || 0, currency, symbol)}</span>
                    </div>
                  )
                ) : (
                  <div className="flex justify-between text-slate-700">
                    <span>Add: {invoice.taxSystem || 'Statutory Tax'}:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(invoice.taxBreakdown?.totalTax || 0, currency, symbol)}</span>
                  </div>
                )}

                {invoice.shippingCharge > 0 && (
                  <div className="flex justify-between text-slate-700">
                    <span>Add: Freight & Insurance:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(invoice.shippingCharge, currency, symbol)}</span>
                  </div>
                )}

                {invoice.discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Less: Special Trade Discount:</span>
                    <span className="font-bold">-{formatCurrency(invoice.discountTotal, currency, symbol)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Round Off:</span>
                  <span>{symbol}0.00</span>
                </div>

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-xs font-black text-slate-950">
                  <span className="uppercase tracking-wider">Total Invoice Value ({currency}):</span>
                  <span className="text-sm font-black text-slate-950">
                    {formatCurrency(invoice.totalAmount, currency, symbol)}
                  </span>
                </div>

                {invoice.paidAmount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold pt-1 border-t border-dashed border-slate-300">
                    <span>Amount Received / Settled:</span>
                    <span>{formatCurrency(invoice.paidAmount, currency, symbol)}</span>
                  </div>
                )}

                {!isPaid && (
                  <div className="flex justify-between text-red-700 font-black pt-1">
                    <span>Balance Payable:</span>
                    <span>{formatCurrency(invoice.totalAmount - (invoice.paidAmount || 0), currency, symbol)}</span>
                  </div>
                )}

              </div>

            </div>

            {/* 7. Terms, Receiver Acknowledgement & Official Seal */}
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-900 p-3 text-[10px] bg-white">
              
              {/* Terms and Conditions */}
              <div className="sm:col-span-2 pr-3 space-y-1">
                <div className="font-black uppercase text-slate-800 text-[9px]">Terms & Conditions ({jurisdiction.country}):</div>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600 leading-tight">
                  <li>Goods once sold will not be accepted back without authorized RMA consent.</li>
                  <li>Interest @ 1.5% per month will be levied on delayed payments past due date.</li>
                  <li>Ownership transfers upon successful carrier delivery scan at destination hub.</li>
                  <li>Subject to commercial courts jurisdiction in {jurisdiction.country}. E. & O.E.</li>
                </ol>
                <div className="pt-2 text-[9px] text-slate-500 italic">
                  Declaration: We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                </div>
              </div>

              {/* Signatures & Official Company Seal */}
              <div className="pl-3 flex flex-col justify-between items-end text-right space-y-4 pt-2 sm:pt-0">
                <div>
                  <div className="font-black text-slate-950 uppercase text-[10px]">
                    For {invoice.company?.name || jurisdiction.legalName}
                  </div>
                  <div className="text-[9px] text-slate-500">Corporate Fulfillment Division</div>
                </div>

                {/* Stamped Graphic Seal */}
                <div className="border border-slate-400 p-1.5 rounded text-center w-36 bg-slate-50/50">
                  <div className="w-16 h-0.5 bg-slate-400 mx-auto mb-1"></div>
                  <div className="text-[8px] text-emerald-800 font-mono font-bold">DIGITALLY VERIFIED</div>
                  <div className="text-[9px] font-black text-slate-800">Authorized Officer</div>
                  <div className="text-[8px] text-slate-400 font-mono">{new Date().toISOString().slice(0, 10)}</div>
                </div>

                <div className="text-[8px] text-slate-400 italic">
                  {jurisdiction.declaration}
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
