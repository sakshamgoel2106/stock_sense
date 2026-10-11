const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Operation = require('../models/Operation');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Company = require('../models/Company');
const { validateOperation } = require('../services/inventory.service');

/**
 * Generate next sequential invoice number for the company
 * Format: INV-YYYY-0001
 */
const generateInvoiceNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastInvoice = await Invoice.findOne({
    company: companyId,
    invoiceNumber: { $regex: `^${prefix}` }
  }).sort({ createdAt: -1 });

  let sequence = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      sequence = lastSeq + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(4, '0')}`;
};

/**
 * Calculate line items, taxes and totals
 */
const calculateInvoiceTotals = (items, isInterState = false, shippingCharge = 0, discountTotal = 0) => {
  let subtotal = 0;
  let totalTax = 0;
  const processedItems = [];

  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const price = Number(item.unitPrice) || 0;
    const rate = Number(item.taxRate ?? 18);
    const disc = Number(item.discount) || 0;

    const baseAmount = qty * price;
    const discountAmount = disc > 0 ? (disc <= 100 ? (baseAmount * disc) / 100 : disc) : 0;
    const taxableAmount = Math.max(0, baseAmount - discountAmount);
    const tax = (taxableAmount * rate) / 100;
    const lineTotal = taxableAmount + tax;

    subtotal += taxableAmount;
    totalTax += tax;

    processedItems.push({
      product: item.product,
      name: item.name || 'Product',
      sku: item.sku || '',
      quantity: qty,
      unitPrice: price,
      taxRate: rate,
      taxAmount: Math.round(tax * 100) / 100,
      discount: disc,
      lineTotal: Math.round(lineTotal * 100) / 100
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  totalTax = Math.round(totalTax * 100) / 100;
  const shipping = Number(shippingCharge) || 0;
  const extraDiscount = Number(discountTotal) || 0;
  const totalAmount = Math.round((subtotal + totalTax + shipping - extraDiscount) * 100) / 100;

  const taxBreakdown = {
    totalTax,
    cgst: isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100,
    sgst: isInterState ? 0 : Math.round((totalTax / 2) * 100) / 100,
    igst: isInterState ? totalTax : 0
  };

  return { processedItems, subtotal, totalTax, taxBreakdown, totalAmount };
};

// @desc    Get all invoices with filters
// @route   GET /api/v1/invoices
// @access  Private
const getInvoices = asyncHandler(async (req, res) => {
  const companyId = req.company ? req.company._id : null;
  const { status, search, warehouse, startDate, endDate } = req.query;

  const query = {};
  if (companyId) query.company = companyId;

  if (status && status !== 'ALL') {
    query.status = status;
  }

  if (warehouse) {
    query.sourceWarehouse = warehouse;
  }

  if (startDate || endDate) {
    query.invoiceDate = {};
    if (startDate) query.invoiceDate.$gte = new Date(startDate);
    if (endDate) query.invoiceDate.$lte = new Date(endDate);
  }

  if (search) {
    query.$or = [
      { invoiceNumber: { $regex: search, $options: 'i' } },
      { 'customer.name': { $regex: search, $options: 'i' } },
      { 'customer.phone': { $regex: search, $options: 'i' } },
      { 'customer.gstin': { $regex: search, $options: 'i' } }
    ];
  }

  const invoices = await Invoice.find(query)
    .populate('sourceWarehouse', 'name code location')
    .populate('operation', 'type status validatedAt')
    .populate('createdBy', 'name email')
    .sort({ invoiceDate: -1, createdAt: -1 });

  res.json(invoices);
});

// @desc    Get invoice summary metrics & KPI stats
// @route   GET /api/v1/invoices/stats
// @access  Private
const getInvoiceStats = asyncHandler(async (req, res) => {
  const companyId = req.company ? req.company._id : null;
  const query = companyId ? { company: companyId } : {};

  const invoices = await Invoice.find(query).select('status totalAmount paidAmount dueDate');

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  const now = new Date();

  for (const inv of invoices) {
    totalBilled += inv.totalAmount || 0;
    
    if (inv.status === 'PAID') {
      totalPaid += inv.totalAmount || 0;
      paidCount++;
    } else if (inv.status === 'CANCELLED') {
      // Ignored from active outstanding
    } else {
      const paid = inv.paidAmount || 0;
      totalPaid += paid;
      totalOutstanding += Math.max(0, (inv.totalAmount || 0) - paid);
      pendingCount++;

      if (inv.dueDate && new Date(inv.dueDate) < now) {
        overdueCount++;
      }
    }
  }

  res.json({
    totalBilled: Math.round(totalBilled),
    totalPaid: Math.round(totalPaid),
    totalOutstanding: Math.round(totalOutstanding),
    totalInvoices: invoices.length,
    paidCount,
    pendingCount,
    overdueCount
  });
});

// @desc    Get invoice by ID
// @route   GET /api/v1/invoices/:id
// @access  Private
const getInvoiceById = asyncHandler(async (req, res) => {
  const companyId = req.company ? req.company._id : null;
  const query = { _id: req.params.id };
  if (companyId) query.company = companyId;

  const invoice = await Invoice.findOne(query)
    .populate('company', 'name code gstin address city state pincode phone email')
    .populate('sourceWarehouse', 'name code location')
    .populate('items.product', 'name sku prices unitOfMeasure')
    .populate('operation', 'type status validatedAt items')
    .populate('createdBy', 'name email');

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  res.json(invoice);
});

// @desc    Create a new customer invoice (optionally auto-dispatching delivery)
// @route   POST /api/v1/invoices
// @access  Private
const createInvoice = asyncHandler(async (req, res) => {
  const {
    customer,
    items,
    sourceWarehouse,
    isInterState,
    shippingCharge,
    discountTotal,
    dueDate,
    status,
    paymentMethod,
    paymentReference,
    notes,
    terms,
    deductStock
  } = req.body;

  if (!customer || !customer.name?.trim()) {
    res.status(400);
    throw new Error('Customer name is required for billing');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400);
    throw new Error('At least one item is required on the bill');
  }

  const companyId = req.company ? req.company._id : null;
  const userId = req.user ? req.user._id : null;

  // Enrich items with product details if not already passed
  const productIds = items.map(i => i.product);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  const enrichedItems = items.map(i => {
    const prod = productMap.get(i.product?.toString());
    const unitPrice = Number(i.unitPrice) || prod?.prices?.[0]?.amount || 0;
    return {
      product: i.product,
      name: i.name || prod?.name || 'Product Item',
      sku: i.sku || prod?.sku || '',
      quantity: Number(i.quantity) || 1,
      unitPrice,
      taxRate: Number(i.taxRate ?? 18),
      discount: Number(i.discount) || 0
    };
  });

  const { processedItems, subtotal, taxBreakdown, totalAmount } = calculateInvoiceTotals(
    enrichedItems,
    isInterState,
    shippingCharge,
    discountTotal
  );

  const invoiceNumber = await generateInvoiceNumber(companyId);

  const invoice = new Invoice({
    company: companyId,
    invoiceNumber,
    invoiceDate: new Date(),
    dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Default 15 days
    sourceWarehouse: sourceWarehouse || null,
    customer: {
      name: customer.name.trim(),
      email: customer.email?.trim() || '',
      phone: customer.phone?.trim() || '',
      gstin: customer.gstin?.trim()?.toUpperCase() || '',
      address: {
        street: customer.address?.street || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        pincode: customer.address?.pincode || '',
        country: customer.address?.country || 'India'
      }
    },
    items: processedItems,
    subtotal,
    taxBreakdown,
    isInterState: Boolean(isInterState),
    shippingCharge: Number(shippingCharge) || 0,
    discountTotal: Number(discountTotal) || 0,
    totalAmount,
    currency: 'INR',
    status: status || 'DRAFT',
    paidAmount: status === 'PAID' ? totalAmount : 0,
    paymentMethod: paymentMethod || 'PENDING',
    paymentReference: paymentReference || '',
    paymentDate: status === 'PAID' ? new Date() : null,
    notes: notes || 'Thank you for choosing us for your fulfillment needs.',
    terms: terms || 'Payment due within 15 days of invoice date.',
    createdBy: userId,
    owner: userId
  });

  // Optional: Auto-create Delivery Operation and decrement stock immediately
  if (deductStock && sourceWarehouse) {
    try {
      const deliveryOperation = new Operation({
        company: companyId,
        owner: userId,
        createdBy: userId,
        type: 'DELIVERY',
        sourceWarehouse,
        status: 'DRAFT',
        approvalStatus: 'NOT_REQUIRED',
        customer: {
          name: customer.name.trim(),
          phone: customer.phone?.trim() || '',
          email: customer.email?.trim() || '',
          address: `${customer.address?.street || ''}, ${customer.address?.city || ''}`
        },
        items: processedItems.map(item => ({
          product: item.product,
          quantity: item.quantity,
          unitCost: item.unitPrice
        }))
      });

      const savedOp = await deliveryOperation.save();
      
      // Auto-validate delivery operation to update physical stock levels
      const validatedOp = await validateOperation(savedOp._id, userId);
      
      invoice.operation = validatedOp._id;
      savedOp.invoice = invoice._id;
      await savedOp.save();
    } catch (stockErr) {
      // If stock is insufficient, report clear message
      res.status(400);
      throw new Error(`Stock Deduction Failed: ${stockErr.message}`);
    }
  }

  const savedInvoice = await invoice.save();
  res.status(201).json(savedInvoice);
});

// @desc    Generate customer bill directly from a DELIVERY operation
// @route   POST /api/v1/invoices/from-delivery/:operationId
// @access  Private
const createInvoiceFromDelivery = asyncHandler(async (req, res) => {
  const { operationId } = req.params;
  const companyId = req.company ? req.company._id : null;
  const userId = req.user ? req.user._id : null;

  const operation = await Operation.findById(operationId)
    .populate('items.product', 'name sku prices')
    .populate('sourceWarehouse', 'name code');

  if (!operation) {
    res.status(404);
    throw new Error('Operation not found');
  }

  // CRITICAL VALIDATION: Transfers are internal movements and cannot be billed
  if (operation.type !== 'DELIVERY') {
    res.status(400);
    throw new Error(
      `Billing is strictly for customer deliveries. Internal movements of type "${operation.type}" cannot be billed to users.`
    );
  }

  // Check if invoice already exists for this operation
  const existingInvoice = await Invoice.findOne({ operation: operation._id });
  if (existingInvoice) {
    return res.json({
      message: 'Invoice already exists for this delivery',
      invoice: existingInvoice
    });
  }

  // Build items from delivery operation
  const enrichedItems = operation.items.map(i => {
    const prod = i.product;
    const unitPrice = prod?.prices?.[0]?.amount || i.unitCost || 0;
    return {
      product: prod?._id || i.product,
      name: prod?.name || 'Delivered Product',
      sku: prod?.sku || '',
      quantity: i.quantity,
      unitPrice,
      taxRate: 18,
      discount: 0
    };
  });

  const { processedItems, subtotal, taxBreakdown, totalAmount } = calculateInvoiceTotals(enrichedItems, false, 0, 0);

  const invoiceNumber = await generateInvoiceNumber(companyId);

  const customerName = req.body?.customer?.name || operation.customer?.name || 'Customer / Consignee';
  const customerPhone = req.body?.customer?.phone || operation.customer?.phone || '';
  const customerEmail = req.body?.customer?.email || operation.customer?.email || '';
  const customerAddress = req.body?.customer?.address || operation.customer?.address || '';

  const invoice = new Invoice({
    company: companyId,
    invoiceNumber,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    operation: operation._id,
    sourceWarehouse: operation.sourceWarehouse?._id || operation.sourceWarehouse,
    customer: {
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      gstin: req.body?.customer?.gstin || '',
      address: typeof customerAddress === 'string' ? { street: customerAddress, country: 'India' } : customerAddress
    },
    items: processedItems,
    subtotal,
    taxBreakdown,
    isInterState: false,
    shippingCharge: 0,
    totalAmount,
    currency: 'INR',
    status: 'SENT',
    paymentMethod: 'PENDING',
    createdBy: userId,
    owner: userId
  });

  const savedInvoice = await invoice.save();

  // Link invoice back to delivery operation
  operation.invoice = savedInvoice._id;
  await operation.save();

  res.status(201).json(savedInvoice);
});

// @desc    Record payment for an invoice
// @route   POST /api/v1/invoices/:id/payment
// @access  Private
const recordPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, paymentReference, paymentDate, notes } = req.body;
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  const paymentVal = Number(amount) || invoice.totalAmount;
  const newPaidAmount = (invoice.paidAmount || 0) + paymentVal;

  invoice.paidAmount = Math.min(invoice.totalAmount, newPaidAmount);
  invoice.paymentMethod = paymentMethod || invoice.paymentMethod || 'UPI';
  invoice.paymentReference = paymentReference || invoice.paymentReference || '';
  invoice.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
  
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'PAID';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'PARTIALLY_PAID';
  }

  if (notes) {
    invoice.notes = `${invoice.notes}\nPayment recorded: ₹${paymentVal} via ${invoice.paymentMethod}`;
  }

  const updatedInvoice = await invoice.save();
  res.json(updatedInvoice);
});

// @desc    Update invoice status (e.g. CANCELLED, DRAFT, SENT)
// @route   PUT /api/v1/invoices/:id/status
// @access  Private
const updateInvoiceStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  invoice.status = status;
  if (status === 'PAID') {
    invoice.paidAmount = invoice.totalAmount;
    invoice.paymentDate = new Date();
  }

  const updated = await invoice.save();
  res.json(updated);
});

module.exports = {
  getInvoices,
  getInvoiceStats,
  getInvoiceById,
  createInvoice,
  createInvoiceFromDelivery,
  recordPayment,
  updateInvoiceStatus
};
