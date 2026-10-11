const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const User = require('../models/User');
const Audit = require('../models/Audit');
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
    await collections[key].deleteMany();
  }
});

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

describe('Smart Stock Audit API', () => {
  let admin, manager, staff, productA, productB, warehouse;
  let adminToken, managerToken, staffToken, company;

  beforeEach(async () => {
    admin = await User.create({ name: 'Admin', email: 'admin@test.com', password: 'password', role: 'ADMIN' });
    manager = await User.create({ name: 'Manager', email: 'manager@test.com', password: 'password', role: 'MANAGER' });
    staff = await User.create({ name: 'Staff', email: 'staff@test.com', password: 'password', role: 'WORKER' });
    
    adminToken = generateToken(admin._id);
    managerToken = generateToken(manager._id);
    staffToken = generateToken(staff._id);

    company = await Company.create({ name: 'Audit Corp', code: 'AUDIT1', createdBy: admin._id });

    await Membership.create({ userId: admin._id, companyId: company._id, role: 'COMPANY_ADMIN', status: 'ACTIVE' });
    await Membership.create({ userId: manager._id, companyId: company._id, role: 'MANAGER', status: 'ACTIVE' });
    await Membership.create({ userId: staff._id, companyId: company._id, role: 'WORKER', status: 'ACTIVE' });

    productA = await Product.create({ company: company._id, owner: admin._id, name: 'Laptop', sku: 'LAP123', prices: [{ currency: 'USD', amount: 1000 }] });
    productB = await Product.create({ company: company._id, owner: admin._id, name: 'Mouse', sku: 'MOU123', prices: [{ currency: 'USD', amount: 20 }] });
    warehouse = await Warehouse.create({ company: company._id, owner: admin._id, name: 'Main Warehouse', code: 'MAIN1' });

    await Stock.create({ owner: admin._id, product: productA._id, warehouse: warehouse._id, quantity: 50 });
    await Stock.create({ owner: admin._id, product: productB._id, warehouse: warehouse._id, quantity: 100 });
  });

  it('1. Staff creates audit and cannot see system quantity before or after submission', async () => {
    const resCreate = await request(app)
      .post('/api/v1/audits')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        warehouse: warehouse._id,
        productIds: [productA._id]
      });
    expect(resCreate.statusCode).toBe(201);
    const auditId = resCreate.body._id;

    // Staff saves count
    await request(app)
      .put(`/api/v1/audits/${auditId}/count`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        items: [{ _id: resCreate.body.items[0]._id, countedQuantity: 48 }]
      });

    // Staff submits
    const resSubmit = await request(app)
      .post(`/api/v1/audits/${auditId}/submit`)
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(resSubmit.statusCode).toBe(200);
    expect(resSubmit.body.items[0].systemQuantitySnapshot).toBeUndefined();
    expect(resSubmit.body.items[0].variance).toBeUndefined();

    // Staff gets audit, still cannot see
    const resGet = await request(app)
      .get(`/api/v1/audits/${auditId}`)
      .set('Authorization', `Bearer ${staffToken}`);
    expect(resGet.body.items[0].systemQuantitySnapshot).toBeUndefined();
  });

  it('2. Unauthorized users (staff) cannot access manager approval APIs', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'PENDING_REVIEW',
      items: [{ product: productA._id, countedQuantity: 48, systemQuantitySnapshot: 50, variance: -2 }],
      countedBy: staff._id
    });

    const resApprove = await request(app)
      .post(`/api/v1/audits/${audit._id}/approve`)
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(resApprove.statusCode).toBe(403);
  });

  it('3. Correct positive and negative variance calculations on submission', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'DRAFT',
      items: [
        { product: productA._id, countedQuantity: 48 }, // expected 50 -> -2
        { product: productB._id, countedQuantity: 105 } // expected 100 -> +5
      ],
      countedBy: staff._id
    });

    await request(app)
      .post(`/api/v1/audits/${audit._id}/submit`)
      .set('Authorization', `Bearer ${managerToken}`); // Manager submits to see variance in response
    
    const dbAudit = await Audit.findById(audit._id);
    expect(dbAudit.items[0].variance).toBe(-2);
    expect(dbAudit.items[1].variance).toBe(5);
  });

  it('4. Reasons are mandatory for discrepancies during approval', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'PENDING_REVIEW',
      items: [{ product: productA._id, countedQuantity: 48, systemQuantitySnapshot: 50, variance: -2 }],
      countedBy: staff._id
    });

    const resApprove = await request(app)
      .post(`/api/v1/audits/${audit._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reasons: { [audit.items[0]._id]: { reason: '' } } }); // Missing reason
    
    expect(resApprove.statusCode).toBe(400);
    expect(resApprove.body.message).toMatch(/Reason is required/);
  });

  it('5. Rejection never changes stock', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'PENDING_REVIEW',
      items: [{ product: productA._id, countedQuantity: 48, systemQuantitySnapshot: 50, variance: -2 }],
      countedBy: staff._id
    });

    await request(app)
      .post(`/api/v1/audits/${audit._id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Count again' });
    
    const stock = await Stock.findOne({ product: productA._id });
    expect(stock.quantity).toBe(50); // Unchanged
  });

  it('6. Approval applies the correct stock delta exactly once', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'PENDING_REVIEW',
      items: [{ product: productA._id, countedQuantity: 48, systemQuantitySnapshot: 50, variance: -2 }],
      countedBy: staff._id
    });

    const resApprove = await request(app)
      .post(`/api/v1/audits/${audit._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reasons: { [audit.items[0]._id]: { reason: 'Counting Error' } } });
    
    expect(resApprove.statusCode).toBe(200);

    const stock = await Stock.findOne({ product: productA._id });
    expect(stock.quantity).toBe(48); // Delta applied

    // Try to approve again
    const resApprove2 = await request(app)
      .post(`/api/v1/audits/${audit._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reasons: { [audit.items[0]._id]: { reason: 'Counting Error' } } });
    
    expect(resApprove2.statusCode).toBe(400); // Audit is not pending review
    const stock2 = await Stock.findOne({ product: productA._id });
    expect(stock2.quantity).toBe(48); // Not double adjusted
  });

  it('7. Stock movement after submission triggers recount-required status', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'PENDING_REVIEW',
      items: [{ product: productA._id, countedQuantity: 48, systemQuantitySnapshot: 50, variance: -2 }],
      countedBy: staff._id
    });

    // Simulate stock movement
    await Stock.updateOne({ product: productA._id }, { $set: { quantity: 49 } });

    const resApprove = await request(app)
      .post(`/api/v1/audits/${audit._id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reasons: { [audit.items[0]._id]: { reason: 'Counting Error' } } });
    
    expect(resApprove.statusCode).toBe(409);
    expect(resApprove.body.message).toMatch(/recount required/);

    const dbAudit = await Audit.findById(audit._id);
    expect(dbAudit.status).toBe('RECOUNT_REQUIRED');
  });

  it('8. Recount preserves prior audit history and creates new draft', async () => {
    const audit = await Audit.create({
      warehouse: warehouse._id,
      status: 'RECOUNT_REQUIRED',
      items: [{ product: productA._id, countedQuantity: 48, systemQuantitySnapshot: 50, variance: -2 }],
      countedBy: staff._id
    });

    const resRecount = await request(app)
      .post(`/api/v1/audits/${audit._id}/recount`)
      .set('Authorization', `Bearer ${staffToken}`);
    
    expect(resRecount.statusCode).toBe(201);
    expect(resRecount.body.status).toBe('DRAFT');
    expect(resRecount.body.items[0].countedQuantity).toBeNull();
    
    // Old audit still exists
    const oldAudit = await Audit.findById(audit._id);
    expect(oldAudit.status).toBe('RECOUNT_REQUIRED');
  });
});
