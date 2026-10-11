import React, { useState, useEffect } from 'react';
import { DollarSign, Box } from 'lucide-react';
import api from '../lib/api';
import { useCountry } from '../context/CountryContext';
import { formatCurrency } from '../lib/countries';
import FeatureGuide from '../components/FeatureGuide';

const InventoryValuation = () => {
  const { selectedCountry, countryMeta, changeCountry } = useCountry();
  const [valuationData, setValuationData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchValuation = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory/valuation');
      setValuationData(res.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch valuation data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValuation();
  }, []);

  const displayedValuation = valuationData.filter(item => {
    if (selectedCountry === 'ALL') return true;
    const cc = item.warehouse?.countryCode || 'IN';
    return cc.toUpperCase() === selectedCountry.toUpperCase();
  });

  const totalPortfolioValue = displayedValuation.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <DollarSign className="text-indigo-600" size={26} /> Perpetual FIFO Inventory Valuation
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
              {countryMeta.flag} {selectedCountry === 'ALL' ? 'Global' : countryMeta.code}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Asset balance sheet tracking powered by granular FIFO procurement batch layers.</p>
        </div>
        <div className="flex items-center gap-3">
          <FeatureGuide
            title="FIFO Perpetual Inventory Valuation"
            subtitle="GAAP / Ind AS compliant asset reporting"
            category="Financial Accounting"
            whatItIs="Calculates the real financial value of all physical inventory held in stock across warehouses. Evaluated using First-In-First-Out (FIFO) perpetual cost layers."
            whyItMatters="Essential for corporate balance sheets, P&L reporting, working capital audits, and insurance coverage. Eliminates distortion caused by price inflation."
            howToUse={[
              "Check the total portfolio valuation card in your operating jurisdiction currency.",
              "Review the table to see unit cost layers and extended total values per SKU and hub.",
              "Track how outgoing deliveries consume the oldest cost layers first to calculate accurate COGS."
            ]}
            proTip="Valuation accurately excludes reserved units from unencumbered liquidity while preserving asset totals on balance sheets."
          />
          <div className="bg-indigo-50 border border-indigo-200/80 rounded-xl px-4 py-2 text-indigo-950 shadow-xs">
            <span className="text-xs text-indigo-700 font-bold block uppercase tracking-wider">Total Portfolio Assets</span>
            <span className="text-lg sm:text-xl font-extrabold">
              {formatCurrency(totalPortfolioValue, countryMeta.currency, countryMeta.currencySymbol)}
            </span>
          </div>
        </div>
      </div>

      {/* Active Country Scope Banner */}
      <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">{countryMeta.flag}</span>
          <span className="font-semibold text-gray-700">
            {selectedCountry === 'ALL'
              ? 'Showing inventory asset valuation across Global Enterprise'
              : `Scoped to ${countryMeta.name} (${displayedValuation.length} valuation layers)`}
          </span>
        </div>
        {selectedCountry !== 'ALL' && (
          <button
            onClick={() => changeCountry('ALL')}
            className="text-indigo-600 hover:text-indigo-800 font-bold underline"
          >
            Show All Countries
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">{error}</div>}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">Loading valuation data...</div>
      ) : displayedValuation.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <Box size={48} className="text-gray-300 mb-4" />
          <p className="text-lg font-medium">No inventory valuation found in {countryMeta.name}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warehouse</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {displayedValuation.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.product?.name}</div>
                    <div className="text-sm text-gray-500">{item.product?.sku}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.warehouse?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">{item.totalQuantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-700">
                    {formatCurrency(item.totalValue, countryMeta.currency, countryMeta.currencySymbol)}
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

export default InventoryValuation;
