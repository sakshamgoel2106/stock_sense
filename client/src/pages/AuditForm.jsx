import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  Plus, 
  ArrowLeft, 
  Send, 
  Search, 
  CheckSquare, 
  Square, 
  ClipboardCheck, 
  Building2, 
  Package, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import api from '../lib/api';

const AuditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // For new audit
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // For counting
  const [audit, setAudit] = useState(null);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (isNew) {
      const fetchData = async () => {
        try {
          const [whRes, prRes] = await Promise.all([
            api.get('/warehouses'),
            api.get('/products')
          ]);
          setWarehouses(whRes.data || []);
          setProducts(prRes.data || []);
          if (whRes.data?.length > 0) {
            setSelectedWarehouse(whRes.data[0]._id);
          }
        } catch (err) {
          setError('Failed to load warehouses and product inventory');
        }
      };
      fetchData();
    } else {
      const fetchAudit = async () => {
        try {
          const res = await api.get(`/audits/${id}`);
          setAudit(res.data);
          const initialCounts = {};
          (res.data.items || []).forEach(item => {
            initialCounts[item._id] = item.countedQuantity !== null && item.countedQuantity !== undefined ? item.countedQuantity : '';
          });
          setCounts(initialCounts);
        } catch (err) {
          setError(err.response?.data?.message || 'Failed to load audit session');
        } finally {
          setLoading(false);
        }
      };
      fetchAudit();
    }
  }, [id, isNew]);

  // Filtered products for selection
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(p => 
      p.name?.toLowerCase().includes(q) || 
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(p => p._id);
    const combined = Array.from(new Set([...selectedProducts, ...allFilteredIds]));
    setSelectedProducts(combined);
  };

  const handleDeselectAll = () => {
    const filteredIdSet = new Set(filteredProducts.map(p => p._id));
    setSelectedProducts(selectedProducts.filter(id => !filteredIdSet.has(id)));
  };

  const toggleProduct = (productId) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(pid => pid !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  const handleCreateAudit = async (e) => {
    e.preventDefault();
    if (!selectedWarehouse) {
      return setError('Please select a target facility hub.');
    }
    if (selectedProducts.length === 0) {
      return setError('Please select at least one product SKU to count.');
    }

    try {
      setSaving(true);
      setError(null);
      const res = await api.post('/audits', {
        warehouse: selectedWarehouse,
        productIds: selectedProducts
      });
      navigate(`/audits/${res.data._id}/count`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start audit session');
      setSaving(false);
    }
  };

  const handleSaveCounts = async () => {
    try {
      setSaving(true);
      const itemsPayload = Object.keys(counts).map(itemId => ({
        _id: itemId,
        countedQuantity: counts[itemId] === '' ? null : Number(counts[itemId])
      }));
      await api.put(`/audits/${id}/count`, { items: itemsPayload });
      alert('Audit progress saved successfully in draft status.');
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save counts');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAudit = async () => {
    if (!audit?.items || audit.items.length === 0) return;

    // Check that every item in audit.items has a filled number
    const incompleteItems = audit.items.filter(
      item => counts[item._id] === '' || counts[item._id] === null || counts[item._id] === undefined
    );

    if (incompleteItems.length > 0) {
      return setError(`Please enter physical counts for all ${audit.items.length} SKUs before submitting.`);
    }

    if (!window.confirm("Submit physical counts for Manager Review? Physical counts cannot be changed after submission.")) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      const itemsPayload = Object.keys(counts).map(itemId => ({
        _id: itemId,
        countedQuantity: Number(counts[itemId])
      }));
      // Save current counts
      await api.put(`/audits/${id}/count`, { items: itemsPayload });
      // Submit for review
      await api.post(`/audits/${id}/submit`);
      navigate(`/audits/${id}/review`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit audit');
      setSaving(false);
    }
  };

  const handleFillAllZero = () => {
    const updated = { ...counts };
    (audit?.items || []).forEach(item => {
      if (updated[item._id] === '' || updated[item._id] === null || updated[item._id] === undefined) {
        updated[item._id] = 0;
      }
    });
    setCounts(updated);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs font-semibold max-w-4xl mx-auto">
        Loading audit configuration...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/audits')} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Audits"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <ClipboardCheck className="text-indigo-600" size={26} />
              {isNew ? 'Initiate Smart Audit Session' : 'Record Physical Stock Counts'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              {isNew 
                ? 'Target a facility hub and select inventory SKUs for blind cycle counting.' 
                : 'Enter physically verified shelf counts. Theoretical ledger amounts are hidden to prevent bias.'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isNew ? (
        <form onSubmit={handleCreateAudit} className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
          {/* Warehouse Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Select Target Facility Hub
            </label>
            <select
              className="w-full text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-2xl p-3 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              required
            >
              <option value="">-- Choose Facility Warehouse --</option>
              {warehouses.map(w => (
                <option key={w._id} value={w._id}>
                  {w.name} {w.code ? `(${w.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Product Selector with Search & Bulk Actions */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Product SKUs to Audit
                </label>
                <span className="text-[11px] text-slate-400">
                  {selectedProducts.length} of {products.length} products selected
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <CheckSquare size={13} /> Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                >
                  <Square size={13} /> Clear
                </button>
              </div>
            </div>

            {/* Product search input */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search size={14} />
              </div>
              <input
                type="text"
                placeholder="Filter SKUs or product names..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
              />
            </div>

            {/* Product Checkbox Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto p-3 border border-slate-100 rounded-2xl bg-slate-50/50">
              {filteredProducts.map(p => {
                const isSelected = selectedProducts.includes(p._id);
                return (
                  <label 
                    key={p._id} 
                    className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${
                      isSelected 
                        ? 'bg-indigo-50/80 border-indigo-200 shadow-2xs' 
                        : 'bg-white border-slate-200/70 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                      checked={isSelected}
                      onChange={() => toggleProduct(p._id)}
                    />
                    <div className="min-w-0">
                      <p className="font-extrabold text-xs text-slate-900 truncate">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {p.sku}
                        </span>
                        {p.unitOfMeasure && (
                          <span className="text-[10px] text-slate-400">
                            {p.unitOfMeasure}
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
            >
              <Plus size={16} />
              {saving ? 'Creating Audit Session...' : 'Start Audit Session'}
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 space-y-6">
          {/* Audit Banner */}
          <div className="bg-indigo-50/80 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-sm">
                <Building2 size={16} />
                <span>Facility: {audit?.warehouse?.name || 'All Facilities'}</span>
                {audit?.warehouse?.code && (
                  <span className="font-mono text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md">
                    {audit.warehouse.code}
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-700 mt-1">
                Blind Counting Mode: System quantities are kept strictly hidden from counters to prevent anchoring bias.
              </p>
            </div>

            <button
              type="button"
              onClick={handleFillAllZero}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs shrink-0"
            >
              Fill blanks with 0
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-slate-100 rounded-2xl">
            <table className="w-full text-left text-xs divide-y divide-slate-100">
              <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Product Item</th>
                  <th className="px-5 py-3.5 w-36">SKU Code</th>
                  <th className="px-5 py-3.5 w-44 text-right">Physical Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(audit?.items || []).map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {item.product?.name || 'Unknown Item'}
                      </div>
                      {item.product?.category && (
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Category: {item.product.category}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600 text-xs">
                      {item.product?.sku || '-'}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="w-28 text-right font-mono font-extrabold text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all"
                          value={counts[item._id] ?? ''}
                          onChange={(e) => setCounts({ ...counts, [item._id]: e.target.value })}
                          placeholder="0"
                        />
                        {item.product?.unitOfMeasure && (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {item.product.unitOfMeasure}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleSaveCounts}
              disabled={saving}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-2xs flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Save size={16} /> Save Draft
            </button>
            <button
              onClick={handleSubmitAudit}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
            >
              <Send size={16} /> Submit for Manager Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditForm;
