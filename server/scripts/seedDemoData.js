const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const crypto = require('crypto');
const User = require('../models/User');
const Company = require('../models/Company');
const Membership = require('../models/Membership');
const Invitation = require('../models/Invitation');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Stock = require('../models/Stock');
const StockLayer = require('../models/StockLayer');
const StockLedger = require('../models/StockLedger');
const Operation = require('../models/Operation');
const Reservation = require('../models/Reservation');
const Audit = require('../models/Audit');
const Invoice = require('../models/Invoice');
const tenantStorage = require('../utils/tenantStorage');

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected for seeding');
};

const seedDemoData = async () => {
  await connectDB();

  console.log('================================================================');
  console.log('  StockSense India: Clean Database & Seed Comprehensive Indian Data');
  console.log('================================================================');

  // 1. Completely Wipe Existing Collections
  console.log('\n[1/7] Wiping all existing database collections...');
  await Promise.all([
    User.deleteMany({}),
    Company.deleteMany({}),
    Membership.deleteMany({}),
    Invitation.deleteMany({}),
    Product.deleteMany({}),
    Warehouse.deleteMany({}),
    Stock.deleteMany({}),
    StockLayer.deleteMany({}),
    StockLedger.deleteMany({}),
    Operation.deleteMany({}),
    Invoice.deleteMany({}),
    Reservation.deleteMany({}),
    Audit.deleteMany({})
  ]);
  console.log('✔ All collections successfully purged.');

  // 2. Create Users
  console.log('\n[2/7] Creating authenticated user accounts with Indian profiles...');
  const targetEmail = process.argv[2] || process.env.DEMO_USER_EMAIL || 'demo@stocksense.com';

  const demoUser = new User({
    name: 'Aarav Sharma (Operations Director)',
    email: targetEmail,
    password: 'Password123!',
    role: 'COMPANY_ADMIN'
  });
  await demoUser.save();

  const developerEmail = process.env.SMTP_USER || 'sakshamgoel2104@gmail.com';
  let devUser = null;
  if (developerEmail && developerEmail !== targetEmail) {
    devUser = new User({
      name: 'Saksham Goel (Executive Admin)',
      email: developerEmail,
      password: 'Password123!',
      role: 'COMPANY_ADMIN'
    });
    await devUser.save();
  }

  const managerUser = new User({
    name: 'Priya Patel (Supply Chain Manager)',
    email: 'manager@stocksense.com',
    password: 'Password123!',
    role: 'MANAGER'
  });
  await managerUser.save();

  const workerUser = new User({
    name: 'Rohan Verma (Bhiwandi Floor Staff)',
    email: 'worker@stocksense.com',
    password: 'Password123!',
    role: 'WORKER'
  });
  await workerUser.save();

  console.log(`✔ Created Company Admin : ${demoUser.email} (Password: Password123!)`);
  if (devUser) console.log(`✔ Created Company Admin : ${devUser.email} (Password: Password123!)`);
  console.log(`✔ Created Manager       : ${managerUser.email} (Password: Password123!)`);
  console.log(`✔ Created Worker        : ${workerUser.email} (Password: Password123!)`);

  // 3. Create Company (Indian Enterprise Logistics)
  console.log('\n[3/7] Creating enterprise Indian logistics company...');
  const company = await Company.create({
    name: 'StockSense India Logistics Pvt Ltd',
    code: 'SS-INDIA',
    createdBy: demoUser._id,
    gstin: '27AABCS1429B1Z1',
    address: 'Plot 42, Logistics Park, Bhiwandi',
    city: 'Thane / Mumbai',
    state: 'Maharashtra',
    pincode: '421302',
    phone: '+91 98200 12345',
    email: 'operations@stocksense.in',
    settings: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      requireTransferApproval: true,
      lowStockThreshold: 15,
      valuationMethod: 'FIFO'
    }
  });
  const companyId = company._id;
  console.log(`✔ Created Company: ${company.name} [Code: ${company.code}, Currency: INR (₹)]`);

  // 4. Create Warehouses (Strategic Indian Industrial Hubs)
  console.log('\n[4/7] Creating major Indian logistics hub network...');
  const whMumbai = await Warehouse.create({
    company: companyId,
    owner: demoUser._id,
    name: 'West Zone Distribution Hub (Bhiwandi, Mumbai)',
    code: 'BOM-01',
    location: 'Bhiwandi Logistics Park, Thane, Maharashtra 421302',
    transitLeadTimeDays: 2,
    transferCostPerUnit: 15,
    isActive: true
  });

  const whDelhi = await Warehouse.create({
    company: companyId,
    owner: demoUser._id,
    name: 'North Zone Fulfillment Center (Gurugram, Delhi-NCR)',
    code: 'DEL-01',
    location: 'Pataudi Road Industrial Zone, Gurugram, Haryana 122503',
    transitLeadTimeDays: 3,
    transferCostPerUnit: 25,
    isActive: true
  });

  const whBengaluru = await Warehouse.create({
    company: companyId,
    owner: demoUser._id,
    name: 'South Tech Logistics Park (Peenya, Bengaluru)',
    code: 'BLR-01',
    location: 'Peenya Industrial Estate, Bengaluru, Karnataka 560058',
    transitLeadTimeDays: 2,
    transferCostPerUnit: 18,
    isActive: true
  });

  const whChennai = await Warehouse.create({
    company: companyId,
    owner: demoUser._id,
    name: 'Automotive & Export Terminal (Sriperumbudur, Chennai)',
    code: 'MAA-01',
    location: 'SIPCOT Industrial Park, Sriperumbudur, Tamil Nadu 602106',
    transitLeadTimeDays: 3,
    transferCostPerUnit: 22,
    isActive: true
  });

  console.log(`✔ Created 4 Regional Hubs: Mumbai (BOM-01), Delhi-NCR (DEL-01), Bengaluru (BLR-01), Chennai (MAA-01)`);

  // 5. Assign Memberships & RBAC Permissions
  console.log('\n[5/7] Assigning memberships and RBAC permission scopes...');
  await Membership.create({
    userId: demoUser._id,
    companyId,
    role: 'COMPANY_ADMIN',
    status: 'ACTIVE',
    warehouseIds: [] // Unrestricted access
  });

  if (devUser) {
    await Membership.create({
      userId: devUser._id,
      companyId,
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      warehouseIds: [] // Unrestricted access
    });
  }

  await Membership.create({
    userId: managerUser._id,
    companyId,
    role: 'MANAGER',
    status: 'ACTIVE',
    warehouseIds: [] // Unrestricted access across all warehouses
  });

  // Assign worker membership strictly restricted to Mumbai Bhiwandi Hub
  await Membership.create({
    userId: workerUser._id,
    companyId,
    role: 'WORKER',
    status: 'ACTIVE',
    warehouseIds: [whMumbai._id]
  });
  console.log(`✔ Worker restricted strictly to: Mumbai Bhiwandi Hub (BOM-01)`);

  // Seed Pending Employee Invitation
  const sampleToken = 'invitation-india-token-88990';
  const sampleTokenHash = crypto.createHash('sha256').update(sampleToken).digest('hex');
  await Invitation.create({
    companyId,
    email: 'lead.logistics@stocksense.in',
    role: 'MANAGER',
    warehouseIds: [whMumbai._id, whDelhi._id],
    tokenHash: sampleTokenHash,
    invitedBy: demoUser._id,
    status: 'PENDING',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  console.log(`✔ Created pending invitation for lead.logistics@stocksense.in [Token: ${sampleToken}]`);

  // 6. Seed Indian Product Catalog & Inventory
  console.log('\n[6/7] Creating Indian product catalog, stock levels, FIFO layers, and 30-day demand history...');
  await tenantStorage.run(companyId, async () => {
    // -------------------------------------------------------------
    // PRODUCTS (12 Items Tailored to Core Indian Industries)
    // -------------------------------------------------------------
    const pBattery = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: '48V 100Ah Lithium Iron Phosphate (LFP) EV Battery Pack',
      sku: 'IND-EV-LFP48V',
      description: 'Automotive grade LFP battery pack with integrated CAN-bus smart BMS for commercial EVs and e-rickshaws',
      category: 'CleanTech & EV',
      prices: [{ currency: 'INR', amount: 42500 }],
      costPrice: 34000,
      leadTimeDays: 5,
      safetyStockDays: 4,
      minOrderQuantity: 5,
      unitOfMeasure: 'Units',
      reorderLevel: 25,
      status: 'ACTIVE'
    });

    const pSolarInverter = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: '5kVA Three-Phase Solar Hybrid On-Grid Inverter',
      sku: 'IND-SOL-INV5KV',
      description: 'High-efficiency MPPT bi-directional solar power conditioning unit with Wi-Fi telemetry',
      category: 'Solar & Energy',
      prices: [{ currency: 'INR', amount: 28500 }],
      costPrice: 22800,
      leadTimeDays: 4,
      safetyStockDays: 3,
      minOrderQuantity: 4,
      unitOfMeasure: 'Units',
      reorderLevel: 15,
      status: 'ACTIVE'
    });

    const pBrakeAssembly = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'High-Tensile Ventilated Disc Brake Assembly (Tata/Mahindra Specs)',
      sku: 'IND-AUTO-BRK01',
      description: 'Precision cast iron ventilated front brake caliper and rotor kit for utility and light commercial vehicles',
      category: 'Automotive',
      prices: [{ currency: 'INR', amount: 3850 }],
      costPrice: 2950,
      leadTimeDays: 3,
      safetyStockDays: 3,
      minOrderQuantity: 20,
      unitOfMeasure: 'Sets',
      reorderLevel: 40,
      status: 'ACTIVE'
    });

    const pSuspensionBush = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Heavy-Duty Polyurethane Suspension Bush Kit (Commercial Vehicles)',
      sku: 'IND-AUTO-BUSH8',
      description: 'Abrasion-resistant elastomeric suspension bushing kit engineered for Indian highway conditions',
      category: 'Automotive',
      prices: [{ currency: 'INR', amount: 1450 }],
      costPrice: 1050,
      leadTimeDays: 3,
      safetyStockDays: 2,
      minOrderQuantity: 25,
      unitOfMeasure: 'Kits',
      reorderLevel: 50,
      status: 'ACTIVE'
    });

    const pParacetamolAPI = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Paracetamol IP / BP Grade Micronized Active API (25kg Drum)',
      sku: 'IND-PHR-PCM25K',
      description: 'Pharma grade bulk Active Pharmaceutical Ingredient (API) powder tested for high purity',
      category: 'Pharmaceuticals',
      prices: [{ currency: 'INR', amount: 16500 }],
      costPrice: 13200,
      leadTimeDays: 6,
      safetyStockDays: 4,
      minOrderQuantity: 10,
      unitOfMeasure: 'Drums',
      reorderLevel: 30,
      status: 'ACTIVE'
    });

    const pN95Masks = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Medical Grade Multilayer N95 Respirator Mask (Pack of 50)',
      sku: 'IND-MED-N95P50',
      description: 'BIS ISI certified particulate filtering respirator with nose clip and welded headbands',
      category: 'Healthcare & PPE',
      prices: [{ currency: 'INR', amount: 1250 }],
      costPrice: 850,
      leadTimeDays: 2,
      safetyStockDays: 2,
      minOrderQuantity: 30,
      unitOfMeasure: 'Packs',
      reorderLevel: 60,
      status: 'ACTIVE'
    });

    const pCottonYarn = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Super Combed 30s Compact Ring-Spun Cotton Yarn (50kg Bale)',
      sku: 'IND-TEX-YRN30S',
      description: 'Premium Shankar-6 Indian cotton combed compact yarn suitable for high-speed weaving and circular knitting',
      category: 'Textiles',
      prices: [{ currency: 'INR', amount: 14200 }],
      costPrice: 11600,
      leadTimeDays: 4,
      safetyStockDays: 3,
      minOrderQuantity: 8,
      unitOfMeasure: 'Bales',
      reorderLevel: 25,
      status: 'ACTIVE'
    });

    const pGeorgetteFabric = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Premium Export Quality Georgette Fabric Bolt (100 Meters)',
      sku: 'IND-TEX-GEO100',
      description: 'High-twist poly georgette woven fabric roll manufactured in Surat textile cluster',
      category: 'Textiles',
      prices: [{ currency: 'INR', amount: 9800 }],
      costPrice: 7400,
      leadTimeDays: 3,
      safetyStockDays: 3,
      minOrderQuantity: 10,
      unitOfMeasure: 'Bolts',
      reorderLevel: 35,
      status: 'ACTIVE'
    });

    const pInductionMotor = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: '5 HP 415V Three-Phase TEFC Heavy Industrial Induction Motor',
      sku: 'IND-IND-MTR5HP',
      description: 'Class F insulation cast iron squirrel cage induction motor conforming to IS 12615 IE3 efficiency',
      category: 'Industrial Electrical',
      prices: [{ currency: 'INR', amount: 18500 }],
      costPrice: 14800,
      leadTimeDays: 5,
      safetyStockDays: 3,
      minOrderQuantity: 3,
      unitOfMeasure: 'Units',
      reorderLevel: 12,
      status: 'ACTIVE'
    });

    const pPVCConduit = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Rigid Heavy Gauge PVC Electrical Conduit 25mm (Bundle of 25 Pipes)',
      sku: 'IND-ELE-PVC25M',
      description: 'Flame retardant low smoke (FRLS) rigid PVC electrical conduit pipes conforming to IS 9537 Part 3',
      category: 'Electrical Infrastructure',
      prices: [{ currency: 'INR', amount: 2650 }],
      costPrice: 1950,
      leadTimeDays: 2,
      safetyStockDays: 2,
      minOrderQuantity: 15,
      unitOfMeasure: 'Bundles',
      reorderLevel: 45,
      status: 'ACTIVE'
    });

    const pBlackPepper = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Wayanad Malabar Black Pepper Extra Bold TGSEB (25kg Bag)',
      sku: 'IND-AGR-PEP25K',
      description: 'Tellicherry Garbled Special Extra Bold whole black pepper from Kerala Western Ghats, export graded',
      category: 'Agro Commodities',
      prices: [{ currency: 'INR', amount: 17500 }],
      costPrice: 14200,
      leadTimeDays: 4,
      safetyStockDays: 3,
      minOrderQuantity: 5,
      unitOfMeasure: 'Bags',
      reorderLevel: 20,
      status: 'ACTIVE'
    });

    const pLegacyStepper = await Product.create({
      company: companyId,
      owner: demoUser._id,
      name: 'Legacy Analog Stepper Motor Driver Board (Discontinued Model)',
      sku: 'IND-ELC-STP99D',
      description: 'Discontinued microstepping driver card replaced by modern digital DSP drivers',
      category: 'Legacy Electronics',
      prices: [{ currency: 'INR', amount: 1200 }],
      costPrice: 950,
      leadTimeDays: 10,
      safetyStockDays: 5,
      minOrderQuantity: 10,
      unitOfMeasure: 'Units',
      reorderLevel: 10,
      status: 'ACTIVE'
    });

    // -------------------------------------------------------------
    // STOCK POSITIONS (Across Major Indian Hubs)
    // -------------------------------------------------------------
    // 1. Critical shortage: EV Battery in Mumbai (18 units on hand, 4.5/d demand -> 4d runway vs 5d lead time)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pBattery._id, warehouse: whMumbai._id, quantity: 18, reservedQuantity: 0 });
    // Surplus in Delhi Hub: 95 on hand, 5 reserved = 90 available for inter-warehouse transfer!
    await Stock.create({ company: companyId, owner: demoUser._id, product: pBattery._id, warehouse: whDelhi._id, quantity: 95, reservedQuantity: 5 });

    // 2. Critical shortage: Brake Assembly in Mumbai (28 on hand, 8 reserved = 20 ATP, 6.2/d demand -> 3.2d runway vs 3d lead time)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pBrakeAssembly._id, warehouse: whMumbai._id, quantity: 28, reservedQuantity: 8 });
    // Surplus in Chennai Hub: 150 on hand, 0 reserved!
    await Stock.create({ company: companyId, owner: demoUser._id, product: pBrakeAssembly._id, warehouse: whChennai._id, quantity: 150, reservedQuantity: 0 });

    // 3. Balanced item: Solar Inverters
    await Stock.create({ company: companyId, owner: demoUser._id, product: pSolarInverter._id, warehouse: whBengaluru._id, quantity: 45, reservedQuantity: 0 });
    await Stock.create({ company: companyId, owner: demoUser._id, product: pSolarInverter._id, warehouse: whDelhi._id, quantity: 30, reservedQuantity: 0 });

    // 4. Excess stock: PVC Conduit (240 bundles in Mumbai, 1.8/d demand -> ~133d runway)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pPVCConduit._id, warehouse: whMumbai._id, quantity: 240, reservedQuantity: 0 });
    await Stock.create({ company: companyId, owner: demoUser._id, product: pPVCConduit._id, warehouse: whBengaluru._id, quantity: 60, reservedQuantity: 0 });

    // 5. Aging stock: Heavy Suspension Bush (380 kits in Delhi, 0.6/d demand -> 600d runway)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pSuspensionBush._id, warehouse: whDelhi._id, quantity: 380, reservedQuantity: 0 });

    // 6. Pharma API stock: Paracetamol in Mumbai (65 drums on hand, 10 reserved = 55 ATP)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pParacetamolAPI._id, warehouse: whMumbai._id, quantity: 65, reservedQuantity: 10 });
    await Stock.create({ company: companyId, owner: demoUser._id, product: pParacetamolAPI._id, warehouse: whChennai._id, quantity: 40, reservedQuantity: 0 });

    // 7. N95 Respirators in Delhi (310 packs) and Mumbai (180 packs)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pN95Masks._id, warehouse: whDelhi._id, quantity: 310, reservedQuantity: 20 });
    await Stock.create({ company: companyId, owner: demoUser._id, product: pN95Masks._id, warehouse: whMumbai._id, quantity: 180, reservedQuantity: 0 });

    // 8. Cotton Yarn in Chennai (90 bales) and Mumbai (45 bales)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pCottonYarn._id, warehouse: whChennai._id, quantity: 90, reservedQuantity: 15 });
    await Stock.create({ company: companyId, owner: demoUser._id, product: pCottonYarn._id, warehouse: whMumbai._id, quantity: 45, reservedQuantity: 0 });

    // 9. Georgette Fabric in Mumbai (120 bolts)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pGeorgetteFabric._id, warehouse: whMumbai._id, quantity: 120, reservedQuantity: 0 });

    // 10. Induction Motors in Bengaluru (32 units) and Delhi (22 units)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pInductionMotor._id, warehouse: whBengaluru._id, quantity: 32, reservedQuantity: 2 });
    await Stock.create({ company: companyId, owner: demoUser._id, product: pInductionMotor._id, warehouse: whDelhi._id, quantity: 22, reservedQuantity: 0 });

    // 11. Malabar Black Pepper in Bengaluru (55 bags)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pBlackPepper._id, warehouse: whBengaluru._id, quantity: 55, reservedQuantity: 5 });

    // 12. Dead Stock / Obsolete: Discontinued Stepper Drivers in Mumbai (75 units, 0 demand, >200 days old)
    await Stock.create({ company: companyId, owner: demoUser._id, product: pLegacyStepper._id, warehouse: whMumbai._id, quantity: 75, reservedQuantity: 0 });

    // -------------------------------------------------------------
    // 30-DAY OUTBOUND DEMAND HISTORY (Powers AI Forecasting & Copilot)
    // -------------------------------------------------------------
    const now = new Date();
    const seedDeliveries = async (product, warehouse, dailyPattern) => {
      for (let dayOffset = 30; dayOffset >= 1; dayOffset--) {
        const txDate = new Date(now);
        txDate.setDate(txDate.getDate() - dayOffset);
        txDate.setHours(11, 0, 0, 0);

        const qty = typeof dailyPattern === 'function' ? dailyPattern(dayOffset) : dailyPattern;
        if (qty > 0) {
          await StockLedger.create({
            company: companyId,
            owner: demoUser._id,
            operationType: 'DELIVERY',
            product: product._id,
            warehouse: warehouse._id,
            quantityChange: -qty,
            previousQuantity: 100 + qty,
            newQuantity: 100,
            user: demoUser._id,
            createdAt: txDate
          });
        }
      }
    };

    // Demand patterns
    await seedDeliveries(pBattery, whMumbai, (offset) => 4 + ((offset % 3 === 0) ? 1 : 0));
    await seedDeliveries(pBattery, whDelhi, 2);
    await seedDeliveries(pBrakeAssembly, whMumbai, (offset) => 6 + (offset % 2));
    await seedDeliveries(pBrakeAssembly, whChennai, 3);
    await seedDeliveries(pSolarInverter, whBengaluru, (offset) => (offset % 2 === 0 ? 2 : 1));
    await seedDeliveries(pPVCConduit, whMumbai, (offset) => (offset % 2 === 0 ? 2 : 0));
    await seedDeliveries(pSuspensionBush, whDelhi, (offset) => (offset % 4 === 0 ? 2 : 0));
    await seedDeliveries(pParacetamolAPI, whMumbai, (offset) => (offset % 3 === 0 ? 3 : 1));
    await seedDeliveries(pN95Masks, whDelhi, 10);
    await seedDeliveries(pN95Masks, whMumbai, 6);
    await seedDeliveries(pCottonYarn, whChennai, (offset) => (offset % 2 === 0 ? 4 : 2));
    await seedDeliveries(pInductionMotor, whBengaluru, (offset) => (offset % 5 === 0 ? 2 : 0));
    await seedDeliveries(pBlackPepper, whBengaluru, (offset) => (offset % 4 === 0 ? 1 : 0));
    // pLegacyStepper: NO DEMAND (zero demand for dead stock verification!)

    // -------------------------------------------------------------
    // FIFO COST LAYERS (Covers ALL 5 Aging Buckets for Indian Portfolio)
    // -------------------------------------------------------------
    const d8 = new Date(now.getTime() - (8 * 24 * 60 * 60 * 1000));     // 0-30 Days
    const d18 = new Date(now.getTime() - (18 * 24 * 60 * 60 * 1000));   // 0-30 Days
    const d42 = new Date(now.getTime() - (42 * 24 * 60 * 60 * 1000));   // 31-60 Days
    const d70 = new Date(now.getTime() - (70 * 24 * 60 * 60 * 1000));   // 61-90 Days
    const d115 = new Date(now.getTime() - (115 * 24 * 60 * 60 * 1000)); // 91-180 Days
    const d140 = new Date(now.getTime() - (140 * 24 * 60 * 60 * 1000)); // 91-180 Days
    const d220 = new Date(now.getTime() - (220 * 24 * 60 * 60 * 1000)); // > 180 Days (Dead Stock)

    // Tier 1: 0 - 30 Days (Fresh Arrivals)
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pBattery._id, warehouse: whMumbai._id, originalQuantity: 30, remainingQuantity: 18, unitCost: 34000, receivedAt: d8 });
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pBattery._id, warehouse: whDelhi._id, originalQuantity: 100, remainingQuantity: 95, unitCost: 34000, receivedAt: d8 });
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pBrakeAssembly._id, warehouse: whMumbai._id, originalQuantity: 40, remainingQuantity: 28, unitCost: 2950, receivedAt: d18 });
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pN95Masks._id, warehouse: whDelhi._id, originalQuantity: 400, remainingQuantity: 310, unitCost: 850, receivedAt: d8 });

    // Tier 2: 31 - 60 Days (Active Stock)
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pSolarInverter._id, warehouse: whBengaluru._id, originalQuantity: 50, remainingQuantity: 45, unitCost: 22800, receivedAt: d42 });
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pCottonYarn._id, warehouse: whChennai._id, originalQuantity: 110, remainingQuantity: 90, unitCost: 11600, receivedAt: d42 });

    // Tier 3: 61 - 90 Days (Maturing Stock)
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pParacetamolAPI._id, warehouse: whMumbai._id, originalQuantity: 80, remainingQuantity: 65, unitCost: 13200, receivedAt: d70 });
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pInductionMotor._id, warehouse: whBengaluru._id, originalQuantity: 40, remainingQuantity: 32, unitCost: 14800, receivedAt: d70 });

    // Tier 4: 91 - 180 Days (Aging Inventory)
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pPVCConduit._id, warehouse: whMumbai._id, originalQuantity: 300, remainingQuantity: 240, unitCost: 1950, receivedAt: d115 });
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pSuspensionBush._id, warehouse: whDelhi._id, originalQuantity: 420, remainingQuantity: 380, unitCost: 1050, receivedAt: d140 });

    // Tier 5: > 180 Days (Obsolete / Dead Stock)
    await StockLayer.create({ company: companyId, owner: demoUser._id, product: pLegacyStepper._id, warehouse: whMumbai._id, originalQuantity: 75, remainingQuantity: 75, unitCost: 950, receivedAt: d220 });

    // -------------------------------------------------------------
    // ACTIVE RESERVATIONS (Indian Enterprise Clients)
    // -------------------------------------------------------------
    await Reservation.create({
      company: companyId,
      owner: demoUser._id,
      product: pBattery._id,
      warehouse: whDelhi._id,
      quantity: 5,
      orderReference: 'SO-MH-TATA-EV-4401 (Tata Motors Pune Plant)',
      status: 'ACTIVE',
      user: demoUser._id
    });

    await Reservation.create({
      company: companyId,
      owner: demoUser._id,
      product: pBrakeAssembly._id,
      warehouse: whMumbai._id,
      quantity: 8,
      orderReference: 'SO-MH-M&M-NASHIK-992 (Mahindra Auto Nashik)',
      status: 'ACTIVE',
      user: demoUser._id
    });

    await Reservation.create({
      company: companyId,
      owner: demoUser._id,
      product: pParacetamolAPI._id,
      warehouse: whMumbai._id,
      quantity: 10,
      orderReference: 'WO-GJ-SUN-PCM-110 (Sun Pharma Vadodara Plant)',
      status: 'ACTIVE',
      user: demoUser._id
    });

    await Reservation.create({
      company: companyId,
      owner: demoUser._id,
      product: pN95Masks._id,
      warehouse: whDelhi._id,
      quantity: 20,
      orderReference: 'SO-DL-REL-N95-882 (Reliance Retail Health Division)',
      status: 'ACTIVE',
      user: demoUser._id
    });

    // -------------------------------------------------------------
    // OPERATIONS (Testing All States & Workflows)
    // -------------------------------------------------------------
    // 1. Pending Transfer Awaiting Manager Approval (Delhi -> Mumbai to avert battery stockout)
    await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'TRANSFER',
      sourceWarehouse: whDelhi._id,
      destinationWarehouse: whMumbai._id,
      items: [{ product: pBattery._id, quantity: 20 }],
      status: 'DRAFT',
      approvalStatus: 'PENDING',
      approvalReason: 'Inter-warehouse replenishment requested from Delhi surplus to avert Mumbai EV battery stockout',
      createdBy: demoUser._id
    });

    // 2. Approved Transfer Ready for Execution (Chennai -> Mumbai)
    await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'TRANSFER',
      sourceWarehouse: whChennai._id,
      destinationWarehouse: whMumbai._id,
      items: [{ product: pBrakeAssembly._id, quantity: 35 }],
      status: 'DRAFT',
      approvalStatus: 'APPROVED',
      approvedBy: demoUser._id,
      approvalReason: 'Approved by Supply Chain Manager to replenish Bhiwandi automotive assembly line',
      createdBy: demoUser._id
    });

    // 3. Draft Incoming Receipt (Solar inverters arriving at Bengaluru)
    await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'RECEIPT',
      destinationWarehouse: whBengaluru._id,
      items: [{ product: pSolarInverter._id, quantity: 25, unitCost: 22800 }],
      status: 'DRAFT',
      approvalStatus: 'NOT_REQUIRED',
      createdBy: demoUser._id
    });

    // 4. Draft Customer Delivery (Ready for live demo of 'Deliver Goods & Generate Bill')
    await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'DELIVERY',
      sourceWarehouse: whMumbai._id,
      items: [{ product: pBrakeAssembly._id, quantity: 10, unitPrice: 3200 }],
      status: 'DRAFT',
      approvalStatus: 'NOT_REQUIRED',
      customer: {
        companyName: 'Mahindra Logistics & Auto Ltd',
        name: 'Mahindra Logistics & Auto Ltd',
        contactName: 'Vikramaditya Shinde',
        email: 'supplychain@mahindra.com',
        phone: '+91 98205 67890',
        gstin: '27AAACM1234A1Z8',
        address: {
          street: 'Kandivali Industrial Complex, SV Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400101',
          country: 'India'
        }
      },
      createdBy: demoUser._id
    });

    // 5. Completed Delivery 1: Tata Motors Commercial Vehicles Ltd (PAID via Bank Transfer)
    const subtotal1 = 20 * 3200; // 64,000
    const cgst1 = Math.round(subtotal1 * 0.09 * 100) / 100; // 5,760
    const sgst1 = Math.round(subtotal1 * 0.09 * 100) / 100; // 5,760
    const total1 = subtotal1 + cgst1 + sgst1; // 75,520

    const opDel1 = await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'DELIVERY',
      sourceWarehouse: whMumbai._id,
      items: [{ product: pBrakeAssembly._id, quantity: 20, unitPrice: 3200 }],
      status: 'VALIDATED',
      approvalStatus: 'NOT_REQUIRED',
      customer: {
        companyName: 'Tata Motors Commercial Vehicles Ltd',
        name: 'Tata Motors Commercial Vehicles Ltd',
        contactName: 'Ramesh Kulkarni',
        email: 'accounts.payable@tatamotors.com',
        phone: '+91 98201 23456',
        gstin: '27AAACT1234A1Z5',
        address: {
          street: 'Pune-Nashik Highway, Chakan Industrial Area',
          city: 'Pune',
          state: 'Maharashtra',
          pincode: '410501',
          country: 'India'
        }
      },
      createdBy: demoUser._id
    });

    const inv1 = await Invoice.create({
      company: companyId,
      invoiceNumber: 'INV-2026-0001',
      invoiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      operation: opDel1._id,
      sourceWarehouse: whMumbai._id,
      customer: opDel1.customer,
      items: [{
        product: pBrakeAssembly._id,
        name: pBrakeAssembly.name,
        sku: pBrakeAssembly.sku,
        quantity: 20,
        unitPrice: 3200,
        taxRate: 18,
        taxAmount: cgst1 + sgst1,
        discount: 0,
        lineTotal: subtotal1
      }],
      subtotal: subtotal1,
      taxBreakdown: { cgst: cgst1, sgst: sgst1, igst: 0, totalTax: cgst1 + sgst1 },
      isInterState: false,
      shippingCharge: 0,
      totalAmount: total1,
      paidAmount: total1,
      status: 'PAID',
      paymentMethod: 'BANK_TRANSFER',
      paymentReference: 'NEFT-HDFC-99201481',
      paymentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      payments: [{
        receiptNumber: 'RCP-2026-0001',
        amount: total1,
        paymentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        paymentMethod: 'BANK_TRANSFER',
        transactionReference: 'NEFT-HDFC-99201481',
        bankName: 'HDFC Bank Ltd',
        status: 'SUCCESS'
      }],
      createdBy: demoUser._id,
      owner: demoUser._id
    });
    opDel1.invoice = inv1._id;
    await opDel1.save();

    // 6. Completed Delivery 2: Sun Pharma Laboratories Ltd (PARTIALLY_PAID via UPI)
    const subtotal2 = 15 * 1850; // 27,750
    const cgst2 = Math.round(subtotal2 * 0.09 * 100) / 100; // 2,497.50
    const sgst2 = Math.round(subtotal2 * 0.09 * 100) / 100; // 2,497.50
    const total2 = subtotal2 + cgst2 + sgst2; // 32,745
    const partialPaid2 = 20000;

    const opDel2 = await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'DELIVERY',
      sourceWarehouse: whMumbai._id,
      items: [{ product: pParacetamolAPI._id, quantity: 15, unitPrice: 1850 }],
      status: 'VALIDATED',
      approvalStatus: 'NOT_REQUIRED',
      customer: {
        companyName: 'Sun Pharma Laboratories Ltd',
        name: 'Sun Pharma Laboratories Ltd',
        contactName: 'Dr. Alok Verma',
        email: 'procurement@sunpharma.com',
        phone: '+91 98202 34567',
        gstin: '27AAACS1420A1ZP',
        address: {
          street: 'Sun House, Western Express Highway, Goregaon East',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400063',
          country: 'India'
        }
      },
      createdBy: demoUser._id
    });

    const inv2 = await Invoice.create({
      company: companyId,
      invoiceNumber: 'INV-2026-0002',
      invoiceDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000),
      operation: opDel2._id,
      sourceWarehouse: whMumbai._id,
      customer: opDel2.customer,
      items: [{
        product: pParacetamolAPI._id,
        name: pParacetamolAPI.name,
        sku: pParacetamolAPI.sku,
        quantity: 15,
        unitPrice: 1850,
        taxRate: 18,
        taxAmount: cgst2 + sgst2,
        discount: 0,
        lineTotal: subtotal2
      }],
      subtotal: subtotal2,
      taxBreakdown: { cgst: cgst2, sgst: sgst2, igst: 0, totalTax: cgst2 + sgst2 },
      isInterState: false,
      shippingCharge: 0,
      totalAmount: total2,
      paidAmount: partialPaid2,
      status: 'PARTIALLY_PAID',
      paymentMethod: 'UPI',
      paymentReference: 'UPI-ICICI-881920',
      paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      payments: [{
        receiptNumber: 'RCP-2026-0002',
        amount: partialPaid2,
        paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        paymentMethod: 'UPI',
        transactionReference: 'UPI-ICICI-881920',
        payerDetails: 'sunpharma.finance@icici',
        status: 'SUCCESS'
      }],
      createdBy: demoUser._id,
      owner: demoUser._id
    });
    opDel2.invoice = inv2._id;
    await opDel2.save();

    // 7. Completed Delivery 3: Infosys BPM Ltd (SENT, Inter-State IGST 18%)
    const subtotal3 = 5 * 24500; // 122,500
    const igst3 = Math.round(subtotal3 * 0.18 * 100) / 100; // 22,050
    const total3 = subtotal3 + igst3; // 144,550

    const opDel3 = await Operation.create({
      company: companyId,
      owner: demoUser._id,
      type: 'DELIVERY',
      sourceWarehouse: whMumbai._id,
      items: [{ product: pSolarInverter._id, quantity: 5, unitPrice: 24500 }],
      status: 'VALIDATED',
      approvalStatus: 'NOT_REQUIRED',
      customer: {
        companyName: 'Infosys BPM Ltd',
        name: 'Infosys BPM Ltd',
        contactName: 'Ananya Deshmukh',
        email: 'facilities.blr@infosys.com',
        phone: '+91 80 2852 0261',
        gstin: '29AABCI1234F1Z9',
        address: {
          street: 'Plot 44, Electronic City, Hosur Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560100',
          country: 'India'
        }
      },
      createdBy: demoUser._id
    });

    const inv3 = await Invoice.create({
      company: companyId,
      invoiceNumber: 'INV-2026-0003',
      invoiceDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      operation: opDel3._id,
      sourceWarehouse: whMumbai._id,
      customer: opDel3.customer,
      items: [{
        product: pSolarInverter._id,
        name: pSolarInverter.name,
        sku: pSolarInverter.sku,
        quantity: 5,
        unitPrice: 24500,
        taxRate: 18,
        taxAmount: igst3,
        discount: 0,
        lineTotal: subtotal3
      }],
      subtotal: subtotal3,
      taxBreakdown: { cgst: 0, sgst: 0, igst: igst3, totalTax: igst3 },
      isInterState: true,
      shippingCharge: 0,
      totalAmount: total3,
      paidAmount: 0,
      status: 'SENT',
      createdBy: demoUser._id,
      owner: demoUser._id
    });
    opDel3.invoice = inv3._id;
    await opDel3.save();

    // -------------------------------------------------------------
    // PHYSICAL STOCK AUDITS (Testing Variance & Recount Flows)
    // -------------------------------------------------------------
    // Audit 1: PENDING_REVIEW with discrepancy in Mumbai Bhiwandi Hub
    await Audit.create({
      company: companyId,
      warehouse: whMumbai._id,
      status: 'PENDING_REVIEW',
      items: [{
        owner: demoUser._id,
        product: pBattery._id,
        countedQuantity: 16,
        systemQuantitySnapshot: 18,
        variance: -2,
        reason: 'Damage',
        explanation: 'Pallet drop during forklift staging; casing dented and moved to quarantine bay'
      }],
      countedBy: workerUser._id,
      submittedAt: new Date(Date.now() - 3 * 60 * 60 * 1000)
    });

    // Audit 2: RECOUNT_REQUIRED in Delhi Hub
    await Audit.create({
      company: companyId,
      warehouse: whDelhi._id,
      status: 'RECOUNT_REQUIRED',
      items: [{
        owner: demoUser._id,
        product: pBrakeAssembly._id,
        countedQuantity: 155,
        systemQuantitySnapshot: 150,
        variance: 5,
        reason: 'Unrecorded Receipt',
        explanation: 'Counter uncovered 5 unboxed assemblies in overflow bay 4'
      }],
      countedBy: demoUser._id,
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    // Audit 3: APPROVED and Reconciled in Bengaluru Facility
    await Audit.create({
      company: companyId,
      warehouse: whBengaluru._id,
      status: 'APPROVED',
      items: [{
        owner: demoUser._id,
        product: pSolarInverter._id,
        countedQuantity: 44,
        systemQuantitySnapshot: 45,
        variance: -1,
        reason: 'Damage',
        explanation: 'Front display panel cracked during quality inspection'
      }],
      countedBy: demoUser._id,
      reviewedBy: demoUser._id,
      submittedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      approvedAt: new Date(Date.now() - 40 * 60 * 60 * 1000)
    });
  });

  console.log('\n[7/7] Verifying seeded records in database...');
  const counts = {
    users: await User.countDocuments(),
    companies: await Company.countDocuments(),
    memberships: await Membership.countDocuments(),
    warehouses: await Warehouse.countDocuments(),
    products: await Product.countDocuments(),
    stocks: await Stock.countDocuments(),
    ledgers: await StockLedger.countDocuments(),
    layers: await StockLayer.countDocuments(),
    operations: await Operation.countDocuments(),
    invoices: await Invoice.countDocuments(),
    audits: await Audit.countDocuments(),
    reservations: await Reservation.countDocuments()
  };

  console.log('\n================================================================');
  console.log('  StockSense India Enterprise Logistics Demo Data Seeded!');
  console.log('================================================================');
  console.log(`Company        : ${company.name} [Code: ${company.code}]`);
  console.log(`Currency       : INR (₹)`);
  console.log(`Company Admin  : demo@stocksense.com / Password123! (Full Privileges)`);
  if (devUser) {
    console.log(`Company Admin  : ${devUser.email} / Password123! (Full Privileges)`);
  }
  console.log(`Manager        : manager@stocksense.com / Password123! (Logistics & Approvals)`);
  console.log(`Restricted Ops : worker@stocksense.com / Password123! (Scoped to Mumbai BOM-01)`);
  console.log(`Pending Invite : lead.logistics@stocksense.in [Token: ${sampleToken}]`);
  console.log('\nDatabase Record Summary:');
  console.log(counts);
  console.log('================================================================\n');

  process.exit(0);
};

seedDemoData().catch(err => {
  console.error('Seed Error:', err);
  process.exit(1);
});
