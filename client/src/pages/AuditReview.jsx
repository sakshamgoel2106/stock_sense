import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowLeft, RotateCw, AlertTriangle } from 'lucide-react';
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

  const [reasons, setReasons] = useState({});

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const res = await api.get(`/audits/${id}`);
        setAudit(res.data);
        const initialReasons = {};
        res.data.items.forEach(item => {
          if (item.variance !== 0) {
            initialReasons[item._id] = { reason: item.reason || '', explanation: item.explanation || '' };
          }
        });
        setReasons(initialReasons);
      } catch (err) {
        setError('Failed to load audit');
      } finally {
        setLoading(false);
      }
    };
    fetchAudit();
  }, [id]);

  const handleReasonChange = (itemId, field, value) => {
    setReasons({
      ...reasons,
      [itemId]: {
        ...reasons[itemId],
        [field]: value
      }
    });
  };

  const handleApprove = async () => {
    for (const item of audit.items) {
      if (item.variance !== 0) {
        const r = reasons[item._id];
        if (!r || !r.reason) {
          return setError(`Please provide a reason for the discrepancy on product ${item.product.name}`);
        }
        if (r.reason === 'Other' && !r.explanation) {
          return setError(`Please provide an explanation for "Other" on product ${item.product.name}`);
        }
      }
    }

    if (!window.confirm("Approve this audit? This will adjust the inventory immediately.")) return;

    try {
      setSaving(true);
      setError(null);
      setStaleError(false);
      await api.post(`/audits/${id}/approve`, { reasons });
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
    const reason = window.prompt("Enter rejection reason:");
    if (!reason) return;
    
    try {
      setSaving(true);
      await api.post(`/audits/${id}/reject`, { reason });
      navigate('/audits');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject audit');
      setSaving(false);
    }
  };

  const handleRecount = async () => {
    try {
      setSaving(true);
      const res = await api.post(`/audits/${id}/recount`);
      navigate(`/audits/${res.data._id}/count`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start recount');
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'ADMIN' || user?.role === 'COMPANY_ADMIN';
  const hasApprovalAuthority = isCompanyAdmin || role === 'MANAGER' || user?.role === 'MANAGER';
  const isManager = hasApprovalAuthority; // backwards compatibility with internal bindings
  const isPending = audit?.status === 'PENDING_REVIEW';
  const isStale = audit?.status === 'RECOUNT_REQUIRED';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/audits')} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Audit Details</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ml-4 ${
          audit?.status === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
          audit?.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
          audit?.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {audit?.status}
        </span>
        {hasApprovalAuthority && isPending && (
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-semibold border border-indigo-200 ml-auto">
            {isCompanyAdmin ? 'Company Admin Approval Gate' : 'Manager Review Gate'}
          </span>
        )}
      </div>

      {staleError && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-center gap-3">
          <AlertTriangle className="text-red-600" size={24} />
          <div>
            <p className="font-bold">Stock changed — recount required.</p>
            <p className="text-sm">The system stock quantity changed while this audit was pending. It is now unsafe to approve. Please initiate a recount.</p>
          </div>
          <button 
            onClick={handleRecount}
            className="ml-auto bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-sm text-sm"
          >
            Start Recount
          </button>
        </div>
      )}
      {error && !staleError && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-500">Warehouse</p>
            <p className="font-medium">{audit?.warehouse?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Counted By</p>
            <p className="font-medium">{audit?.countedBy?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Submitted At</p>
            <p className="font-medium">{audit?.submittedAt ? new Date(audit.submittedAt).toLocaleString() : '-'}</p>
          </div>
          {audit?.reviewedBy && (
            <div>
              <p className="text-sm text-gray-500">Reviewed By</p>
              <p className="font-medium">{audit.reviewedBy.name}</p>
            </div>
          )}
        </div>
        {audit?.rejectionReason && (
          <div className="bg-red-50 text-red-800 p-3 rounded border border-red-100">
            <strong>Rejection Reason:</strong> {audit.rejectionReason}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                {isManager && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">System Stock</th>}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual Count</th>
                {isManager && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Variance</th>}
                {isManager && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audit?.items.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {item.product?.name} <span className="text-gray-500 text-xs ml-2">({item.product?.sku})</span>
                  </td>
                  {isManager && <td className="px-4 py-3 text-right text-sm text-gray-500">{item.systemQuantitySnapshot ?? '?'}</td>}
                  <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{item.countedQuantity}</td>
                  
                  {isManager && (
                    <td className={`px-4 py-3 text-right text-sm font-bold ${item.variance > 0 ? 'text-green-600' : item.variance < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                      {item.variance > 0 ? `+${item.variance}` : item.variance}
                    </td>
                  )}
                  {isManager && (
                    <td className="px-4 py-3">
                      {item.variance !== 0 ? (
                        isPending ? (
                          <div className="flex flex-col gap-2">
                            <select
                              className="w-full text-sm border-gray-300 rounded p-1 border"
                              value={reasons[item._id]?.reason || ''}
                              onChange={(e) => handleReasonChange(item._id, 'reason', e.target.value)}
                            >
                              <option value="">Select reason...</option>
                              <option value="Damage">Damage</option>
                              <option value="Missing Stock">Missing Stock</option>
                              <option value="Counting Error">Counting Error</option>
                              <option value="Unrecorded Receipt">Unrecorded Receipt</option>
                              <option value="Other">Other</option>
                            </select>
                            {reasons[item._id]?.reason === 'Other' && (
                              <input 
                                type="text"
                                placeholder="Explanation"
                                className="w-full text-sm border-gray-300 rounded p-1 border"
                                value={reasons[item._id]?.explanation || ''}
                                onChange={(e) => handleReasonChange(item._id, 'explanation', e.target.value)}
                              />
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700">
                            {item.reason} {item.explanation && <span className="text-gray-500 italic">({item.explanation})</span>}
                          </div>
                        )
                      ) : (
                        <span className="text-gray-400 text-sm">Match</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isManager && isPending && (
          <div className="flex justify-end gap-4 pt-6 border-t mt-6">
            <button
              onClick={handleReject}
              disabled={saving}
              className="bg-white border border-red-300 text-red-600 hover:bg-red-50 px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 transition-colors"
            >
              <XCircle size={18} /> Reject Audit
            </button>
            <button
              onClick={handleApprove}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium shadow flex items-center gap-2 transition-colors"
            >
              <CheckCircle size={18} /> Approve & Adjust Stock
            </button>
          </div>
        )}

        {isStale && (
          <div className="flex justify-end pt-4">
             <button
              onClick={handleRecount}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-medium shadow flex items-center gap-2 transition-colors"
            >
              <RotateCw size={18} /> Restart Count
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditReview;
