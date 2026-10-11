import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, MapPin, FileSpreadsheet } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BulkImportModal from '../components/BulkImportModal';

const Warehouses = () => {
  const { user, role } = useAuth();
  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';

  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBulkModal, setShowBulkModal] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/warehouses');
      setWarehouses(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch warehouses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this warehouse?')) {
      try {
        await api.delete(`/warehouses/${id}`);
        fetchWarehouses();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete warehouse');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Warehouses</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Physical distribution hubs, regional centers & fulfillment nodes.</p>
        </div>
        {isCompanyAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold shadow flex items-center gap-1.5 transition-colors text-xs sm:text-sm"
            >
              <FileSpreadsheet size={16} /> Bulk Import
            </button>
            <Link to="/warehouses/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow flex items-center gap-1.5 transition-colors text-xs sm:text-sm">
              <Plus size={16} /> New Warehouse
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading warehouses...
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <MapPin size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No warehouses found</p>
          <p className="text-sm">Create a new warehouse to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => (
            <div key={warehouse._id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{warehouse.name}</h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md font-mono border border-indigo-100">
                      {warehouse.code}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold flex items-center gap-1 border border-slate-200">
                      <span>
                        {warehouse.countryCode === 'US' ? '🇺🇸' : warehouse.countryCode === 'GB' ? '🇬🇧' : warehouse.countryCode === 'DE' ? '🇩🇪' : warehouse.countryCode === 'AE' ? '🇦🇪' : warehouse.countryCode === 'SG' ? '🇸🇬' : '🇮🇳'}
                      </span>
                      <span>{warehouse.country || 'India'}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-bold">({warehouse.currency || 'INR'})</span>
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  warehouse.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {warehouse.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div className="flex-grow mb-6 text-gray-600">
                <p className="flex items-start gap-2">
                  <MapPin size={18} className="mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>{warehouse.location || 'No location specified'}</span>
                </p>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                {isCompanyAdmin ? (
                  <>
                    <Link to={`/warehouses/${warehouse._id}/edit`} className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1 font-medium text-sm">
                      <Edit size={16} /> Edit
                    </Link>
                    <button onClick={() => handleDelete(warehouse._id)} className="text-red-600 hover:text-red-900 flex items-center gap-1 font-medium text-sm ml-2">
                      <Trash2 size={16} /> Delete
                    </button>
                  </>
                ) : (
                  <span className="text-gray-400 text-xs italic">Assigned hub</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk Import Modal */}
      <BulkImportModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        entityType="warehouses"
        onSuccess={fetchWarehouses}
      />
    </div>
  );
};

export default Warehouses;
