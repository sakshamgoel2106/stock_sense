const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import all 13 models
const Audit = require('../models/Audit');
const Company = require('../models/Company');
const Invitation = require('../models/Invitation');
const Invoice = require('../models/Invoice');
const Membership = require('../models/Membership');
const Operation = require('../models/Operation');
const Product = require('../models/Product');
const Reservation = require('../models/Reservation');
const Stock = require('../models/Stock');
const StockLayer = require('../models/StockLayer');
const StockLedger = require('../models/StockLedger');
const User = require('../models/User');
const Warehouse = require('../models/Warehouse');

const clearDatabase = async () => {
  try {
    console.log('Connecting to MongoDB database...');
    if (mongoose.connection.readyState < 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log(`Connected to: ${mongoose.connection.host}/${mongoose.connection.name}`);

    console.log('\n========================================================');
    console.log('  StockSense: Completely Wiping All Collections');
    console.log('========================================================\n');

    const collections = [
      { name: 'Users', model: User },
      { name: 'Companies', model: Company },
      { name: 'Memberships', model: Membership },
      { name: 'Invitations', model: Invitation },
      { name: 'Products', model: Product },
      { name: 'Warehouses', model: Warehouse },
      { name: 'Stock (On-Hand Balances)', model: Stock },
      { name: 'StockLayers (FIFO Layers)', model: StockLayer },
      { name: 'StockLedger (Movement Audit Trail)', model: StockLedger },
      { name: 'Operations (Receipts/Deliveries/Transfers/Adjustments)', model: Operation },
      { name: 'Invoices (GST Tax Invoices)', model: Invoice },
      { name: 'Reservations (ATP Allocations)', model: Reservation },
      { name: 'Audits (Cycle Counts & Variances)', model: Audit },
    ];

    for (const item of collections) {
      const result = await item.model.deleteMany({});
      console.log(`✔ Cleared ${item.name}: ${result.deletedCount} document(s) deleted.`);
    }

    console.log('\n========================================================');
    console.log('✔ All collections in the database are now completely empty!');
    console.log('========================================================\n');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected.');
  }
};

clearDatabase();
