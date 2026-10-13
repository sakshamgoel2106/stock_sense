const asyncHandler = require('express-async-handler');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Company = require('../models/Company');
const Membership = require('../models/Membership');
const Invitation = require('../models/Invitation');
const Warehouse = require('../models/Warehouse');
const User = require('../models/User');

const { runWithTransaction } = require('../services/inventory.service');

// @desc    Create a new company and assign creator as COMPANY_ADMIN
// @route   POST /api/v1/companies
// @access  Private
const createCompany = asyncHandler(async (req, res) => {
  const { name, code, settings } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Company name is required');
  }

  // Generate code if missing
  const generatedCode = (code || name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)).toUpperCase();

  const existingCompany = await Company.findOne({ code: generatedCode });
  if (existingCompany) {
    res.status(400);
    throw new Error(`Company code '${generatedCode}' is already taken. Please choose another.`);
  }

  try {
    const result = await runWithTransaction(async (session) => {
      const company = new Company({
        name: name.trim(),
        code: generatedCode,
        createdBy: req.user._id,
        settings: settings || {}
      });
      if (session) {
        await company.save({ session });
      } else {
        await company.save();
      }

      const membership = new Membership({
        userId: req.user._id,
        companyId: company._id,
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        warehouseIds: [] // Unrestricted access for admin
      });
      if (session) {
        await membership.save({ session });
      } else {
        await membership.save();
      }

      return { company, membership };
    });

    res.status(201).json({
      message: 'Company created successfully',
      company: result.company,
      membership: result.membership
    });
  } catch (err) {
    res.status(400);
    throw new Error(err.message);
  }
});

// @desc    Get current company details and user membership
// @route   GET /api/v1/companies/current
// @access  Private (Requires Company)
const getCurrentCompany = asyncHandler(async (req, res) => {
  res.json({
    company: req.company,
    membership: req.membership
  });
});

// @desc    Update company settings
// @route   PUT /api/v1/companies/current
// @access  Private (COMPANY_ADMIN only)
const updateCompanySettings = asyncHandler(async (req, res) => {
  const { name, gstin, address, city, state, pincode, phone, email, settings } = req.body;
  const company = await Company.findById(req.company._id);

  if (!company) {
    res.status(404);
    throw new Error('Company not found');
  }

  if (name) company.name = name.trim();
  if (gstin !== undefined) company.gstin = gstin.trim().toUpperCase();
  if (address !== undefined) company.address = address.trim();
  if (city !== undefined) company.city = city.trim();
  if (state !== undefined) company.state = state.trim();
  if (pincode !== undefined) company.pincode = pincode.trim();
  if (phone !== undefined) company.phone = phone.trim();
  if (email !== undefined) company.email = email.trim();
  if (settings) company.settings = { ...company.settings, ...settings };

  await company.save();
  res.json({ message: 'Company settings updated successfully', company });
});

// @desc    List all company members
// @route   GET /api/v1/companies/members
// @access  Private (COMPANY_ADMIN, MANAGER)
const getCompanyMembers = asyncHandler(async (req, res) => {
  const members = await Membership.find({ companyId: req.company._id })
    .populate('userId', 'name email role')
    .populate('warehouseIds', 'name code location')
    .populate('removalRequest.requestedBy', 'name email role')
    .sort({ createdAt: -1 });

  res.json(members);
});

// @desc    Update member role
// @route   PUT /api/v1/companies/members/:id/role
// @access  Private (COMPANY_ADMIN only)
const updateMemberRole = asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (!['WORKER', 'MANAGER', 'COMPANY_ADMIN'].includes(role)) {
    res.status(400);
    throw new Error('Invalid role specified');
  }

  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  // Prevent demoting oneself if the sole admin
  if (membership.userId.toString() === req.user._id.toString() && role !== 'COMPANY_ADMIN') {
    const adminCount = await Membership.countDocuments({
      companyId: req.company._id,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE'
    });
    if (adminCount <= 1) {
      res.status(400);
      throw new Error('Cannot demote yourself when you are the sole Company Admin');
    }
  }

  membership.role = role;
  await membership.save();

  res.json({ message: 'Member role updated', membership });
});

