import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Plus, Eye, Edit } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import FeatureGuide from '../components/FeatureGuide';

const AuditList = () => {
  const { user } = useAuth();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audits');
      setAudits(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch audits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudits();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'RECOUNT_REQUIRED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <ClipboardCheck className="text-indigo-600" size={26} /> Smart Stock Audits
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Physical cycle counts with segregation of duties and automated ledger reconciliations.</p>
        </div>
        <div className="flex items-center gap-3">
          <FeatureGuide
            title="Physical Stock Audits & Cycle Counting"
            subtitle="Blind counting & discrepancy reconciliation"
            category="Inventory Assurance"
            whatItIs="Cycle counting protocol that decouples physical floor counting from administrative approval. Floor workers record actual batch quantities, and the system automatically calculates physical variances against theoretical stock."
            whyItMatters="Essential for ISO compliance, statutory balance sheet audits, and detecting shrinkage. Company Admins and Managers hold full approval authority over stock adjustments."
            howToUse={[
              "Create an audit session for a specific warehouse.",
              "Warehouse staff enters physical counts across SKUs.",
              "Company Admin or Manager reviews discrepancies (loss/gain) and either approves adjustments or flags a recount."
            ]}
            proTip="Separation of duties is strictly enforced: floor workers cannot approve their own counts, while Company Admins maintain supreme override authority."
          />
          <Link to="/audits/new" className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center gap-2 transition-all">
            <Plus size={18} /> New Audit
          </Link>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading audits...</div>
      ) : audits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <ClipboardCheck size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No audits found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Audit ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Counted By</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.map((audit) => (
                <tr key={audit._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">...{audit._id.substring(18)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{audit.warehouse?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(audit.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(audit.status)}`}>
                      {audit.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{audit.countedBy?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {audit.status === 'DRAFT' || audit.status === 'RECOUNT_REQUIRED' ? (
                      <Link to={`/audits/${audit._id}/count`} className="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1">
                        <Edit size={16} /> Resume Count
                      </Link>
                    ) : (
                      <Link to={`/audits/${audit._id}/review`} className="text-gray-600 hover:text-gray-900 flex items-center justify-end gap-1">
                        <Eye size={16} /> View Details
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuditList;
