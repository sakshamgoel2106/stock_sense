import React, { useState, useEffect } from 'react';
import { CheckSquare, Box, Check, X } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const TransferApprovals = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/operations');
      // Filter only TRANSFER operations that are PENDING
      setOperations(res.data.filter(op => op.type === 'TRANSFER' && op.approvalStatus === 'PENDING'));
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch operations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperations();
  }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this transfer?`)) return;
    try {
      if (action === 'reject') {
        const reason = window.prompt("Enter rejection reason:");
        if (reason === null) return; // User cancelled
        await api.put(`/inventory/operations/${id}/reject`, { reason });
      } else {
        await api.put(`/inventory/operations/${id}/approve`);
        // If approved, automatically validate it to execute the stock movement
        await api.post(`/inventory/operations/${id}/validate`);
      }
      fetchOperations();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} operation`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="text-indigo-600" size={26} /> Transfer Approvals
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Executive and managerial authorization gate for inter-warehouse inventory shipments. Company Admins and Managers hold full approval authority.</p>
        </div>
        <FeatureGuide
          title="Inter-Warehouse Transfer Governance"
          subtitle="Admin & Manager authorization gate for stock relocation"
          category="Executive Governance"
          whatItIs="A security review gate ensuring that inter-hub stock movements (e.g. Gurugram to Bhiwandi) cannot be dispatched without formal Company Admin or Managerial sign-off."
          whyItMatters="Company Admins hold supreme authority over all inventory movements, preventing rogue shipments, stock shrinkage, and unauthorized freight expenditure."
          howToUse={[
            "Inspect the source warehouse, destination facility, SKU, and unit quantity.",
            "Verify that source surplus does not violate the origin hub's safety buffer.",
            "Company Admin or Manager clicks Approve to execute FIFO stock reallocation or Reject to stop the transfer."
          ]}
          proTip="Upon approval, StockSense automatically validates the operation, updates real-time stock balances across Indian hubs, and logs immutable ledger audit trails."
        />
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading pending transfers...</div>
      ) : operations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <Box size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No pending transfers to approve</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Operation ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {operations.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item._id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{item.sourceWarehouse?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{item.destinationWarehouse?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.items.map((i, idx) => (
                      <div key={idx}>
                        {i.quantity}x {i.product?.name}
                      </div>
                    ))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleAction(item._id, 'approve')} className="bg-green-50 text-green-600 px-3 py-1 rounded-md hover:bg-green-100 flex items-center gap-1 transition-colors">
                        <Check size={16} /> Approve
                      </button>
                      <button onClick={() => handleAction(item._id, 'reject')} className="bg-red-50 text-red-600 px-3 py-1 rounded-md hover:bg-red-100 flex items-center gap-1 transition-colors">
                        <X size={16} /> Reject
                      </button>
                    </div>
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

export default TransferApprovals;
