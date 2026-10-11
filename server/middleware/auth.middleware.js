const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Membership = require('../models/Membership');
const tenantStorage = require('../utils/tenantStorage');

const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        res.status(401);
        throw new Error('Not authorized, user not found');
      }

      // Resolve company membership
      const requestedCompanyId = req.headers['x-company-id'];
      let membership = null;

      if (requestedCompanyId) {
        membership = await Membership.findOne({
          userId: req.user._id,
          companyId: requestedCompanyId,
          status: { $in: ['ACTIVE', 'PENDING_REMOVAL'] }
        }).populate('companyId');
      }

      if (!membership) {
        membership = await Membership.findOne({
          userId: req.user._id,
          status: { $in: ['ACTIVE', 'PENDING_REMOVAL'] }
        }).populate('companyId');
      }

      if (membership && membership.companyId) {
        req.membership = membership;
        req.company = membership.companyId;
        // Tenant storage runs with the Company ID for true company-level isolation
        tenantStorage.run(req.company._id, () => {
          next();
        });
      } else {
        req.membership = null;
        req.company = null;
        // If user has not yet joined or created a company, isolate by user ID
        tenantStorage.run(req.user._id, () => {
          next();
        });
      }
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

// Middleware requiring an active company membership
const requireCompany = (req, res, next) => {
  if (!req.company || !req.membership || req.membership.status !== 'ACTIVE') {
    return res.status(403).json({
      code: 'NO_COMPANY_MEMBERSHIP',
      message: 'Active company membership required to access this resource. Please create or join a company.'
    });
  }
  next();
};

// Authorize based on business company roles: COMPANY_ADMIN, MANAGER, WORKER
const authorize = (...roles) => {
  return (req, res, next) => {
    // If company membership is active, verify company role
    const currentRole = req.membership ? req.membership.role : req.user.role;
    
    // Normalize role checks (support both COMPANY_ADMIN and legacy ADMIN)
    const normalizedRoles = roles.map(r => r === 'ADMIN' ? 'COMPANY_ADMIN' : r);
    const normalizedCurrent = currentRole === 'ADMIN' ? 'COMPANY_ADMIN' : currentRole;

    if (!normalizedRoles.includes(normalizedCurrent)) {
      res.status(403);
      throw new Error(`User role ${currentRole} is not authorized to access this resource`);
    }
    next();
  };
};

// Check warehouse access scope for restricted workers or managers
const checkWarehouseScope = (warehouseId) => {
  return (req, res, next) => {
    if (!req.membership) return next();
    if (req.membership.role === 'COMPANY_ADMIN') return next();

    const allowed = req.membership.warehouseIds || [];
    if (allowed.length === 0) return next(); // Empty array = unrestricted within company

    const targetId = typeof warehouseId === 'function' ? warehouseId(req) : warehouseId;
    if (!targetId) return next();

    const isPermitted = allowed.some(wId => wId.toString() === targetId.toString());
    if (!isPermitted) {
      res.status(403);
      throw new Error(`Access denied: You do not have permission for warehouse ${targetId}`);
    }
    next();
  };
};

module.exports = { 
  protect, 
  requireCompany, 
  authorize, 
  checkWarehouseScope 
};