// @desc    Update member warehouse permissions
// @route   PUT /api/v1/companies/members/:id/warehouses
// @access  Private (COMPANY_ADMIN only)
const updateMemberWarehouses = asyncHandler(async (req, res) => {
  const { warehouseIds } = req.body;

  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  // Verify all provided warehouse IDs belong to this company
  if (warehouseIds && warehouseIds.length > 0) {
    const validWarehouses = await Warehouse.find({
      _id: { $in: warehouseIds },
      $or: [
        { company: req.company._id },
        { owner: req.company._id }
      ]
    });
    if (validWarehouses.length !== warehouseIds.length) {
      res.status(400);
      throw new Error('One or more selected warehouses do not belong to this company');
    }
  }

  membership.warehouseIds = warehouseIds || [];
  await membership.save();

  res.json({ message: 'Warehouse permissions updated', membership });
});

// @desc    Suspend or activate member
// @route   PUT /api/v1/companies/members/:id/status
// @access  Private (COMPANY_ADMIN only)
const updateMemberStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
    res.status(400);
    throw new Error('Invalid status specified');
  }

  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  if (membership.userId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot suspend your own account');
  }

  membership.status = status;
  await membership.save();

  res.json({ message: `Member status updated to ${status}`, membership });
});

// @desc    Remove member from company
// @route   DELETE /api/v1/companies/members/:id
// @access  Private (COMPANY_ADMIN only)
const removeMember = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  if (membership.userId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot remove yourself from the company');
  }

  await membership.deleteOne();
  res.json({ message: 'Member removed from company' });
});

// @desc    Create an employee invitation
// @route   POST /api/v1/companies/invitations
// @access  Private (COMPANY_ADMIN only)
const createInvitation = asyncHandler(async (req, res) => {
  const { email, role = 'WORKER', warehouseIds = [], expiresInDays = 7 } = req.body;

  if (!email || !email.trim()) {
    res.status(400);
    throw new Error('Invited email address is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!['WORKER', 'MANAGER'].includes(role)) {
    res.status(400);
    throw new Error('Can only invite employees as WORKER or MANAGER');
  }

  // Check if user is already an active member
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const existingMembership = await Membership.findOne({
      userId: existingUser._id,
      companyId: req.company._id,
      status: 'ACTIVE'
    });
    if (existingMembership) {
      res.status(400);
      throw new Error('User is already an active member of this company');
    }
  }

  // Verify warehouse IDs belong to this company
  if (warehouseIds.length > 0) {
    const validWarehouses = await Warehouse.find({
      _id: { $in: warehouseIds },
      $or: [
        { company: req.company._id },
        { owner: req.company._id }
      ]
    });
    if (validWarehouses.length !== warehouseIds.length) {
      res.status(400);
      throw new Error('Invalid warehouse IDs selected');
    }
  }

  // Revoke any previous pending invitation for this email
  await Invitation.updateMany(
    { companyId: req.company._id, email: normalizedEmail, status: 'PENDING' },
    { status: 'REVOKED' }
  );

  // Generate cryptographically secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  const invitation = new Invitation({
    companyId: req.company._id,
    email: normalizedEmail,
    role,
    warehouseIds,
    tokenHash,
    invitedBy: req.user._id,
    status: 'PENDING',
    expiresAt
  });

  await invitation.save();

  res.status(201).json({
    message: 'Invitation created successfully',
    invitation: {
      _id: invitation._id,
      email: invitation.email,
      role: invitation.role,
      warehouseIds: invitation.warehouseIds,
      expiresAt: invitation.expiresAt,
      status: invitation.status
    },
    // Return raw token for display/sharing
    rawToken
  });
});

