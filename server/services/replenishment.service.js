const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Operation = require('../models/Operation');
const { getDailyDemandSeries, generateForecast } = require('./forecasting.service');

/**
 * Calculates pending incoming receipts for a specific product and warehouse.
 */
const getPendingReceiptQuantity = async (productId, warehouseId) => {
  const operations = await Operation.find({
    type: 'RECEIPT',
    destinationWarehouse: warehouseId,
    status: { $in: ['DRAFT', 'READY'] },
    'items.product': productId
  });

  let pendingQty = 0;
  operations.forEach(op => {
    op.items.forEach(item => {
      if (item.product.toString() === productId.toString()) {
        pendingQty += item.quantity;
      }
    });
  });

  return pendingQty;
};

/**
 * Evaluates replenishment metrics and generates explainable recommendations
 * for a specific product and warehouse.
 */
const evaluateReplenishment = async (productId, warehouseId, options = {}) => {
  const { historyWindowDays = 30 } = options;

  const product = await Product.findById(productId);
  const warehouse = await Warehouse.findById(warehouseId);
  const stock = await Stock.findOne({ product: productId, warehouse: warehouseId });

  if (!product || !warehouse) {
    throw new Error('Product or Warehouse not found');
  }

  const onHand = stock ? stock.quantity : 0;
  const reserved = stock ? (stock.reservedQuantity || 0) : 0;
  const availableToPromise = Math.max(0, onHand - reserved);

  // Demand history and forecast
  const dailySeries = await getDailyDemandSeries(productId, warehouseId, historyWindowDays);
  const forecastResult = generateForecast(dailySeries, 14);

  const forecastDailyDemand = forecastResult.forecastDailyDemand;
  const leadTimeDays = product.leadTimeDays || 4;
  const safetyStockDays = product.safetyStockDays || 3;
  const minOrderQty = product.minOrderQuantity || 1;
  const unitCost = product.costPrice || (product.prices && product.prices[0] ? product.prices[0].amount : 25);
  const unitPrice = product.prices && product.prices[0] ? product.prices[0].amount : unitCost * 1.5;

  // Inventory formulas
  const leadTimeDemand = +(forecastDailyDemand * leadTimeDays).toFixed(1);
  const safetyStock = +(forecastDailyDemand * safetyStockDays).toFixed(1);
  const reorderPoint = +(leadTimeDemand + safetyStock).toFixed(1);

  // Pending inbound receipts
  const pendingReceipts = await getPendingReceiptQuantity(productId, warehouseId);

  // Stockout horizon
  let daysUntilStockout = null;
  if (forecastDailyDemand > 0) {
    daysUntilStockout = +(availableToPromise / forecastDailyDemand).toFixed(1);
  } else if (availableToPromise === 0) {
    daysUntilStockout = 0;
  }

  // Target stock and recommended replenishment
  const targetInventory = reorderPoint + safetyStock;
  const effectiveStock = availableToPromise + pendingReceipts;
  let rawReplenishment = Math.max(0, targetInventory - effectiveStock);

  // Adjust for MOQ
  let suggestedReplenishment = 0;
  if (rawReplenishment > 0) {
    suggestedReplenishment = Math.ceil(rawReplenishment / minOrderQty) * minOrderQty;
  }

  // Risk Classification
  let riskCategory = 'HEALTHY';
  let urgencyLevel = 'LOW';

  if (forecastDailyDemand === 0 && availableToPromise > 0) {
    riskCategory = availableToPromise > 50 ? 'EXCESS' : 'HEALTHY';
  } else if (forecastDailyDemand === 0 && availableToPromise === 0) {
    riskCategory = 'INSUFFICIENT_DATA';
    urgencyLevel = 'INFO';
  } else if (availableToPromise === 0) {
    riskCategory = 'CRITICAL';
    urgencyLevel = 'CRITICAL';
  } else if (daysUntilStockout !== null && daysUntilStockout <= leadTimeDays) {
    // Critical: Stockout will happen before normal supplier replenishment arrives!
    riskCategory = 'CRITICAL';
    urgencyLevel = 'CRITICAL';
  } else if (effectiveStock <= reorderPoint) {
    riskCategory = 'HIGH_RISK';
    urgencyLevel = 'HIGH';
  } else if (effectiveStock <= reorderPoint * 1.25) {
    riskCategory = 'REORDER_SOON';
    urgencyLevel = 'MEDIUM';
  } else if (availableToPromise > reorderPoint * 3.5 && availableToPromise > 50) {
    riskCategory = 'EXCESS';
    urgencyLevel = 'LOW';
  }

  // Financial impact of a stockout: estimated lost revenue during stockout days
  let estimatedFinancialImpact = 0;
  if (daysUntilStockout !== null && daysUntilStockout < leadTimeDays) {
    const unfulfilledDays = leadTimeDays - daysUntilStockout;
    const lostUnits = Math.round(unfulfilledDays * forecastDailyDemand);
    estimatedFinancialImpact = +(lostUnits * unitPrice).toFixed(2);
  }

  // Construct structured explainability block
  let explainability = {};
  if (riskCategory === 'CRITICAL') {
    explainability = {
      detection: `Critical stockout imminent: only ${availableToPromise} available units (${daysUntilStockout} days of cover) against an average daily demand of ${forecastDailyDemand} units/day.`,
      calculations: `Available (${availableToPromise}) ÷ Daily Demand (${forecastDailyDemand}) = ${daysUntilStockout} days runway. Supplier lead time is ${leadTimeDays} days. Lead-time demand is ${leadTimeDemand} units, leaving no safety buffer.`,
      urgency: `Supplier lead time (${leadTimeDays} days) exceeds current stock cover (${daysUntilStockout} days). New supplier purchase orders will arrive after stock is completely depleted.`,
      riskOfInaction: `Estimated stockout of ${Math.max(1, Math.round((leadTimeDays - daysUntilStockout) * forecastDailyDemand))} units, risking $${estimatedFinancialImpact.toLocaleString()} in unfulfilled demand and operational delay.`,
      recommendedAction: `Check other warehouses for available surplus immediately to trigger an emergency transfer, or expedite purchase order of at least ${suggestedReplenishment} units.`
    };
  } else if (riskCategory === 'HIGH_RISK') {
    explainability = {
      detection: `Inventory approaching reorder point: ${availableToPromise} available units (${daysUntilStockout} days runway) with reorder point of ${reorderPoint} units.`,
      calculations: `Lead-time demand: ${leadTimeDemand} units (${forecastDailyDemand}/day × ${leadTimeDays} days) + Safety stock: ${safetyStock} units (${safetyStockDays} days buffer) = Reorder Point of ${reorderPoint} units.`,
      urgency: `Stock position (${availableToPromise} units) has crossed into the safety stock buffer. Normal procurement cycle must be initiated.`,
      riskOfInaction: `Stockout expected in ${daysUntilStockout} days if no replenishment is ordered.`,
      recommendedAction: `Create a replenishment request for ${suggestedReplenishment} units from standard supplier or inspect regional warehouses for transfer options.`
    };
  } else if (riskCategory === 'REORDER_SOON') {
    explainability = {
      detection: `Stock level approaching threshold: ${availableToPromise} available units (~${daysUntilStockout} days cover).`,
      calculations: `Currently at ${availableToPromise} units compared to reorder threshold of ${reorderPoint} units.`,
      urgency: `Anticipated replenishment requirement within the next week.`,
      riskOfInaction: `Delaying will push stock below safety stock threshold.`,
      recommendedAction: `Prepare purchase order for ${suggestedReplenishment} units.`
    };
  } else if (riskCategory === 'EXCESS') {
    explainability = {
      detection: `Potential excess inventory: ${availableToPromise} units on hand, providing ${daysUntilStockout ? daysUntilStockout + ' days' : 'extended cover'}.`,
      calculations: `Current stock exceeds 3.5× Reorder Point (${reorderPoint} units). Value tied up: $${(availableToPromise * unitCost).toFixed(2)}.`,
      urgency: `Capital efficiency concern; consider transferring surplus to other facilities.`,
      riskOfInaction: `High carrying costs and risk of stock aging/obsolescence.`,
      recommendedAction: `Make units available as surplus for inter-warehouse transfers.`
    };
  } else if (riskCategory === 'INSUFFICIENT_DATA') {
    explainability = {
      detection: `Insufficient demand history: 0 recorded deliveries in the past ${historyWindowDays} days.`,
      calculations: `Available: ${availableToPromise} units. Daily demand cannot be reliably estimated.`,
      urgency: `Monitor initial consumption before placing large automated reorders.`,
      riskOfInaction: `Risk of either premature purchasing or untracked stockout.`,
      recommendedAction: `Maintain minimum baseline safety stock and log outbound movements.`
    };
  } else {
    explainability = {
      detection: `Stock levels are healthy: ${availableToPromise} available units (${daysUntilStockout} days cover).`,
      calculations: `Available stock (${availableToPromise}) is safely above Reorder Point (${reorderPoint}) and covers lead-time demand (${leadTimeDemand}) plus safety stock (${safetyStock}).`,
      urgency: `No immediate action required.`,
      riskOfInaction: `None.`,
      recommendedAction: `Continue routine monitoring.`
    };
  }

  return {
    product: {
      _id: product._id,
      name: product.name,
      sku: product.sku,
      category: product.category,
      unitCost,
      unitPrice,
      leadTimeDays,
      safetyStockDays,
      minOrderQuantity: minOrderQty
    },
    warehouse: {
      _id: warehouse._id,
      name: warehouse.name,
      code: warehouse.code,
      location: warehouse.location
    },
    metrics: {
      onHand,
      reserved,
      availableToPromise,
      pendingReceipts,
      forecastDailyDemand,
      leadTimeDemand,
      safetyStock,
      reorderPoint,
      daysUntilStockout,
      suggestedReplenishment,
      estimatedFinancialImpact,
      targetInventory
    },
    forecastDetails: {
      method: forecastResult.method,
      confidence: forecastResult.confidence,
      trend: forecastResult.trend,
      trendRate: forecastResult.trendRate,
      evaluation: forecastResult.evaluation
    },
    riskCategory,
    urgencyLevel,
    explainability
  };
};

