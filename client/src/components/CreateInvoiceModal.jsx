import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Receipt, Building2, Package, 
  MapPin, DollarSign, Percent, ShieldCheck, Truck, CheckCircle2,
  Calendar, Layers, Sparkles, AlertCircle, ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const CreateInvoiceModal = ({ isOpen, onClose, onSuccess }) => {
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  // Form State
  const [customer, setCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' }
  });
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [items, setItems] = useState([
    { product: '', name: '', sku: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }
  ]);
  const [isInterState, setIsInterState] = useState(false);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [deductStock, setDeductStock] = useState(true);
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('Thank you for choosing us for your fulfillment needs.');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    try {
      setLoadingInitial(true);
      const [prodRes, whRes] = await Promise.all([
        api.get('/products'),
        api.get('/warehouses')
      ]);
      setProducts(prodRes.data || []);
      setWarehouses(whRes.data || []);
      if (whRes.data?.length > 0 && !sourceWarehouse) {
        setSourceWarehouse(whRes.data[0]._id);
      }
    } catch (err) {
      toast.error('Failed to load products or warehouses');
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleProductSelect = (index, productId) => {
    const selected = products.find(p => p._id === productId);
    const updated = [...items];
    if (selected) {
      updated[index] = {
        ...updated[index],
        product: selected._id,
        name: selected.name,
        sku: selected.sku || '',
        unitPrice: selected.prices?.[0]?.amount || 0,
        taxRate: 18
      };
    } else {
      updated[index] = {
        ...updated[index],
        product: '',
        name: '',
        sku: '',
        unitPrice: 0
      };
    }
    setItems(updated);
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { product: '', name: '', sku: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      toast.error('Bill must contain at least one item');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    items.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const rate = Number(item.taxRate) || 0;
      const disc = Number(item.discount) || 0;

      const baseAmount = qty * price;
      const discAmount = disc > 0 ? (disc <= 100 ? (baseAmount * disc) / 100 : disc) : 0;
      const taxable = Math.max(0, baseAmount - discAmount);
      const tax = (taxable * rate) / 100;

      subtotal += taxable;
      totalTax += tax;
    });

    const shipping = Number(shippingCharge) || 0;
    const extraDisc = Number(discountTotal) || 0;
    const grandTotal = Math.max(0, subtotal + totalTax + shipping - extraDisc);

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      cgst: isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100,
      sgst: isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100,
      igst: isInterState ? Math.round(totalTax * 100) / 100 : 0,
      grandTotal: Math.round(grandTotal * 100) / 100
    };
  };

  const { subtotal, totalTax, cgst, sgst, igst, grandTotal } = calculateTotals();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    const invalidItem = items.find(i => !i.product || Number(i.quantity) <= 0);
    if (invalidItem) {
      toast.error('Please select valid products with quantity > 0 for all rows');
      return;
    }

    if (deductStock && !sourceWarehouse) {
      toast.error('Please select a dispatch warehouse to deduct stock');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer,
        sourceWarehouse,
        items,
        isInterState,
        shippingCharge: Number(shippingCharge) || 0,
        discountTotal: Number(discountTotal) || 0,
        dueDate,
        status: markPaid ? 'PAID' : 'SENT',
        paymentMethod: markPaid ? paymentMethod : 'PENDING',
        paymentReference: markPaid ? paymentReference : '',
        notes,
        deductStock
      };

      const res = await api.post('/invoices', payload);
      toast.success(`Invoice ${res.data.invoiceNumber} generated successfully!`);
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[96vh] flex flex-col overflow-hidden my-auto">
        
        {/* ── Modal Header ── */}
        <div className="p-6 bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 shadow-inner">
              <Receipt size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Create Customer Invoice & Bill</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold uppercase">
                  GST Ready
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Generate official GST tax invoices with optional real-time warehouse inventory dispatch.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── Form Body ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Section 1: Customer Details */}
          <div className="bg-slate-50/90 p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 size={15} className="text-indigo-600" /> Buyer / Customer Information (Bill To)
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">* Required for GST invoice</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Entity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors Ltd or Rahul Verma"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98765 43210"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. accounts@tatamotors.com"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Billing Street Address</label>
                <input
                  type="text"
                  placeholder="e.g. 102, MIDC Industrial Area, Phase II"
                  value={customer.address.street}
                  onChange={(e) => setCustomer({ 
                    ...customer, 
                    address: { ...customer.address, street: e.target.value } 
                  })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">City & State</label>
                <input
                  type="text"
                  placeholder="e.g. Pune, Maharashtra"
                  value={customer.address.city}
                  onChange={(e) => setCustomer({ 
                    ...customer, 
                    address: { ...customer.address, city: e.target.value, state: e.target.value } 
                  })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer GSTIN</label>
                <input
                  type="text"
                  placeholder="e.g. 27ABCDE1234F1Z5"
                  value={customer.gstin}
                  onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white uppercase font-mono font-bold focus:ring-2 focus:ring-indigo-500 text-indigo-700"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Fulfillment Hub & Settlement Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/90 p-5 rounded-3xl border border-slate-200/80 shadow-sm">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin size={14} className="text-indigo-600" /> Dispatch Warehouse Hub *
              </label>
              <select
                required
                value={sourceWarehouse}
                onChange={(e) => setSourceWarehouse(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="">-- Select Fulfillment Hub --</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh._id}>{wh.name} ({wh.code})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-600" /> Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer bg-white p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-700">Inter-State Sale (Apply IGST)</span>
              </label>
            </div>
          </div>

          {/* Section 3: Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package size={15} className="text-indigo-600" /> Billed Products & Catalog Line Items
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors border border-indigo-200/60"
              >
                <Plus size={14} /> Add Product Row
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-100 text-slate-600 font-black uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3 text-left">Catalog Product</th>
                    <th className="py-3 px-3 text-center w-24">Qty</th>
                    <th className="py-3 px-3 text-right w-28">Rate (₹)</th>
                    <th className="py-3 px-3 text-center w-24">GST %</th>
                    <th className="py-3 px-3 text-right w-24">Discount %</th>
                    <th className="py-3 px-3 text-right w-28">Total (₹)</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((row, idx) => {
                    const rowBase = (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);
                    const rowDisc = Number(row.discount) > 0 ? (rowBase * Number(row.discount)) / 100 : 0;
                    const rowTax = ((rowBase - rowDisc) * (Number(row.taxRate) || 0)) / 100;
                    const rowTotal = Math.round((rowBase - rowDisc + rowTax) * 100) / 100;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <select
                            required
                            value={row.product}
                            onChange={(e) => handleProductSelect(idx, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white font-semibold text-slate-800"
                          >
                            <option value="">-- Choose Product --</option>
                            {products.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.name} ({p.sku}) • ₹{p.prices?.[0]?.amount || 0}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-mono font-bold"
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.unitPrice}
                            onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-mono font-medium"
                            required
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <select
                            value={row.taxRate}
                            onChange={(e) => handleItemChange(idx, 'taxRate', Number(e.target.value))}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-center font-semibold"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.discount}
                            onChange={(e) => handleItemChange(idx, 'discount', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-right font-mono"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                          ₹{rowTotal.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Live Financial Summary & Dispatch Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            
            {/* Left: Stock Dispatch & Payment Options */}
            <div className="space-y-4">
              
              {/* Auto Delivery Toggle */}
              <div className="p-4 rounded-3xl bg-indigo-50/80 border border-indigo-200/80 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="deductStockToggle"
                  checked={deductStock}
                  onChange={(e) => setDeductStock(e.target.checked)}
                  className="mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="deductStockToggle" className="cursor-pointer text-xs text-slate-700">
                  <div className="font-black text-indigo-950 flex items-center gap-1.5">
                    <Truck size={15} className="text-indigo-600" /> Deduct Stock Automatically (Auto-Dispatch)
                  </div>
                  <p className="text-slate-500 mt-0.5 leading-relaxed">
                    Instantly creates & validates a verified Delivery operation in the warehouse, burning FIFO layers and updating inventory positions.
                  </p>
                </label>
              </div>

              {/* Instant Settlement Toggle */}
              <div className="p-4 rounded-3xl bg-emerald-50/80 border border-emerald-200/80 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={markPaid}
                    onChange={(e) => setMarkPaid(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-black text-emerald-950 flex items-center gap-1">
                    <CheckCircle2 size={15} className="text-emerald-600" /> Settle Payment Immediately (Mark as Paid)
                  </span>
                </label>

                {markPaid && (
                  <div className="grid grid-cols-2 gap-3 pt-1 animate-in fade-in duration-200">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Channel</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-semibold"
                      >
                        <option value="UPI">UPI / QR Code</option>
                        <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                        <option value="CASH">Cash in Hand</option>
                        <option value="CREDIT_CARD">Credit / Debit Card</option>
                        <option value="CHEQUE">Cheque</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Transaction Ref / UTR</label>
                      <input
                        type="text"
                        placeholder="e.g. UPI-981245"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right: Tax Calculation Box */}
            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="font-bold text-slate-800 font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-slate-600">
                  <span>IGST (Integrated GST):</span>
                  <span className="font-bold text-slate-800 font-mono">₹{igst.toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>CGST (Central GST):</span>
                    <span className="font-bold text-slate-800 font-mono">₹{cgst.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>SGST (State GST):</span>
                    <span className="font-bold text-slate-800 font-mono">₹{sgst.toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center text-slate-600 pt-1">
                <span>Shipping / Freight (₹):</span>
                <input
                  type="number"
                  min="0"
                  value={shippingCharge}
                  onChange={(e) => setShippingCharge(e.target.value)}
                  className="w-24 px-2.5 py-1 border border-slate-200 rounded-lg text-right font-mono bg-white font-bold"
                />
              </div>

              <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-baseline">
                <span className="text-sm font-black text-slate-900">Grand Total (INR):</span>
                <span className="text-xl font-black text-indigo-700 font-mono">
                  ₹{grandTotal.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-200 pt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-2 hover:scale-[1.01]"
            >
              {submitting ? 'Generating Invoice...' : 'Generate & Issue Invoice'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

export default CreateInvoiceModal;
