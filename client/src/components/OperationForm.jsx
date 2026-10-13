import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Building2, Truck, Receipt, AlertTriangle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

const OperationForm = ({ type, title, backLink }) => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    sourceWarehouse: '',
    destinationWarehouse: '',
    items: [],
    customer: {
      companyName: '',
      name: '',
      gstin: '',
      phone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India'
      }
    }
  });

  const [deliverAndBill, setDeliverAndBill] = useState(type === 'DELIVERY');
  const [isInterState, setIsInterState] = useState(false);
  
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockLevels, setStockLevels] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [whRes, prodRes] = await Promise.all([
          api.get('/warehouses'),
          api.get('/products')
        ]);
        setWarehouses(whRes.data);
        setProducts(prodRes.data);
      } catch (err) {
        setError('Failed to load form dependencies');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, []);

  // Fetch stock levels for warehouse when warehouse changes (for both DELIVERY and ADJUSTMENT)
  useEffect(() => {
    const targetWh = type === 'DELIVERY' ? formData.sourceWarehouse : (type === 'ADJUSTMENT' ? formData.destinationWarehouse : null);
    if (targetWh) {
      const fetchStock = async () => {
        try {
          const res = await api.get(`/inventory/stock?warehouse=${targetWh}`);
          const map = {};
          res.data.forEach(s => {
            map[s.product._id] = s.quantity;
          });
          setStockLevels(map);
          
          setFormData(prev => ({
            ...prev,
            items: prev.items.map(item => ({
              ...item,
              currentQty: map[item.product] ?? 0
            }))
          }));
        } catch (err) {
          console.error(err);
        }
      };
      fetchStock();
    }
  }, [type, formData.sourceWarehouse, formData.destinationWarehouse]);

  const handleProductChange = (index, productId) => {
    const newItems = [...formData.items];
    const selectedProd = products.find(p => p._id === productId);
    newItems[index].product = productId;
    newItems[index].currentQty = stockLevels[productId] ?? 0;
    newItems[index].unitCost = selectedProd?.prices?.[0]?.amount || 0;
    setFormData({ ...formData, items: newItems });
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...formData.items];
    newItems[index].quantity = qty;
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1, currentQty: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      setError('Please add at least one product line.');
      return;
    }
    
    for (let item of formData.items) {
      if (!item.product) {
        setError('Please select a product for all lines.');
        return;
      }
      if (item.quantity <= 0) {
        setError('Quantities must be greater than zero.');
        return;
      }
    }

    setLoading(true);
    setError(null);

    // Verify stock availability when delivering goods
    if (type === 'DELIVERY' && deliverAndBill) {
      for (let item of formData.items) {
        const available = stockLevels[item.product] ?? 0;
        const prodObj = products.find(p => p._id === item.product);
        if (Number(item.quantity) > available) {
          setError(`Cannot deliver goods: Requested ${item.quantity} units of "${prodObj?.name || 'Product'}", but only ${available} units are available in ${warehouses.find(w => w._id === formData.sourceWarehouse)?.name || 'this warehouse'}.`);
          setLoading(false);
          return;
        }
      }
    }

    const payload = {
      type,
      items: formData.items.map(i => ({ 
        product: i.product, 
        quantity: Number(i.quantity),
        unitCost: Number(i.unitCost || 0)
      }))
    };

    if (type === 'RECEIPT' || type === 'TRANSFER' || type === 'ADJUSTMENT') {
      payload.destinationWarehouse = formData.destinationWarehouse;
    }
    if (type === 'DELIVERY') {
      payload.sourceWarehouse = formData.sourceWarehouse;
      payload.customer = formData.customer;
    } else if (type === 'TRANSFER') {
      payload.sourceWarehouse = formData.sourceWarehouse;
    }
    if (type === 'TRANSFER' && formData.sourceWarehouse === formData.destinationWarehouse) {
      setError('Source and destination warehouses must be different.');
      setLoading(false);
      return;
    }

    try {
      const opRes = await api.post('/inventory/operations', payload);
      const opId = opRes.data._id;

      if (type === 'DELIVERY' && deliverAndBill) {
        // Automatically dispatch goods (deduct physical warehouse stock) and generate tax invoice
        await api.post(`/invoices/from-delivery/${opId}`, {
          dispatchGoods: true,
          isInterState,
          customer: formData.customer
        });
        toast.success(`Goods Dispatched & Tax Invoice Generated for #${opId.slice(-6).toUpperCase()}!`);
      } else {
        toast.success(type === 'DELIVERY' ? 'Delivery draft order saved!' : 'Operation saved!');
      }

      navigate(backLink);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to process operation');
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-8 text-center text-gray-500">Loading form...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
          New {title}
        </h1>
        <button 
          onClick={() => navigate(backLink)}
          className="text-gray-600 hover:text-gray-900 font-medium"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(type === 'DELIVERY' || type === 'TRANSFER') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Warehouse *</label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5"
                  value={formData.sourceWarehouse}
                  onChange={(e) => setFormData({...formData, sourceWarehouse: e.target.value})}
                >
                  <option value="">Select Source</option>
                  {warehouses.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {(type === 'RECEIPT' || type === 'TRANSFER' || type === 'ADJUSTMENT') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Warehouse *</label>
                <select
                  required
                  className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2.5"
                  value={formData.destinationWarehouse}
                  onChange={(e) => setFormData({...formData, destinationWarehouse: e.target.value})}
                >
                  <option value="">Select Destination</option>
                  {warehouses.map(w => (
                    <option key={w._id} value={w._id}>{w.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Recipient Company Details for Outbound Deliveries */}
          {type === 'DELIVERY' && (
            <div className="bg-slate-50/90 p-5 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-600" />
                  Recipient / Client Company Details (Billed To)
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">* Required for GST Bill Generation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tata Motors Ltd or Reliance Retail"
                    value={formData.customer.companyName}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: { ...formData.customer, companyName: e.target.value }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person / Attn</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Sharma"
                    value={formData.customer.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: { ...formData.customer, name: e.target.value }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 27ABCDE1234F1Z5"
                    value={formData.customer.gstin}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: { ...formData.customer, gstin: e.target.value.toUpperCase() }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono uppercase focus:ring-indigo-500 focus:border-indigo-500 text-indigo-700 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={formData.customer.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: { ...formData.customer, phone: e.target.value }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. accounts@client.com"
                    value={formData.customer.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: { ...formData.customer, email: e.target.value }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City & State</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={formData.customer.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: {
                        ...formData.customer,
                        address: {
                          ...formData.customer.address,
                          city: e.target.value,
                          state: e.target.value
                        }
                      }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery / Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Plot 14, MIDC Industrial Area, Phase 1"
                    value={formData.customer.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: {
                        ...formData.customer,
                        address: {
                          ...formData.customer.address,
                          street: e.target.value
                        }
                      }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 400001"
                    value={formData.customer.address.pincode}
                    onChange={(e) => setFormData({
                      ...formData,
                      customer: {
                        ...formData.customer,
                        address: {
                          ...formData.customer.address,
                          pincode: e.target.value
                        }
                      }
                    })}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-mono focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Fulfillment & Invoicing Mode for Outbound Deliveries */}
          {type === 'DELIVERY' && (
            <div className="bg-indigo-50/70 p-4 sm:p-5 rounded-2xl border border-indigo-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck size={17} className="text-indigo-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-950">
                    Delivery Fulfillment & Invoicing Mode
                  </h4>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                  Real-Time Dispatch
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  deliverAndBill 
                    ? 'bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500' 
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={deliverAndBill}
                    onChange={() => setDeliverAndBill(true)}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <strong className="text-slate-900 block flex items-center gap-1 font-bold">
                      <Receipt size={13} className="text-indigo-600" /> Deliver Goods & Generate Bill (Recommended)
                    </strong>
                    <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                      Verifies available on-hand inventory, immediately deducts warehouse stock, and issues the official GST Tax Invoice.
                    </span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                  !deliverAndBill 
                    ? 'bg-white border-slate-500 shadow-sm ring-1 ring-slate-500' 
                    : 'bg-white/60 border-slate-200 hover:bg-white'
                }`}>
                  <input
                    type="radio"
                    name="deliveryMode"
                    checked={!deliverAndBill}
                    onChange={() => setDeliverAndBill(false)}
                    className="mt-0.5 text-slate-600 focus:ring-slate-500"
                  />
                  <div>
                    <strong className="text-slate-900 block font-bold">Save as Delivery Order Draft</strong>
                    <span className="text-[11px] text-slate-500 leading-snug block mt-0.5">
                      Logs the delivery schedule without deducting physical stock or generating customer bills yet.
                    </span>
                  </div>
                </label>
              </div>

              {deliverAndBill && (
                <div className="pt-2 border-t border-indigo-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isInterStateDelivery"
                    checked={isInterState}
                    onChange={(e) => setIsInterState(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="isInterStateDelivery" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Inter-State Supply (Apply IGST 18% instead of Intra-State CGST+SGST)
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="mt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Line Items</h3>
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="flex items-end gap-4 p-4 border rounded-lg bg-gray-50">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                      required
                      className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                      value={item.product}
                      onChange={(e) => handleProductChange(index, e.target.value)}
                    >
                      <option value="">Select Product</option>
                      {products.map(p => (
                        <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>

                  {type === 'DELIVERY' && item.product && (
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">In Stock</label>
                      <div className={`p-2 rounded-lg text-xs font-mono font-bold text-center border ${
                        (stockLevels[item.product] || 0) >= Number(item.quantity)
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                      }`}>
                        {stockLevels[item.product] ?? 0} units
                      </div>
                    </div>
                  )}

                  {type === 'DELIVERY' && (
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Unit Rate (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 font-mono"
                        value={item.unitCost || 0}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].unitCost = Number(e.target.value);
                          setFormData({ ...formData, items: newItems });
                        }}
                      />
                    </div>
                  )}
                  
                  {type === 'ADJUSTMENT' && (
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">System Qty</label>
                      <input
                        type="number"
                        disabled
                        className="w-full border border-gray-300 rounded-lg shadow-sm bg-gray-100 p-2"
                        value={item.currentQty}
                      />
                    </div>
                  )}

                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {type === 'ADJUSTMENT' ? 'Counted Qty' : 'Quantity'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      className="w-full border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                    />
                  </div>

                  {type === 'ADJUSTMENT' && (
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delta</label>
                      <input
                        type="number"
                        disabled
                        className="w-full border border-gray-300 rounded-lg shadow-sm bg-gray-100 p-2"
                        value={Number(item.quantity) - item.currentQty}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 text-red-600 hover:text-red-900 bg-white border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={addItem}
              className="mt-4 flex items-center gap-2 text-indigo-600 font-medium hover:text-indigo-800"
            >
              <Plus size={20} /> Add Line Item
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            type="button"
            onClick={() => navigate(backLink)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 rounded-xl text-white font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-70 ${
              type === 'DELIVERY' && deliverAndBill
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                : 'bg-slate-800 hover:bg-slate-900'
            }`}
          >
            {loading ? 'Processing...' : (
              type === 'DELIVERY' && deliverAndBill ? (
                <>
                  <Truck size={16} /> Deliver Goods & Generate Bill
                </>
              ) : (
                'Save Draft'
              )
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OperationForm;
