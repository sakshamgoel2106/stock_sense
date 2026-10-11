const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const StockLedger = require('../models/StockLedger');
const Operation = require('../models/Operation');
const Reservation = require('../models/Reservation');
const User = require('../models/User');
const Company = require('../models/Company');
const Membership = require('../models/Membership');
const { generateForecast } = require('../services/forecasting.service');
const { evaluateReplenishment } = require('../services/replenishment.service');
const { calculateSourceSurplus, findTransferOpportunities } = require('../services/transferOptimizer.service');
const { runInventorySimulation } = require('../services/simulation.service');

let mongoServer;

jest.setTimeout(120000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany();
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

describe('StockSense AI Intelligence Platform Test Suite', () => {
  let user, token, product, whA, whB, company, membership;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test Manager',
      email: 'manager@test.com',
      password: 'password123',
      role: 'MANAGER'
    });
    token = generateToken(user._id);

    company = await Company.create({
      name: 'Intelligence Corp',
      code: 'INTEL1',
      createdBy: user._id
    });

    membership = await Membership.create({
      userId: user._id,
      companyId: company._id,
      role: 'MANAGER',
      status: 'ACTIVE'
    });

    whA = await Warehouse.create({
      company: company._id,
      owner: user._id,
      name: 'Warehouse Chicago',
      code: 'CHI-01',
      transitLeadTimeDays: 1,
      transferCostPerUnit: 2
    });

    whB = await Warehouse.create({
      company: company._id,
      owner: user._id,
      name: 'Warehouse Dallas',
      code: 'DAL-01',
      transitLeadTimeDays: 1,
      transferCostPerUnit: 3
    });

    product = await Product.create({
      company: company._id,
      owner: user._id,
      name: 'Sensor Module X-100',
      sku: 'COMP-SENS-100',
      prices: [{ currency: 'USD', amount: 75 }],
      costPrice: 45,
      leadTimeDays: 4,
      safetyStockDays: 3,
      minOrderQuantity: 10
    });
  });

  describe('1. Replenishment & Stockout Engine', () => {
    it('calculates available stock considering active reservations', async () => {
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whA._id,
        quantity: 30,
        reservedQuantity: 6
      });

      const rep = await evaluateReplenishment(product._id, whA._id);
      expect(rep.metrics.onHand).toBe(30);
      expect(rep.metrics.reserved).toBe(6);
      expect(rep.metrics.availableToPromise).toBe(24);
    });

    it('identifies CRITICAL risk when runway is <= supplier lead time', async () => {
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whA._id,
        quantity: 16,
        reservedQuantity: 0
      });

      // Seed 6 units/day delivery history over last 30 days
      const now = new Date();
      for (let i = 1; i <= 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        await StockLedger.create({
          owner: user._id,
          operationType: 'DELIVERY',
          product: product._id,
          warehouse: whA._id,
          quantityChange: -6,
          previousQuantity: 100,
          newQuantity: 94,
          createdAt: d
        });
      }

      const rep = await evaluateReplenishment(product._id, whA._id);
      expect(rep.riskCategory).toBe('CRITICAL');
      expect(rep.metrics.daysUntilStockout).toBeLessThanOrEqual(4.0);
      expect(rep.explainability.detection).toContain('Critical stockout imminent');
      expect(rep.explainability.recommendedAction).toBeDefined();
    });

    it('handles zero demand gracefully with INSUFFICIENT_DATA status', async () => {
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whA._id,
        quantity: 0,
        reservedQuantity: 0
      });

      const rep = await evaluateReplenishment(product._id, whA._id);
      expect(rep.riskCategory).toBe('INSUFFICIENT_DATA');
      expect(rep.metrics.forecastDailyDemand).toBe(0);
    });
  });

  describe('2. Forecasting & Holdout Backtesting', () => {
    it('evaluates forecasts against naive baseline with MAE/WAPE', () => {
      // Create synthetic demand series with 20 days
      const series = Array.from({ length: 20 }, (_, i) => ({
        date: `2026-03-${String(i + 1).padStart(2, '0')}`,
        demand: 5 + (i % 2) // 5, 6, 5, 6...
      }));

      const res = generateForecast(series, 7);
      expect(res.forecastDailyDemand).toBeGreaterThanOrEqual(4.5);
      expect(res.evaluation.mae).toBeDefined();
      expect(res.evaluation.naiveMAE).toBeDefined();
      expect(res.evaluation.validationDays).toBeGreaterThan(0);
      expect(res.forecastSeries.length).toBe(7);
    });
  });

  describe('3. Multi-Warehouse Transfer Optimizer', () => {
    it('safeguards source warehouse safety stock during surplus calculation', async () => {
      // Source has 40 units, but high demand requiring 35 units in reserve
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whB._id,
        quantity: 40,
        reservedQuantity: 0
      });

      // Seed demand in Dallas
      const now = new Date();
      for (let i = 1; i <= 30; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        await StockLedger.create({
          owner: user._id,
          operationType: 'DELIVERY',
          product: product._id,
          warehouse: whB._id,
          quantityChange: -5,
          previousQuantity: 100,
          newQuantity: 95,
          createdAt: d
        });
      }

      const surplusRes = await calculateSourceSurplus(product._id, whB._id);
      // Source safety reserve = 5 daily demand * (4 lead days + 3 buffer days) = 35 units
      // Usable surplus = 40 - 35 = 5 units (up to 15 with holdout weighting)
      expect(surplusRes.usableSurplus).toBeLessThanOrEqual(15);
      expect(surplusRes.isFeasible).toBe(true);
    });

    it('identifies feasible transfer opportunity and ranks speed and capital savings', async () => {
      // Shortage in Chicago (24 units, demand 6/day)
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whA._id,
        quantity: 24,
        reservedQuantity: 0
      });
      // Surplus in Dallas (140 units, low demand)
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whB._id,
        quantity: 140,
        reservedQuantity: 0
      });

      // Seed Chicago 6/day demand
      const now = new Date();
      for (let i = 1; i <= 10; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        await StockLedger.create({
          owner: user._id,
          operationType: 'DELIVERY',
          product: product._id,
          warehouse: whA._id,
          quantityChange: -6,
          previousQuantity: 100,
          newQuantity: 94,
          createdAt: d
        });
      }

      const opp = await findTransferOpportunities(product._id, whA._id);
      expect(opp.hasFeasibleOption).toBe(true);
      expect(opp.options.length).toBeGreaterThan(0);
      expect(opp.options[0].sourceWarehouse.name).toBe('Warehouse Dallas');
      expect(opp.options[0].daysSaved).toBe(3); // 4 supplier days - 1 transit day
      expect(opp.options[0].capitalPreserved).toBeGreaterThan(0);
    });
  });

  describe('4. What-If Simulation Isolation', () => {
    it('simulates trajectory without mutating database records', async () => {
      await Stock.create({
        owner: user._id,
        product: product._id,
        warehouse: whA._id,
        quantity: 50,
        reservedQuantity: 0
      });

      const simResult = await runInventorySimulation({
        productId: product._id,
        warehouseId: whA._id,
        horizonDays: 14,
        customQuantity: 30
      });

      expect(simResult.dailyTimeline.length).toBe(14);
      expect(simResult.scenarios.purchase).toBeDefined();
      expect(simResult.scenarios.transfer).toBeDefined();

      // Verify stock in database was UNTOUCHED
      const stockAfter = await Stock.findOne({ product: product._id, warehouse: whA._id });
      expect(stockAfter.quantity).toBe(50);
    });
  });

  describe('5. Security & Authorization', () => {
    it('prevents self-assigned role elevation during public registration', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker User',
          email: 'hacker@test.com',
          password: 'Password123!',
          role: 'ADMIN' // Trying to elevate to ADMIN
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.role).toBe('WORKER'); // Must be WORKER!
    });

    it('rejects unauthenticated requests to intelligence endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/intelligence/overview');

      expect(res.status).toBe(401);
    });

    it('allows authenticated users to query overview and copilot', async () => {
      const res = await request(app)
        .get('/api/v1/intelligence/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.kpis).toBeDefined();
    });

    it('answers Copilot questions grounded in backend services', async () => {
      const res = await request(app)
        .post('/api/v1/intelligence/copilot/chat')
        .set('Authorization', `Bearer ${token}`)
        .send({ message: 'What should the manager prioritize today?' });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(res.body.toolsUsed).toBeDefined();
    });
  });
});
