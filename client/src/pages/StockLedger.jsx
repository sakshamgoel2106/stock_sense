import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import api from '../lib/api';
import { useCountry } from '../context/CountryContext';

const StockLedger = () => {
  const { selectedCountry, countryMeta, changeCountry } = useCountry();
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchLedger = async () => {
      try {
        setLoading(true);
        const res = await api.get('/inventory/ledger');
        setLedger(res.data);
        setError(null);
      } catch (err) {
        setError('Failed to load stock ledger');
      } finally {
        setLoading(false);
      }
    };

    fetchLedger();
  }, []);

  const filteredLedger = ledger.filter(entry => {
    if (selectedCountry !== 'ALL') {
      const cc = entry.warehouse?.countryCode || 'IN';
      if (cc.toUpperCase() !== selectedCountry.toUpperCase()) return false;
    }
    const search = searchTerm.toLowerCase();
    return (
      entry.product?.name?.toLowerCase().includes(search) ||
      entry.product?.sku?.toLowerCase().includes(search) ||
      entry.warehouse?.name?.toLowerCase().includes(search) ||
      entry.operation?.type?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
            Stock Ledger
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full font-bold">
              {countryMeta.flag} {selectedCountry === 'ALL' ? 'Global' : countryMeta.code}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Granular chronological audit trail of all warehouse movements.</p>
        </div>
        
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search ledger..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Active Country Scope Banner */}
      <div className="bg-white rounded-xl p-3 border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">{countryMeta.flag}</span>
          <span className="font-semibold text-gray-700">
            {selectedCountry === 'ALL'
              ? 'Showing audit movements across Global Enterprise'
              : `Scoped to ${countryMeta.name} (${filteredLedger.length} movement records)`}
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

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64 text-gray-500">
          Loading ledger...
        </div>
      ) : filteredLedger.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-gray-500">
          <p className="text-lg font-medium">No ledger records found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Operation</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Result Qty</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLedger.map((entry) => (
                  <tr key={entry._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{entry.product?.name || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.product?.sku || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {entry.warehouse?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="font-medium">{entry.operation?.type || 'UNKNOWN'}</span>
                      {entry.operation?._id && <div className="text-xs text-gray-400">Ref: {entry.operation._id.slice(-6).toUpperCase()}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <span className={entry.quantityChange > 0 ? 'text-green-600' : entry.quantityChange < 0 ? 'text-red-600' : 'text-gray-500'}>
                        {entry.quantityChange > 0 ? '+' : ''}{entry.quantityChange}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900">
                      {entry.newQuantity !== undefined ? entry.newQuantity : '-'}
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

export default StockLedger;
