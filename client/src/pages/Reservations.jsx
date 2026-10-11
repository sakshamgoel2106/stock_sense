import React, { useState, useEffect } from 'react';
import { Bookmark, Box, CheckCircle, XCircle } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reservations');
      setReservations(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch reservations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleAction = async (id, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this reservation?`)) return;
    try {
      await api.put(`/reservations/${id}/${action}`);
      fetchReservations();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${action} reservation`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Bookmark className="text-indigo-600" size={26} /> Client Stock Reservations
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Available-To-Promise (ATP) hard stock allocations for enterprise client purchase orders.</p>
        </div>
        <FeatureGuide
          title="Client Stock Reservations (ATP)"
          subtitle="Hard allocation of inventory against client purchase orders"
          category="Fulfillment Assurance"
          whatItIs="Locks down specific batch quantities for enterprise buyers (e.g. Tata Motors, Reliance Retail). The stock stays physically on warehouse racks but is removed from Available-To-Promise (ATP) to prevent double-selling."
          whyItMatters="Guarantees order fulfillment SLA compliance and protects contract revenue from being poached by other walk-in or emergency dispatches."
          howToUse={[
            "Track customer name, order reference number, product SKU, and warehouse.",
            "Click Fulfill to convert the reservation into an outward delivery operation.",
            "Click Cancel to release reserved stock back into the general available pool."
          ]}
          proTip="Available-To-Promise is calculated as: ATP = Physical On-Hand - Active Reservations."
        />
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading reservations...</div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <Box size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No reservations found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Ref</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reservations.map((item) => (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.orderReference}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                    <div className="text-sm text-gray-500">{item.product?.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.warehouse?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">{item.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                      item.status === 'FULFILLED' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {item.status === 'ACTIVE' && (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleAction(item._id, 'fulfill')} className="text-green-600 hover:text-green-900 flex items-center gap-1">
                          <CheckCircle size={16} /> Fulfill
                        </button>
                        <button onClick={() => handleAction(item._id, 'cancel')} className="text-red-600 hover:text-red-900 flex items-center gap-1">
                          <XCircle size={16} /> Cancel
                        </button>
                      </div>
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

export default Reservations;
