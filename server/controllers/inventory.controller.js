const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Operation = require('../models/Operation');
const Stock = require('../models/Stock');
const StockLedger = require('../models/StockLedger');
const StockLayer = require('../models/StockLayer');
const { validateOperation } = require('../services/inventory.service');

// @desc    Create new inventory operation
// @route   POST /api/v1/inventory/operations
// @access  Private
const createOperation = asyncHandler(async (req, res) => {
  const { type, sourceWarehouse, destinationWarehouse, items } = req.body;
  
  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('Please provide items for the operation');
  }

  const requiresApproval = type === 'TRANSFER' && (req.company?.settings?.requireTransferApproval !== false);
  const operation = new Operation({
    type,
    sourceWarehouse,
    destinationWarehouse,
    items,
    createdBy: req.user ? req.user._id : null,
    approvalStatus: requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
    company: req.company ? req.company._id : null,
    owner: req.user ? req.user._id : null
  });

  const createdOperation = await operation.save();
  res.status(201).json(createdOperation);
});

// @desc    Get all operations
// @route   GET /api/v1/inventory/operations
// @access  Private
const getOperations = asyncHandler(async (req, res) => {
  const query = {};
  if (req.company) {
    query.company = req.company._id;
  }
  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    query.$or = [
      { sourceWarehouse: { $in: req.membership.warehouseIds } },
      { destinationWarehouse: { $in: req.membership.warehouseIds } }
    ];
  }
  const operations = await Operation.find(query)
    .populate('sourceWarehouse', 'name code')
    .populate('destinationWarehouse', 'name code')
    .populate('items.product', 'name sku prices')
    .populate('invoice', 'invoiceNumber status totalAmount')
    .sort({ createdAt: -1 });
  res.json(operations);
});

// @desc    Get operation by ID
// @route   GET /api/v1/inventory/operations/:id
// @access  Private
const getOperationById = asyncHandler(async (req, res) => {
  const operation = await Operation.findById(req.params.id)
    .populate('sourceWarehouse', 'name')
    .populate('destinationWarehouse', 'name')
    .populate('items.product', 'name sku');

  if (operation) {
    res.json(operation);
  } else {
    res.status(404);
    throw new Error('Operation not found');
  }
});

