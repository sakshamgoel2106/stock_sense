const Stock = require('../models/Stock');
const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const Operation = require('../models/Operation');
const { evaluateReplenishment } = require('./replenishment.service');
const { getDailyDemandSeries, generateForecast } = require('./forecasting.service');

/**
 * Calculates transferable surplus for a product in a candidate source warehouse,
 * strictly safeguarding the source warehouse's own reorder point and safety buffer.
 */
const calculateSourceSurplus = async (productId, sourceWarehouseId) => {
  const stock = await Stock.findOne({ product: productId, warehouse: sourceWarehouseId });
  const warehouse = await Warehouse.findById(sourceWarehouseId);
  const product = await Product.findById(productId);

  if (!stock || !warehouse || !product) {
    return { surplus: 0, available: 0, isFeasible: false, reason: 'Record not found' };
  }

  const onHand = stock.quantity;
  const reserved = stock.reservedQuantity || 0;
  const availableToPromise = Math.max(0, onHand - reserved);

  // Source historical demand and safety buffer
  const dailySeries = await getDailyDemandSeries(productId, sourceWarehouseId, 30);
  const forecast = generateForecast(dailySeries, 7);
  const sourceADU = forecast.forecastDailyDemand;
  const leadTimeDays = product.leadTimeDays || 4;
  const safetyStockDays = product.safetyStockDays || 3;

  // Source minimum required reserve: Lead-time demand + Safety Stock
  const sourceReservedPolicy = Math.ceil(sourceADU * (leadTimeDays + safetyStockDays));
  const usableSurplus = Math.max(0, availableToPromise - sourceReservedPolicy);

  return {
    warehouse: {
      _id: warehouse._id,
      name: warehouse.name,
      code: warehouse.code,
      location: warehouse.location,
      transitLeadTimeDays: warehouse.transitLeadTimeDays || 1,
      transferCostPerUnit: warehouse.transferCostPerUnit || 2
    },
    onHand,
    reserved,
    availableToPromise,
    sourceADU,
    sourceReservedPolicy,
    usableSurplus,
    isFeasible: usableSurplus > 0
  };
};

/**
 * Finds and ranks all feasible inter-warehouse transfer options for a destination warehouse shortage.
 */
