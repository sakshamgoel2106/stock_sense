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
 * Generate next sequential payment receipt number for the company
 * Format: RCT-YYYY-0001
 */
const generateReceiptNumber = async (companyId) => {
  const year = new Date().getFullYear();
  const prefix = `RCT-${year}-`;

  // Find all invoices with payments for this company
  const invoicesWithPayments = await Invoice.find({
    company: companyId,
    'payments.receiptNumber': { $regex: `^${prefix}` }
  }).select('payments.receiptNumber');

  let maxSeq = 0;
  for (const inv of invoicesWithPayments) {
    for (const p of inv.payments || []) {
      if (p.receiptNumber && p.receiptNumber.startsWith(prefix)) {
        const parts = p.receiptNumber.split('-');
        const seq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
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
    .populate('payments.recordedBy', 'name email')
    .sort({ invoiceDate: -1, createdAt: -1 });

  res.json(invoices);
});

// @desc    Get all payment records across all invoices
// @route   GET /api/v1/invoices/payments/all
// @access  Private
const getAllPayments = asyncHandler(async (req, res) => {
  const companyId = req.company ? req.company._id : null;
  const { search, paymentMethod, startDate, endDate } = req.query;

  const query = { 'payments.0': { $exists: true } };
  if (companyId) query.company = companyId;

  const invoices = await Invoice.find(query)
    .populate('sourceWarehouse', 'name code')
    .populate('payments.recordedBy', 'name email')
    .select('invoiceNumber invoiceDate customer totalAmount paidAmount status payments sourceWarehouse');

  const allPayments = [];

  for (const inv of invoices) {
    for (const p of inv.payments || []) {
      let matches = true;

      if (paymentMethod && paymentMethod !== 'ALL' && p.paymentMethod !== paymentMethod) {
        matches = false;
      }

      if (startDate && new Date(p.paymentDate) < new Date(startDate)) {
        matches = false;
      }

      if (endDate && new Date(p.paymentDate) > new Date(endDate)) {
        matches = false;
      }

      if (search) {
        const s = search.toLowerCase();
        const inReceipt = p.receiptNumber?.toLowerCase().includes(s);
        const inRef = p.transactionReference?.toLowerCase().includes(s);
        const inBank = p.bankName?.toLowerCase().includes(s);
        const inCust = inv.customer?.name?.toLowerCase().includes(s);
        const inInv = inv.invoiceNumber?.toLowerCase().includes(s);
        if (!inReceipt && !inRef && !inBank && !inCust && !inInv) {
          matches = false;
        }
      }

      if (matches) {
        allPayments.push({
          _id: p._id,
          receiptNumber: p.receiptNumber,
          invoiceId: inv._id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customer?.name || 'Customer',
          customerGstin: inv.customer?.gstin || '',
          warehouseName: inv.sourceWarehouse?.name || '',
          amount: p.amount,
          paymentDate: p.paymentDate,
          paymentMethod: p.paymentMethod,
          transactionReference: p.transactionReference || '',
          bankName: p.bankName || '',
          payerDetails: p.payerDetails || '',
          notes: p.notes || '',
          status: p.status || 'SUCCESS',
          recordedBy: p.recordedBy ? { name: p.recordedBy.name, email: p.recordedBy.email } : null,
          invoiceTotalAmount: inv.totalAmount,
          invoiceStatus: inv.status
        });
      }
    }
  }

  // Sort newest payment date first
  allPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

  res.json(allPayments);
});

// @desc    Get invoice summary metrics & KPI stats
// @route   GET /api/v1/invoices/stats
// @access  Private
const getInvoiceStats = asyncHandler(async (req, res) => {
  const companyId = req.company ? req.company._id : null;
  const query = companyId ? { company: companyId } : {};

  const invoices = await Invoice.find(query).select('status totalAmount paidAmount dueDate payments');

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let totalPaymentTransactions = 0;
  const now = new Date();

  for (const inv of invoices) {
    totalBilled += inv.totalAmount || 0;
    totalPaymentTransactions += (inv.payments?.length || 0);
    
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
    totalPaymentTransactions,
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
    .populate('createdBy', 'name email')
    .populate('payments.recordedBy', 'name email');

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
    bankName,
    payerDetails,
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

  // If initial status is PAID, generate first payment receipt
  const initialPayments = [];
  if (status === 'PAID') {
    const receiptNumber = await generateReceiptNumber(companyId);
    initialPayments.push({
      receiptNumber,
      amount: totalAmount,
      paymentDate: new Date(),
      paymentMethod: paymentMethod || 'UPI',
      transactionReference: paymentReference || '',
      bankName: bankName || '',
      payerDetails: payerDetails || '',
      notes: 'Initial settlement on invoice creation',
      recordedBy: userId,
      status: 'SUCCESS'
    });
  }

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
    payments: initialPayments,
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
      res.status(400);
      throw new Error(`Stock Deduction Failed: ${stockErr.message}`);
    }
  }

  const savedInvoice = await invoice.save();
  const populatedInvoice = await Invoice.findById(savedInvoice._id)
    .populate('company', 'name code gstin address city state pincode phone email')
    .populate('sourceWarehouse', 'name code location')
    .populate('items.product', 'name sku prices unitOfMeasure');
  res.status(201).json(populatedInvoice);
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

  // Auto-dispatch and deliver goods if operation is in DRAFT (default: true)
  if (operation.status === 'DRAFT' && req.body.dispatchGoods !== false) {
    try {
      const userRole = req.membership ? req.membership.role : (req.user ? req.user.role : null);
      await validateOperation(operation._id, userId, userRole);
      const reloaded = await Operation.findById(operationId)
        .populate('items.product', 'name sku prices')
        .populate('sourceWarehouse', 'name code');
      if (reloaded) {
        operation.status = reloaded.status;
        operation.validatedAt = reloaded.validatedAt;
      }
    } catch (dispatchErr) {
      res.status(400);
      throw new Error(`Delivery Dispatch Failed: ${dispatchErr.message}`);
    }
  }

  // Check if invoice already exists for this operation
  const existingInvoice = await Invoice.findOne({ operation: operation._id })
    .populate('company', 'name code gstin address city state pincode phone email')
    .populate('sourceWarehouse', 'name code location')
    .populate('items.product', 'name sku prices unitOfMeasure');
  if (existingInvoice) {
    return res.json(existingInvoice);
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

  const isInterState = Boolean(req.body?.isInterState);
  const { processedItems, subtotal, taxBreakdown, totalAmount } = calculateInvoiceTotals(enrichedItems, isInterState, 0, 0);

  const invoiceNumber = await generateInvoiceNumber(companyId);

  // Recipient Company & Contact Details
  const reqCust = req.body?.customer || {};
  const opCust = operation.customer || {};

  const companyName = (reqCust.companyName || reqCust.name || opCust.companyName || opCust.name || '').trim();
  const contactName = (reqCust.contactName || reqCust.name || opCust.name || '').trim();
  const customerName = companyName || contactName || 'Client Company';
  const customerPhone = (reqCust.phone || opCust.phone || '').trim();
  const customerEmail = (reqCust.email || opCust.email || '').trim();
  const customerGstin = (reqCust.gstin || opCust.gstin || '').trim().toUpperCase();

  // Normalize address
  const rawAddr = reqCust.address || opCust.address || {};
  let addressObj = {
    street: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  };

  if (typeof rawAddr === 'string') {
    addressObj.street = rawAddr;
  } else if (typeof rawAddr === 'object') {
    addressObj.street = rawAddr.street || '';
    addressObj.city = rawAddr.city || '';
    addressObj.state = rawAddr.state || '';
    addressObj.pincode = rawAddr.pincode || '';
    addressObj.country = rawAddr.country || 'India';
  }

  const invoice = new Invoice({
    company: companyId,
    invoiceNumber,
    invoiceDate: new Date(),
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    operation: operation._id,
    sourceWarehouse: operation.sourceWarehouse?._id || operation.sourceWarehouse,
    customer: {
      name: customerName,
      companyName: companyName,
      phone: customerPhone,
      email: customerEmail,
      gstin: customerGstin,
      address: addressObj
    },
    items: processedItems,
    subtotal,
    taxBreakdown,
    isInterState,
    shippingCharge: 0,
    totalAmount,
    currency: 'INR',
    status: 'SENT',
    paymentMethod: 'PENDING',
    payments: [],
    createdBy: userId,
    owner: userId
  });

  const savedInvoice = await invoice.save();

  // Link invoice back to delivery operation and store recipient company details on operation
  operation.invoice = savedInvoice._id;
  if (companyName || customerGstin || addressObj.street) {
    operation.customer = {
      name: contactName || customerName,
      companyName,
      phone: customerPhone,
      email: customerEmail,
      gstin: customerGstin,
      address: addressObj
    };
  }
  await operation.save();

  const populatedInvoice = await Invoice.findById(savedInvoice._id)
    .populate('company', 'name code gstin address city state pincode phone email')
    .populate('sourceWarehouse', 'name code location')
    .populate('items.product', 'name sku prices unitOfMeasure')
    .populate('operation', 'type status validatedAt');

  res.status(201).json(populatedInvoice);
});

// @desc    Record payment for an invoice with complete payment receipt tracking
// @route   POST /api/v1/invoices/:id/payment
// @access  Private
const recordPayment = asyncHandler(async (req, res) => {
  const { 
    amount, 
    paymentMethod, 
    transactionReference, 
    bankName, 
    payerDetails, 
    paymentDate, 
    notes 
  } = req.body;

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  const paymentVal = Number(amount);
  if (isNaN(paymentVal) || paymentVal <= 0) {
    res.status(400);
    throw new Error('Valid payment amount greater than zero is required');
  }

  const companyId = req.company ? req.company._id : invoice.company;
  const receiptNumber = await generateReceiptNumber(companyId);

  const newPaymentRecord = {
    receiptNumber,
    amount: paymentVal,
    paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
    paymentMethod: paymentMethod || 'UPI',
    transactionReference: transactionReference || req.body.paymentReference || '',
    bankName: bankName || '',
    payerDetails: payerDetails || '',
    notes: notes || '',
    recordedBy: req.user ? req.user._id : null,
    status: 'SUCCESS'
  };

  invoice.payments.push(newPaymentRecord);

  // Recalculate total paid from all SUCCESS payment records
  const totalPaid = invoice.payments
    .filter(p => p.status === 'SUCCESS')
    .reduce((sum, p) => sum + p.amount, 0);

  invoice.paidAmount = Math.min(invoice.totalAmount, totalPaid);
  invoice.paymentMethod = paymentMethod || invoice.paymentMethod || 'UPI';
  invoice.paymentReference = newPaymentRecord.transactionReference || invoice.paymentReference;
  invoice.paymentDate = newPaymentRecord.paymentDate;
  
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'PAID';
  } else if (invoice.paidAmount > 0) {
    invoice.status = 'PARTIALLY_PAID';
  }

  if (notes) {
    invoice.notes = `${invoice.notes || ''}\n[Receipt ${receiptNumber}]: ₹${paymentVal} via ${invoice.paymentMethod}`.trim();
  }

  await invoice.save();

  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate('company', 'name code gstin address city state pincode phone email')
    .populate('sourceWarehouse', 'name code location')
    .populate('items.product', 'name sku prices unitOfMeasure')
    .populate('payments.recordedBy', 'name email');

  res.json({
    message: `Payment of ₹${paymentVal} recorded successfully`,
    receiptNumber,
    invoice: populatedInvoice
  });
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

// @desc    Update invoice details (company details, items, financial adjustments, terms)
// @route   PUT /api/v1/invoices/:id
// @access  Private
const updateInvoice = asyncHandler(async (req, res) => {
  const companyId = req.company ? req.company._id : null;
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  if (companyId && invoice.company.toString() !== companyId.toString()) {
    res.status(403);
    throw new Error('Not authorized to modify this invoice');
  }

  const {
    customer,
    items,
    dueDate,
    isInterState,
    shippingCharge,
    discountTotal,
    notes,
    terms,
    status
  } = req.body;

  // 1. Update customer & recipient company details
  if (customer) {
    const companyName = (customer.companyName || customer.name || invoice.customer?.companyName || invoice.customer?.name || '').trim();
    const contactName = (customer.contactName || customer.name || invoice.customer?.name || '').trim();

    invoice.customer.name = companyName || contactName || invoice.customer.name;
    invoice.customer.companyName = companyName || invoice.customer.companyName || '';
    if (customer.email !== undefined) invoice.customer.email = customer.email.trim();
    if (customer.phone !== undefined) invoice.customer.phone = customer.phone.trim();
    if (customer.gstin !== undefined) invoice.customer.gstin = customer.gstin.trim().toUpperCase();

    if (customer.address) {
      if (typeof customer.address === 'string') {
        invoice.customer.address.street = customer.address;
      } else if (typeof customer.address === 'object') {
        if (customer.address.street !== undefined) invoice.customer.address.street = customer.address.street;
        if (customer.address.city !== undefined) invoice.customer.address.city = customer.address.city;
        if (customer.address.state !== undefined) invoice.customer.address.state = customer.address.state;
        if (customer.address.pincode !== undefined) invoice.customer.address.pincode = customer.address.pincode;
        if (customer.address.country !== undefined) invoice.customer.address.country = customer.address.country;
      }
    }

    // Keep linked delivery operation in sync
    if (invoice.operation) {
      await Operation.findByIdAndUpdate(invoice.operation, {
        customer: {
          name: contactName || companyName,
          companyName,
          phone: invoice.customer.phone,
          email: invoice.customer.email,
          gstin: invoice.customer.gstin,
          address: invoice.customer.address
        }
      });
    }
  }

  // 2. Metadata updates
  if (dueDate) invoice.dueDate = new Date(dueDate);
  if (notes !== undefined) invoice.notes = notes;
  if (terms !== undefined) invoice.terms = terms;
  if (isInterState !== undefined) invoice.isInterState = Boolean(isInterState);
  if (shippingCharge !== undefined) invoice.shippingCharge = Number(shippingCharge) || 0;
  if (discountTotal !== undefined) invoice.discountTotal = Number(discountTotal) || 0;

  // 3. Recalculate totals if line items or adjustments changed
  const itemsToProcess = items || invoice.items;
  if (items || isInterState !== undefined || shippingCharge !== undefined || discountTotal !== undefined) {
    const { processedItems, subtotal, taxBreakdown, totalAmount } = calculateInvoiceTotals(
      itemsToProcess,
      invoice.isInterState,
      invoice.shippingCharge,
      invoice.discountTotal
    );

    invoice.items = processedItems;
    invoice.subtotal = subtotal;
    invoice.taxBreakdown = taxBreakdown;
    invoice.totalAmount = totalAmount;

    if (invoice.paidAmount >= invoice.totalAmount) {
      invoice.status = 'PAID';
    } else if (invoice.paidAmount > 0) {
      invoice.status = 'PARTIALLY_PAID';
    } else if (status) {
      invoice.status = status;
    }
  } else if (status) {
    invoice.status = status;
  }

  await invoice.save();

  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate('company', 'name code gstin address city state pincode phone email')
    .populate('sourceWarehouse', 'name code location')
    .populate('items.product', 'name sku prices unitOfMeasure')
    .populate('payments.recordedBy', 'name email');

  res.json(populatedInvoice);
});

module.exports = {
  getInvoices,
  getAllPayments,
  getInvoiceStats,
  getInvoiceById,
  createInvoice,
  createInvoiceFromDelivery,
  updateInvoice,
  recordPayment,
  updateInvoiceStatus
};
