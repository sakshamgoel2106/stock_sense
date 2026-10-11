const mongoose = require('mongoose');
const StockLedger = require('../models/StockLedger');

/**
 * Extracts and aggregates daily outbound demand (DELIVERY operations)
 * over a given historical window, filling zero-demand days for continuity.
 */
const getDailyDemandSeries = async (productId, warehouseId, windowDays = 30) => {
  const cutoffDate = new Date();
  cutoffDate.setHours(0, 0, 0, 0);
  cutoffDate.setDate(cutoffDate.getDate() - windowDays);

  const match = {
    product: new mongoose.Types.ObjectId(productId),
    operationType: 'DELIVERY',
    createdAt: { $gte: cutoffDate }
  };

  if (warehouseId) {
    match.warehouse = new mongoose.Types.ObjectId(warehouseId);
  }

  const rawMovements = await StockLedger.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        },
        dailyDemand: { $sum: { $abs: "$quantityChange" } }
      }
    },
    {
      $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
    }
  ]);

  // Build a date lookup map
  const demandMap = new Map();
  rawMovements.forEach(item => {
    const key = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
    demandMap.set(key, item.dailyDemand);
  });

  // Construct complete continuous series
  const series = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = windowDays; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    series.push({
      date: key,
      demand: demandMap.get(key) || 0
    });
  }

  return series;
};

/**
 * Computes Moving Average (SMA), Weighted Moving Average (WMA), and Exponential Smoothing (SES),
 * validates against a naive baseline using a chronological holdout, and detects trends.
 */
