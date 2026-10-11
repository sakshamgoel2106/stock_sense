const asyncHandler = require('express-async-handler');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');

// @desc    Get all warehouses (scoped to assigned warehouses for restricted members)
// @route   GET /api/v1/warehouses
// @access  Private
const getWarehouses = asyncHandler(async (req, res) => {
  const query = {};
  if (req.company) {
    query.company = req.company._id;
  }
  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    query._id = { $in: req.membership.warehouseIds };
  }
  const warehouses = await Warehouse.find(query).sort({ createdAt: -1 });
  res.json(warehouses);
});

// @desc    Create a warehouse
// @route   POST /api/v1/warehouses
// @access  Private (COMPANY_ADMIN only)
const createWarehouse = asyncHandler(async (req, res) => {
  const { name, code, location, isActive, transitLeadTimeDays, transferCostPerUnit } = req.body;

  const codeQuery = { code };
  if (req.company) codeQuery.company = req.company._id;
  const warehouseExists = await Warehouse.findOne(codeQuery);
  if (warehouseExists) {
    res.status(400);
    throw new Error('Warehouse with this code already exists in this company');
  }

  const warehouse = await Warehouse.create({
    name, 
    code, 
    location, 
    isActive: isActive !== undefined ? isActive : true,
    transitLeadTimeDays: transitLeadTimeDays || 1,
    transferCostPerUnit: transferCostPerUnit || 2,
    company: req.company?._id,
    owner: req.user._id
  });

  res.status(201).json(warehouse);
});

// @desc    Get warehouse by ID (enforces warehouse-level permission)
// @route   GET /api/v1/warehouses/:id
// @access  Private
const getWarehouseById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const warehouse = await Warehouse.findOne(query);
  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    const isAllowed = req.membership.warehouseIds.some(wId => wId.toString() === warehouse._id.toString());
    if (!isAllowed) {
      res.status(403);
      throw new Error('Access denied: You do not have permission for this warehouse');
    }
  }

  res.json(warehouse);
});

// @desc    Update a warehouse
// @route   PUT /api/v1/warehouses/:id
// @access  Private (COMPANY_ADMIN only)
const updateWarehouse = asyncHandler(async (req, res) => {
  const { name, code, location, isActive, transitLeadTimeDays, transferCostPerUnit } = req.body;

  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const warehouse = await Warehouse.findOne(query);

  if (warehouse) {
    if (code && code !== warehouse.code) {
      const codeQuery = { code };
      if (req.company) codeQuery.company = req.company._id;
      const warehouseExists = await Warehouse.findOne(codeQuery);
      if (warehouseExists) {
        res.status(400);
        throw new Error('Warehouse with this code already exists');
      }
    }

    warehouse.name = name || warehouse.name;
    warehouse.code = code || warehouse.code;
    warehouse.location = location !== undefined ? location : warehouse.location;
    warehouse.isActive = isActive !== undefined ? isActive : warehouse.isActive;
    if (transitLeadTimeDays !== undefined) warehouse.transitLeadTimeDays = transitLeadTimeDays;
    if (transferCostPerUnit !== undefined) warehouse.transferCostPerUnit = transferCostPerUnit;

    const updatedWarehouse = await warehouse.save();
    res.json(updatedWarehouse);
  } else {
    res.status(404);
    throw new Error('Warehouse not found');
  }
});

// @desc    Delete a warehouse
// @route   DELETE /api/v1/warehouses/:id
// @access  Private (COMPANY_ADMIN only)
const deleteWarehouse = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const warehouse = await Warehouse.findOne(query);

  if (!warehouse) {
    res.status(404);
    throw new Error('Warehouse not found');
  }

  const stockExists = await Stock.findOne({ warehouse: warehouse._id, quantity: { $gt: 0 } });
  if (stockExists) {
    res.status(400);
    throw new Error('Cannot delete warehouse with existing stock.');
  }

  await warehouse.deleteOne();
  res.json({ message: 'Warehouse removed' });
});

module.exports = {
  getWarehouses,
  createWarehouse,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
};
