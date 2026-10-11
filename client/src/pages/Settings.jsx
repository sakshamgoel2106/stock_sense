import React, { useState, useEffect } from 'react';
import { 
  Building2, Settings as SettingsIcon, Shield, MapPin, 
  CheckCircle, Save, AlertTriangle, Globe, Landmark, 
  HelpCircle, Sliders, FileText, Phone, Mail
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, company, role } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState(company?.name || 'StockSense India Logistics Pvt Ltd');
  const [code, setCode] = useState(company?.code || 'SS-INDIA');
  const [gstin, setGstin] = useState(company?.gstin || '27AABCS1429B1Z1');
  const [address, setAddress] = useState(company?.address || 'Plot 42, Logistics Park, Bhiwandi');
  const [city, setCity] = useState(company?.city || 'Thane / Mumbai');
  const [state, setState] = useState(company?.state || 'Maharashtra');
  const [pincode, setPincode] = useState(company?.pincode || '421302');
  const [phone, setPhone] = useState(company?.phone || '+91 98200 12345');
  const [email, setEmail] = useState(company?.email || 'operations@stocksense.in');

  // MNC Multi-Country Settings
  const [isMNC, setIsMNC] = useState(true);
  const [primaryCountry, setPrimaryCountry] = useState('IN');
  const [operatingCountries, setOperatingCountries] = useState([]);

  // Policy Settings
  const [currency, setCurrency] = useState(company?.settings?.currency || 'INR');
  const [timezone, setTimezone] = useState(company?.settings?.timezone || 'Asia/Kolkata');
  const [requireTransferApproval, setRequireTransferApproval] = useState(
    company?.settings?.requireTransferApproval ?? true
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    company?.settings?.lowStockThreshold ?? 15
  );
  const [valuationMethod, setValuationMethod] = useState(
    company?.settings?.valuationMethod || 'FIFO'
  );

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';

  // Fetch latest company settings on mount
  useEffect(() => {
    const fetchCompanyData = async () => {
      try {
        setLoading(true);
        const res = await api.get('/companies/current');
        if (res.data?.company) {
          const c = res.data.company;
          setName(c.name || '');
          setCode(c.code || '');
          setGstin(c.gstin || '27AABCS1429B1Z1');
          setAddress(c.address || '');
          setCity(c.city || '');
          setState(c.state || '');
          setPincode(c.pincode || '');
          setPhone(c.phone || '');
          setEmail(c.email || '');
          setIsMNC(c.isMNC ?? true);
          setPrimaryCountry(c.primaryCountry || 'IN');
          setOperatingCountries(c.operatingCountries || []);
          if (c.settings) {
            setCurrency(c.settings.currency || 'INR');
            setTimezone(c.settings.timezone || 'Asia/Kolkata');
            setRequireTransferApproval(c.settings.requireTransferApproval ?? true);
            setLowStockThreshold(c.settings.lowStockThreshold ?? 15);
            setValuationMethod(c.settings.valuationMethod || 'FIFO');
          }
        }
      } catch (err) {
        console.error('Failed to load company details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyData();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isCompanyAdmin) {
      toast.error('Only Company Admins are authorized to update enterprise settings');
      return;
    }

    try {
      setSaving(true);
      await api.put('/companies/current', {
        name,
        gstin,
        address,
        city,
        state,
        pincode,
        phone,
        email,
        isMNC,
        primaryCountry,
        settings: {
          currency,
          timezone,
          requireTransferApproval,
          lowStockThreshold: Number(lowStockThreshold),
          valuationMethod
        }
      });
      toast.success('Company settings & multinational policies saved!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Company & Enterprise Settings
            </h1>
            <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {code}
            </span>
          </div>
          <p className="text-gray-400 text-sm mt-1">
            Configure Indian tax compliance, facility network governance, and automated stock thresholds.
          </p>
        </div>

        {!isCompanyAdmin && (
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle size={15} /> Read-Only Mode (Company Admin Privilege Required)
          </div>
        )}
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-8">
        {/* Section 1: Indian Business Registration & Headquarters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Landmark size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Legal Entity & Tax Information</h2>
              <p className="text-xs text-gray-500">Official Indian registration details for invoicing & stock transfer e-way bills</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Registered Company Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isCompanyAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Company Identifier Code
              </label>
              <input
                type="text"
                value={code}
                disabled
                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl font-mono text-gray-600 text-sm font-semibold cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">Assigned during tenant organization setup.</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                GSTIN (Goods and Services Tax ID)
              </label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                disabled={!isCompanyAdmin}
                placeholder="27AABCS1429B1Z1"
                maxLength={15}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-mono font-semibold text-sm disabled:opacity-60"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">15-digit PAN-based Indian GST identifier.</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Headquarters Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={!isCompanyAdmin}
                placeholder="Plot 42, Logistics Park, Bhiwandi"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 text-sm disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 sm:col-span-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!isCompanyAdmin}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={!isCompanyAdmin}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  disabled={!isCompanyAdmin}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Operations Contact Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isCompanyAdmin}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <Phone size={15} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Operations Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isCompanyAdmin}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <Mail size={15} className="absolute left-3 top-3 text-gray-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Section 1.5: Multinational Corporation (MNC) Operations & Jurisdictions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                <Globe size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Multinational Corporation (MNC) Governance</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                    Active
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Global multi-currency billing, localized statutory tax regimes, and cross-border facility network
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-700">MNC Mode:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMNC}
                  onChange={(e) => setIsMNC(e.target.checked)}
                  disabled={!isCompanyAdmin}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Primary Global Headquarters
              </label>
              <select
                value={primaryCountry}
                onChange={(e) => setPrimaryCountry(e.target.value)}
                disabled={!isCompanyAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800"
              >
                <option value="IN">🇮🇳 India (Global HQ / Central Operations)</option>
                <option value="US">🇺🇸 United States (Americas Corp HQ)</option>
                <option value="GB">🇬🇧 United Kingdom (EMEA Distribution HQ)</option>
                <option value="DE">🇩🇪 Germany (European Union Continental HQ)</option>
                <option value="AE">🇦🇪 United Arab Emirates (Middle East FZ-LLC)</option>
                <option value="SG">🇸🇬 Singapore (Asia Pacific Regional HQ)</option>
              </select>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 block">Cross-Border Inventory Sync</span>
                <span className="text-[11px] text-slate-500">Live multi-hub ledger across INR, USD, GBP, EUR, AED, and SGD.</span>
              </div>
              <span className="px-2 py-1 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-xs">
                6 REGIONS
              </span>
            </div>
          </div>

          {/* Operating Entities Grid */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-600">
              Configured Operating Jurisdictions & Statutory Entities
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { code: 'IN', flag: '🇮🇳', name: 'India', curr: 'INR (₹)', tax: 'GST (18%)', idLabel: 'GSTIN', idVal: '27AABCS1429B1Z1', hub: 'Bhiwandi & Pune' },
                { code: 'US', flag: '🇺🇸', name: 'United States', curr: 'USD ($)', tax: 'Sales Tax', idLabel: 'Federal EIN', idVal: '12-8941029', hub: 'Los Angeles & Austin' },
                { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', curr: 'GBP (£)', tax: 'VAT (20%)', idLabel: 'HMRC VAT', idVal: 'GB 123 4567 89', hub: 'London & Midlands' },
                { code: 'DE', flag: '🇩🇪', name: 'Germany (EU)', curr: 'EUR (€)', tax: 'MwSt (19%)', idLabel: 'USt-IdNr', idVal: 'DE 123456789', hub: 'Frankfurt Hub' },
                { code: 'AE', flag: '🇦🇪', name: 'UAE', curr: 'AED (د.إ)', tax: 'VAT (5%)', idLabel: 'FTA TRN', idVal: '100 2489 1928 00003', hub: 'Dubai CommerCity' },
                { code: 'SG', flag: '🇸🇬', name: 'Singapore', curr: 'SGD (S$)', tax: 'GST (9%)', idLabel: 'ACRA UEN', idVal: '201928374G', hub: 'Ocean Financial Hub' }
              ].map(entity => (
                <div 
                  key={entity.code} 
                  className={`p-3.5 rounded-xl border transition-all ${
                    primaryCountry === entity.code 
                      ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-300' 
                      : 'bg-gray-50/80 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{entity.flag}</span>
                      <span className="font-bold text-xs text-gray-900">{entity.name}</span>
                    </div>
                    {primaryCountry === entity.code && (
                      <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded uppercase">
                        Primary HQ
                      </span>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Currency:</span>
                      <span className="font-mono font-bold text-gray-900">{entity.curr}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax System:</span>
                      <span className="font-semibold text-gray-800">{entity.tax}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>{entity.idLabel}:</span>
                      <span className="font-bold text-indigo-700">{entity.idVal}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Supply Chain Policies & Inventory Governance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Sliders size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Operational Policies & Guardrails</h2>
              <p className="text-xs text-gray-500">Governance policies for multi-warehouse transfers and valuation models</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Default Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                disabled={!isCompanyAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800"
              >
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Operating Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!isCompanyAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30)</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Inventory Valuation Methodology
              </label>
              <select
                value={valuationMethod}
                onChange={(e) => setValuationMethod(e.target.value)}
                disabled={!isCompanyAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800"
              >
                <option value="FIFO">FIFO (First-In-First-Out Perpetual Cost Layers)</option>
                <option value="AVCO">AVCO (Weighted Average Cost Method)</option>
              </select>
              <span className="text-[11px] text-gray-400 mt-1 block">
                StockSense automatically consumes oldest batches first with full batch layer lineage.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Network Low-Stock Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                disabled={!isCompanyAdmin}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Minimum units before SKU is flagged in AI Reorder alerts.
              </span>
            </div>

            {/* Toggle: Require Transfer Approval */}
            <div className="sm:col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-900">
                  Mandatory Inter-Warehouse Transfer Approval
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  When enabled, all stock transfers between hubs must be reviewed and approved by a Manager or Company Admin before stock moves out.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireTransferApproval}
                  onChange={(e) => setRequireTransferApproval(e.target.checked)}
                  disabled={!isCompanyAdmin}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        {isCompanyAdmin && (
          <div className="flex justify-end gap-4 items-center pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Saving Changes...' : 'Save Enterprise Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;