const generateForecast = (dailySeries, horizonDays = 7) => {
  const totalDays = dailySeries.length;
  const demandValues = dailySeries.map(s => s.demand);
  const totalDemand = demandValues.reduce((acc, v) => acc + v, 0);

  if (totalDays < 7 || totalDemand === 0) {
    const simpleAvg = totalDays > 0 ? +(totalDemand / totalDays).toFixed(2) : 0;
    return {
      forecastDailyDemand: simpleAvg,
      method: 'SIMPLE_AVERAGE',
      confidence: totalDemand === 0 ? 'ZERO_DEMAND' : 'INSUFFICIENT_DATA',
      trend: 'STABLE',
      trendRate: 0,
      evaluation: {
        modelUsed: 'SIMPLE_AVERAGE',
        mae: 0,
        wape: 0,
        naiveMAE: 0,
        validationDays: 0,
        totalDataPoints: totalDays
      },
      historicalSeries: dailySeries,
      forecastSeries: Array.from({ length: horizonDays }, (_, i) => ({
        day: i + 1,
        projectedDemand: simpleAvg
      }))
    };
  }

  // --- Chronological Holdout Validation ---
  // Split: train on first 75%, test on last 25% (minimum 3 holdout days)
  const holdoutLength = Math.max(3, Math.min(7, Math.floor(totalDays * 0.25)));
  const trainData = demandValues.slice(0, totalDays - holdoutLength);
  const testData = demandValues.slice(totalDays - holdoutLength);

  // Naive Baseline: predict last observed value in training set
  const naivePrediction = trainData[trainData.length - 1] ?? 0;
  const naiveMAE = +(testData.reduce((sum, actual) => sum + Math.abs(actual - naivePrediction), 0) / holdoutLength).toFixed(2);

  // Candidate 1: Simple Moving Average (7-day window on train)
  const smaWindow = Math.min(7, trainData.length);
  const smaTrainSlice = trainData.slice(trainData.length - smaWindow);
  const smaPred = +(smaTrainSlice.reduce((a, b) => a + b, 0) / smaWindow).toFixed(2);
  const smaMAE = +(testData.reduce((sum, actual) => sum + Math.abs(actual - smaPred), 0) / holdoutLength).toFixed(2);

  // Candidate 2: Weighted Moving Average (weights 1, 2, 3...)
  const wmaWindow = Math.min(7, trainData.length);
  const wmaTrainSlice = trainData.slice(trainData.length - wmaWindow);
  let weightSum = 0;
  let weightedDemand = 0;
  wmaTrainSlice.forEach((val, idx) => {
    const weight = idx + 1;
    weightSum += weight;
    weightedDemand += val * weight;
  });
  const wmaPred = +(weightedDemand / weightSum).toFixed(2);
  const wmaMAE = +(testData.reduce((sum, actual) => sum + Math.abs(actual - wmaPred), 0) / holdoutLength).toFixed(2);

  // Candidate 3: Exponential Smoothing (alpha = 0.3)
  const alpha = 0.3;
  let sesVal = trainData[0] || 0;
  for (let i = 1; i < trainData.length; i++) {
    sesVal = alpha * trainData[i] + (1 - alpha) * sesVal;
  }
  const sesPred = +sesVal.toFixed(2);
  const sesMAE = +(testData.reduce((sum, actual) => sum + Math.abs(actual - sesPred), 0) / holdoutLength).toFixed(2);

  // Select best model on holdout
  let bestModel = 'WMA';
  let bestMAE = wmaMAE;
  let bestDailyForecast = 0;

  if (sesMAE < bestMAE) {
    bestModel = 'EXPONENTIAL_SMOOTHING';
    bestMAE = sesMAE;
  }
  if (smaMAE < bestMAE) {
    bestModel = 'SMA';
    bestMAE = smaMAE;
  }

  // Calculate final forecast using entire dataset for chosen model
  if (bestModel === 'WMA') {
    const win = Math.min(7, demandValues.length);
    const slice = demandValues.slice(demandValues.length - win);
    let ws = 0, wd = 0;
    slice.forEach((val, idx) => {
      const weight = idx + 1;
      ws += weight;
      wd += val * weight;
    });
    bestDailyForecast = +(wd / ws).toFixed(2);
  } else if (bestModel === 'EXPONENTIAL_SMOOTHING') {
    let s = demandValues[0] || 0;
    for (let i = 1; i < demandValues.length; i++) {
      s = alpha * demandValues[i] + (1 - alpha) * s;
    }
    bestDailyForecast = +s.toFixed(2);
  } else {
    const win = Math.min(7, demandValues.length);
    const slice = demandValues.slice(demandValues.length - win);
    bestDailyForecast = +(slice.reduce((a, b) => a + b, 0) / win).toFixed(2);
  }

  // Compute WAPE on holdout: sum(|actual - pred|) / sum(actual)
  const testActualSum = testData.reduce((a, b) => a + b, 0);
  const testAbsErrors = testData.reduce((acc, actual) => acc + Math.abs(actual - (bestModel === 'WMA' ? wmaPred : bestModel === 'SMA' ? smaPred : sesPred)), 0);
  const wape = testActualSum > 0 ? +(testAbsErrors / testActualSum).toFixed(2) : 0;

  // Trend detection over recent 14 days
  const recentSlice = demandValues.slice(Math.max(0, demandValues.length - 14));
  const n = recentSlice.length;
  let slope = 0;
  if (n >= 4) {
    const xMean = (n - 1) / 2;
    const yMean = recentSlice.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    recentSlice.forEach((y, x) => {
      num += (x - xMean) * (y - yMean);
      den += (x - xMean) ** 2;
    });
    slope = den !== 0 ? num / den : 0;
  }

  let trend = 'STABLE';
  if (slope > 0.15) trend = 'INCREASING';
  else if (slope < -0.15) trend = 'DECREASING';

  // Confidence grade
  let confidence = 'HIGH';
  if (bestMAE > bestDailyForecast * 0.5 || wape > 0.4) {
    confidence = 'MEDIUM';
  }
  if (bestMAE > bestDailyForecast || totalDays < 14) {
    confidence = 'LOW';
  }

  // Construct forecast curve
  const forecastSeries = Array.from({ length: horizonDays }, (_, i) => {
    // Apply modest trend dampening
    const projected = Math.max(0, +(bestDailyForecast + (slope * 0.5 * (i + 1))).toFixed(2));
    return {
      day: i + 1,
      projectedDemand: projected
    };
  });

  return {
    forecastDailyDemand: Math.max(0.1, bestDailyForecast),
    method: bestModel,
    confidence,
    trend,
    trendRate: +slope.toFixed(2),
    evaluation: {
      modelUsed: bestModel,
      mae: bestMAE,
      wape,
      naiveMAE,
      validationDays: holdoutLength,
      totalDataPoints: totalDays
    },
    historicalSeries: dailySeries,
    forecastSeries
  };
};

module.exports = {
  getDailyDemandSeries,
  generateForecast
};
