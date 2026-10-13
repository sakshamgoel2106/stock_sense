import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Edit, Trash2, MapPin, FileSpreadsheet, Building2, 
  ExternalLink, Layers, CheckCircle2, XCircle 
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import BulkImportModal from '../components/BulkImportModal';
import FeatureGuide from '../components/FeatureGuide';
import toast from 'react-hot-toast';

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
      setWarehouses(res.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch warehouse hubs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This will remove its distribution node records.`)) {
      try {
        await api.delete(`/warehouses/${id}`);
        toast.success('Warehouse hub deleted successfully');
        fetchWarehouses();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete warehouse');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Building2 size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Warehouses & Distribution Hubs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Regional distribution centers, fulfillment facilities, and domestic inventory nodes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <FeatureGuide
            title="Warehouse Hub Network"
            subtitle="Multi-facility supply chain nodes & fulfillment routing"
            category="Infrastructure"
            whatItIs="Defines the physical distribution facilities where company stock is warehoused and dispatched. Each facility tracks localized FIFO inventory layers and stock ledgers."
            whyItMatters="Enables multi-hub supply chain optimization. Having facilities close to customer clusters dramatically cuts shipping transit times and logistics freight costs."
            howToUse={[
              "Admins can add new regional facilities with code identifier and geographical location.",
              "Workers are assigned to specific facilities to isolate stock count responsibilities.",
              "Managers can execute inter-hub transfers between any pair of active facilities."
            ]}
            proTip="Restricting staff to their local facility prevents cross-hub count contamination."
          />

          {isCompanyAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all text-xs sm:text-sm hover:scale-102 active:scale-98"
              >
                <FileSpreadsheet size={16} /> Bulk Import
              </button>
              <Link 
                to="/warehouses/new" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all text-xs sm:text-sm hover:scale-102 active:scale-98"
              >
                <Plus size={16} /> New Warehouse
              </Link>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {/* Warehouse Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-slate-200/80 rounded-3xl"></div>
          ))}
        </div>
      ) : warehouses.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <MapPin size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No warehouses configured</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Create your primary warehouse hub to begin managing regional inventory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {warehouses.map((warehouse) => (
            <div 
              key={warehouse._id} 
              className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 flex flex-col justify-between hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-50 to-indigo-100 border border-indigo-200/60 flex items-center justify-center text-indigo-700 font-extrabold">
                      <Building2 size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {warehouse.name}
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block mt-0.5">
                        Code: {warehouse.code}
                      </span>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 text-[11px] font-extrabold rounded-full flex items-center gap-1 ${
                    warehouse.isActive !== false
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${warehouse.isActive !== false ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {warehouse.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                <div className="mt-4 p-3 bg-slate-50/75 rounded-2xl border border-slate-100 text-slate-600 text-xs">
                  <p className="flex items-start gap-2">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />
                    <span className="font-medium text-slate-700">{warehouse.location || 'Location not specified'}</span>
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-100">
                <Link
                  to={`/stock-overview?warehouse=${warehouse._id}`}
                  className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  <Layers size={14} /> Stock Matrix
                </Link>

                <div className="flex items-center gap-2">
                  {isCompanyAdmin ? (
                    <>
                      <Link 
                        to={`/warehouses/${warehouse._id}/edit`} 
                        className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg inline-flex items-center transition-colors"
                        title="Edit Hub"
                      >
                        <Edit size={16} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(warehouse._id, warehouse.name)} 
                        className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg inline-flex items-center transition-colors"
                        title="Delete Hub"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-400 text-[11px] font-semibold italic">Assigned Facility</span>
                  )}
                </div>
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
