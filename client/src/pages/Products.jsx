import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, Search, Edit, Trash2, Box, FileSpreadsheet, 
  Tag, Clock, ShieldCheck, Filter, X, ChevronRight 
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FeatureGuide from '../components/FeatureGuide';
import BulkImportModal from '../components/BulkImportModal';
import toast from 'react-hot-toast';

const Products = () => {
  const { user, role } = useAuth();
  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      if (status) params.append('status', status);
      
      const res = await api.get(`/products?${params.toString()}`);
      setProducts(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch catalog products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (search) {
        searchParams.set('search', search);
      } else {
        searchParams.delete('search');
      }
      setSearchParams(searchParams, { replace: true });
      fetchProducts();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [search, category, status]);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null && query !== search) {
      setSearch(query);
    }
  }, [searchParams]);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name || 'this product'}? This action is irreversible.`)) {
      try {
        await api.delete(`/products/${id}`);
        toast.success('Product deleted successfully');
        fetchProducts();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  // Derive unique categories from current items
  const categoriesList = ['Electronics', 'Automotive', 'Renewable Energy', 'Industrial', 'Raw Materials'];

  return (
    <div className="space-y-6">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Box size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Product Master Catalog
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enterprise SKU master registry with supplier lead times, safety stock days, and INR costs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <FeatureGuide
            title="Product Master Catalog & SKU Profiles"
            subtitle="Central supply chain parameters for every SKU"
            category="Master Data"
            whatItIs="The central registry for all inventory items. Defines SKU identifiers, category classifications, unit acquisition costs (INR ₹), supplier lead times (days), and minimum safety stock buffers."
            whyItMatters="Accurate product lead times and safety days drive automated reorder formulas, transfer ranking algorithms, and economic batch sizing across your supply chain."
            howToUse={[
              "Search by SKU or name using the instant debounce search bar.",
              "Filter by category (Electronics, Pharma, Textiles, Engineering) or status.",
              "Managers and Admins can create new SKUs or modify lead time parameters."
            ]}
            proTip="Workers have read-only access to verify product specifications during physical counts and dispatches."
          />

          {isManager && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98"
              >
                <FileSpreadsheet size={16} /> Bulk Import
              </button>
              <Link 
                to="/products/new" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98"
              >
                <Plus size={16} /> New Product
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200/80 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200/80 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
              placeholder="Search by SKU, product name, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="border border-slate-200/80 bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold py-2 px-3 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active SKUs</option>
              <option value="ARCHIVED">Archived SKUs</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 custom-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1 shrink-0">
            <Tag size={12} /> Category:
          </span>
          <button
            onClick={() => setCategory('')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
              !category ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            All
          </button>
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(category === cat ? '' : cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 ${
                category === cat ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Catalog Table */}
      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Loading catalog products...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Box size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No products found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {search ? 'Try adjusting your search criteria or category filter.' : 'Add your first SKU to begin inventory tracking.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold bg-slate-50/50">
            <span>Showing <strong className="text-slate-900">{products.length}</strong> catalog items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-5 py-3.5">Product & SKU</th>
                  <th className="px-5 py-3.5">Category</th>
                  <th className="px-5 py-3.5">Unit of Measure</th>
                  <th className="px-5 py-3.5">Standard Cost / Price</th>
                  <th className="px-5 py-3.5">Safety Buffer</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200/60 flex items-center justify-center text-indigo-700 font-extrabold text-xs shrink-0">
                          {product.name?.substring(0, 2).toUpperCase() || 'SK'}
                        </div>
                        <div>
                          <div className="font-extrabold text-slate-900">{product.name}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">{product.sku}</div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700">
                        {product.category || 'General'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-semibold">
                      {product.unitOfMeasure || 'Units'}
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {product.prices && product.prices.length > 0 ? (
                          product.prices.map((p, idx) => (
                            <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 font-mono font-bold text-[11px] px-2 py-0.5 rounded-md">
                              ₹{p.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600">
                      <div className="font-semibold text-slate-900">{product.reorderLevel || 10} units</div>
                      <div className="text-[10px] text-slate-400">{product.safetyStockDays || 7} days lead buffer</div>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-[11px] font-extrabold rounded-full ${
                        product.status === 'ACTIVE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {product.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 whitespace-nowrap text-right space-x-2">
                      {isManager && (
                        <Link 
                          to={`/products/${product._id}/edit`} 
                          className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg inline-flex items-center transition-colors"
                          title="Edit Product"
                        >
                          <Edit size={16} />
                        </Link>
                      )}
                      {isCompanyAdmin && (
                        <button 
                          onClick={() => handleDelete(product._id, product.name)} 
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg inline-flex items-center transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      {!isManager && <span className="text-slate-400 text-xs italic">View only</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        entityType="products"
        onSuccess={fetchProducts}
      />
    </div>
  );
};

export default Products;
