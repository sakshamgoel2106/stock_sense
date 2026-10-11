require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Company = require('../models/Company');
const Membership = require('../models/Membership');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const StockLayer = require('../models/StockLayer');
const StockLedger = require('../models/StockLedger');
const Operation = require('../models/Operation');
const Reservation = require('../models/Reservation');
const Audit = require('../models/Audit');

const migrate = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for company data migration');

  // 1. Find or create master primary company
  let company = await Company.findOne({ code: 'SS-GLOBAL' });
  let adminUser = await User.findOne({ email: 'demo@stocksense.com' });

  if (!adminUser) {
    adminUser = await User.findOne({ role: 'ADMIN' }) || await User.findOne({});
  }

  if (!adminUser) {
    console.log('No users found in database to attach company to.');
    process.exit(0);
  }

  if (!company) {
    console.log(`Creating default company 'StockSense Global Logistics' under user ${adminUser.email}...`);
    company = await Company.create({
      name: 'StockSense Global Logistics',
      code: 'SS-GLOBAL',
      createdBy: adminUser._id,
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        requireTransferApproval: true
      }
    });
  } else {
    console.log(`Using existing company: ${company.name} (${company.code})`);
  }

  // 2. Ensure adminUser has COMPANY_ADMIN membership
  let adminMembership = await Membership.findOne({ userId: adminUser._id, companyId: company._id });
  if (!adminMembership) {
    console.log(`Creating COMPANY_ADMIN membership for ${adminUser.email}...`);
    adminMembership = await Membership.create({
      userId: adminUser._id,
      companyId: company._id,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      warehouseIds: []
    });
  } else {
    adminMembership.role = 'COMPANY_ADMIN';
    adminMembership.status = 'ACTIVE';
    await adminMembership.save();
  }

  // 3. Migrate inventory documents to company._id
  console.log(`Migrating inventory records to company ${company._id}...`);

  const pRes = await Product.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated Products: ${pRes.modifiedCount}`);

  const wRes = await Warehouse.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated Warehouses: ${wRes.modifiedCount}`);

  const sRes = await Stock.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated Stocks: ${sRes.modifiedCount}`);

  const lRes = await StockLayer.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated StockLayers: ${lRes.modifiedCount}`);

  const ledgerRes = await StockLedger.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated StockLedger records: ${ledgerRes.modifiedCount}`);

  const opRes = await Operation.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated Operations: ${opRes.modifiedCount}`);

  const resRes = await Reservation.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated Reservations: ${resRes.modifiedCount}`);

  const auditRes = await Audit.updateMany(
    { owner: { $ne: company._id } },
    { $set: { owner: company._id } }
  );
  console.log(`Migrated Audits: ${auditRes.modifiedCount}`);

  console.log('--- Migration to Company Architecture Complete! ---');
  process.exit(0);
};

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
