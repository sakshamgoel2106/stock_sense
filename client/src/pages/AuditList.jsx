import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Plus, Eye, Edit, Box, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
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
      setAudits(res.data || []);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': 
        return { label: 'In Progress (Draft)', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'PENDING_REVIEW': 
        return { label: 'Pending Manager Review', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'APPROVED': 
        return { label: 'Approved & Reconciled', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'REJECTED': 
        return { label: 'Rejected', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'RECOUNT_REQUIRED': 
        return { label: 'Recount Required', bg: 'bg-orange-50 text-orange-700 border-orange-200' };
      default: 
        return { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <ClipboardCheck size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Smart Stock Audits
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Physical cycle counting protocol with segregation of duties and automated ledger reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <Link 
            to="/audits/new" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all hover:scale-102 active:scale-98"
          >
            <Plus size={16} /> New Audit Session
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Loading smart audit sessions...
        </div>
      ) : audits.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <ClipboardCheck size={36} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-800">No audit sessions recorded</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Launch a cycle count audit to verify theoretical computer stock against physical shelf counts.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-6 py-3.5">Session Code</th>
                  <th className="px-6 py-3.5">Target Facility</th>
                  <th className="px-6 py-3.5">Initiated Date</th>
                  <th className="px-6 py-3.5">Audit Status</th>
                  <th className="px-6 py-3.5">Assigned Auditor</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {audits.map((audit) => {
                  const badge = getStatusBadge(audit.status);
                  return (
                    <tr key={audit._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 whitespace-nowrap font-mono font-extrabold text-slate-900">
                        AUD-{audit._id.slice(-6).toUpperCase()}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-900 font-bold">
                        {audit.warehouse?.name || 'All Facilities'}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-500">
                        {audit.createdAt && !isNaN(new Date(audit.createdAt).getTime())
                          ? new Date(audit.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                          : '-'}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-[11px] font-extrabold rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-slate-600 font-semibold">
                        {audit.countedBy?.name || 'Unassigned'}
                      </td>

                      <td className="px-6 py-3.5 whitespace-nowrap text-right">
                        {audit.status === 'DRAFT' || audit.status === 'RECOUNT_REQUIRED' ? (
                          <Link 
                            to={`/audits/${audit._id}/count`} 
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1 text-xs shadow-2xs transition-colors"
                          >
                            <Edit size={14} /> Resume Counting
                          </Link>
                        ) : (
                          <Link 
                            to={`/audits/${audit._id}/review`} 
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1 text-xs transition-colors"
                          >
                            <Eye size={14} /> Review Variance
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditList;
