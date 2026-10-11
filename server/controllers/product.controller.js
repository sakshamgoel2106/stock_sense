const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const Stock = require('../models/Stock');
const StockLedger = require('../models/StockLedger');

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, status } = req.query;
  const filter = {};

  if (req.company) {
    filter.company = req.company._id;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } }
    ];
  }
  if (category) filter.category = category;
  if (status) filter.status = status;

  const products = await Product.find(filter).sort({ createdAt: -1 });
  res.json(products);
});

// @desc    Create a product
// @route   POST /api/v1/products
// @access  Private
const createProduct = asyncHandler(async (req, res) => {
  const { 
    name, sku, description, category, prices, costPrice,
    leadTimeDays, safetyStockDays, minOrderQuantity,
    unitOfMeasure, reorderLevel, status 
  } = req.body;

  const skuQuery = { sku };
  if (req.company) skuQuery.company = req.company._id;

  const productExists = await Product.findOne(skuQuery);
  if (productExists) {
    res.status(400);
    throw new Error('Product with this SKU already exists');
  }

  const product = await Product.create({
    name, sku, description, category, prices, 
    costPrice: costPrice !== undefined ? costPrice : (prices?.[0]?.amount || 0),
    leadTimeDays: leadTimeDays || 4,
    safetyStockDays: safetyStockDays || 3,
    minOrderQuantity: minOrderQuantity || 1,
    unitOfMeasure, reorderLevel, status,
    company: req.company?._id,
    owner: req.user._id
  });

  res.status(201).json(product);
});

// @desc    Get product by ID
// @route   GET /api/v1/products/:id
// @access  Private
const getProductById = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const product = await Product.findOne(query);
  if (product) {
    res.json(product);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Update a product
// @route   PUT /api/v1/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
  const { 
    name, sku, description, category, prices, costPrice,
    leadTimeDays, safetyStockDays, minOrderQuantity,
    unitOfMeasure, reorderLevel, status 
  } = req.body;

  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const product = await Product.findOne(query);

  if (product) {
    if (sku && sku !== product.sku) {
      const skuQuery = { sku };
      if (req.company) skuQuery.company = req.company._id;
      const productExists = await Product.findOne(skuQuery);
      if (productExists) {
        res.status(400);
        throw new Error('Product with this SKU already exists');
      }
    }

    product.name = name || product.name;
    product.sku = sku || product.sku;
    product.description = description !== undefined ? description : product.description;
    product.category = category !== undefined ? category : product.category;
    product.prices = prices !== undefined ? prices : product.prices;
    if (costPrice !== undefined) product.costPrice = costPrice;
    if (leadTimeDays !== undefined) product.leadTimeDays = leadTimeDays;
    if (safetyStockDays !== undefined) product.safetyStockDays = safetyStockDays;
    if (minOrderQuantity !== undefined) product.minOrderQuantity = minOrderQuantity;
    product.unitOfMeasure = unitOfMeasure !== undefined ? unitOfMeasure : product.unitOfMeasure;
    product.reorderLevel = reorderLevel !== undefined ? reorderLevel : product.reorderLevel;
    product.status = status || product.status;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404);
    throw new Error('Product not found');
  }
});

// @desc    Delete a product
// @route   DELETE /api/v1/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
  const query = { _id: req.params.id };
  if (req.company) query.company = req.company._id;

  const product = await Product.findOne(query);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  // Check if product is in use in Stock or Ledger
  const stockExists = await Stock.findOne({ product: product._id, quantity: { $gt: 0 } });
  if (stockExists) {
    res.status(400);
    throw new Error('Cannot delete product with existing stock in a warehouse. Archive it instead.');
  }

  const ledgerExists = await StockLedger.findOne({ product: product._id });
  if (ledgerExists) {
    res.status(400);
    throw new Error('Cannot delete product with operation history. Archive it instead.');
  }

  await product.deleteOne();
  res.json({ message: 'Product removed' });
});

