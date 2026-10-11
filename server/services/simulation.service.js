const Stock = require('../models/Stock');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const { getDailyDemandSeries, generateForecast } = require('./forecasting.service');

/**
 * Simulates daily inventory trajectories across multiple decision paths over a given horizon.
 * Strictly computational and read-only.
 */
const runInventorySimulation = async ({ productId, warehouseId, horizonDays = 14, customQuantity = null, sourceWarehouseId = null }) => {
  const product = await Product.findById(productId);
  const warehouse = await Warehouse.findById(warehouseId);
  const stock = await Stock.findOne({ product: productId, warehouse: warehouseId });

  if (!product || !warehouse) {
    throw new Error('Product or Warehouse not found');
  }

  const initialOnHand = stock ? stock.quantity : 0;
  const initialReserved = stock ? (stock.reservedQuantity || 0) : 0;
  const initialAvailable = Math.max(0, initialOnHand - initialReserved);

  // Demand forecast
  const dailySeries = await getDailyDemandSeries(productId, warehouseId, 30);
  const forecast = generateForecast(dailySeries, horizonDays);
  const dailyDemand = Math.max(0.1, forecast.forecastDailyDemand);

  const supplierLeadDays = product.leadTimeDays || 4;
  const transferTransitDays = 1; // default inter-warehouse transit
  const unitCost = product.costPrice || (product.prices && product.prices[0] ? product.prices[0].amount : 25);
  const transferCostPerUnit = warehouse.transferCostPerUnit || 2;

  // Replenishment quantity to test
  const testQuantity = customQuantity && customQuantity > 0 
    ? customQuantity 
    : Math.max(20, Math.ceil(dailyDemand * (supplierLeadDays + (product.safetyStockDays || 3))));

  // Initialize day-by-day projections
  const days = [];
  let doNothingBal = initialAvailable;
  let purchaseBal = initialAvailable;
  let transferBal = initialAvailable;

  let doNothingStockoutDay = null;
  let purchaseStockoutDays = 0;
  let transferStockoutDays = 0;

  for (let day = 1; day <= horizonDays; day++) {
    // 1. Scenario: Do Nothing
    doNothingBal = Math.max(0, +(doNothingBal - dailyDemand).toFixed(1));
    if (doNothingBal === 0 && doNothingStockoutDay === null) {
      doNothingStockoutDay = day;
    }

    // 2. Scenario: Purchase Replenishment (Arrives on supplierLeadDays + 1)
    if (day === supplierLeadDays + 1) {
      purchaseBal += testQuantity;
    }
    purchaseBal = Math.max(0, +(purchaseBal - dailyDemand).toFixed(1));
    if (purchaseBal === 0) purchaseStockoutDays++;

    // 3. Scenario: Inter-Warehouse Transfer (Arrives on transferTransitDays + 1)
    if (day === transferTransitDays + 1) {
      transferBal += testQuantity;
    }
    transferBal = Math.max(0, +(transferBal - dailyDemand).toFixed(1));
    if (transferBal === 0) transferStockoutDays++;

    days.push({
      day,
      doNothing: doNothingBal,
      purchase: purchaseBal,
      transfer: transferBal
    });
  }

  const doNothingTotalStockoutDays = doNothingStockoutDay ? horizonDays - doNothingStockoutDay + 1 : 0;

  return {
    product: {
      _id: product._id,
      name: product.name,
      sku: product.sku
    },
    warehouse: {
      _id: warehouse._id,
      name: warehouse.name
    },
    parameters: {
      horizonDays,
      initialAvailable,
      dailyDemand,
      simulatedReplenishmentQty: testQuantity,
      supplierLeadDays,
      transferTransitDays
    },
    scenarios: {
      doNothing: {
        name: 'Do Nothing',
        description: 'Take no procurement or transfer action',
        estimatedCost: 0,
        stockoutDays: doNothingTotalStockoutDays,
        firstStockoutDay: doNothingStockoutDay,
        finalBalance: doNothingBal,
        risk: doNothingTotalStockoutDays > 0 ? 'CRITICAL' : 'LOW'
      },
      purchase: {
        name: 'Supplier Purchase',
        description: `Order ${testQuantity} units from supplier (${supplierLeadDays} days lead time)`,
        arrivalDay: supplierLeadDays + 1,
        estimatedCost: +(testQuantity * unitCost).toFixed(2),
        stockoutDays: purchaseStockoutDays,
        finalBalance: purchaseBal,
        risk: purchaseStockoutDays > 0 ? 'MODERATE' : 'OPTIMAL'
      },
      transfer: {
        name: 'Warehouse Transfer',
        description: `Transfer ${testQuantity} units from regional hub (${transferTransitDays} day transit)`,
        arrivalDay: transferTransitDays + 1,
        estimatedCost: +(testQuantity * transferCostPerUnit).toFixed(2),
        workingCapitalPreserved: +((testQuantity * unitCost) - (testQuantity * transferCostPerUnit)).toFixed(2),
        stockoutDays: transferStockoutDays,
        finalBalance: transferBal,
        risk: transferStockoutDays > 0 ? 'LOW' : 'OPTIMAL'
      }
    },
    dailyTimeline: days,
    assumptions: [
      'Projections are estimates based on constant forecast daily demand rate.',
      'Supplier arrival assumes punctual delivery exactly on lead time.',
      'Does not account for unpredicted demand spikes or supplier stockouts.'
    ]
  };
};

module.exports = {
  runInventorySimulation
};
