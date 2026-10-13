const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Audit = require('../models/Audit');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const Operation = require('../models/Operation');
const { validateOperation, runWithTransaction } = require('../services/inventory.service');

// @desc    Create a new audit session
// @route   POST /api/v1/audits
// @access  Private (Staff or Manager)
const createAudit = asyncHandler(async (req, res) => {
  const { warehouse, productIds } = req.body;
  if (!warehouse || !productIds || productIds.length === 0) {
    res.status(400);
    throw new Error('Warehouse and products are required');
  }

  const items = productIds.map(productId => ({
    product: productId,
    countedQuantity: null,
    owner: req.user ? req.user._id : null
  }));

  const audit = new Audit({
    warehouse,
    items,
    countedBy: req.user._id,
    company: req.company ? req.company._id : null,
    owner: req.user ? req.user._id : null,
    status: 'DRAFT'
  });

  const createdAudit = await audit.save();
  const populated = await Audit.findById(createdAudit._id)
    .populate('warehouse', 'name code location')
    .populate('countedBy', 'name email')
    .populate('items.product', 'name sku unitOfMeasure category');

  res.status(201).json(populated);
});

// @desc    Update counts for an audit
// @route   PUT /api/v1/audits/:id/count
// @access  Private
const updateAuditCounts = asyncHandler(async (req, res) => {
  const { items } = req.body; 
  const audit = await Audit.findById(req.params.id);

  if (!audit) {
    res.status(404);
    throw new Error('Audit not found');
  }
  if (audit.status !== 'DRAFT' && audit.status !== 'RECOUNT_REQUIRED') {
    res.status(400);
    throw new Error('Can only update counts for DRAFT or RECOUNT_REQUIRED audits');
  }

  items.forEach(updateItem => {
    const item = audit.items.id(updateItem._id);
    if (item && updateItem.countedQuantity !== undefined) {
      item.countedQuantity = Number(updateItem.countedQuantity);
    }
  });

  await audit.save();
  res.json(audit);
});

// @desc    Submit an audit
// @route   POST /api/v1/audits/:id/submit
// @access  Private
const submitAudit = asyncHandler(async (req, res) => {
  const audit = await Audit.findById(req.params.id);

  if (!audit) {
    res.status(404);
    throw new Error('Audit not found');
  }
  if (audit.status !== 'DRAFT' && audit.status !== 'RECOUNT_REQUIRED') {
    res.status(400);
    throw new Error('Can only submit DRAFT or RECOUNT_REQUIRED audits');
  }

  const incomplete = audit.items.some(item => item.countedQuantity === null || item.countedQuantity === undefined);
  if (incomplete) {
    res.status(400);
    throw new Error('All items must have a counted quantity before submission');
  }

  for (const item of audit.items) {
    const stock = await Stock.findOne({ warehouse: audit.warehouse, product: item.product });
    const systemQty = stock ? stock.quantity : 0;
    item.systemQuantitySnapshot = systemQty;
    item.variance = item.countedQuantity - systemQty;
  }

  audit.status = 'PENDING_REVIEW';
  audit.submittedAt = new Date();
  await audit.save();

  const responseData = audit.toObject();
  if (req.user.role !== 'ADMIN' && req.user.role !== 'MANAGER') {
    responseData.items.forEach(item => {
      delete item.systemQuantitySnapshot;
      delete item.variance;
    });
  }

  res.json(responseData);
});

// @desc    Get all audits
// @route   GET /api/v1/audits
// @access  Private
const getAudits = asyncHandler(async (req, res) => {
  const query = {};
  if (req.company) query.company = req.company._id;

  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    query.warehouse = { $in: req.membership.warehouseIds };
  }

  const audits = await Audit.find(query)
    .populate('warehouse', 'name code location')
    .populate('countedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .populate('items.product', 'name sku unitOfMeasure category')
    .sort({ createdAt: -1 });

  const currentRole = req.membership ? req.membership.role : req.user.role;
  const isManagerOrAdmin = currentRole === 'COMPANY_ADMIN' || currentRole === 'ADMIN' || currentRole === 'MANAGER';

  if (!isManagerOrAdmin) {
    const maskedAudits = audits.map(audit => {
      const a = audit.toObject();
      if (a.status !== 'APPROVED' && a.status !== 'REJECTED') {
        a.items.forEach(item => {
          delete item.systemQuantitySnapshot;
          delete item.variance;
        });
      }
      return a;
    });
    return res.json(maskedAudits);
  }

  res.json(audits);
});

// @desc    Get single audit
// @route   GET /api/v1/audits/:id
// @access  Private
const getAuditById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const audit = await Audit.findOne(query)
    .populate('warehouse', 'name code location')
    .populate('countedBy', 'name email')
    .populate('reviewedBy', 'name email')
    .populate('items.product', 'name sku unitOfMeasure category');

  if (!audit) {
    res.status(404);
    throw new Error('Audit not found');
  }

  const currentRole = req.membership ? req.membership.role : req.user.role;
  const isManagerOrAdmin = currentRole === 'COMPANY_ADMIN' || currentRole === 'ADMIN' || currentRole === 'MANAGER';

  const a = audit.toObject();
  if (!isManagerOrAdmin && a.status !== 'APPROVED' && a.status !== 'REJECTED') {
    a.items.forEach(item => {
      delete item.systemQuantitySnapshot;
      delete item.variance;
    });
  }

  res.json(a);
});