// @desc    Bulk create products from Excel / CSV / JSON
// @route   POST /api/v1/products/bulk
// @access  Private (COMPANY_ADMIN, ADMIN, MANAGER)
const createProductsBulk = asyncHandler(async (req, res) => {
  const products = req.body.products || req.body.items || req.body.data;

  if (!products || !Array.isArray(products) || products.length === 0) {
    res.status(400);
    throw new Error('Please provide an array of products to import');
  }

  const companyId = req.company ? req.company._id : null;
  const ownerId = req.user ? req.user._id : null;

  // Fetch existing SKUs for duplicate detection
  const skuQuery = {};
  if (companyId) skuQuery.company = companyId;
  const existingProducts = await Product.find(skuQuery).select('sku');
  const existingSkuSet = new Set(existingProducts.map(p => p.sku.toLowerCase().trim()));

  const created = [];
  const errors = [];
  const seenBatchSkus = new Set();

  for (let idx = 0; idx < products.length; idx++) {
    const p = products[idx];
    const rowNum = idx + 1;

    const name = p.name ? String(p.name).trim() : '';
    const sku = p.sku ? String(p.sku).trim() : '';

    if (!name) {
      errors.push({ row: rowNum, sku, error: 'Product name is required' });
      continue;
    }
    if (!sku) {
      errors.push({ row: rowNum, sku, error: 'Product SKU is required' });
      continue;
    }

    const skuLower = sku.toLowerCase();
    if (existingSkuSet.has(skuLower)) {
      errors.push({ row: rowNum, sku, error: `SKU "${sku}" already exists in company catalog` });
      continue;
    }
    if (seenBatchSkus.has(skuLower)) {
      errors.push({ row: rowNum, sku, error: `Duplicate SKU "${sku}" found multiple times in this batch` });
      continue;
    }
    seenBatchSkus.add(skuLower);

    try {
      const currency = p.currency || (req.company?.settings?.currency || 'INR');
      const amount = Number(p.price !== undefined ? p.price : (p.amount !== undefined ? p.amount : (p.prices?.[0]?.amount || 0)));
      const costPrice = Number(p.costPrice !== undefined ? p.costPrice : (amount * 0.7));
      const leadTimeDays = Number(p.leadTimeDays || 4);
      const safetyStockDays = Number(p.safetyStockDays || 3);
      const minOrderQuantity = Number(p.minOrderQuantity || 1);
      const reorderLevel = Number(p.reorderLevel || 0);

      const newProduct = await Product.create({
        name,
        sku,
        description: p.description || '',
        category: p.category || 'General',
        prices: [{ currency, amount: isNaN(amount) ? 0 : amount }],
        costPrice: isNaN(costPrice) ? 0 : costPrice,
        leadTimeDays: isNaN(leadTimeDays) ? 4 : leadTimeDays,
        safetyStockDays: isNaN(safetyStockDays) ? 3 : safetyStockDays,
        minOrderQuantity: isNaN(minOrderQuantity) ? 1 : minOrderQuantity,
        unitOfMeasure: p.unitOfMeasure || 'Units',
        reorderLevel: isNaN(reorderLevel) ? 0 : reorderLevel,
        status: p.status === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE',
        company: companyId,
        owner: ownerId
      });

      existingSkuSet.add(skuLower);
      created.push(newProduct);
    } catch (err) {
      errors.push({ row: rowNum, sku, error: err.message });
    }
  }

  res.status(201).json({
    message: `Successfully imported ${created.length} product(s)${errors.length ? ` (${errors.length} skipped or failed)` : ''}`,
    total: products.length,
    successCount: created.length,
    failedCount: errors.length,
    created,
    errors
  });
});

module.exports = {
  getProducts,
  createProduct,
  createProductsBulk,
  getProductById,
  updateProduct,
  deleteProduct
};