// @desc    Validate an operation (process stock movement)
// @route   POST /api/v1/inventory/operations/:id/validate
// @access  Private
const validateOperationController = asyncHandler(async (req, res) => {
  const userId = req.user ? req.user._id : null;
  const userRole = req.membership ? req.membership.role : (req.user ? req.user.role : null);
  try {
    const operation = await validateOperation(req.params.id, userId, userRole);
    res.json({ message: 'Operation validated successfully', operation });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Get stock levels
// @route   GET /api/v1/inventory/stock
// @access  Private
const getStock = asyncHandler(async (req, res) => {
  const { warehouse, product, search } = req.query;
  const filter = {};
  if (req.company) filter.company = req.company._id;
  if (warehouse) filter.warehouse = warehouse;
  if (product) filter.product = product;

  // Worker warehouse restriction
  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    if (filter.warehouse) {
      const isAllowed = req.membership.warehouseIds.some(wId => wId.toString() === filter.warehouse.toString());
      if (!isAllowed) return res.json([]);
    } else {
      filter.warehouse = { $in: req.membership.warehouseIds };
    }
  }

  if (search) {
    const products = await require('../models/Product').find({
      $or: [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ]
    }).select('_id');
    const productIds = products.map(p => p._id);
    filter.product = { $in: productIds };
  }

  const stock = await Stock.find(filter)
    .populate('product', 'name sku prices unitOfMeasure reorderLevel status')
    .populate('warehouse', 'name location code');
  res.json(stock);
});

// @desc    Get stock ledger
// @route   GET /api/v1/inventory/ledger
// @access  Private
const getLedger = asyncHandler(async (req, res) => {
  const { warehouse, product, operation } = req.query;
  const filter = {};
  if (req.company) filter.company = req.company._id;
  if (warehouse) filter.warehouse = warehouse;
  if (product) filter.product = product;
  if (operation) filter.operation = operation;

  // Worker warehouse restriction
  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    if (filter.warehouse) {
      const isAllowed = req.membership.warehouseIds.some(wId => wId.toString() === filter.warehouse.toString());
      if (!isAllowed) return res.json([]);
    } else {
      filter.warehouse = { $in: req.membership.warehouseIds };
    }
  }

  const ledger = await StockLedger.find(filter)
    .populate('product', 'name sku')
    .populate('warehouse', 'name')
    .populate('operation', 'type')
    .populate('user', 'name')
    .sort({ createdAt: -1 });
  res.json(ledger);
});

// @desc    Get stock aging
// @route   GET /api/v1/inventory/aging
// @access  Private
const getStockAging = asyncHandler(async (req, res) => {
  const { warehouse, product } = req.query;
  const match = { remainingQuantity: { $gt: 0 } };
  
  if (req.company) match.company = new mongoose.Types.ObjectId(req.company._id);
  if (warehouse) match.warehouse = new mongoose.Types.ObjectId(warehouse);
  if (product) match.product = new mongoose.Types.ObjectId(product);

  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    if (warehouse) {
      const isAllowed = req.membership.warehouseIds.some(wId => wId.toString() === warehouse.toString());
      if (!isAllowed) return res.json([]);
    } else {
      match.warehouse = { $in: req.membership.warehouseIds.map(wId => new mongoose.Types.ObjectId(wId)) };
    }
  }

  const now = new Date();
  
  const agingReport = await StockLayer.aggregate([
    { $match: match },
    {
      $project: {
        product: 1,
        warehouse: 1,
        remainingQuantity: 1,
        ageInDays: {
          $divide: [
            { $subtract: [now, "$receivedAt"] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $project: {
        product: 1,
        warehouse: 1,
        remainingQuantity: 1,
        ageInDays: 1,
        category: {
          $switch: {
            branches: [
              { case: { $lte: ["$ageInDays", 30] }, then: "0-30 days" },
              { case: { $lte: ["$ageInDays", 60] }, then: "31-60 days" },
              { case: { $lte: ["$ageInDays", 90] }, then: "61-90 days" }
            ],
            default: "90+ days"
          }
        }
      }
    },
    {
      $group: {
        _id: {
          product: "$product",
          warehouse: "$warehouse",
          category: "$category"
        },
        totalQuantity: { $sum: "$remainingQuantity" }
      }
    }
  ]);
  
  const populated = await StockLayer.populate(agingReport, [
    { path: '_id.product', select: 'name sku', model: 'Product' },
    { path: '_id.warehouse', select: 'name', model: 'Warehouse' }
  ]);

  const result = populated.map(item => ({
    product: item._id.product,
    warehouse: item._id.warehouse,
    category: item._id.category,
    quantity: item.totalQuantity
  }));

  res.json(result);
});

// @desc    Get inventory valuation
// @route   GET /api/v1/inventory/valuation
// @access  Private
const getValuation = asyncHandler(async (req, res) => {
  const { warehouse, product } = req.query;
  const match = { remainingQuantity: { $gt: 0 } };
  
  if (req.company) match.company = new mongoose.Types.ObjectId(req.company._id);
  if (warehouse) match.warehouse = new mongoose.Types.ObjectId(warehouse);
  if (product) match.product = new mongoose.Types.ObjectId(product);

  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    if (warehouse) {
      const isAllowed = req.membership.warehouseIds.some(wId => wId.toString() === warehouse.toString());
      if (!isAllowed) return res.json([]);
    } else {
      match.warehouse = { $in: req.membership.warehouseIds.map(wId => new mongoose.Types.ObjectId(wId)) };
    }
  }

  const valuationReport = await StockLayer.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          product: "$product",
          warehouse: "$warehouse"
        },
        totalQuantity: { $sum: "$remainingQuantity" },
        totalValue: { $sum: { $multiply: ["$remainingQuantity", { $ifNull: ["$unitCost", 0] }] } }
      }
    }
  ]);

  const populated = await StockLayer.populate(valuationReport, [
    { path: '_id.product', select: 'name sku category', model: 'Product' },
    { path: '_id.warehouse', select: 'name', model: 'Warehouse' }
  ]);

  const result = populated.map(item => ({
    product: item._id.product,
    warehouse: item._id.warehouse,
    totalQuantity: item.totalQuantity,
    totalValue: item.totalValue
  }));

  res.json(result);
});

