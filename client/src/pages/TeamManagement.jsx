import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Shield, Building2, MapPin, CheckCircle, 
  XCircle, Clock, Trash2, Copy, Check, AlertTriangle, RefreshCw, X,
  ShieldAlert, ShieldCheck, Info, ChevronDown, ChevronUp, Lock, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import toast from 'react-hot-toast';

const TeamManagement = () => {
  const { user, company, role } = useAuth();
  const [activeTab, setActiveTab] = useState('members');
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guide card state
  const [showGuide, setShowGuide] = useState(true);

  // Add Member Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMode, setAddMode] = useState('direct'); // 'direct' or 'invite'
  
  // Direct Add state
  const [directName, setDirectName] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [directPassword, setDirectPassword] = useState('Password123!');
  const [directRole, setDirectRole] = useState('WORKER');
  const [directWarehouses, setDirectWarehouses] = useState([]);
  const [directSubmitting, setDirectSubmitting] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('WORKER');
  const [inviteWarehouses, setInviteWarehouses] = useState([]);
  const [inviteExpiry, setInviteExpiry] = useState(7);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [generatedInvite, setGeneratedInvite] = useState(null);
  const [copied, setCopied] = useState(false);

  // Edit Member Modal state
  const [editingMember, setEditingMember] = useState(null);
  const [editRole, setEditRole] = useState('WORKER');
  const [editWarehouses, setEditWarehouses] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  // Removal Request Modal state
  const [removalTarget, setRemovalTarget] = useState(null);
  const [removalReason, setRemovalReason] = useState('');
  const [removalSubmitting, setRemovalSubmitting] = useState(false);

  const isCompanyAdmin = role === 'COMPANY_ADMIN' || role === 'ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'ADMIN';
  const isManager = role === 'MANAGER' || user?.role === 'MANAGER' || isCompanyAdmin;

  const fetchData = async () => {
    try {
      setLoading(true);
      const [mRes, iRes, wRes] = await Promise.all([
        api.get('/companies/members'),
        api.get('/companies/invitations').catch(err => {
          console.warn('Invitations load warning:', err?.response?.status);
          return { data: [] };
        }),
        api.get('/warehouses').catch(err => {
          console.warn('Warehouses load warning:', err?.response?.status);
          return { data: [] };
        })
      ]);
      setMembers(mRes.data || []);
      setInvitations(iRes.data || []);
      setWarehouses(wRes.data || []);
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1. Direct Add Member
  const handleDirectAdd = async (e) => {
    e.preventDefault();
    if (!directEmail.trim() || !directName.trim()) {
      toast.error('Name and Email are required');
      return;
    }

    try {
      setDirectSubmitting(true);
      await api.post('/companies/members/direct', {
        name: directName.trim(),
        email: directEmail.trim(),
        password: directPassword.trim() || 'Password123!',
        role: directRole,
        warehouseIds: directWarehouses
      });
      toast.success(`Team member ${directName} added successfully!`);
      setShowAddModal(false);
      setDirectName('');
      setDirectEmail('');
      setDirectWarehouses([]);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add team member');
    } finally {
      setDirectSubmitting(false);
    }
  };

  // 2. Create Invite
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      setInviteSubmitting(true);
      const res = await api.post('/companies/invitations', {
        email: inviteEmail.trim(),
        role: inviteRole,
        warehouseIds: inviteWarehouses,
        expiresInDays: inviteExpiry
      });
      toast.success('Invitation token generated!');
      setGeneratedInvite(res.data);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (id) => {
    if (!window.confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await api.delete(`/companies/invitations/${id}`);
      toast.success('Invitation revoked');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to revoke invitation');
    }
  };

  // 3. Status Toggle (Active/Suspended)
  const handleStatusChange = async (memberId, currentStatus) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    if (!window.confirm(`Are you sure you want to ${nextStatus === 'SUSPENDED' ? 'suspend' : 'activate'} this member?`)) return;

    try {
      await api.put(`/companies/members/${memberId}/status`, { status: nextStatus });
      toast.success(`Member status updated to ${nextStatus}`);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update member status');
    }
  };

  // 4. Request Member Removal (Requires Admin Approval)
  const handleOpenRemovalModal = (member) => {
    setRemovalTarget(member);
    setRemovalReason('');
  };

  const handleSubmitRemovalRequest = async (e) => {
    e.preventDefault();
    if (!removalTarget) return;

    try {
      setRemovalSubmitting(true);
      const res = await api.post(`/companies/members/${removalTarget._id}/request-removal`, {
        reason: removalReason.trim() || 'Removal requested by management'
      });
      toast.success(res.data?.message || 'Removal request submitted for Company Admin approval');
      setRemovalTarget(null);
      setRemovalReason('');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit removal request');
    } finally {
      setRemovalSubmitting(false);
    }
  };

  // 5. Admin Approve Removal (COMPANY_ADMIN only)
  const handleApproveRemoval = async (memberId) => {
    if (!window.confirm('COMPANY ADMIN CONFIRMATION: Are you sure you want to permanently remove and purge this member from the organization?')) return;

    try {
      await api.post(`/companies/members/${memberId}/approve-removal`);
      toast.success('Team member removal permanently approved and processed');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve member removal');
    }
  };

  // 6. Admin Reject Removal (COMPANY_ADMIN only)
  const handleRejectRemoval = async (memberId) => {
    try {
      await api.post(`/companies/members/${memberId}/reject-removal`);
      toast.success('Removal request rejected. Member restored to Active status.');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject removal');
    }
  };

  // 7. Edit Permissions / Scope
  const handleSaveEditMember = async (e) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setEditLoading(true);
      await Promise.all([
        api.put(`/companies/members/${editingMember._id}/role`, { role: editRole }),
        api.put(`/companies/members/${editingMember._id}/warehouses`, { warehouseIds: editWarehouses })
      ]);
      toast.success('Member permissions updated');
      setEditingMember(null);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update member permissions');
    } finally {
      setEditLoading(false);
    }
  };

  const copyToClipboard = (token) => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    toast.success('Invite code copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  const pendingRemovalMembers = members.filter(m => m.status === 'PENDING_REMOVAL');

  if (!isManager && !loading) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-2xl border border-gray-200 text-center shadow-sm">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-gray-500">
          Team & Organization Management is reserved for Company Admins and Managers. Please contact your organization administrator for permission changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Team & Organization Management
            </h1>
            <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              {company?.code || 'SS-INDIA'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Manage multi-tenant roles, regional warehouse scopes, and enforce strict admin-approved employee offboarding.
          </p>
        </div>

        {isCompanyAdmin && (
          <button
            onClick={() => {
              setGeneratedInvite(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all self-start sm:self-center"
          >
            <UserPlus size={18} />
            Add Team Member
          </button>
        )}
      </div>

      {/* Feature Guide Accordion / Card */}
      <div className="bg-white rounded-2xl border border-indigo-100 shadow-sm overflow-hidden">
        <div 
          onClick={() => setShowGuide(!showGuide)}
          className="p-4 bg-gradient-to-r from-indigo-50/60 via-purple-50/40 to-white flex items-center justify-between cursor-pointer select-none hover:bg-indigo-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Info size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                How to Use Team Management in StockSense
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-extrabold uppercase">
                  Governance Guide
                </span>
              </h2>
              <p className="text-xs text-indigo-800/70">
                Learn how RBAC roles, facility access boundaries, and admin-approved removals safeguard operations.
              </p>
            </div>
          </div>
          <button className="text-indigo-600 p-1 rounded-lg hover:bg-indigo-100/50">
            {showGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        {showGuide && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border-t border-indigo-50 text-xs">
            <div className="space-y-2 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <Shield size={16} /> 1. Business Roles (RBAC)
              </div>
              <ul className="space-y-1.5 text-gray-600">
                <li><b className="text-gray-900">Company Admin:</b> Supreme executive authority. Full control over settings, hubs, all transfer & audit approvals, and exclusive member removal sign-offs.</li>
                <li><b className="text-gray-900">Manager:</b> Inventory valuation, AI forecasting, audit reconciliations, and transfer approvals.</li>
                <li><b className="text-gray-900">Worker:</b> Floor operations (receipts, deliveries, counts) strictly restricted to assigned facilities.</li>
              </ul>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-gray-50/80 border border-gray-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <MapPin size={16} /> 2. Warehouse Facility Scoping
              </div>
              <p className="text-gray-600">
                When adding or editing a worker, restrict their permissions to specific hubs (e.g. <b>Mumbai Hub BOM-01</b>). 
                Restricted workers are blocked from viewing stock balances, ledger entries, or audits belonging to other hubs.
              </p>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-amber-50/80 border border-amber-200">
              <div className="flex items-center gap-2 text-amber-800 font-bold">
                <ShieldAlert size={16} /> 3. Mandatory Admin Removal Sign-off
              </div>
              <p className="text-amber-900">
                To prevent accidental loss of accountability, <b>no employee can be purged without Company Admin approval</b>. 
                Any removal enters <span className="font-bold underline">Pending Removal Approval</span> until verified by an Admin.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* PENDING REMOVAL APPROVALS BANNER */}
      {pendingRemovalMembers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 rounded-2xl p-5 text-white shadow-lg space-y-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-extrabold text-base tracking-tight">
                  Pending Member Removal Approvals ({pendingRemovalMembers.length})
                </h3>
                <p className="text-amber-100 text-xs">
                  {isCompanyAdmin 
                    ? 'Review and decide whether to permanently remove or retain these team members.'
                    : 'Removal requests submitted by management are currently awaiting Company Admin sign-off.'
                  }
                </p>
              </div>
            </div>
            <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase">
              Action Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {pendingRemovalMembers.map((m) => (
              <div key={m._id} className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{m.userId?.name}</span>
                    <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded font-mono">
                      {m.role}
                    </span>
                  </div>
                  <p className="text-xs text-amber-100">{m.userId?.email}</p>
                  <div className="mt-2 text-xs bg-black/20 rounded-lg p-2 text-amber-50">
                    <p className="font-semibold text-[11px] uppercase tracking-wider text-amber-200">
                      Reason for Removal:
                    </p>
                    <p className="italic">{m.removalRequest?.reason || 'No specific reason provided'}</p>
                    {m.removalRequest?.requestedBy && (
                      <p className="text-[10px] text-amber-300 mt-1">
                        Requested by: {m.removalRequest.requestedBy.name} ({m.removalRequest.requestedBy.email})
                      </p>
                    )}
                  </div>
                </div>

                {isCompanyAdmin ? (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleApproveRemoval(m._id)}
                      className="flex-1 bg-red-700 hover:bg-red-800 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck size={14} /> Approve Removal
                    </button>
                    <button
                      onClick={() => handleRejectRemoval(m._id)}
                      className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle size={14} /> Reject & Retain
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-200 italic text-center py-1 bg-black/10 rounded">
                    Awaiting Company Admin final authorization
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'members'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={16} /> Team Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'invitations'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock size={16} /> Pending Invitations ({invitations.filter(i => i.status === 'PENDING').length})
        </button>
      </div>

      {/* TAB 1: MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw size={18} className="animate-spin text-indigo-600" /> Loading team roster...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Business Role</th>
                    <th className="px-6 py-4">Warehouse Facility Scope</th>
                    <th className="px-6 py-4">Status</th>
                    {isManager && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((m) => {
                    const isSelf = m.userId?._id === user?._id;
                    const isPendingRemoval = m.status === 'PENDING_REMOVAL';

                    return (
                      <tr key={m._id} className={`hover:bg-gray-50/60 transition-colors ${isPendingRemoval ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center font-bold text-indigo-700 shrink-0 shadow-sm">
                              {m.userId?.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 flex items-center gap-2">
                                {m.userId?.name || 'Unknown User'}
                                {isSelf && (
                                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-400">{m.userId?.email}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                            m.role === 'COMPANY_ADMIN' ? 'bg-purple-100 text-purple-700' :
                            m.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            <Shield size={12} />
                            {m.role === 'COMPANY_ADMIN' ? 'Company Admin' : m.role}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          {(m.warehouseIds?.length || 0) === 0 ? (
                            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5 w-fit">
                              <CheckCircle size={13} /> Unrestricted (All 4 Regional Hubs)
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {m.warehouseIds?.map((w, idx) => (
                                <span key={w?._id || idx} className="text-xs bg-gray-100 text-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 flex items-center gap-1 font-medium">
                                  <MapPin size={11} className="text-indigo-600" /> {w?.name || 'Assigned Hub'}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          {isPendingRemoval ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200 shadow-sm animate-pulse">
                              <AlertTriangle size={13} /> Awaiting Admin Approval
                            </span>
                          ) : (
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                              m.status === 'ACTIVE' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {m.status === 'ACTIVE' ? <CheckCircle size={13} /> : <XCircle size={13} />}
                              {m.status}
                            </span>
                          )}
                        </td>

                        {isManager && (
                          <td className="px-6 py-4 text-right space-x-2">
                            {isCompanyAdmin && (
                              <button
                                onClick={() => {
                                  setEditingMember(m);
                                  setEditRole(m.role);
                                  setEditWarehouses(m.warehouseIds?.map(w => w._id) || []);
                                }}
                                className="text-indigo-600 hover:text-indigo-800 font-bold text-xs px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                              >
                                Edit Scope
                              </button>
                            )}

                            {!isSelf && (
                              <>
                                {isCompanyAdmin && !isPendingRemoval && (
                                  <button
                                    onClick={() => handleStatusChange(m._id, m.status)}
                                    className={`text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                                      m.status === 'ACTIVE' 
                                        ? 'text-amber-600 hover:bg-amber-50' 
                                        : 'text-emerald-600 hover:bg-emerald-50'
                                    }`}
                                  >
                                    {m.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                  </button>
                                )}

                                {isPendingRemoval ? (
                                  isCompanyAdmin ? (
                                    <div className="inline-flex gap-1">
                                      <button
                                        onClick={() => handleApproveRemoval(m._id)}
                                        className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-sm"
                                        title="Approve Permanent Removal"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        onClick={() => handleRejectRemoval(m._id)}
                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-2 py-1 rounded-lg"
                                        title="Reject and Restore to Active"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400 italic">Admin Review Pending</span>
                                  )
                                ) : (
                                  <button
                                    onClick={() => handleOpenRemovalModal(m)}
                                    className="text-red-500 hover:text-red-700 font-bold text-xs px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
                                  >
                                    Request Removal
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {invitations.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              No pending or historical invitations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">Invited Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Warehouse Scope</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Expires</th>
                    {isCompanyAdmin && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invitations.map((inv) => (
                    <tr key={inv._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900">{inv.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">
                          {inv.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {(inv.warehouseIds?.length || 0) === 0 ? (
                          <span className="text-emerald-700 font-semibold">All Warehouses</span>
                        ) : (
                          inv.warehouseIds?.map(w => w?.name || 'Assigned Hub').join(', ')
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          inv.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      {isCompanyAdmin && (
                        <td className="px-6 py-4 text-right">
                          {inv.status === 'PENDING' && (
                            <button
                              onClick={() => handleRevokeInvitation(inv._id)}
                              className="text-xs text-red-600 hover:text-red-800 font-bold px-2 py-1 rounded hover:bg-red-50"
                            >
                              Revoke
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD TEAM MEMBER (DIRECT OR INVITE) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={22} />
                Add New Team Member
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => setAddMode('direct')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  addMode === 'direct' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Direct Provision (Instant Access)
              </button>
              <button
                type="button"
                onClick={() => setAddMode('invite')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  addMode === 'invite' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Generate Single-Use Code
              </button>
            </div>

            {addMode === 'direct' ? (
              /* TAB A: DIRECT ADD FORM */
              <form onSubmit={handleDirectAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={directName}
                    onChange={(e) => setDirectName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="ramesh@stocksense.in"
                    value={directEmail}
                    onChange={(e) => setDirectEmail(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Business Role</label>
                    <select
                      value={directRole}
                      onChange={(e) => setDirectRole(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:bg-white"
                    >
                      <option value="WORKER">Worker (Operations)</option>
                      <option value="MANAGER">Manager (Reviews)</option>
                      <option value="COMPANY_ADMIN">Company Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Temporary Password</label>
                    <input
                      type="text"
                      value={directPassword}
                      onChange={(e) => setDirectPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Assigned Warehouses (Leave empty for Full Hub Access)
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2.5 space-y-1.5 bg-gray-50">
                    <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={directWarehouses.length === 0}
                        onChange={(e) => {
                          if (e.target.checked) setDirectWarehouses([]);
                        }}
                      />
                      Unrestricted (All Company Warehouses)
                    </label>
                    {warehouses.map(w => (
                      <label key={w._id} className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={directWarehouses.includes(w._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setDirectWarehouses([...directWarehouses, w._id]);
                            } else {
                              setDirectWarehouses(directWarehouses.filter(id => id !== w._id));
                            }
                          }}
                        />
                        {w.name} ({w.code})
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={directSubmitting}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-all"
                  >
                    {directSubmitting ? 'Provisioning...' : 'Provision Member'}
                  </button>
                </div>
              </form>
            ) : (
              /* TAB B: INVITATION TOKEN GENERATOR */
              generatedInvite ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center">
                    <CheckCircle size={32} className="text-green-600 mx-auto mb-2" />
                    <h4 className="font-bold text-green-900 text-base">Invitation Created!</h4>
                    <p className="text-xs text-green-700 mt-1">
                      An invitation was issued for <b>{generatedInvite.invitation.email}</b> ({generatedInvite.invitation.role}).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Single-Use Invitation Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={generatedInvite.rawToken}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-xs text-gray-800"
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedInvite.rawToken)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg shrink-0 flex items-center gap-1.5 text-xs font-bold"
                        title="Copy Invitation Code"
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                        <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 space-y-2 text-left">
                    <div className="font-bold flex items-center gap-1.5 text-indigo-900">
                      <Info size={15} className="text-indigo-600 shrink-0" /> Where the worker logs in with this code:
                    </div>
                    <ol className="list-decimal list-inside text-gray-700 space-y-1 pl-1">
                      <li>Worker registers or signs in at <b>/register</b> or <b>/login</b> using <b>{generatedInvite.invitation.email}</b>.</li>
                      <li>Because they have no company yet, they are automatically routed to the <b>Onboarding screen (/onboarding)</b>.</li>
                      <li>They click the <b>"Join with Invite"</b> tab.</li>
                      <li>They paste this code and click <b>"Join Company Workspace"</b>.</li>
                    </ol>
                  </div>

                  <button
                    onClick={() => setShowAddModal(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 rounded-xl text-sm"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateInvite} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Employee Email</label>
                    <input
                      type="email"
                      required
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Assigned Role</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:bg-white"
                      >
                        <option value="WORKER">Worker</option>
                        <option value="MANAGER">Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Expiration</label>
                      <select
                        value={inviteExpiry}
                        onChange={(e) => setInviteExpiry(parseInt(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:bg-white"
                      >
                        <option value="7">7 Days</option>
                        <option value="14">14 Days</option>
                        <option value="30">30 Days</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                      Warehouse Permissions
                    </label>
                    <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2.5 space-y-1.5 bg-gray-50">
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                        <input
                          type="checkbox"
                          checked={inviteWarehouses.length === 0}
                          onChange={(e) => {
                            if (e.target.checked) setInviteWarehouses([]);
                          }}
                        />
                        Unrestricted (All Warehouses)
                      </label>
                      {warehouses.map(w => (
                        <label key={w._id} className="flex items-center gap-2 text-xs text-gray-600">
                          <input
                            type="checkbox"
                            checked={inviteWarehouses.includes(w._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInviteWarehouses([...inviteWarehouses, w._id]);
                              } else {
                                setInviteWarehouses(inviteWarehouses.filter(id => id !== w._id));
                              }
                            }}
                          />
                          {w.name}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={inviteSubmitting}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm"
                    >
                      {inviteSubmitting ? 'Creating...' : 'Generate Code'}
                    </button>
                  </div>
                </form>
              )
            )}
          </div>
        </div>
      )}

      {/* MODAL: REMOVAL REQUEST (WITH ADMIN APPROVAL POLICY) */}
      {removalTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-red-600 flex items-center gap-2">
                <AlertTriangle size={20} />
                Request Member Removal
              </h3>
              <button onClick={() => setRemovalTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <Lock size={14} /> Mandatory Admin Approval Policy Enforced
              </p>
              <p>
                Submitting this request will place <b>{removalTarget.userId?.name}</b> in 
                <span className="font-semibold underline ml-1">Pending Removal Approval</span> status. 
                They will <b>not be deleted</b> until a Company Admin formally reviews and approves the removal.
              </p>
            </div>

            <form onSubmit={handleSubmitRemovalRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Reason for Removal (Required for Audit Trail)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Employee resigned, contract term ended, or role reorganized"
                  value={removalReason}
                  onChange={(e) => setRemovalReason(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRemovalTarget(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={removalSubmitting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-all"
                >
                  {removalSubmitting ? 'Submitting...' : 'Submit Removal Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MEMBER SCOPE */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h3 className="text-lg font-extrabold text-gray-900">
                Edit Member Permissions
              </h3>
              <button onClick={() => setEditingMember(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="space-y-4">
              <div>
                <p className="text-xs text-gray-500">Member:</p>
                <p className="font-bold text-gray-900">{editingMember.userId?.name} ({editingMember.userId?.email})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:bg-white"
                >
                  <option value="WORKER">Worker</option>
                  <option value="MANAGER">Manager</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Warehouse Permissions</label>
                <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl p-2.5 space-y-1.5 bg-gray-50">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <input
                      type="checkbox"
                      checked={editWarehouses.length === 0}
                      onChange={(e) => {
                        if (e.target.checked) setEditWarehouses([]);
                      }}
                    />
                    Unrestricted (All Warehouses)
                  </label>
                  {warehouses.map(w => (
                    <label key={w._id} className="flex items-center gap-2 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={editWarehouses.includes(w._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditWarehouses([...editWarehouses, w._id]);
                          } else {
                            setEditWarehouses(editWarehouses.filter(id => id !== w._id));
                          }
                        }}
                      />
                      {w.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-sm shadow-sm"
                >
                  {editLoading ? 'Saving...' : 'Save Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
