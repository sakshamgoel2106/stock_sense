const asyncHandler = require('express-async-handler');
const { getAllReplenishmentRecommendations, evaluateReplenishment } = require('../services/replenishment.service');
const { getAllTransferOpportunities, findTransferOpportunities, createTransferProposal } = require('../services/transferOptimizer.service');
const { getDailyDemandSeries, generateForecast } = require('../services/forecasting.service');
const { runInventorySimulation } = require('../services/simulation.service');
const { handleCopilotChat } = require('../services/copilot.service');
const Warehouse = require('../models/Warehouse');

// @desc    Get high-level intelligence KPIs and risk summary
// @route   GET /api/v1/intelligence/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
  const recommendations = await getAllReplenishmentRecommendations();
  const transferOpportunities = await getAllTransferOpportunities();

  const critical = recommendations.filter(r => r.riskCategory === 'CRITICAL');
  const highRisk = recommendations.filter(r => r.riskCategory === 'HIGH_RISK');
  const reorderSoon = recommendations.filter(r => r.riskCategory === 'REORDER_SOON');
  const excess = recommendations.filter(r => r.riskCategory === 'EXCESS');

  const totalValueAtRisk = critical.reduce((sum, r) => sum + (r.metrics.estimatedFinancialImpact || 0), 0);
  
  const excessValue = excess.reduce((sum, r) => {
    return sum + (r.metrics.availableToPromise * (r.product.unitCost || 0));
  }, 0);

  // Avoidable purchases via transfers
  let avoidablePurchasesValue = 0;
  transferOpportunities.forEach(opp => {
    if (opp.options && opp.options.length > 0) {
      avoidablePurchasesValue += opp.options[0].capitalPreserved;
    }
  });

  res.json({
    kpis: {
      criticalCount: critical.length,
      highRiskCount: highRisk.length,
      reorderSoonCount: reorderSoon.length,
      excessCount: excess.length,
      totalRecommendations: critical.length + highRisk.length + reorderSoon.length,
      totalValueAtRisk: +totalValueAtRisk.toFixed(2),
      excessValue: +excessValue.toFixed(2),
      avoidablePurchasesValue: +avoidablePurchasesValue.toFixed(2),
      transferOpportunitiesCount: transferOpportunities.length
    },
    topCriticalItems: critical.slice(0, 5),
    topTransferOpportunities: transferOpportunities.slice(0, 5)
  });
});

// @desc    Get prioritized replenishment recommendations
// @route   GET /api/v1/intelligence/recommendations
// @access  Private
const getRecommendations = asyncHandler(async (req, res) => {
  const { warehouse, product, riskCategory } = req.query;
  const filter = {};
  if (warehouse) filter.warehouse = warehouse;
  if (product) filter.product = product;

  let recommendations = await getAllReplenishmentRecommendations(filter);

  if (riskCategory && riskCategory !== 'ALL') {
    recommendations = recommendations.filter(r => r.riskCategory === riskCategory);
  }

  res.json(recommendations);
});

// @desc    Get detailed forecast and backtest evaluation for a product
// @route   GET /api/v1/intelligence/forecast/:productId
// @access  Private
const getProductForecast = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { warehouseId, window = 30 } = req.query;

  const targetWarehouse = warehouseId || (await Warehouse.findOne({ isActive: true }))?._id;
  if (!targetWarehouse) {
    res.status(400);
    throw new Error('No active warehouse found');
  }

  const series = await getDailyDemandSeries(productId, targetWarehouse, parseInt(window));
  const forecast = generateForecast(series, 14);

  res.json({
    productId,
    warehouseId: targetWarehouse,
    forecast
  });
});

// @desc    Get all multi-warehouse transfer optimization opportunities
// @route   GET /api/v1/intelligence/transfers
// @access  Private
const getTransfers = asyncHandler(async (req, res) => {
  const opportunities = await getAllTransferOpportunities();
  res.json(opportunities);
});

// @desc    Propose an inter-warehouse transfer (creates draft operation requiring approval)
// @route   POST /api/v1/intelligence/transfers/propose
// @access  Private
const proposeTransfer = asyncHandler(async (req, res) => {
  const { productId, sourceWarehouseId, destinationWarehouseId, quantity, reason } = req.body;
  const userId = req.user ? req.user._id : null;

  if (!productId || !sourceWarehouseId || !destinationWarehouseId || !quantity) {
    res.status(400);
    throw new Error('Missing required transfer proposal fields');
  }

  const proposal = await createTransferProposal({
    productId,
    sourceWarehouseId,
    destinationWarehouseId,
    quantity: parseInt(quantity),
    userId,
    reason
  });

  res.status(201).json({
    message: 'Transfer proposal created and submitted for Admin / Manager approval',
    operation: proposal
  });
});

// @desc    Run What-If scenario simulation
// @route   POST /api/v1/intelligence/simulate
// @access  Private
const simulateScenario = asyncHandler(async (req, res) => {
  const { productId, warehouseId, horizonDays, customQuantity, sourceWarehouseId } = req.body;

  if (!productId || !warehouseId) {
    res.status(400);
    throw new Error('Product ID and Warehouse ID are required for simulation');
  }

  const simulation = await runInventorySimulation({
    productId,
    warehouseId,
    horizonDays: horizonDays ? parseInt(horizonDays) : 14,
    customQuantity: customQuantity ? parseInt(customQuantity) : null,
    sourceWarehouseId
  });

  res.json(simulation);
});

// @desc    Conversational AI Copilot Chat
// @route   POST /api/v1/intelligence/copilot/chat
// @access  Private
const copilotChat = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400);
    throw new Error('Message is required');
  }

  const result = await handleCopilotChat(message);
  res.json(result);
});

module.exports = {
  getOverview,
  getRecommendations,
  getProductForecast,
  getTransfers,
  proposeTransfer,
  simulateScenario,
  copilotChat
};
