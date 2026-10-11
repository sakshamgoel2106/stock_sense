const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Reservation = require('../models/Reservation');
const Stock = require('../models/Stock');
const Operation = require('../models/Operation');
const { validateOperation } = require('../services/inventory.service');

// @desc    Create a reservation
// @route   POST /api/v1/reservations
// @access  Private
const createReservation = asyncHandler(async (req, res) => {
  const { product, warehouse, quantity, orderReference } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const stock = await Stock.findOne({ product, warehouse }).session(session);
    if (!stock) throw new Error('Stock record not found for this product and warehouse');

    const availableStock = stock.quantity - (stock.reservedQuantity || 0);
    if (availableStock < quantity) throw new Error('Insufficient available stock to reserve');

    stock.reservedQuantity = (stock.reservedQuantity || 0) + quantity;
    await stock.save({ session });

    const reservation = new Reservation({
      product,
      warehouse,
      quantity,
      orderReference,
      user: userId,
      company: req.company ? req.company._id : null,
      owner: req.user ? req.user._id : null,
      status: 'ACTIVE'
    });
    const savedReservation = await reservation.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.status(201).json(savedReservation);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400);
    throw new Error(err.message);
  }
});

// @desc    Get all reservations
// @route   GET /api/v1/reservations
// @access  Private
const getReservations = asyncHandler(async (req, res) => {
  const query = {};
  if (req.company) query.company = req.company._id;
  const reservations = await Reservation.find(query)
    .populate('product', 'name sku')
    .populate('warehouse', 'name code')
    .populate('user', 'name email')
    .sort({ createdAt: -1 });
  res.json(reservations);
});

// @desc    Cancel a reservation
// @route   PUT /api/v1/reservations/:id/cancel
// @access  Private
const cancelReservation = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const reservation = await Reservation.findById(req.params.id).session(session);
    if (!reservation) throw new Error('Reservation not found');
    if (reservation.status !== 'ACTIVE') throw new Error(`Cannot cancel a reservation that is ${reservation.status}`);

    const stock = await Stock.findOne({ product: reservation.product, warehouse: reservation.warehouse }).session(session);
    if (stock) {
      stock.reservedQuantity = Math.max(0, (stock.reservedQuantity || 0) - reservation.quantity);
      await stock.save({ session });
    }

    reservation.status = 'CANCELLED';
    await reservation.save({ session });

    await session.commitTransaction();
    session.endSession();
    res.json({ message: 'Reservation cancelled successfully', reservation });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400);
    throw new Error(err.message);
  }
});

// @desc    Fulfill a reservation
// @route   PUT /api/v1/reservations/:id/fulfill
// @access  Private
const fulfillReservation = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const reservation = await Reservation.findById(req.params.id).session(session);
    if (!reservation) throw new Error('Reservation not found');
    if (reservation.status !== 'ACTIVE') throw new Error(`Cannot fulfill a reservation that is ${reservation.status}`);

    const stock = await Stock.findOne({ product: reservation.product, warehouse: reservation.warehouse }).session(session);
    if (stock) {
      stock.reservedQuantity = Math.max(0, (stock.reservedQuantity || 0) - reservation.quantity);
      await stock.save({ session });
    }

    reservation.status = 'FULFILLED';
    await reservation.save({ session });

    // Create a DELIVERY operation
    const operation = new Operation({
      type: 'DELIVERY',
      sourceWarehouse: reservation.warehouse,
      items: [{
        product: reservation.product,
        quantity: reservation.quantity
      }],
      createdBy: userId,
      company: req.company ? req.company._id : reservation.company,
      owner: req.user ? req.user._id : reservation.owner,
      status: 'DRAFT',
      approvalStatus: 'NOT_REQUIRED'
    });
    await operation.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Validate the operation outside the transaction
    const validatedOperation = await validateOperation(operation._id, userId);

    res.json({ message: 'Reservation fulfilled successfully', reservation, operation: validatedOperation });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400);
    throw new Error(err.message);
  }
});

module.exports = {
  createReservation,
  getReservations,
  cancelReservation,
  fulfillReservation
};
