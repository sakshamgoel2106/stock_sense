const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const StockLayer = require('../models/StockLayer');
const { getAllReplenishmentRecommendations, evaluateReplenishment } = require('./replenishment.service');
const { findTransferOpportunities } = require('./transferOptimizer.service');

// Tool Definitions
const TOOLS = {
  getInventoryRiskOverview: {
    name: 'getInventoryRiskOverview',
    description: 'Returns high-level inventory health summary, stockout risks, and financial exposure.',
    handler: async () => {
      const recs = await getAllReplenishmentRecommendations();
      const critical = recs.filter(r => r.riskCategory === 'CRITICAL');
      const highRisk = recs.filter(r => r.riskCategory === 'HIGH_RISK');
      const excess = recs.filter(r => r.riskCategory === 'EXCESS');
      const totalShortageExposure = critical.reduce((acc, r) => acc + r.metrics.estimatedFinancialImpact, 0);

      return {
        totalEvaluated: recs.length,
        criticalCount: critical.length,
        highRiskCount: highRisk.length,
        excessCount: excess.length,
        totalShortageExposure,
        criticalItems: critical.map(c => ({
          name: c.product.name,
          sku: c.product.sku,
          warehouse: c.warehouse.name,
          runwayDays: c.metrics.daysUntilStockout,
          available: c.metrics.availableToPromise,
          dailyDemand: c.metrics.forecastDailyDemand
        }))
      };
    }
  },

  getProductsRunningOutSoon: {
    name: 'getProductsRunningOutSoon',
    description: 'Lists all products expected to experience a stockout within 7 days.',
    handler: async () => {
      const recs = await getAllReplenishmentRecommendations();
      const runoutSoon = recs.filter(r => r.metrics.daysUntilStockout !== null && r.metrics.daysUntilStockout <= 7);
      return runoutSoon.map(r => ({
        product: r.product.name,
        sku: r.product.sku,
        warehouse: r.warehouse.name,
        availableStock: r.metrics.availableToPromise,
        forecastDailyDemand: r.metrics.forecastDailyDemand,
        daysUntilStockout: r.metrics.daysUntilStockout,
        leadTimeDays: r.product.leadTimeDays,
        action: r.explainability.recommendedAction
      }));
    }
  },

  explainProductRisk: {
    name: 'explainProductRisk',
    description: 'Provides detailed causal explanation of risk and replenishment metrics for a given product.',
    handler: async ({ query }) => {
      const product = await Product.findOne({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { sku: { $regex: query, $options: 'i' } }
        ]
      });

      if (!product) {
        return { found: false, message: `Product '${query}' was not found in catalog.` };
      }

      // Check across all warehouses holding this product
      const warehouses = await Warehouse.find({ isActive: true });
      const warehouseEvaluations = [];

      for (const wh of warehouses) {
        try {
          const evalRes = await evaluateReplenishment(product._id, wh._id);
          warehouseEvaluations.push(evalRes);
        } catch (e) {
          // ignore
        }
      }

      return {
        found: true,
        product: { name: product.name, sku: product.sku },
        warehouses: warehouseEvaluations.map(w => ({
          warehouse: w.warehouse.name,
          riskCategory: w.riskCategory,
          available: w.metrics.availableToPromise,
          dailyDemand: w.metrics.forecastDailyDemand,
          daysUntilStockout: w.metrics.daysUntilStockout,
          explainability: w.explainability
        }))
      };
    }
  },

  findTransferOptionsForProduct: {
    name: 'findTransferOptionsForProduct',
    description: 'Finds which warehouses have transferable surplus for a product facing shortage.',
    handler: async ({ query }) => {
      const product = await Product.findOne({
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { sku: { $regex: query, $options: 'i' } }
        ]
      });

      if (!product) {
        return { found: false, message: `Product '${query}' was not found.` };
      }

      // Find warehouses where product is in shortage
      const warehouses = await Warehouse.find({ isActive: true });
      const results = [];

      for (const dest of warehouses) {
        const evalRes = await evaluateReplenishment(product._id, dest._id);
        if (evalRes.riskCategory === 'CRITICAL' || evalRes.riskCategory === 'HIGH_RISK') {
          const opps = await findTransferOpportunities(product._id, dest._id);
          results.push(opps);
        }
      }

      return {
        product: { name: product.name, sku: product.sku },
        transferOpportunities: results
      };
    }
  },

  getStockAgingSummary: {
    name: 'getStockAgingSummary',
    description: 'Returns stock aging distribution, highlighting inventory older than 90 days.',
    handler: async () => {
      const now = new Date();
      const cutoff90 = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

      const oldLayers = await StockLayer.find({
        remainingQuantity: { $gt: 0 },
        receivedAt: { $lt: cutoff90 }
      }).populate('product', 'name sku').populate('warehouse', 'name');

      return {
        totalOldBatches: oldLayers.length,
        itemsOlderThan90Days: oldLayers.map(l => ({
          product: l.product ? l.product.name : 'Unknown',
          sku: l.product ? l.product.sku : 'Unknown',
          warehouse: l.warehouse ? l.warehouse.name : 'Unknown',
          remainingQuantity: l.remainingQuantity,
          receivedDate: l.receivedAt.toISOString().split('T')[0],
          unitCost: l.unitCost
        }))
      };
    }
  },

  getManagerPriorities: {
    name: 'getManagerPriorities',
    description: 'Synthesizes top urgent decisions and operations the warehouse manager should address right now.',
    handler: async () => {
      const recs = await getAllReplenishmentRecommendations();
      const critical = recs.filter(r => r.riskCategory === 'CRITICAL');
      
      const priorities = [];
      critical.forEach((item, idx) => {
        priorities.push({
          rank: idx + 1,
          type: 'CRITICAL_STOCKOUT_PREVENTION',
          headline: `Prevent stockout of ${item.product.name} in ${item.warehouse.name}`,
          runway: `${item.metrics.daysUntilStockout} days remaining`,
          recommendedAction: item.explainability.recommendedAction
        });
      });

      return priorities;
    }
  }
};