// @desc    Get stock forecasting
// @route   GET /api/v1/inventory/forecast
// @access  Private
const getForecast = asyncHandler(async (req, res) => {
  const { warehouse, product, window = 30 } = req.query;
  const match = { operationType: 'DELIVERY' };
  
  if (req.company) match.company = new mongoose.Types.ObjectId(req.company._id);
  if (warehouse) match.warehouse = new mongoose.Types.ObjectId(warehouse);
  if (product) match.product = new mongoose.Types.ObjectId(product);

  if (req.membership && req.membership.role !== 'COMPANY_ADMIN' && req.membership.warehouseIds?.length > 0) {
    if (warehouse) {
      const isAllowed = req.membership.warehouseIds.some(wId => wId.toString() === warehouse.toString());
      if (!isAllowed) return res.json([]);
    } else {
      match.warehouse = { $in: req.membership.warehouseIds.map(wId => new mongoose.Types.ObjectId(wId)) };
    }
  }

  const windowDays = parseInt(window);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);
  match.createdAt = { $gte: cutoffDate };

  const usageStats = await StockLedger.aggregate([
    { $match: match },
    {
      $group: {
        _id: { product: "$product", warehouse: "$warehouse" },
        totalUsage: { $sum: { $abs: "$quantityChange" } }
      }
    }
  ]);

  const stockFilter = {};
  if (warehouse) stockFilter.warehouse = new mongoose.Types.ObjectId(warehouse);
  if (product) stockFilter.product = new mongoose.Types.ObjectId(product);
  
  const currentStocks = await Stock.find(stockFilter).populate('product', 'name sku').populate('warehouse', 'name');

  const result = currentStocks.map(stock => {
    const stat = usageStats.find(s => 
      s._id.product.toString() === stock.product._id.toString() && 
      s._id.warehouse.toString() === stock.warehouse._id.toString()
    );
    
    const totalUsage = stat ? stat.totalUsage : 0;
    const averageDailyUsage = totalUsage / windowDays;
    const availableStock = stock.quantity - (stock.reservedQuantity || 0);
    
    let estimatedDaysRemaining = null;
    let status = "Insufficient data";
    
    if (averageDailyUsage > 0) {
      estimatedDaysRemaining = availableStock / averageDailyUsage;
      if (estimatedDaysRemaining <= 7) status = "Critical";
      else if (estimatedDaysRemaining <= 30) status = "Warning";
      else status = "Healthy";
    } else if (availableStock === 0) {
      status = "Stock out";
      estimatedDaysRemaining = 0;
    }

    return {
      product: stock.product,
      warehouse: stock.warehouse,
      currentStock: stock.quantity,
      reservedStock: stock.reservedQuantity || 0,
      availableStock,
      totalUsageInWindow: totalUsage,
      averageDailyUsage,
      estimatedDaysRemaining,
      status,
      windowDays
    };
  });

  res.json(result);
});

// @desc    Approve an operation
// @route   PUT /api/v1/inventory/operations/:id/approve
// @access  Private
const approveOperation = asyncHandler(async (req, res) => {
  const operation = await Operation.findById(req.params.id);
  if (!operation) {
    res.status(404);
    throw new Error('Operation not found');
  }
  if (operation.approvalStatus !== 'PENDING') {
    res.status(400);
    throw new Error('Operation is not pending approval');
  }
  
  operation.approvalStatus = 'APPROVED';
  operation.approvedBy = req.user._id;
  await operation.save();
  
  res.json({ message: 'Operation approved', operation });
});

// @desc    Reject an operation
// @route   PUT /api/v1/inventory/operations/:id/reject
// @access  Private
const rejectOperation = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const operation = await Operation.findById(req.params.id);
  
  if (!operation) {
    res.status(404);
    throw new Error('Operation not found');
  }
  if (operation.approvalStatus !== 'PENDING') {
    res.status(400);
    throw new Error('Operation is not pending approval');
  }
  
  operation.approvalStatus = 'REJECTED';
  operation.approvedBy = req.user._id;
  operation.approvalReason = reason;
  operation.status = 'CANCELLED';
  await operation.save();
  
  res.json({ message: 'Operation rejected', operation });
});

module.exports = {
  createOperation,
  getOperations,
  getOperationById,
  validateOperationController,
  getStock,
  getLedger,
  getStockAging,
  getValuation,
  getForecast,
  approveOperation,
  rejectOperation
};
