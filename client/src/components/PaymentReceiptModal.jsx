import React from 'react';
import { 
  X, Printer, CheckCircle2, Building2, Phone, Mail, 
  MapPin, Receipt, CreditCard, ShieldCheck, Copy, Check 
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const PaymentReceiptModal = ({ isOpen, onClose, payment, invoice, company }) => {
  if (!isOpen || !payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const copyReceiptNo = () => {
    navigator.clipboard.writeText(payment.receiptNumber);
    toast.success(`Copied ${payment.receiptNumber}`);
  };

  const amountInWords = numberToIndianWords(payment.amount);
  const companyObj = company || invoice?.company || {
    name: 'StockSense India Logistics Private Limited',
    gstin: '27AABCS1429B1Z1',
    address: 'Hub #4, Bhiwandi Logistics Corridor, Thane, Maharashtra - 421302',
    phone: '+91 22 4988 2900',
    email: 'billing@stocksense.in'
  };

  const customerName = payment.customerName || invoice?.customer?.name || 'Customer';
  const customerGstin = payment.customerGstin || invoice?.customer?.gstin || '';
  const invoiceNo = payment.invoiceNumber || invoice?.invoiceNumber || 'INV-2026';
  const invoiceTotal = payment.invoiceTotalAmount || invoice?.totalAmount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-300 w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden my-auto print:shadow-none print:border-none print:m-0 print:max-h-none print:w-full print:rounded-none">
        
        {/* Top Control Header (Hidden when printed) */}
        <div className="px-6 py-3.5 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black font-mono tracking-wider">{payment.receiptNumber}</span>
                <span className="text-[10px] bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 px-2 py-0.2 rounded-full font-bold uppercase">
                  Verified Payment Receipt
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Issued for Invoice {invoiceNo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={copyReceiptNo}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-700"
            >
              <Copy size={13} /> Copy Ref
            </button>
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <Printer size={14} /> Print Receipt
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Official Printable Receipt Voucher */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white text-slate-900 font-sans print:p-0 print:overflow-visible">
          <div className="border-2 border-slate-900 p-6 rounded-2xl relative text-xs leading-normal">
            
            {/* Watermark / Seal */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none select-none">
              <span className="text-8xl font-black rotate-[-25deg]">PAID</span>
            </div>

            {/* Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-slate-900 text-white font-black flex items-center justify-center text-xs">
                    SS
                  </div>
                  <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                    {companyObj.name}
                  </h2>
                </div>
                <div className="text-[11px] text-slate-600 mt-1 max-w-sm">
                  {companyObj.address}
                </div>
                <div className="text-[11px] font-mono font-bold text-slate-800 mt-0.5">
                  GSTIN: {companyObj.gstin || '27AABCS1429B1Z1'}
                </div>
              </div>

              <div className="text-right sm:border-l-2 sm:border-slate-900 sm:pl-4">
                <div className="text-sm font-black uppercase text-emerald-700 tracking-wider">
                  Payment Receipt Voucher
                </div>
                <div className="mt-1 font-mono font-black text-xs text-slate-900">
                  Receipt No: {payment.receiptNumber}
                </div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  Date: {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Time: {new Date(payment.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* Receipt Body */}
            <div className="space-y-4">
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Received With Thanks From:
                  </span>
                  <p className="text-sm font-extrabold text-slate-900 mt-0.5">{customerName}</p>
                  {customerGstin && (
                    <p className="text-[11px] font-mono font-semibold text-slate-700 mt-0.5">
                      GSTIN: {customerGstin}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    On Account Of Tax Invoice:
                  </span>
                  <p className="text-sm font-mono font-extrabold text-indigo-700 mt-0.5">
                    {invoiceNo}
                  </p>
                  {invoiceTotal > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Invoice Value: ₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
              </div>

              {/* Amount Highlight Box */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                    Amount Received
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight mt-0.5">
                    ₹{payment.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="text-left sm:text-right max-w-sm">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Amount in Words
                  </span>
                  <p className="text-xs font-bold text-slate-800 italic mt-0.5">
                    {amountInWords}
                  </p>
                </div>
              </div>

              {/* Transaction Method & Banking Details */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <tbody className="divide-y divide-slate-100">
                    <tr className="bg-slate-50/70">
                      <td className="py-2.5 px-3.5 font-bold text-slate-600 w-1/3">Payment Channel</td>
                      <td className="py-2.5 px-3.5 font-extrabold text-slate-900">
                        {payment.paymentMethod || 'UPI / Online'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3.5 font-bold text-slate-600">Transaction Ref / UTR / Cheque #</td>
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900">
                        {payment.transactionReference || 'N/A (Cash / Counter Settlement)'}
                      </td>
                    </tr>
                    {payment.bankName && (
                      <tr className="bg-slate-50/70">
                        <td className="py-2.5 px-3.5 font-bold text-slate-600">Bank / Institution</td>
                        <td className="py-2.5 px-3.5 font-semibold text-slate-800">
                          {payment.bankName}
                        </td>
                      </tr>
                    )}
                    {payment.payerDetails && (
                      <tr>
                        <td className="py-2.5 px-3.5 font-bold text-slate-600">Payer Details / Account / VPA</td>
                        <td className="py-2.5 px-3.5 font-mono text-slate-800">
                          {payment.payerDetails}
                        </td>
                      </tr>
                    )}
                    {payment.notes && (
                      <tr className="bg-slate-50/70">
                        <td className="py-2.5 px-3.5 font-bold text-slate-600">Remarks / Purpose</td>
                        <td className="py-2.5 px-3.5 text-slate-700 italic">
                          {payment.notes}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Status and Signatures */}
              <div className="pt-4 border-t-2 border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-[11px]">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold">
                    <CheckCircle2 size={16} />
                    <span>Transaction Authenticated & Credited to Company Account</span>
                  </div>
                  {payment.recordedBy?.name && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      Cashier / Cash Office: <strong className="text-slate-600">{payment.recordedBy.name}</strong>
                    </div>
                  )}
                  <div className="text-[9px] text-slate-400 mt-0.5">
                    System Generated Voucher • Valid without physical signature under IT Act 2000
                  </div>
                </div>

                <div className="text-right sm:self-end">
                  <div className="text-[10px] font-extrabold uppercase text-slate-900">
                    For {companyObj.name}
                  </div>
                  <div className="mt-4 border-t border-slate-400 pt-1 text-[10px] font-bold text-slate-700 w-40 text-center ml-auto">
                    Authorized Signatory
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

    </div>
  );
};

export default PaymentReceiptModal;
