import React, { useState, useEffect } from 'react';
import { Clock, Box } from 'lucide-react';
import api from '../lib/api';
import FeatureGuide from '../components/FeatureGuide';

const StockAging = () => {
  const [agingData, setAgingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAging = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/aging');
      setAgingData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch aging data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAging();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Clock className="text-indigo-600" size={26} /> Stock Aging Analysis
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Perpetual FIFO batch age classification and dead-stock depreciation risk alerts.</p>
        </div>
        <FeatureGuide
          title="Stock Aging & Dead-Stock Liquidation"
          subtitle="FIFO batch layer duration across 5 aging tiers"
          category="Working Capital Optimization"
          whatItIs="Breaks down inventory across 5 chronological tiers (0–30 days, 31–60 days, 61–90 days, 91–180 days, and 180+ days) based on the exact inbound timestamp of each batch layer."
          whyItMatters="Carrying obsolete or slow-moving stock ties up expensive working capital and risks total write-offs from expiry or tech obsolescence. Identifying batches >90 days old triggers transfer to high-demand hubs or clearance sales."
          howToUse={[
            "Filter items by Age Category to see products sitting stagnant on warehouse racks.",
            "Items in 91–180d or 180+d should be prioritized for inter-hub transfer to active hubs.",
            "Compare quantity vs daily demand velocity to project liquidation timelines."
          ]}
          proTip="Our FIFO engine automatically routes the oldest batches first on customer deliveries to minimize aging."
        />
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading aging data...</div>
      ) : agingData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <Box size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No aging data found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age Category</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agingData.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                    <div className="text-sm text-gray-500">{item.product?.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.warehouse?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.category === '0-30 days' ? 'bg-green-100 text-green-800' :
                      item.category === '31-60 days' ? 'bg-yellow-100 text-yellow-800' :
                      item.category === '61-90 days' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockAging;