/**
 * Deterministic Semantic Engine when no external LLM API key is present,
 * ensuring high reliability and grounded outputs without hallucinations.
 */
const runDeterministicAssistant = async (userPrompt) => {
  const lower = userPrompt.toLowerCase().trim();

  // 1. Stockout in 7 days / running out soon
  if (lower.includes('7 days') || lower.includes('run out') || lower.includes('shortage') || lower.includes('critical')) {
    if (lower.includes('why') && (lower.includes('marked') || lower.includes('sensor') || lower.includes('critical'))) {
      // Explain specific product
      const productName = lower.includes('sensor') ? 'Sensor' : 'X-100';
      const data = await TOOLS.explainProductRisk.handler({ query: productName });
      if (data.found && data.warehouses.length > 0) {
        const wh = data.warehouses[0];
        return {
          response: `### Analysis for ${data.product.name} (${data.product.sku}) in ${wh.warehouse}:\n\n` +
            `* **Status**: **${wh.riskCategory}**\n` +
            `* **Current Stock Runway**: **${wh.daysUntilStockout} days** (${wh.available} units on hand vs **${wh.dailyDemand} units/day** forecast demand).\n` +
            `* **Why it's Critical**: ${wh.explainability.detection}\n` +
            `* **Calculations**: ${wh.explainability.calculations}\n` +
            `* **Urgency**: ${wh.explainability.urgency}\n` +
            `* **Risk of Inaction**: ${wh.explainability.riskOfInaction}\n` +
            `* **Recommended Next Step**: ${wh.explainability.recommendedAction}`,
          toolsUsed: ['explainProductRisk'],
          groundedData: data
        };
      }
    }

    const items = await TOOLS.getProductsRunningOutSoon.handler();
    if (items.length === 0) {
      return {
        response: `All monitored products currently have sufficient stock runway exceeding 7 days. There are no immediate stockouts projected this week.`,
        toolsUsed: ['getProductsRunningOutSoon'],
        groundedData: items
      };
    }

    let formatted = `### Products Facing Stockout Within 7 Days:\n\n`;
    items.forEach(item => {
      formatted += `* **${item.product}** (${item.sku}) at **${item.warehouse}**:\n` +
        `  - Available: **${item.availableStock} units** | Daily Demand: **${item.forecastDailyDemand}/day**\n` +
        `  - **Runway**: **${item.daysUntilStockout} days** (Supplier Lead Time: ${item.leadTimeDays} days)\n` +
        `  - **Action**: ${item.action}\n\n`;
    });

    return {
      response: formatted,
      toolsUsed: ['getProductsRunningOutSoon'],
      groundedData: items
    };
  }

  // 2. Transfer Surplus / Compare Transfer vs Purchase
  if (lower.includes('surplus') || lower.includes('transfer') || lower.includes('compare')) {
    const productName = lower.includes('sensor') ? 'Sensor' : lower.includes('microcontroller') ? 'Microcontroller' : '';
    const query = productName || 'Sensor';
    const data = await TOOLS.findTransferOptionsForProduct.handler({ query });

    if (data.found && data.transferOpportunities.length > 0) {
      const opp = data.transferOpportunities[0];
      if (opp.hasFeasibleOption) {
        const bestOpt = opp.options[0];
        return {
          response: `### Inter-Warehouse Transfer Feasibility for ${data.product.name}:\n\n` +
            `* **Shortage Location**: ${opp.destinationWarehouse.name} (${opp.shortageRisk} risk)\n` +
            `* **Feasible Source**: **${bestOpt.sourceWarehouse.name}**\n` +
            `* **Transferable Surplus at Source**: **${bestOpt.sourceSurplus} units** (safeguards source safety stock)\n` +
            `* **Recommended Transfer**: **${bestOpt.recommendedTransferQty} units**\n\n` +
            `#### Comparison: Warehouse Transfer vs Supplier Purchase\n` +
            `| Metric | Inter-Warehouse Transfer | Supplier Purchase |\n` +
            `| :--- | :--- | :--- |\n` +
            `| **Arrival Time** | **${bestOpt.transitDays} day(s)** | **${bestOpt.supplierLeadDays} days** |\n` +
            `| **Speed Advantage** | Arrives **${bestOpt.daysSaved} days sooner** | Risk of stockout during lead time |\n` +
            `| **Estimated Cost** | $${bestOpt.totalTransferCost} handling | $${bestOpt.totalPurchaseCost} procurement |\n` +
            `| **Capital Preserved** | **$${bestOpt.capitalPreserved.toLocaleString()}** | $0 (new expenditure) |\n\n` +
            `* **Verdict**: ${bestOpt.recommendationReason}`,
          toolsUsed: ['findTransferOptionsForProduct'],
          groundedData: data
        };
      }
    }

    return {
      response: `No immediate warehouse surplus is available for inter-warehouse transfer for the specified product. Purchasing through supplier replenishment is recommended.`,
      toolsUsed: ['findTransferOptionsForProduct'],
      groundedData: data
    };
  }

  // 3. Stock aging > 90 days
  if (lower.includes('aging') || lower.includes('90 days') || lower.includes('slow moving') || lower.includes('excess')) {
    const data = await TOOLS.getStockAgingSummary.handler();
    if (data.totalOldBatches === 0) {
      return {
        response: `There are currently no stock batches older than 90 days in the active warehouses. Inventory turnover is healthy.`,
        toolsUsed: ['getStockAgingSummary'],
        groundedData: data
      };
    }

    let res = `### Inventory Batches Older Than 90 Days:\n\n`;
    data.itemsOlderThan90Days.forEach(b => {
      res += `* **${b.product}** (${b.sku}) at **${b.warehouse}**: **${b.remainingQuantity} units** received on ${b.receivedDate} (Unit Cost: $${b.unitCost}).\n`;
    });
    res += `\n*Recommendation*: Consider discounting or reallocating this stock to prevent capital lockup and obsolescence.`;

    return {
      response: res,
      toolsUsed: ['getStockAgingSummary'],
      groundedData: data
    };
  }

  // 4. Priorities / What to do today
  if (lower.includes('prioritize') || lower.includes('today') || lower.includes('overview') || lower.includes('action')) {
    const priorities = await TOOLS.getManagerPriorities.handler();
    const overview = await TOOLS.getInventoryRiskOverview.handler();

    let res = `### Warehouse Manager Priority Briefing:\n\n`;
    res += `* **Status**: ${overview.criticalCount} Critical Shortages | ${overview.highRiskCount} High Risk | $${overview.totalShortageExposure.toLocaleString()} Shortage Value at Risk.\n\n`;
    res += `#### Key Actions to Take Today:\n`;

    priorities.forEach(p => {
      res += `${p.rank}. **${p.headline}** (${p.runway})\n` +
        `   - *Action*: ${p.recommendedAction}\n`;
    });

    return {
      response: res,
      toolsUsed: ['getManagerPriorities', 'getInventoryRiskOverview'],
      groundedData: { overview, priorities }
    };
  }

  // General fallback
  const overview = await TOOLS.getInventoryRiskOverview.handler();
  return {
    response: `### StockSense Inventory Assistant\n\n` +
      `Here is a summary of current inventory operations:\n` +
      `* **Critical Items**: ${overview.criticalCount}\n` +
      `* **Approaching Reorder Point**: ${overview.highRiskCount}\n` +
      `* **Value at Risk**: $${overview.totalShortageExposure.toLocaleString()}\n\n` +
      `You can ask me questions like:\n` +
      `* *"Which products could run out within the next seven days?"*\n` +
      `* *"Why is Sensor Module X-100 marked as critical?"*\n` +
      `* *"Which warehouse has transferable surplus for Sensor Module X-100?"*\n` +
      `* *"Compare transferring stock with purchasing it."*\n` +
      `* *"Show products with more than 90 days of stock aging."*\n` +
      `* *"What should the manager prioritize today?"*`,
    toolsUsed: ['getInventoryRiskOverview'],
    groundedData: overview
  };
};

