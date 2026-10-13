import React, { useState, useEffect } from 'react';
import { CheckSquare, Box, Check, X, ArrowRight, Clock, ShieldAlert } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';
import toast from 'react-hot-toast';

const TransferApprovals = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/operations');
      setOperations((res.data || []).filter(op => op.type === 'TRANSFER' && op.approvalStatus === 'PENDING'));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch pending transfer operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this inter-warehouse transfer?`)) return;
    try {
      if (action === 'reject') {
        const reason = window.prompt("Please state the reason for rejecting this transfer:");
        if (reason === null) return;
        await api.put(`/inventory/operations/${id}/reject`, { reason });
        toast.success('Transfer rejected');
      } else {
        await api.put(`/inventory/operations/${id}/approve`);
        await api.post(`/inventory/operations/${id}/validate`);
        toast.success('Transfer approved & physical stock movement validated!');
      }
      fetchOperations();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} transfer`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <CheckSquare size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Transfer Governance & Approvals
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Managerial authorization gate for inter-warehouse inventory dispatches and hub rebalancing.
          </p>
        </div>

        <FeatureGuide
          title="Inter-Warehouse Transfer Governance"
          subtitle="Admin & Manager authorization gate for stock relocation"
          category="Executive Governance"
          whatItIs="A security review gate ensuring that inter-hub stock movements cannot be dispatched without formal Company Admin or Managerial sign-off."
          whyItMatters="Company Admins hold supreme authority over all inventory movements, preventing rogue shipments, stock shrinkage, and unauthorized freight expenditure."
          howToUse={[
            "Inspect the source warehouse, destination facility, SKU, and unit quantity.",
            "Verify that source surplus does not violate the origin hub's safety buffer.",
            "Company Admin or Manager clicks Approve to execute FIFO stock reallocation or Reject to stop the transfer."
          ]}
          proTip="Upon approval, StockSense automatically validates the operation, updates real-time stock balances across Indian hubs, and logs immutable ledger audit trails."
        />
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Loading pending transfer requests...
        </div>
      ) : operations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <CheckSquare size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">All Transfers Processed</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            There are currently no inter-warehouse transfer requests awaiting managerial authorization.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-6 py-3.5">Transfer Ref</th>
                  <th className="px-6 py-3.5">Source Facility</th>
                  <th className="px-6 py-3.5">Route</th>
                  <th className="px-6 py-3.5">Destination Hub</th>
                  <th className="px-6 py-3.5">Items to Relocate</th>
                  <th className="px-6 py-3.5 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {operations.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap font-mono font-extrabold text-slate-900">
                      #{item._id.slice(-6).toUpperCase()}
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-rose-700 font-extrabold bg-rose-50/40">
                      {item.sourceWarehouse?.name || '-'}
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-400 text-center">
                      <ArrowRight size={16} className="inline text-indigo-500" />
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-emerald-700 font-extrabold bg-emerald-50/40">
                      {item.destinationWarehouse?.name || '-'}
                    </td>

                    <td className="px-6 py-3.5 text-slate-700">
                      <div className="space-y-1">
                        {item.items.map((i, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">{i.product?.name}</span>
                            <span className="text-[11px] bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.2 rounded">
                              {i.quantity} units
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleAction(item._id, 'approve')} 
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1 text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-102"
                        >
                          <Check size={14} /> Approve & Dispatch
                        </button>
                        <button 
                          onClick={() => handleAction(item._id, 'reject')} 
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 text-xs transition-colors"
                        >
                          <X size={14} /> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransferApprovals;
