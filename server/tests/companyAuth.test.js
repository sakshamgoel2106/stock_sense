const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../app');
const User = require('../models/User');
const Company = require('../models/Company');
const Membership = require('../models/Membership');
const Invitation = require('../models/Invitation');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const Operation = require('../models/Operation');

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

describe('Company Management, Roles & Multi-Tenant Authorization Test Suite', () => {
  let adminUser, adminToken, workerUser, workerToken, company;

  beforeEach(async () => {
    adminUser = await User.create({
      name: 'Acme Admin',
      email: 'admin@acme.com',
      password: 'Password123!',
      role: 'ADMIN'
    });
    adminToken = generateToken(adminUser._id);

    workerUser = await User.create({
      name: 'Acme Worker',
      email: 'worker@acme.com',
      password: 'Password123!',
      role: 'WORKER'
    });
    workerToken = generateToken(workerUser._id);

    company = await Company.create({
      name: 'Acme Corporation',
      code: 'ACME',
      createdBy: adminUser._id
    });

    await Membership.create({
      userId: adminUser._id,
      companyId: company._id,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      warehouseIds: []
    });

    await Membership.create({
      userId: workerUser._id,
      companyId: company._id,
      role: 'WORKER',
      status: 'ACTIVE',
      warehouseIds: []
    });
  });

  describe('1. Onboarding & Registration Safety', () => {
    it('blocks unassigned users without company from accessing inventory APIs', async () => {
      const lonelyUser = await User.create({
        name: 'Lonely User',
        email: 'lonely@test.com',
        password: 'Password123!',
        role: 'WORKER'
      });
      const lonelyToken = generateToken(lonelyUser._id);

      const res = await request(app)
        .get('/api/v1/inventory/stock')
        .set('Authorization', `Bearer ${lonelyToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NO_COMPANY_MEMBERSHIP');
    });

    it('creates company and assigns creator as COMPANY_ADMIN atomically', async () => {
      const newOwner = await User.create({
        name: 'Startup Founder',
        email: 'founder@startup.com',
        password: 'Password123!',
        role: 'WORKER'
      });
      const founderToken = generateToken(newOwner._id);

      const res = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${founderToken}`)
        .send({
          name: 'Apex Robotics',
          code: 'APEXROBO'
        });

      expect(res.status).toBe(201);
      expect(res.body.company.code).toBe('APEXROBO');
      expect(res.body.membership.role).toBe('COMPANY_ADMIN');

      // Verify membership saved in database
      const savedMem = await Membership.findOne({ userId: newOwner._id, companyId: res.body.company._id });
      expect(savedMem).toBeDefined();
      expect(savedMem.role).toBe('COMPANY_ADMIN');
    });

    it('prevents public signup from self-assigning COMPANY_ADMIN or MANAGER', async () => {
      const regRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Sneaky User',
          email: 'sneaky@test.com',
          password: 'Password123!',
          role: 'COMPANY_ADMIN'
        });

      expect(regRes.status).toBe(201);
      expect(regRes.body.role).toBe('WORKER');
    });
  });

  describe('2. Company Invitations & Verification', () => {
    it('allows COMPANY_ADMIN to create single-use invitation', async () => {
      const res = await request(app)
        .post('/api/v1/companies/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newhire@acme.com',
          role: 'WORKER',
          expiresInDays: 7
        });

      expect(res.status).toBe(201);
      expect(res.body.rawToken).toBeDefined();
      expect(res.body.invitation.email).toBe('newhire@acme.com');

      // Verify token hash was stored rather than raw token
      const savedInv = await Invitation.findById(res.body.invitation._id);
      expect(savedInv.tokenHash).not.toBe(res.body.rawToken);
    });

    it('rejects invitation creation by WORKER', async () => {
      const res = await request(app)
        .post('/api/v1/companies/invitations')
        .set('Authorization', `Bearer ${workerToken}`)
        .send({
          email: 'someone@acme.com',
          role: 'WORKER'
        });

      expect(res.status).toBe(403);
    });

    it('rejects invitation acceptance when authenticated user email does not match invited email', async () => {
      // Admin invites employee@acme.com
      const invRes = await request(app)
        .post('/api/v1/companies/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'employee@acme.com',
          role: 'WORKER'
        });

      const token = invRes.body.rawToken;

      // An unauthorized user signs in and tries to use the token
      const imposter = await User.create({
        name: 'Imposter',
        email: 'imposter@evil.com',
        password: 'Password123!'
      });
      const imposterToken = generateToken(imposter._id);

      const acceptRes = await request(app)
        .post('/api/v1/companies/invitations/accept')
        .set('Authorization', `Bearer ${imposterToken}`)
        .send({ token });

      expect(acceptRes.status).toBe(403);
    });

    it('accepts invitation for matching user and enrolls them into company', async () => {
      const candidate = await User.create({
        name: 'Jane Candidate',
        email: 'jane@acme.com',
        password: 'Password123!'
      });
      const candidateToken = generateToken(candidate._id);

      const invRes = await request(app)
        .post('/api/v1/companies/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'jane@acme.com',
          role: 'MANAGER'
        });

      const token = invRes.body.rawToken;

      const acceptRes = await request(app)
        .post('/api/v1/companies/invitations/accept')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ token });

      expect(acceptRes.status).toBe(200);
      expect(acceptRes.body.membership.role).toBe('MANAGER');

      const mem = await Membership.findOne({ userId: candidate._id, companyId: company._id });
      expect(mem.status).toBe('ACTIVE');
      expect(mem.role).toBe('MANAGER');
    });

    it('rejects expired invitations', async () => {
      const expiredCandidate = await User.create({
        name: 'Late User',
        email: 'late@acme.com',
        password: 'Password123!'
      });
      const lateToken = generateToken(expiredCandidate._id);

      const rawToken = 'sample-expired-token';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      await Invitation.create({
        companyId: company._id,
        email: 'late@acme.com',
        role: 'WORKER',
        tokenHash,
        invitedBy: adminUser._id,
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000) // Expired 1 second ago
      });

      const res = await request(app)
        .post('/api/v1/companies/invitations/accept')
        .set('Authorization', `Bearer ${lateToken}`)
        .send({ token: rawToken });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('expired');
    });
  });

  describe('3. Multi-Tenant Company Isolation', () => {
    it('ensures Company B cannot view or modify Company A inventory', async () => {
      // Company A creates Warehouse and Product
      const whA = await Warehouse.create({
        owner: company._id,
        name: 'Acme Warehouse Alpha',
        code: 'A-ALPHA'
      });
      const prodA = await Product.create({
        owner: company._id,
        name: 'Acme Widget X',
        sku: 'WIDG-X',
        prices: [{ currency: 'USD', amount: 50 }]
      });

      // Create Company B with Founder B
      const founderB = await User.create({
        name: 'Beta Founder',
        email: 'founder@beta.com',
        password: 'Password123!'
      });
      const founderBToken = generateToken(founderB._id);

      const compBRes = await request(app)
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${founderBToken}`)
        .send({ name: 'Beta Industries', code: 'BETA' });

      const companyBId = compBRes.body.company._id;

      // User from Company B queries products
      const bProducts = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${founderBToken}`);

      expect(bProducts.status).toBe(200);
      // Must NOT contain Acme Widget X!
      expect(bProducts.body.length).toBe(0);

      // User from Company B queries warehouses
      const bWarehouses = await request(app)
        .get('/api/v1/warehouses')
        .set('Authorization', `Bearer ${founderBToken}`);

      expect(bWarehouses.status).toBe(200);
      expect(bWarehouses.body.length).toBe(0);
    });
  });

  describe('4. Warehouse Scope & Role Separation', () => {
    it('prevents worker from approving transfer operations', async () => {
      const wh1 = await Warehouse.create({ owner: company._id, name: 'Main', code: 'MAIN' });
      const wh2 = await Warehouse.create({ owner: company._id, name: 'Branch', code: 'BRAN' });
      const prod = await Product.create({ owner: company._id, name: 'Item', sku: 'ITM1' });

      const op = await Operation.create({
        owner: company._id,
        type: 'TRANSFER',
        sourceWarehouse: wh1._id,
        destinationWarehouse: wh2._id,
        items: [{ product: prod._id, quantity: 10 }],
        approvalStatus: 'PENDING',
        createdBy: workerUser._id
      });

      // Worker attempts to approve transfer
      const res = await request(app)
        .put(`/api/v1/inventory/operations/${op._id}/approve`)
        .set('Authorization', `Bearer ${workerToken}`);

      expect(res.status).toBe(403);
    });

    it('enforces warehouse-level access for restricted workers', async () => {
      const wh1 = await Warehouse.create({ company: company._id, owner: adminUser._id, name: 'Chicago', code: 'CHI' });
      const wh2 = await Warehouse.create({ company: company._id, owner: adminUser._id, name: 'Dallas', code: 'DAL' });

      // Create worker restricted ONLY to Chicago (wh1)
      const restrictedWorker = await User.create({
        name: 'Chicago Operator',
        email: 'chicago@acme.com',
        password: 'Password123!'
      });
      const restrictedToken = generateToken(restrictedWorker._id);

      await Membership.create({
        userId: restrictedWorker._id,
        companyId: company._id,
        role: 'WORKER',
        status: 'ACTIVE',
        warehouseIds: [wh1._id] // Only Chicago!
      });

      // Worker lists warehouses -> only sees Chicago!
      const listRes = await request(app)
        .get('/api/v1/warehouses')
        .set('Authorization', `Bearer ${restrictedToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].code).toBe('CHI');

      // Worker attempts to get Dallas by ID directly -> 403 Forbidden!
      const dallasRes = await request(app)
        .get(`/api/v1/warehouses/${wh2._id}`)
        .set('Authorization', `Bearer ${restrictedToken}`);

      expect(dallasRes.status).toBe(403);
    });
  });
});
