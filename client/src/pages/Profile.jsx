import React, { useState } from 'react';
import { 
  UserCircle, Mail, Shield, Building2, MapPin, KeyRound, 
  CheckCircle, AlertCircle, Save, Lock, Globe, Clock, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, company, role, warehouseIds } = useAuth();

  // Profile Form state
  const [name, setName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;
  const roleDisplay = isCompanyAdmin ? 'Company Admin' : (isManager ? 'Manager' : 'Worker');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    try {
      setProfileSaving(true);
      const res = await api.put('/auth/profile', { name: name.trim() });
      toast.success('Profile name updated successfully');
      // Update local storage or session if needed
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, name: res.data.name }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setPasswordSaving(true);
      await api.put('/auth/password', {
        currentPassword,
        newPassword
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 relative z-10">
          <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-bold shadow-inner">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{user?.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                isCompanyAdmin 
                  ? 'bg-amber-400 text-amber-950 ring-2 ring-amber-300/40' 
                  : (isManager ? 'bg-purple-300 text-purple-950' : 'bg-emerald-300 text-emerald-950')
              }`}>
                {roleDisplay}
              </span>
            </div>
            <p className="text-indigo-200 text-sm flex items-center gap-2">
              <Mail size={15} /> {user?.email}
            </p>
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-indigo-200/80">
              <span className="flex items-center gap-1.5">
                <Building2 size={14} /> {company?.name || 'StockSense Organization'}
              </span>
              <span className="flex items-center gap-1.5">
                <Globe size={14} /> India Region (INR ₹)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Account & Security */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <UserCircle size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Personal Profile</h2>
                <p className="text-xs text-gray-500">Update your account identity details</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 font-medium text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-medium text-sm cursor-not-allowed"
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={14} /> Verified
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Email address is linked to your workspace security login.
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <Save size={16} />
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                <Lock size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Security & Password</h2>
                <p className="text-xs text-gray-500">Manage your access authentication credentials</p>
              </div>
            </div>

            {user?.googleId && (
              <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-blue-900">
                  <p className="font-bold">Google Single Sign-On Active</p>
                  <p className="mt-0.5 text-blue-700">
                    Your account is securely authenticated using Google OAuth. You can also configure a local password below for alternate email logins.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              {!user?.googleId && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm transition-all"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 text-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  <KeyRound size={16} />
                  {passwordSaving ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Organization Scope & RBAC Details */}
        <div className="space-y-8">
          {/* Organization & Scope Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Company Workspace</h3>
                <p className="text-xs text-gray-500">Tenant organization details</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Legal Name</span>
                  <span className="font-bold text-gray-900">{company?.name || 'StockSense India'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Company Code</span>
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                    {company?.code || 'SS-INDIA'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">GSTIN</span>
                  <span className="font-mono text-gray-700">{company?.gstin || '27AABCS1429B1Z1'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Currency</span>
                  <span className="font-semibold text-gray-800">INR (₹)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Timezone</span>
                  <span className="text-gray-700">Asia/Kolkata (IST)</span>
                </div>
              </div>

              {/* Warehouse Scope */}
              <div className="pt-2">
                <p className="font-bold text-gray-800 mb-2 flex items-center gap-1.5">
                  <MapPin size={14} className="text-indigo-600" /> Facility Access Scope
                </p>
                {(!warehouseIds || warehouseIds.length === 0) ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle size={14} /> Full Hub Network Access
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      You have unrestricted operational visibility across all regional hubs (Mumbai, Delhi-NCR, Bengaluru, Chennai).
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-amber-900">
                    <p className="font-bold flex items-center gap-1">
                      <AlertCircle size={14} /> Restricted Facility Access
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Your permissions are restricted strictly to your assigned warehouse facilities. Contact a Company Admin to modify permissions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RBAC Privilege Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                <Shield size={20} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Role Privileges</h3>
                <p className="text-xs text-gray-500">Enforced by StockSense RBAC</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>View Products, Inventory positions & stock ledger movements</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>Record Receipts, Deliveries & Physical Count Submissions</span>
              </div>
              <div className="flex items-start gap-2">
                {isManager ? (
                  <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={14} className="text-gray-300 shrink-0 mt-0.5" />
                )}
                <span className={isManager ? 'text-gray-800 font-medium' : 'text-gray-400 line-through'}>
                  Access AI Forecasting, Stock Aging & Valuation reports
                </span>
              </div>
              <div className="flex items-start gap-2">
                {isCompanyAdmin ? (
                  <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={14} className="text-gray-300 shrink-0 mt-0.5" />
                )}
                <span className={isCompanyAdmin ? 'text-gray-800 font-medium' : 'text-gray-400 line-through'}>
                  Approve Inter-Hub Transfers, Audits & Team Member Removals
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