/**
 * Evaluates replenishment across all products and warehouses,
 * returning a prioritized list sorted by risk urgency.
 */
const getAllReplenishmentRecommendations = async (filter = {}) => {
  const stockQuery = {};
  if (filter.warehouse) stockQuery.warehouse = filter.warehouse;
  if (filter.product) stockQuery.product = filter.product;

  const stocks = await Stock.find(stockQuery)
    .populate('product')
    .populate('warehouse');

  const recommendations = [];

  for (const item of stocks) {
    if (!item.product || !item.warehouse) continue;
    try {
      const rec = await evaluateReplenishment(item.product._id, item.warehouse._id);
      recommendations.push(rec);
    } catch (err) {
      console.error(`Error evaluating replenishment for product ${item.product._id}:`, err);
    }
  }

  // Priority sorting: CRITICAL -> HIGH_RISK -> REORDER_SOON -> EXCESS -> HEALTHY -> INSUFFICIENT_DATA
  const priorityWeight = {
    'CRITICAL': 5,
    'HIGH_RISK': 4,
    'REORDER_SOON': 3,
    'EXCESS': 2,
    'HEALTHY': 1,
    'INSUFFICIENT_DATA': 0
  };

  recommendations.sort((a, b) => {
    const diff = (priorityWeight[b.riskCategory] || 0) - (priorityWeight[a.riskCategory] || 0);
    if (diff !== 0) return diff;
    // Secondary sort: lower days until stockout first
    const daysA = a.metrics.daysUntilStockout ?? 999;
    const daysB = b.metrics.daysUntilStockout ?? 999;
    return daysA - daysB;
  });

  return recommendations;
};

module.exports = {
  evaluateReplenishment,
  getAllReplenishmentRecommendations,
  getPendingReceiptQuantity
};