/**
 * Handles Copilot Chat requests.
 * Uses Gemini API if GEMINI_API_KEY is present; otherwise falls back gracefully
 * to deterministic assistant grounded on live data.
 */
const handleCopilotChat = async (userMessage) => {
  if (!userMessage || typeof userMessage !== 'string') {
    throw new Error('Please provide a valid question');
  }

  // Prompt injection mitigation
  const sanitizedMessage = userMessage.slice(0, 500).replace(/[<>]/g, '');

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  let cachedOverview = null;
  let cachedRunoutSoon = null;
  const getGroundedPrompt = async () => {
    if (!cachedOverview) cachedOverview = await TOOLS.getInventoryRiskOverview.handler();
    if (!cachedRunoutSoon) cachedRunoutSoon = await TOOLS.getProductsRunningOutSoon.handler();
    return `You are StockSense Copilot, an expert AI inventory intelligence assistant.
Answer questions accurately based ONLY on this verified live data:
OVERVIEW: ${JSON.stringify(cachedOverview)}
CRITICAL_PRODUCTS: ${JSON.stringify(cachedRunoutSoon)}
Do NOT invent products or numbers. If data is missing, say so explicitly. Be concise, professional, actionable, and clear.`;
  };

  // 1. Try Groq (ultra-fast, free tier)
  if (groqApiKey && groqApiKey.trim()) {
    try {
      const modelName = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
      const systemPrompt = await getGroundedPrompt();
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey.trim()}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sanitizedMessage }
          ],
          temperature: 0.3,
          max_tokens: 1024
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.choices?.[0]?.message?.content;
        if (text) {
          return {
            reply: text,
            provider: `Groq AI (${modelName})`,
            toolsUsed: ['getInventoryRiskOverview', 'getProductsRunningOutSoon']
          };
        }
      } else {
        const errText = await response.text();
        console.warn('Groq API error, falling back:', response.status, errText);
      }
    } catch (err) {
      console.warn('Groq API request failed, trying next provider:', err.message);
    }
  }

  // 2. Try Gemini API
  if (geminiApiKey && geminiApiKey.trim()) {
    try {
      const systemPrompt = await getGroundedPrompt();
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey.trim()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${sanitizedMessage}` }] }
          ]
        })
      });

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return {
            reply: text,
            provider: 'Gemini 1.5 Flash (Grounded)',
            toolsUsed: ['getInventoryRiskOverview', 'getProductsRunningOutSoon']
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to deterministic engine:', err.message);
    }
  }

  // Fallback to deterministic engine
  const result = await runDeterministicAssistant(sanitizedMessage);
  return {
    reply: result.response,
    provider: 'StockSense Intelligence Engine (Grounded)',
    toolsUsed: result.toolsUsed,
    data: result.groundedData
  };
};

module.exports = {
  handleCopilotChat,
  TOOLS
};