// @desc    Approve audit & apply adjustments
// @route   POST /api/v1/audits/:id/approve
// @access  Private (Manager only)
const approveAudit = asyncHandler(async (req, res) => {
  const { reasons } = req.body;

  let operation = null;
  let auditToReturn = null;

  await runWithTransaction(async (session) => {
    const audit = await Audit.findById(req.params.id).session(session);
    
    if (!audit) throw new Error('Audit not found');
    if (audit.status !== 'PENDING_REVIEW') throw new Error('Audit is not pending review');

    const currentRole = req.membership ? req.membership.role : req.user.role;
    const isSuperAdmin = currentRole === 'COMPANY_ADMIN' || currentRole === 'ADMIN';

    const isSelfCounted = audit.countedBy && audit.countedBy.toString() === req.user._id.toString();
    const allowOverride = req.body.overrideSeparationOfDuties === true || isSuperAdmin;

    if (isSelfCounted && !allowOverride) {
      throw new Error('Separation of duties: You cannot approve an audit you counted yourself without Company Admin authorization.');
    }

    if (reasons) {
      for (const [itemId, data] of Object.entries(reasons)) {
        const item = audit.items.id(itemId);
        if (item) {
          if (data.reason) item.reason = data.reason;
          if (data.explanation) item.explanation = data.explanation;
        }
      }
    }

    for (const item of audit.items) {
      if (item.variance !== 0 && !item.reason) {
        throw new Error(`Reason is required for product ${item.product} with variance`);
      }
      if (item.reason === 'Other' && !item.explanation) {
        throw new Error(`Explanation is required when reason is "Other" for product ${item.product}`);
      }
    }

    const adjustmentItems = [];
    for (const item of audit.items) {
      const stock = await Stock.findOne({ warehouse: audit.warehouse, product: item.product }).session(session);
      const currentSystemQty = stock ? stock.quantity : 0;
      
      if (currentSystemQty !== item.systemQuantitySnapshot) {
        audit.status = 'RECOUNT_REQUIRED';
        await audit.save({ session });
        const err = new Error('Stock changed — recount required.');
        err.statusCode = 409;
        err.audit = audit;
        throw err;
      }

      if (item.variance !== 0) {
        adjustmentItems.push({
          product: item.product,
          quantity: item.countedQuantity,
        });
      }
    }

    if (adjustmentItems.length > 0) {
      operation = new Operation({
        type: 'ADJUSTMENT',
        destinationWarehouse: audit.warehouse,
        items: adjustmentItems,
        createdBy: req.user._id,
        company: req.company ? req.company._id : audit.company,
        owner: req.user ? req.user._id : audit.owner,
        status: 'DRAFT',
        approvalStatus: 'NOT_REQUIRED'
      });
      await operation.save({ session });
      audit.operationRef = operation._id;
    }

    audit.status = 'APPROVED';
    audit.reviewedBy = req.user._id;
    audit.approvedAt = new Date();
    await audit.save({ session });
    auditToReturn = audit;
  }).catch(err => {
    if (err.statusCode === 409) {
      res.status(409).json({ message: err.message, audit: err.audit });
    } else {
      res.status(400);
      throw new Error(err.message);
    }
  });

  if (res.headersSent) return;

  if (operation) {
     await validateOperation(operation._id, req.user._id);
  }

  res.json(auditToReturn);
});

// @desc    Reject audit
// @route   POST /api/v1/audits/:id/reject
// @access  Private (Manager only)
const rejectAudit = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason) {
    res.status(400);
    throw new Error('Rejection reason is required');
  }

  const audit = await Audit.findById(req.params.id);
  if (!audit) {
    res.status(404);
    throw new Error('Audit not found');
  }
  if (audit.status !== 'PENDING_REVIEW') {
    res.status(400);
    throw new Error('Audit is not pending review');
  }

  audit.status = 'REJECTED';
  audit.rejectionReason = reason;
  audit.reviewedBy = req.user._id;
  audit.approvedAt = new Date(); 

  await audit.save();
  res.json(audit);
});

// @desc    Clone a stale audit for recount
// @route   POST /api/v1/audits/:id/recount
// @access  Private
const recountAudit = asyncHandler(async (req, res) => {
  const oldAudit = await Audit.findById(req.params.id);
  if (!oldAudit) {
    res.status(404);
    throw new Error('Audit not found');
  }
  if (oldAudit.status !== 'RECOUNT_REQUIRED') {
    res.status(400);
    throw new Error('Can only recount if status is RECOUNT_REQUIRED');
  }

  const items = oldAudit.items.map(item => ({
    product: item.product,
    countedQuantity: null,
    owner: req.user ? req.user._id : null
  }));

  const newAudit = new Audit({
    warehouse: oldAudit.warehouse,
    items,
    countedBy: req.user._id,
    company: oldAudit.company || (req.company ? req.company._id : null),
    owner: req.user ? req.user._id : oldAudit.owner,
    status: 'DRAFT'
  });

  const createdAudit = await newAudit.save();
  const populated = await Audit.findById(createdAudit._id)
    .populate('warehouse', 'name code location')
    .populate('countedBy', 'name email')
    .populate('items.product', 'name sku unitOfMeasure category');

  res.status(201).json(populated);
});

module.exports = {
  createAudit,
  updateAuditCounts,
  submitAudit,
  getAudits,
  getAuditById,
  approveAudit,
  rejectAudit,
  recountAudit
};