// @desc    List all company invitations
// @route   GET /api/v1/companies/invitations
// @access  Private (COMPANY_ADMIN only)
const getInvitations = asyncHandler(async (req, res) => {
  const invitations = await Invitation.find({ companyId: req.company._id })
    .populate('invitedBy', 'name email')
    .populate('warehouseIds', 'name code')
    .sort({ createdAt: -1 });

  res.json(invitations);
});

// @desc    Revoke an invitation
// @route   DELETE /api/v1/companies/invitations/:id
// @access  Private (COMPANY_ADMIN only)
const revokeInvitation = asyncHandler(async (req, res) => {
  const invitation = await Invitation.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!invitation) {
    res.status(404);
    throw new Error('Invitation not found');
  }

  invitation.status = 'REVOKED';
  await invitation.save();

  res.json({ message: 'Invitation revoked successfully' });
});

// @desc    Accept an invitation to join a company
// @route   POST /api/v1/companies/invitations/accept
// @access  Private
const acceptInvitation = asyncHandler(async (req, res) => {
  const { token } = req.body;

  if (!token || !token.trim()) {
    res.status(400);
    throw new Error('Invitation token is required');
  }

  const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');

  const invitation = await Invitation.findOne({ tokenHash });
  if (!invitation) {
    res.status(404);
    throw new Error('Invalid or unrecognized invitation token');
  }

  if (invitation.status !== 'PENDING') {
    res.status(400);
    throw new Error(`Invitation is no longer active (status: ${invitation.status})`);
  }

  if (new Date() > invitation.expiresAt) {
    invitation.status = 'EXPIRED';
    await invitation.save();
    res.status(400);
    throw new Error('Invitation has expired. Please request a new invitation.');
  }

  // Security check: Verify that authenticated user's email matches the invited email
  if (req.user.email.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
    res.status(403);
    throw new Error(`This invitation was issued to ${invitation.email}. You are logged in as ${req.user.email}.`);
  }

  // Enroll user into company
  let membership = await Membership.findOne({
    userId: req.user._id,
    companyId: invitation.companyId
  });

  if (membership) {
    membership.role = invitation.role;
    membership.warehouseIds = invitation.warehouseIds;
    membership.status = 'ACTIVE';
    await membership.save();
  } else {
    membership = new Membership({
      userId: req.user._id,
      companyId: invitation.companyId,
      role: invitation.role,
      warehouseIds: invitation.warehouseIds,
      status: 'ACTIVE',
      invitedBy: invitation.invitedBy
    });
    await membership.save();
  }

  invitation.status = 'ACCEPTED';
  invitation.acceptedBy = req.user._id;
  invitation.acceptedAt = new Date();
  await invitation.save();

  const company = await Company.findById(invitation.companyId);

  res.json({
    message: `Successfully joined ${company.name}`,
    company,
    membership
  });
});

