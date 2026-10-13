const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const StockLedger = require('../models/StockLedger');
const Operation = require('../models/Operation');
const StockLayer = require('../models/StockLayer');
const intelligenceCache = require('./intelligenceCache.service');

/**
 * Ensures atomicity when processing stock changes.
 * Wraps logic in a MongoDB transaction if a replica set is available.
 */
const runWithTransaction = async (logic) => {
  let session = null;
  const topologyType = mongoose.connection.client?.topology?.description?.type || '';
  const isReplicaSet = topologyType.includes('ReplicaSet') || Boolean(mongoose.connection.replicaSet);

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch (err) {
      session = null;
    }
  }

  try {
    const result = await logic(session);
    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
    return result;
  } catch (error) {
    if (session) {
      try { await session.abortTransaction(); } catch (e) {}
      try { session.endSession(); } catch (e) {}
    }
    // Fallback if environment does not support replica set transactions (e.g. standalone test server)
    if (error.message && (
      error.message.includes('replica set') || 
      error.message.includes('Transaction numbers are only allowed') ||
      error.message.includes('does not support transactions')
    )) {
      return await logic(null);
    }
    throw error;
  }
};

const _updateStock = async (product, warehouse, quantityChange, session, company, owner) => {
  let stock = await Stock.findOne({ product, warehouse }).session(session);
  let previousQuantity = 0;
  
  if (!stock) {
    if (quantityChange < 0) {
      throw new Error(`Insufficient stock for product ${product} in warehouse ${warehouse}`);
    }
    stock = new Stock({ 
      product, 
      warehouse, 
      quantity: quantityChange,
      company: company || null,
      owner: owner || null
    });
    await stock.save({ session });
    return { previousQuantity: 0, newQuantity: quantityChange };
  }
  
  previousQuantity = stock.quantity;
  const newQuantity = previousQuantity + quantityChange;
  
  if (newQuantity < 0) {
    throw new Error(`Insufficient stock for product ${product} in warehouse ${warehouse}`);
  }
  
  stock.quantity = newQuantity;
  await stock.save({ session });
  
  // Invalidate intelligence cache on stock level change
  try { intelligenceCache.invalidate(); } catch (e) {}

  return { previousQuantity, newQuantity };
};

const _createLedgerEntry = async (data, session) => {
  const ledger = new StockLedger(data);
  await ledger.save({ session });
};

// --- NEW FIFO LOGIC ---
const _consumeFIFO = async (product, warehouse, quantityToConsume, session) => {
  let remaining = quantityToConsume;
  // Get active layers ordered by oldest first
  const layers = await StockLayer.find({
    product,
    warehouse,
    remainingQuantity: { $gt: 0 }
  }).sort({ receivedAt: 1 }).session(session);

  for (const layer of layers) {
    if (remaining <= 0) break;
    const available = layer.remainingQuantity;
    if (available <= remaining) {
      layer.remainingQuantity = 0;
      remaining -= available;
    } else {
      layer.remainingQuantity -= remaining;
      remaining = 0;
    }
    await layer.save({ session });
  }
};

const _transferFIFO = async (product, sourceWarehouse, destWarehouse, quantityToTransfer, operation, session) => {
  let remaining = quantityToTransfer;
  const layers = await StockLayer.find({
    product,
    warehouse: sourceWarehouse,
    remainingQuantity: { $gt: 0 }
  }).sort({ receivedAt: 1 }).session(session);

  for (const layer of layers) {
    if (remaining <= 0) break;
    const available = layer.remainingQuantity;
    let taken = 0;
    
    if (available <= remaining) {
      taken = available;
      layer.remainingQuantity = 0;
      remaining -= available;
    } else {
      taken = remaining;
      layer.remainingQuantity -= remaining;
      remaining = 0;
    }
    await layer.save({ session });
    
    if (taken > 0) {
      const destLayer = new StockLayer({
        company: operation.company || layer.company,
        owner: operation.owner || layer.owner,
        product,
        warehouse: destWarehouse,
        operation: operation._id,
        originalQuantity: taken,
        remainingQuantity: taken,
        unitCost: layer.unitCost, // transfer existing cost
        receivedAt: layer.receivedAt // PRESERVE AGING
      });
      await destLayer.save({ session });
    }
  }
};

