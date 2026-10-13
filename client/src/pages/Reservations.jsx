import React, { useState, useEffect } from 'react';
import { Bookmark, Box, CheckCircle, XCircle, Clock, ShieldCheck, ArrowRight } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';
import toast from 'react-hot-toast';

const Reservations = () => {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reservations');
      setReservations(res.data || []);
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
    const confirmMsg = action === 'fulfill' 
      ? 'Fulfill this client reservation? This will convert it into an outward delivery.' 
      : 'Cancel this reservation? This will release reserved stock back into general ATP inventory.';
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.put(`/reservations/${id}/${action}`);
      toast.success(`Reservation ${action === 'fulfill' ? 'fulfilled' : 'cancelled'} successfully!`);
      fetchReservations();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to ${action} reservation`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Guide Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Bookmark size={22} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Client Stock Reservations
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Available-To-Promise (ATP) hard stock allocations locked for enterprise client purchase orders.
          </p>
        </div>

        <FeatureGuide
          title="Client Stock Reservations (ATP)"
          subtitle="Hard allocation of inventory against client purchase orders"
          category="Fulfillment Assurance"
          whatItIs="Locks down specific batch quantities for enterprise buyers. The stock stays physically on warehouse racks but is removed from Available-To-Promise (ATP) to prevent double-selling."
          whyItMatters="Guarantees order fulfillment SLA compliance and protects contract revenue from being poached by other walk-in or emergency dispatches."
          howToUse={[
            "Track customer name, order reference number, product SKU, and warehouse.",
            "Click Fulfill to convert the reservation into an outward delivery operation.",
            "Click Cancel to release reserved stock back into the general available pool."
          ]}
          proTip="Available-To-Promise is calculated as: ATP = Physical On-Hand - Active Reservations."
        />
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-200 text-xs font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 animate-pulse text-xs">
          Loading client stock reservations...
        </div>
      ) : reservations.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
            <Box size={24} />
          </div>
          <p className="text-sm font-bold text-slate-800">No active reservations found</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            All warehouse inventory is currently unallocated and Available-To-Promise (ATP).
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="bg-slate-50/75">
                <tr className="text-slate-400 uppercase tracking-wider font-extrabold text-left">
                  <th className="px-6 py-3.5">Order Reference</th>
                  <th className="px-6 py-3.5">Product Item</th>
                  <th className="px-6 py-3.5">Assigned Facility</th>
                  <th className="px-6 py-3.5 text-right">Locked Units</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Fulfillment Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reservations.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                        {item.orderReference || 'N/A'}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-slate-900">{item.product?.name}</div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{item.product?.sku}</div>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-slate-700 font-semibold">
                      {item.warehouse?.name}
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-right font-extrabold text-slate-900 text-sm">
                      {item.quantity}
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-center">
                      <span className={`px-2.5 py-1 inline-flex text-[11px] font-extrabold rounded-full ${
                        item.status === 'ACTIVE' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        item.status === 'FULFILLED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="px-6 py-3.5 whitespace-nowrap text-right space-x-2">
                      {item.status === 'ACTIVE' && (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleAction(item._id, 'fulfill')} 
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <CheckCircle size={14} /> Fulfill
                          </button>
                          <button 
                            onClick={() => handleAction(item._id, 'cancel')} 
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1 shadow-2xs transition-colors"
                          >
                            <XCircle size={14} /> Release
                          </button>
                        </div>
                      )}
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

export default Reservations;