// @desc    Directly add an employee (Company Admin only)
// @route   POST /api/v1/companies/members/direct
// @access  Private (COMPANY_ADMIN only)
const addMemberDirect = asyncHandler(async (req, res) => {
  const { name, email, role = 'WORKER', warehouseIds = [], password } = req.body;

  if (!email || !email.trim()) {
    res.status(400);
    throw new Error('Email address is required');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Find or create user
  let targetUser = await User.findOne({ email: normalizedEmail });
  if (!targetUser) {
    if (!name || !name.trim()) {
      res.status(400);
      throw new Error('Name is required when adding a new user');
    }
    const tempPassword = password && password.trim() ? password.trim() : 'Password123!';
    targetUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: tempPassword,
      role: role === 'COMPANY_ADMIN' ? 'ADMIN' : (role === 'MANAGER' ? 'MANAGER' : 'WORKER')
    });
  }

  // Check if membership already exists in this company
  let existingMembership = await Membership.findOne({
    userId: targetUser._id,
    companyId: req.company._id
  });

  if (existingMembership) {
    res.status(400);
    throw new Error('User is already a member of this company');
  }

  // Validate warehouses
  if (warehouseIds && warehouseIds.length > 0) {
    const validWarehouses = await Warehouse.find({
      _id: { $in: warehouseIds },
      $or: [
        { company: req.company._id },
        { owner: req.company._id }
      ]
    });
    if (validWarehouses.length !== warehouseIds.length) {
      res.status(400);
      throw new Error('One or more selected warehouses are invalid');
    }
  }

  const membership = await Membership.create({
    userId: targetUser._id,
    companyId: req.company._id,
    role,
    status: 'ACTIVE',
    warehouseIds: warehouseIds || [],
    invitedBy: req.user._id
  });

  const populated = await Membership.findById(membership._id)
    .populate('userId', 'name email role')
    .populate('warehouseIds', 'name code location');

  res.status(201).json({
    message: 'Team member added directly to company',
    membership: populated
  });
});

// @desc    Request member removal (Manager or Admin)
// @route   POST /api/v1/companies/members/:id/request-removal
// @access  Private (COMPANY_ADMIN, MANAGER)
const requestMemberRemoval = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  }).populate('userId', 'name email role');

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  if (membership.userId._id.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot request removal of yourself');
  }

  if (membership.role === 'COMPANY_ADMIN') {
    const adminCount = await Membership.countDocuments({
      companyId: req.company._id,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE'
    });
    if (adminCount <= 1) {
      res.status(400);
      throw new Error('Cannot request removal of the sole Company Admin');
    }
  }

  membership.status = 'PENDING_REMOVAL';
  membership.removalRequest = {
    requestedBy: req.user._id,
    reason: (reason && reason.trim()) ? reason.trim() : 'Requested by management',
    requestedAt: new Date()
  };

  await membership.save();

  const populated = await Membership.findById(membership._id)
    .populate('userId', 'name email role')
    .populate('warehouseIds', 'name code location')
    .populate('removalRequest.requestedBy', 'name email role');

  res.json({
    message: 'Removal request submitted. Awaiting Company Admin approval.',
    membership: populated
  });
});

// @desc    Approve member removal (COMPANY_ADMIN only)
// @route   POST /api/v1/companies/members/:id/approve-removal
// @access  Private (COMPANY_ADMIN only)
const approveMemberRemoval = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  if (membership.userId.toString() === req.user._id.toString()) {
    res.status(400);
    throw new Error('Cannot approve removal of yourself');
  }

  await membership.deleteOne();

  res.json({ message: 'Team member removal approved and permanently removed from company' });
});

// @desc    Reject member removal (COMPANY_ADMIN only)
// @route   POST /api/v1/companies/members/:id/reject-removal
// @access  Private (COMPANY_ADMIN only)
const rejectMemberRemoval = asyncHandler(async (req, res) => {
  const membership = await Membership.findOne({
    _id: req.params.id,
    companyId: req.company._id
  });

  if (!membership) {
    res.status(404);
    throw new Error('Member not found');
  }

  membership.status = 'ACTIVE';
  membership.removalRequest = undefined;
  await membership.save();

  const populated = await Membership.findById(membership._id)
    .populate('userId', 'name email role')
    .populate('warehouseIds', 'name code location');

  res.json({
    message: 'Removal request rejected. Member restored to active status.',
    membership: populated
  });
});

module.exports = {
  createCompany,
  getCurrentCompany,
  updateCompanySettings,
  getCompanyMembers,
  updateMemberRole,
  updateMemberWarehouses,
  updateMemberStatus,
  removeMember,
  addMemberDirect,
  requestMemberRemoval,
  approveMemberRemoval,
  rejectMemberRemoval,
  createInvitation,
  getInvitations,
  revokeInvitation,
  acceptInvitation
};
