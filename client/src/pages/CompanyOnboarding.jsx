import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, UserPlus, ShieldCheck, ArrowRight, Package, Check, Key } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const CompanyOnboarding = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeMode, setActiveMode] = useState('create'); // 'create' or 'join'

  // Auto-detect URL query params (e.g. /onboarding?token=XYZ or /onboarding?tab=join)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token') || params.get('code');
    const tab = params.get('tab') || params.get('mode');
    if (token) {
      setInviteToken(token);
      setActiveMode('join');
    } else if (tab === 'join') {
      setActiveMode('join');
    }
  }, []);

  // Create Company state
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [createLoading, setCreateLoading] = useState(false);

  // Join Company state
  const [inviteToken, setInviteToken] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  // Auto-generate code preview
  const handleNameChange = (e) => {
    const val = e.target.value;
    setCompanyName(val);
    if (!companyCode || companyCode === val.slice(0, -1).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()) {
      setCompanyCode(val.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase());
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error('Please enter a company name');
      return;
    }

    try {
      setCreateLoading(true);
      await api.post('/companies', {
        name: companyName.trim(),
        code: companyCode.trim().toUpperCase(),
        settings: { currency }
      });
      toast.success('Company created successfully! Welcome to your workspace.');
      await refreshUser();
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create company');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinCompany = async (e) => {
    e.preventDefault();
    if (!inviteToken.trim()) {
      toast.error('Please enter your invitation code');
      return;
    }

    try {
      setJoinLoading(true);
      const res = await api.post('/companies/invitations/accept', {
        token: inviteToken.trim()
      });
      toast.success(res.data.message || 'Successfully joined company!');
      await refreshUser();
      navigate('/');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to join company with this token');
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200 mb-4">
          <Package size={36} />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Welcome to StockSense
        </h2>
        <p className="mt-2 text-sm text-gray-600 max-w-sm mx-auto">
          Hello <b>{user?.name || 'there'}</b> ({user?.email})! Complete setup to access your inventory workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-xl shadow-gray-200/50 sm:rounded-2xl border border-gray-100 sm:px-10">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1.5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setActiveMode('create')}
              className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeMode === 'create'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Building2 size={16} /> Create Company
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('join')}
              className={`py-2.5 text-xs sm:text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition-all ${
                activeMode === 'join'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <UserPlus size={16} /> Join with Invite
            </button>
          </div>

          {/* Form: Create Company */}
          {activeMode === 'create' && (
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Logistics Corp"
                  value={companyName}
                  onChange={handleNameChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Company Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. APEXLOG"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Base Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  You will become the <b>Company Admin</b> with administrative authority over warehouses, inventory workflows, and team invitations.
                </span>
              </div>

              <button
                type="submit"
                disabled={createLoading || !companyName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50 transition-all"
              >
                {createLoading ? 'Setting up Company...' : 'Create Company Workspace'}
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* Form: Join Company with Invite */}
          {activeMode === 'join' && (
            <form onSubmit={handleJoinCompany} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Invitation Code / Token
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Key size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Paste your 64-character invite token"
                    value={inviteToken}
                    onChange={(e) => setInviteToken(e.target.value)}
                    className="w-full pl-10 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  Obtained from your Company Admin via email or invitation link.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-600">
                <div className="font-semibold text-gray-800 mb-1">Invitation Security Verification:</div>
                <ul className="space-y-1 text-[11px] text-gray-500 list-disc list-inside">
                  <li>Tokens are single-use and cryptographically validated.</li>
                  <li>Must match your verified sign-in email: <b>{user?.email}</b>.</li>
                  <li>Assigned roles and warehouse permissions take effect automatically.</li>
                </ul>
              </div>

              <button
                type="submit"
                disabled={joinLoading || !inviteToken.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200 disabled:opacity-50 transition-all"
              >
                {joinLoading ? 'Validating Token...' : 'Join Company Workspace'}
                <Check size={16} />
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
            <span>Signed in as {user?.email}</span>
            <button
              type="button"
              onClick={logout}
              className="text-red-600 hover:underline font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboarding;