const validateOperation = async (operationId, userId, userRole = null) => {
  return await runWithTransaction(async (session) => {
    const operation = await Operation.findById(operationId).session(session);
    
    if (!operation) {
      throw new Error("Operation not found");
    }
    if (operation.status === 'VALIDATED') {
      throw new Error("Operation is already validated");
    }
    if (operation.status === 'CANCELLED') {
      throw new Error("Cannot validate a cancelled operation");
    }
    if (operation.approvalStatus === 'PENDING') {
      const isSuperAdmin = userRole === 'COMPANY_ADMIN' || userRole === 'ADMIN';
      const isManager = userRole === 'MANAGER';
      if (isSuperAdmin || isManager) {
        // Supreme authority: Company Admin or Manager validating directly executes approval
        operation.approvalStatus = 'APPROVED';
        operation.approvedBy = userId;
        await operation.save({ session });
      } else {
        throw new Error("Transfer requires Company Admin or Manager approval before validation");
      }
    }

    const { type, items, sourceWarehouse, destinationWarehouse } = operation;
    const opCompany = operation.company;
    const opOwner = operation.owner || userId;

    for (const item of items) {
      if (type === 'RECEIPT') {
        const { previousQuantity, newQuantity } = await _updateStock(item.product, destinationWarehouse, item.quantity, session, opCompany, opOwner);
        
        // Create new StockLayer
        const newLayer = new StockLayer({
          company: opCompany,
          owner: opOwner,
          product: item.product,
          warehouse: destinationWarehouse,
          operation: operation._id,
          originalQuantity: item.quantity,
          remainingQuantity: item.quantity,
          unitCost: item.unitCost || 0,
          receivedAt: new Date()
        });
        await newLayer.save({ session });

        await _createLedgerEntry({
          company: opCompany,
          owner: opOwner,
          operation: operation._id,
          operationType: type,
          product: item.product,
          warehouse: destinationWarehouse,
          quantityChange: item.quantity,
          previousQuantity,
          newQuantity,
          user: userId
        }, session);
      } 
      else if (type === 'DELIVERY') {
        const { previousQuantity, newQuantity } = await _updateStock(item.product, sourceWarehouse, -item.quantity, session, opCompany, opOwner);
        
        // Consume FIFO
        await _consumeFIFO(item.product, sourceWarehouse, item.quantity, session);

        await _createLedgerEntry({
          company: opCompany,
          owner: opOwner,
          operation: operation._id,
          operationType: type,
          product: item.product,
          warehouse: sourceWarehouse,
          quantityChange: -item.quantity,
          previousQuantity,
          newQuantity,
          user: userId
        }, session);
      } 
      else if (type === 'TRANSFER') {
        // Decrease from source
        const sourceUpdate = await _updateStock(item.product, sourceWarehouse, -item.quantity, session, opCompany, opOwner);
        
        // Increase in destination
        const destUpdate = await _updateStock(item.product, destinationWarehouse, item.quantity, session, opCompany, opOwner);
        
        // Transfer FIFO layers
        await _transferFIFO(item.product, sourceWarehouse, destinationWarehouse, item.quantity, operation, session);

        await _createLedgerEntry({
          company: opCompany,
          owner: opOwner,
          operation: operation._id,
          operationType: type,
          product: item.product,
          warehouse: sourceWarehouse,
          quantityChange: -item.quantity,
          previousQuantity: sourceUpdate.previousQuantity,
          newQuantity: sourceUpdate.newQuantity,
          user: userId
        }, session);
        
        await _createLedgerEntry({
          company: opCompany,
          owner: opOwner,
          operation: operation._id,
          operationType: type,
          product: item.product,
          warehouse: destinationWarehouse,
          quantityChange: item.quantity,
          previousQuantity: destUpdate.previousQuantity,
          newQuantity: destUpdate.newQuantity,
          user: userId
        }, session);
      }
      else if (type === 'ADJUSTMENT') {
        // Here, item.quantity is the counted quantity
        let stock = await Stock.findOne({ product: item.product, warehouse: destinationWarehouse }).session(session);
        const currentQty = stock ? stock.quantity : 0;
        const delta = item.quantity - currentQty;
        
        const { previousQuantity, newQuantity } = await _updateStock(item.product, destinationWarehouse, delta, session, opCompany, opOwner);
        
        if (delta > 0) {
          // Gain: new layer
          const newLayer = new StockLayer({
            company: opCompany,
            owner: opOwner,
            product: item.product,
            warehouse: destinationWarehouse,
            operation: operation._id,
            originalQuantity: delta,
            remainingQuantity: delta,
            unitCost: item.unitCost || 0,
            receivedAt: new Date()
          });
          await newLayer.save({ session });
        } else if (delta < 0) {
          // Loss: consume FIFO
          await _consumeFIFO(item.product, destinationWarehouse, Math.abs(delta), session);
        }

        if (delta !== 0) {
          await _createLedgerEntry({
            company: opCompany,
            owner: opOwner,
            operation: operation._id,
            operationType: type,
            product: item.product,
            warehouse: destinationWarehouse,
            quantityChange: delta,
            previousQuantity,
            newQuantity,
            user: userId
          }, session);
        }
      }
    }

    operation.status = 'VALIDATED';
    operation.validatedAt = new Date();
    await operation.save({ session });
    
    return operation;
  });
};

module.exports = {
  runWithTransaction,
  validateOperation,
  _updateStock, // Exported for use in reservations
  _consumeFIFO // Exported for use in reservations
};
