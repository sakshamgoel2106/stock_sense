import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RotateCw, 
  AlertTriangle, 
  ShieldCheck, 
  Building2, 
  User, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  Check, 
  ExternalLink,
  Info
} from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const AuditReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [staleError, setStaleError] = useState(false);
  const [demoOverride, setDemoOverride] = useState(false);

  const [reasons, setReasons] = useState({});

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/audits/${id}`);
        setAudit(res.data);
        const initialReasons = {};
        (res.data.items || []).forEach(item => {
          if (item.variance !== 0) {
            initialReasons[item._id] = { 
              reason: item.reason || '', 
              explanation: item.explanation || '' 
            };
          }
        });
        setReasons(initialReasons);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load audit session');
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [id]);

  const handleReasonChange = (itemId, field, value) => {
    setReasons(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value
      }
    }));
  };

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'ADMIN' || user?.role === 'COMPANY_ADMIN';
  const hasApprovalAuthority = isCompanyAdmin || role === 'MANAGER' || user?.role === 'MANAGER';
  const isManager = hasApprovalAuthority;
  const isPending = audit?.status === 'PENDING_REVIEW';
  const isStale = audit?.status === 'RECOUNT_REQUIRED';
  
  const isCounter = Boolean(
    audit?.countedBy && 
    user?._id && 
    (audit.countedBy._id?.toString() === user._id.toString() || audit.countedBy.toString() === user._id.toString())
  );

  const handleApprove = async () => {
    for (const item of (audit?.items || [])) {
      if (item.variance !== 0) {
        const r = reasons[item._id];
        if (!r || !r.reason) {
          return setError(`Please select an audit discrepancy reason for SKU: ${item.product?.name || item.product?.sku || 'Product'}`);
        }
        if (r.reason === 'Other' && !r.explanation) {
          return setError(`Please provide an explanation for "Other" reason on SKU: ${item.product?.name || item.product?.sku || 'Product'}`);
        }
      }
    }

    if (!window.confirm("Approve this smart audit session? This will post immutable double-entry ledger adjustment records and reconcile physical stock.")) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setStaleError(false);
      await api.post(`/audits/${id}/approve`, { 
        reasons, 
        overrideSeparationOfDuties: demoOverride || isCompanyAdmin 
      });
      navigate('/audits');
    } catch (err) {
      if (err.response?.status === 409) {
        setStaleError(true);
      }
      setError(err.response?.data?.message || 'Failed to approve audit');
      setSaving(false);
    }
  };

  const handleReject = async () => {
    const reason = window.prompt("Enter statutory rejection reason (e.g. Unverified batch count, seal broken):");
    if (!reason || !reason.trim()) return;
    
    try {
      setSaving(true);
      setError(null);
      await api.post(`/audits/${id}/reject`, { reason: reason.trim() });
      navigate('/audits');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject audit');
      setSaving(false);
    }
  };

  const handleRecount = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.post(`/audits/${id}/recount`);
      navigate(`/audits/${res.data._id}/count`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initiate recount');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-16 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs font-semibold max-w-6xl mx-auto">
        Loading smart audit details & reconciliation ledger...
      </div>
    );
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'PENDING_REVIEW': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'REJECTED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'RECOUNT_REQUIRED': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/audits')} 
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            title="Back to Audits"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Audit Review: AUD-{audit?._id?.slice(-6).toUpperCase()}
              </h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold border ${getStatusBadge(audit?.status)}`}>
                {audit?.status}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Physical inventory variance analysis and ledger reconciliation dashboard.
            </p>
          </div>
        </div>

        {hasApprovalAuthority && isPending && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold shrink-0">
            <ShieldCheck size={16} />
            <span>{isCompanyAdmin ? 'Company Admin Approval Gate' : 'Manager Review Gate'}</span>
          </div>
        )}
      </div>

      {/* Recount Stale Notice */}
      {staleError && (
        <div className="bg-orange-50 text-orange-800 p-4 rounded-2xl border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-extrabold text-xs sm:text-sm">Stock Changed — Recount Required</p>
              <p className="text-xs text-orange-700 mt-0.5">
                The theoretical stock level changed while this audit was pending review. To protect ledger integrity, a recount is required.
              </p>
            </div>
          </div>
          <button 
            onClick={handleRecount}
            disabled={saving}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <RotateCw size={14} /> Start Recount
          </button>
        </div>
      )}

      {error && !staleError && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Separation of Duties Banner if counter is manager */}
      {isPending && isCounter && !isCompanyAdmin && (
        <div className="bg-amber-50/90 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Info className="text-amber-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs sm:text-sm font-extrabold text-amber-900">
                Separation of Duties Active
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                You performed the physical count for this audit. Under standard compliance, approvals require an independent Manager or Company Admin.
              </p>
            </div>
          </div>
          <label className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-amber-200 cursor-pointer shadow-2xs shrink-0">
            <input 
              type="checkbox"
              className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              checked={demoOverride}
              onChange={(e) => setDemoOverride(e.target.checked)}
            />
            <span className="text-xs font-bold text-amber-900">Demo Mode Override</span>
          </label>
        </div>
      )}

      {/* Metadata Cards */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Building2 size={12} /> Target Facility
            </div>
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1">
              {audit?.warehouse?.name || 'All Facilities'}
            </div>
            {audit?.warehouse?.code && (
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Code: {audit.warehouse.code}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <User size={12} /> Counted By
            </div>
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1">
              {audit?.countedBy?.name || 'Unassigned'}
            </div>
            {audit?.countedBy?.email && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                {audit.countedBy.email}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Calendar size={12} /> Submitted At
            </div>
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1">
              {audit?.submittedAt ? new Date(audit.submittedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'In Draft'}
            </div>
            {audit?.submittedAt && (
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                {new Date(audit.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <ShieldCheck size={12} /> Reviewed By
            </div>
            <div className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1">
              {audit?.reviewedBy?.name || 'Pending Review'}
            </div>
            {audit?.approvedAt && (
              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                Approved: {new Date(audit.approvedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Rejection Reason banner if rejected */}
        {audit?.rejectionReason && (
          <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-200 text-xs">
            <span className="font-bold">Rejection Note: </span>
            <span>{audit.rejectionReason}</span>
          </div>
        )}

        {/* Linked stock ledger entry if approved */}
        {audit?.operationRef && (
          <div className="bg-indigo-50/70 border border-indigo-200/80 p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-indigo-900 font-bold">
              Adjustments reconciled to immutable stock ledger
            </span>
            <Link 
              to="/inventory/ledger" 
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
            >
              <span>View Stock Ledger</span>
              <ExternalLink size={13} />
            </Link>
          </div>
        )}

        {/* Variances Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-2xl">
          <table className="w-full text-left text-xs divide-y divide-slate-100">
            <thead className="bg-slate-50/80 text-slate-400 font-extrabold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Product SKU</th>
                {isManager && <th className="px-5 py-3.5 text-right w-28">System Qty</th>}
                <th className="px-5 py-3.5 text-right w-28">Physical Count</th>
                {isManager && <th className="px-5 py-3.5 text-right w-28">Discrepancy</th>}
                {isManager && <th className="px-5 py-3.5 min-w-[260px]">Reason & Resolution</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {(audit?.items || []).map((item) => {
                const isVariance = item.variance !== undefined && item.variance !== 0;
                const isGain = (item.variance || 0) > 0;
                const isLoss = (item.variance || 0) < 0;

                return (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        {item.product?.name || 'Unspecified SKU'}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded">
                          {item.product?.sku || '-'}
                        </span>
                        {item.product?.unitOfMeasure && (
                          <span className="text-[10px] text-slate-400">
                            ({item.product.unitOfMeasure})
                          </span>
                        )}
                      </div>
                    </td>

                    {isManager && (
                      <td className="px-5 py-3.5 text-right font-mono text-slate-500 font-bold text-xs">
                        {item.systemQuantitySnapshot !== undefined ? item.systemQuantitySnapshot.toLocaleString() : '?'}
                      </td>
                    )}

                    <td className="px-5 py-3.5 text-right font-mono font-black text-slate-900 text-sm">
                      {item.countedQuantity !== undefined ? item.countedQuantity.toLocaleString() : '-'}
                    </td>

                    {isManager && (
                      <td className="px-5 py-3.5 text-right font-mono font-extrabold">
                        {item.variance === undefined ? (
                          <span className="text-slate-400">-</span>
                        ) : isGain ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs">
                            <TrendingUp size={12} /> +{item.variance}
                          </span>
                        ) : isLoss ? (
                          <span className="inline-flex items-center gap-0.5 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-xs">
                            <TrendingDown size={12} /> {item.variance}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg text-xs">
                            <Check size={12} /> Match (0)
                          </span>
                        )}
                      </td>
                    )}

                    {isManager && (
                      <td className="px-5 py-3.5">
                        {isVariance ? (
                          isPending ? (
                            <div className="space-y-1.5">
                              <select
                                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                value={reasons[item._id]?.reason || ''}
                                onChange={(e) => handleReasonChange(item._id, 'reason', e.target.value)}
                              >
                                <option value="">-- Select Root Cause Reason --</option>
                                <option value="Damage">Damage (Dropped/Cracked/Expired)</option>
                                <option value="Missing Stock">Missing Stock (Unexplained Shrinkage)</option>
                                <option value="Counting Error">Counting Error (Floor Miscount)</option>
                                <option value="Unrecorded Receipt">Unrecorded Receipt (Surplus Found)</option>
                                <option value="Other">Other (Requires written explanation)</option>
                              </select>

                              {reasons[item._id]?.reason === 'Other' && (
                                <input
                                  type="text"
                                  placeholder="Provide statutory explanation..."
                                  value={reasons[item._id]?.explanation || ''}
                                  onChange={(e) => handleReasonChange(item._id, 'explanation', e.target.value)}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="text-xs">
                              <span className="font-bold text-slate-800">{item.reason || 'Variance noted'}</span>
                              {item.explanation && (
                                <p className="text-[11px] text-slate-500 italic mt-0.5">"{item.explanation}"</p>
                              )}
                            </div>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Physical inventory verified</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Manager Action Buttons */}
        {isManager && isPending && (
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={handleReject}
              disabled={saving}
              className="w-full sm:w-auto bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-2xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <XCircle size={16} /> Reject Audit
            </button>
            <button
              onClick={handleApprove}
              disabled={saving}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
            >
              <CheckCircle2 size={16} /> Approve & Adjust Stock
            </button>
          </div>
        )}

        {isStale && (
          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={handleRecount}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RotateCw size={16} /> Restart Recount Session
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditReview;