const findTransferOpportunities = async (productId, destinationWarehouseId) => {
  const destReplenishment = await evaluateReplenishment(productId, destinationWarehouseId);
  const product = destReplenishment.product;
  const destWarehouse = destReplenishment.warehouse;
  const destMetrics = destReplenishment.metrics;

  // Target required quantity to resolve shortage
  const requiredQty = destMetrics.suggestedReplenishment > 0
    ? destMetrics.suggestedReplenishment
    : Math.max(1, Math.round(destMetrics.leadTimeDemand - destMetrics.availableToPromise));

  // Find all other warehouses
  const otherWarehouses = await Warehouse.find({
    _id: { $ne: destinationWarehouseId },
    isActive: true
  });

  const transferOptions = [];

  for (const wh of otherWarehouses) {
    const sourceAnalysis = await calculateSourceSurplus(productId, wh._id);
    if (!sourceAnalysis.isFeasible || sourceAnalysis.usableSurplus <= 0) {
      continue;
    }

    const transferableQty = Math.min(requiredQty, sourceAnalysis.usableSurplus);
    const transitDays = sourceAnalysis.warehouse.transitLeadTimeDays || 1;
    const supplierLeadDays = product.leadTimeDays || 4;
    const daysSaved = Math.max(0, supplierLeadDays - transitDays);

    const unitTransferCost = sourceAnalysis.warehouse.transferCostPerUnit || 2;
    const totalTransferCost = +(transferableQty * unitTransferCost).toFixed(2);
    const unitPurchaseCost = product.unitCost || 25;
    const totalPurchaseCost = +(transferableQty * unitPurchaseCost).toFixed(2);
    const capitalPreserved = +(totalPurchaseCost - totalTransferCost).toFixed(2);

    // Stockout risk reduction
    const currentRunwayDays = destMetrics.daysUntilStockout ?? 0;
    const postTransferAvailable = destMetrics.availableToPromise + transferableQty;
    const postTransferRunwayDays = destMetrics.forecastDailyDemand > 0
      ? +(postTransferAvailable / destMetrics.forecastDailyDemand).toFixed(1)
      : null;

    // Feasibility score & ranking
    // High score for faster delivery and full quantity coverage
    const coverageRatio = transferableQty / requiredQty;
    const speedAdvantage = daysSaved > 0 ? 30 : 0;
    const score = Math.round((coverageRatio * 50) + speedAdvantage + (capitalPreserved > 0 ? 20 : 0));

    // Explanation
    let recommendationReason = '';
    if (daysSaved > 0 && transferableQty >= requiredQty) {
      recommendationReason = `Highly Recommended: Transfer from ${wh.name} arrives in ${transitDays} day(s) vs ${supplierLeadDays} days supplier lead time, completely avoiding the projected stockout while utilizing existing surplus of ${sourceAnalysis.usableSurplus} units.`;
    } else if (daysSaved > 0) {
      recommendationReason = `Partial Relief: Can transfer ${transferableQty} units from ${wh.name} in ${transitDays} day(s) to bridge emergency stockout until supplier purchase arrives.`;
    } else {
      recommendationReason = `Feasible Transfer: Conserves capital (₹${capitalPreserved.toLocaleString('en-IN')} saved vs new procurement), though transit time is comparable to supplier lead time.`;
    }

    transferOptions.push({
      sourceWarehouse: sourceAnalysis.warehouse,
      destinationWarehouse: destWarehouse,
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku
      },
      recommendedTransferQty: transferableQty,
      requestedQty: requiredQty,
      sourceSurplus: sourceAnalysis.usableSurplus,
      sourceAvailableAfterTransfer: sourceAnalysis.availableToPromise - transferableQty,
      transitDays,
      supplierLeadDays,
      daysSaved,
      totalTransferCost,
      totalPurchaseCost,
      capitalPreserved,
      stockoutRiskBefore: destReplenishment.riskCategory,
      runwayDaysBefore: currentRunwayDays,
      runwayDaysAfter: postTransferRunwayDays,
      recommendationReason,
      rankingScore: score
    });
  }

  // Sort by ranking score descending
  transferOptions.sort((a, b) => b.rankingScore - a.rankingScore);

  return {
    product: destReplenishment.product,
    destinationWarehouse: destWarehouse,
    shortageRisk: destReplenishment.riskCategory,
    requiredQty,
    options: transferOptions,
    hasFeasibleOption: transferOptions.length > 0
  };
};

/**
 * Scans all inventory shortages and collects all actionable transfer recommendations.
 */
const getAllTransferOpportunities = async () => {
  const criticalStocks = await Stock.find({ quantity: { $lte: 50 } })
    .populate('product')
    .populate('warehouse');

  const opportunities = [];
  const processedKeys = new Set();

  for (const s of criticalStocks) {
    if (!s.product || !s.warehouse) continue;
    const key = `${s.product._id}_${s.warehouse._id}`;
    if (processedKeys.has(key)) continue;
    processedKeys.add(key);

    try {
      const opp = await findTransferOpportunities(s.product._id, s.warehouse._id);
      if (opp.hasFeasibleOption) {
        opportunities.push(opp);
      }
    } catch (err) {
      // Continue with other stocks
    }
  }

  return opportunities;
};

/**
 * Creates an authorized Transfer proposal (draft operation) that must proceed
 * through the existing manager approval workflow.
 */
const createTransferProposal = async ({ productId, sourceWarehouseId, destinationWarehouseId, quantity, userId, reason }) => {
  // Validate stock availability and surplus at source
  const sourceAnalysis = await calculateSourceSurplus(productId, sourceWarehouseId);
  if (!sourceAnalysis.isFeasible || sourceAnalysis.usableSurplus < quantity) {
    throw new Error(`Insufficient transferable surplus at source warehouse. Max transferable: ${sourceAnalysis.usableSurplus}`);
  }

  // Create DRAFT operation with approvalStatus PENDING
  const operation = new Operation({
    type: 'TRANSFER',
    sourceWarehouse: sourceWarehouseId,
    destinationWarehouse: destinationWarehouseId,
    items: [{
      product: productId,
      quantity
    }],
    status: 'DRAFT',
    approvalStatus: 'PENDING',
    approvalReason: reason || 'AI Replenishment Optimization proposal',
    createdBy: userId
  });

  const saved = await operation.save();
  return saved;
};

module.exports = {
  calculateSourceSurplus,
  findTransferOpportunities,
  getAllTransferOpportunities,
  createTransferProposal
};
