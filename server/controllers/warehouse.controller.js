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
  const { 
    name, code, location, country = 'India', countryCode = 'IN', currency = 'INR', 
    isActive, transitLeadTimeDays, transferCostPerUnit 
  } = req.body;

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
    country,
    countryCode: countryCode.toUpperCase(),
    currency: currency.toUpperCase(),
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
  const { 
    name, code, location, country, countryCode, currency, 
    isActive, transitLeadTimeDays, transferCostPerUnit 
  } = req.body;

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
    if (country) warehouse.country = country;
    if (countryCode) warehouse.countryCode = countryCode.toUpperCase();
    if (currency) warehouse.currency = currency.toUpperCase();
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

// @desc    Bulk create warehouses from Excel / CSV / JSON
// @route   POST /api/v1/warehouses/bulk
// @access  Private (COMPANY_ADMIN, ADMIN)
const createWarehousesBulk = asyncHandler(async (req, res) => {
  const warehouses = req.body.warehouses || req.body.items || req.body.data;

  if (!warehouses || !Array.isArray(warehouses) || warehouses.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of warehouses to import');
  }

  const companyId = req.company ? req.company._id : null;
  const ownerId = req.user ? req.user._id : null;

  // Fetch existing warehouse codes for duplicate detection
  const codeQuery = {};
  if (companyId) codeQuery.company = companyId;
  const existingWarehouses = await Warehouse.find(codeQuery).select('code');
  const existingCodeSet = new Set(existingWarehouses.map(w => w.code.toLowerCase().trim()));

  const created = [];
  const errors = [];
  const seenBatchCodes = new Set();

  for (let idx = 0; idx < warehouses.length; idx++) {
    const w = warehouses[idx];
    const rowNum = idx + 1;

    const name = w.name ? String(w.name).trim() : '';
    const code = w.code ? String(w.code).trim().toUpperCase() : '';

    if (!name) {
      errors.push({ row: rowNum, code, error: 'Warehouse name is required' });
      continue;
    }
    if (!code) {
      errors.push({ row: rowNum, code, error: 'Warehouse facility code is required' });
      continue;
    }

    const codeLower = code.toLowerCase();
    if (existingCodeSet.has(codeLower)) {
      errors.push({ row: rowNum, code, error: `Warehouse code "${code}" already exists in company` });
      continue;
    }
    if (seenBatchCodes.has(codeLower)) {
      errors.push({ row: rowNum, code, error: `Duplicate warehouse code "${code}" found in batch` });
      continue;
    }
    seenBatchCodes.add(codeLower);

    try {
      const transitLeadTimeDays = Number(w.transitLeadTimeDays || 1);
      const transferCostPerUnit = Number(w.transferCostPerUnit || 2);
      const isActive = w.isActive !== undefined ? Boolean(w.isActive) : true;

      const newWarehouse = await Warehouse.create({
        name,
        code,
        location: w.location || '',
        country: w.country || 'India',
        countryCode: (w.countryCode || (w.country === 'United States' ? 'US' : 'IN')).toUpperCase(),
        currency: (w.currency || (w.country === 'United States' ? 'USD' : 'INR')).toUpperCase(),
        transitLeadTimeDays: isNaN(transitLeadTimeDays) ? 1 : transitLeadTimeDays,
        transferCostPerUnit: isNaN(transferCostPerUnit) ? 2 : transferCostPerUnit,
        isActive,
        company: companyId,
        owner: ownerId
      });

      existingCodeSet.add(codeLower);
      created.push(newWarehouse);
    } catch (err) {
      errors.push({ row: rowNum, code, error: err.message });
    }
  }

  res.status(201).json({
    message: `Successfully imported ${created.length} warehouse(s)${errors.length ? ` (${errors.length} skipped or failed)` : ''}`,
    total: warehouses.length,
    successCount: created.length,
    failedCount: errors.length,
    created,
    errors
  });
});

module.exports = {
  getWarehouses,
  createWarehouse,
  createWarehousesBulk,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse
};
