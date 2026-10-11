import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Box, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FeatureGuide from '../components/FeatureGuide';
import BulkImportModal from '../components/BulkImportModal';

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
      setProducts(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      // Update URL silently when search changes, but don't if they navigated here with a query param already
      if (search) {
        searchParams.set('search', search);
      } else {
        searchParams.delete('search');
      }
      setSearchParams(searchParams, { replace: true });
      fetchProducts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, category, status]);

  // If URL changes from outside (e.g., clicking Header search bar while already on Products page)
  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null && query !== search) {
      setSearch(query);
    }
  }, [searchParams]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete product');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Box className="text-indigo-600" size={26} /> Product Master Catalog
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Enterprise SKU registry with supplier lead times, safety stock days, and INR costs.</p>
        </div>
        <div className="flex items-center gap-3">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all"
              >
                <FileSpreadsheet size={16} /> Bulk Import
              </button>
              <Link to="/products/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-1.5 transition-all">
                <Plus size={16} /> New Product
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="pl-10 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2 border"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <Box size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No products found</p>
          <p className="text-sm">Adjust your filters or add a new product</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Info</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prices</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.unitOfMeasure}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col gap-1">
                        {product.prices && product.prices.length > 0 ? (
                          product.prices.map((p, idx) => (
                            <span key={idx} className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-md inline-block">
                              {p.amount.toFixed(2)} {p.currency}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isManager && (
                        <Link to={`/products/${product._id}/edit`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                          <Edit size={18} className="inline" />
                        </Link>
                      )}
                      {isCompanyAdmin && (
                        <button onClick={() => handleDelete(product._id)} className="text-red-600 hover:text-red-900">
                          <Trash2 size={18} className="inline" />
                        </button>
                      )}
                      {!isManager && <span className="text-gray-400 text-xs italic">View only</span>}
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
