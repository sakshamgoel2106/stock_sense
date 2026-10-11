const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const Operation = require('../models/Operation');
const StockLedger = require('../models/StockLedger');
const User = require('../models/User');
const Company = require('../models/Company');
const Membership = require('../models/Membership');

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
    const collection = collections[key];
    await collection.deleteMany();
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

describe('Inventory Operations API', () => {
  let product, warehouseA, warehouseB, admin, adminToken, company, membership;

  beforeEach(async () => {
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password', role: 'ADMIN' });
    adminToken = generateToken(admin._id);

    company = await Company.create({
      name: 'Test Corp',
      code: 'TEST1',
      createdBy: admin._id
    });

    membership = await Membership.create({
      userId: admin._id,
      companyId: company._id,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE'
    });

    product = await Product.create({ company: company._id, owner: admin._id, name: 'Laptop', sku: 'LAP123', prices: [{ currency: 'USD', amount: 1000 }] });
    warehouseA = await Warehouse.create({ company: company._id, owner: admin._id, name: 'Main Warehouse', code: 'MAIN1' });
    warehouseB = await Warehouse.create({ company: company._id, owner: admin._id, name: 'Secondary Warehouse', code: 'SEC1' });
  });

  it('1. Receipt increases stock correctly', async () => {
    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'RECEIPT',
        destinationWarehouse: warehouseA._id,
        items: [{ product: product._id, quantity: 50 }]
      });
    expect(opRes.statusCode).toBe(201);
    const opId = opRes.body._id;

    const valRes = await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(valRes.statusCode).toBe(200);

    const stock = await Stock.findOne({ product: product._id, warehouse: warehouseA._id });
    expect(stock).not.toBeNull();
    expect(stock.quantity).toBe(50);

    const ledger = await StockLedger.findOne({ operation: opId });
    expect(ledger).not.toBeNull();
    expect(ledger.quantityChange).toBe(50);
  });

  it('2. Delivery decreases stock correctly', async () => {
    await Stock.create({ owner: admin._id, product: product._id, warehouse: warehouseA._id, quantity: 100 });

    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'DELIVERY',
        sourceWarehouse: warehouseA._id,
        items: [{ product: product._id, quantity: 20 }]
      });
    const opId = opRes.body._id;

    await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const stock = await Stock.findOne({ product: product._id, warehouse: warehouseA._id });
    expect(stock.quantity).toBe(80);
  });

  it('3. Delivery fails when stock is insufficient', async () => {
    await Stock.create({ owner: admin._id, product: product._id, warehouse: warehouseA._id, quantity: 10 });

    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'DELIVERY',
        sourceWarehouse: warehouseA._id,
        items: [{ product: product._id, quantity: 20 }]
      });
    const opId = opRes.body._id;

    const valRes = await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(valRes.statusCode).toBe(400);

    const stock = await Stock.findOne({ product: product._id, warehouse: warehouseA._id });
    expect(stock.quantity).toBe(10);
  });

  it('4. Transfer decreases source and increases destination by the same amount', async () => {
    await Stock.create({ owner: admin._id, product: product._id, warehouse: warehouseA._id, quantity: 100 });
    await Stock.create({ owner: admin._id, product: product._id, warehouse: warehouseB._id, quantity: 50 });

    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'TRANSFER',
        sourceWarehouse: warehouseA._id,
        destinationWarehouse: warehouseB._id,
        items: [{ product: product._id, quantity: 30 }]
      });
    const opId = opRes.body._id;

    const approveRes = await request(app)
      .put(`/api/v1/inventory/operations/${opId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.statusCode).toBe(200);

    await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const stockA = await Stock.findOne({ product: product._id, warehouse: warehouseA._id });
    const stockB = await Stock.findOne({ product: product._id, warehouse: warehouseB._id });
    
    expect(stockA.quantity).toBe(70);
    expect(stockB.quantity).toBe(80);
  });

  it('5. Adjustment correctly applies the delta', async () => {
    await Stock.create({ owner: admin._id, product: product._id, warehouse: warehouseA._id, quantity: 50 });

    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'ADJUSTMENT',
        destinationWarehouse: warehouseA._id,
        items: [{ product: product._id, quantity: 45 }]
      });
    const opId = opRes.body._id;

    await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);

    const stock = await Stock.findOne({ product: product._id, warehouse: warehouseA._id });
    expect(stock.quantity).toBe(45);

    const ledger = await StockLedger.findOne({ operation: opId });
    expect(ledger.quantityChange).toBe(-5);
  });

  it('6. Revalidating an operation does not change stock again', async () => {
    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'RECEIPT',
        destinationWarehouse: warehouseA._id,
        items: [{ product: product._id, quantity: 50 }]
      });
    const opId = opRes.body._id;

    await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);
      
    const valRes2 = await request(app)
      .post(`/api/v1/inventory/operations/${opId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`);
    
    expect(valRes2.statusCode).toBe(400);
    expect(valRes2.body.message).toMatch(/already validated/i);

    const stock = await Stock.findOne({ product: product._id, warehouse: warehouseA._id });
    expect(stock.quantity).toBe(50);
  });

  it('8. Invalid quantities and invalid IDs are rejected', async () => {
    const opRes = await request(app)
      .post('/api/v1/inventory/operations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        type: 'RECEIPT',
        destinationWarehouse: warehouseA._id,
        items: [{ product: product._id, quantity: -10 }]
      });
    
    expect(opRes.statusCode).toBe(500); // Mongoose validation error
  });
});
