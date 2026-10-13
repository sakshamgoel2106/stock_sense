import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Trash2, Receipt, Building2, Package, 
  MapPin, DollarSign, Percent, ShieldCheck, Truck, CheckCircle2,
  Calendar, Layers, Sparkles, AlertCircle, ArrowRight, Save
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const EditInvoiceModal = ({ isOpen, onClose, invoice, onSuccess }) => {
  const [products, setProducts] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [customer, setCustomer] = useState({
    companyName: '',
    name: '',
    email: '',
    phone: '',
    gstin: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' }
  });
  const [items, setItems] = useState([]);
  const [isInterState, setIsInterState] = useState(false);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [discountTotal, setDiscountTotal] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('SENT');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    if (isOpen && invoice) {
      loadProducts();
      populateFromInvoice();
    }
  }, [isOpen, invoice]);

  const loadProducts = async () => {
    try {
      setLoadingInitial(true);
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const populateFromInvoice = () => {
    const c = invoice.customer || {};
    const addr = c.address || {};
    setCustomer({
      companyName: c.companyName || c.name || '',
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      gstin: c.gstin || '',
      address: {
        street: addr.street || (typeof addr === 'string' ? addr : ''),
        city: addr.city || '',
        state: addr.state || '',
        pincode: addr.pincode || '',
        country: addr.country || 'India'
      }
    });

    const parsedItems = (invoice.items || []).map(i => ({
      product: typeof i.product === 'object' ? i.product?._id : i.product,
      name: i.name || '',
      sku: i.sku || '',
      quantity: i.quantity || 1,
      unitPrice: i.unitPrice || 0,
      taxRate: i.taxRate ?? 18,
      discount: i.discount || 0
    }));

    setItems(parsedItems.length > 0 ? parsedItems : [
      { product: '', name: '', sku: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }
    ]);

    setIsInterState(Boolean(invoice.isInterState));
    setShippingCharge(invoice.shippingCharge || 0);
    setDiscountTotal(invoice.discountTotal || 0);
    setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
    setStatus(invoice.status || 'SENT');
    setNotes(invoice.notes || '');
    setTerms(invoice.terms || '');
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
    setItems([
      ...items,
      { product: '', name: '', sku: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) {
      toast.error('Bill must contain at least one line item');
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

    if (!customer.companyName.trim() && !customer.name.trim()) {
      toast.error('Recipient Company or Customer name is required');
      return;
    }

    const invalidItem = items.find(i => !i.product || Number(i.quantity) <= 0);
    if (invalidItem) {
      toast.error('Please select valid products with quantity > 0 for all rows');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customer: {
          companyName: customer.companyName.trim(),
          contactName: customer.name.trim(),
          name: customer.companyName.trim() || customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim(),
          gstin: customer.gstin.trim().toUpperCase(),
          address: {
            street: customer.address.street.trim(),
            city: customer.address.city.trim(),
            state: customer.address.state.trim() || customer.address.city.trim(),
            pincode: customer.address.pincode.trim(),
            country: 'India'
          }
        },
        items: items.map(item => ({
          product: item.product,
          name: item.name,
          sku: item.sku,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          taxRate: Number(item.taxRate),
          discount: Number(item.discount)
        })),
        isInterState,
        shippingCharge: Number(shippingCharge) || 0,
        discountTotal: Number(discountTotal) || 0,
        dueDate: dueDate || undefined,
        status,
        notes,
        terms
      };

      const res = await api.put(`/invoices/${invoice._id}`, payload);
      toast.success(`Tax Invoice ${invoice.invoiceNumber} updated successfully!`);
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update invoice');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !invoice) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 px-6 flex items-center justify-between border-b border-indigo-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-white/10 backdrop-blur-md">
              <Receipt size={22} className="text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Edit Tax Invoice</h2>
                <span className="text-xs font-mono font-bold bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200/80 mt-0.5">
                Update client company, GST rates, line items, and financial terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-indigo-200 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          
          {/* Section 1: Customer & Company Details */}
          <div className="bg-slate-50/90 p-5 rounded-3xl border border-slate-200/80 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Building2 size={15} className="text-indigo-600" /> Buyer / Customer Company Information (Bill To)
              </h3>
              <span className="text-[11px] text-slate-400 font-semibold">* Legal billing entity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Entity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors Ltd or Reliance Retail"
                  value={customer.companyName}
                  onChange={(e) => setCustomer({ ...customer, companyName: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person / Attn</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Verma"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Pincode</label>
                <input
                  type="text"
                  placeholder="e.g. 411018"
                  value={customer.address.pincode}
                  onChange={(e) => setCustomer({ 
                    ...customer, 
                    address: { ...customer.address, pincode: e.target.value } 
                  })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Financial Terms & Supply Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50/90 p-5 rounded-3xl border border-slate-200/80 shadow-sm text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-600" /> Payment Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Invoice Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-bold"
              >
                <option value="DRAFT">DRAFT</option>
                <option value="SENT">SENT / UNPAID</option>
                <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Freight / Shipping (₹)</label>
              <input
                type="number"
                min="0"
                value={shippingCharge}
                onChange={(e) => setShippingCharge(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Extra Discount (₹)</label>
              <input
                type="number"
                min="0"
                value={discountTotal}
                onChange={(e) => setDiscountTotal(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-mono font-bold focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sm:col-span-4 pt-2 border-t border-slate-200">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInterState}
                  onChange={(e) => setIsInterState(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span className="font-bold text-slate-800">
                  Inter-State Supply (IGST Applicable)
                </span>
                <span className="text-[11px] text-slate-400">
                  — Splits as IGST 18% instead of Intra-State CGST 9% + SGST 9%
                </span>
              </label>
            </div>
          </div>

          {/* Section 3: Line Items Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 px-6 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Package size={15} className="text-indigo-600" /> Billed Items & GST Slabs
              </h3>
              <button
                type="button"
                onClick={addItemRow}
                className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={14} /> Add Product Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-100">
                <thead className="bg-slate-50/50 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4 w-64">Product SKU</th>
                    <th className="py-3 px-3 w-24 text-center">Qty</th>
                    <th className="py-3 px-3 w-32 text-right">Unit Price (₹)</th>
                    <th className="py-3 px-3 w-28 text-center">GST Slab</th>
                    <th className="py-3 px-3 w-24 text-right">Disc %</th>
                    <th className="py-3 px-4 w-32 text-right">Line Total</th>
                    <th className="py-3 px-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.map((item, index) => {
                    const qty = Number(item.quantity) || 0;
                    const price = Number(item.unitPrice) || 0;
                    const rate = Number(item.taxRate) || 0;
                    const disc = Number(item.discount) || 0;
                    const base = qty * price;
                    const discAmt = disc > 0 ? (disc <= 100 ? (base * disc) / 100 : disc) : 0;
                    const taxable = Math.max(0, base - discAmt);
                    const lineTot = taxable + (taxable * rate) / 100;

                    return (
                      <tr key={index} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4">
                          <select
                            required
                            value={item.product}
                            onChange={(e) => handleProductSelect(index, e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 font-semibold"
                          >
                            <option value="">Select Product SKU</option>
                            {products.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs text-center font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-28 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs text-right font-mono font-bold bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-3 text-center">
                          <select
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(index, 'taxRate', Number(e.target.value))}
                            className="w-24 px-2 py-1.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center bg-white focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value={0}>0%</option>
                            <option value={5}>5%</option>
                            <option value={12}>12%</option>
                            <option value={18}>18%</option>
                            <option value={28}>28%</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 text-right">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => handleItemChange(index, 'discount', e.target.value)}
                            className="w-20 px-2 py-1.5 border border-slate-200 rounded-xl text-xs text-right font-mono bg-white focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>

                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{lineTot.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
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

            {/* Financial Summary Footer */}
            <div className="bg-slate-50/90 p-5 px-6 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="text-xs text-slate-500 space-y-1">
                <div>Subtotal (Taxable): <strong className="text-slate-800 font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
                <div>
                  Total GST ({isInterState ? 'IGST' : 'CGST + SGST'}): <strong className="text-slate-800 font-mono">₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <div className="bg-white p-3 px-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-6">
                <div className="text-xs font-bold text-slate-500">Total Billed Amount:</div>
                <div className="text-xl font-black text-indigo-700 font-mono">
                  ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Notes and Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer / Ledger Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes for customer..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Statutory Terms & Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 px-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Changes will update both the tax invoice and linked delivery order.
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save size={15} />
              {submitting ? 'Saving Changes...' : 'Save & Update Bill'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EditInvoiceModal;
