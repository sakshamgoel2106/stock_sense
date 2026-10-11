const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['WORKER', 'MANAGER', 'COMPANY_ADMIN'], 
    default: 'WORKER',
    required: true
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'INVITED', 'SUSPENDED', 'PENDING_REMOVAL'], 
    default: 'ACTIVE',
    required: true
  },
  // Removal approval request tracking
  removalRequest: {
    requestedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    reason: { 
      type: String, 
      default: '' 
    },
    requestedAt: { 
      type: Date 
    }
  },
  // If warehouseIds is empty, user has access to all company warehouses (default for COMPANY_ADMIN).
  // If populated, access is strictly limited to these warehouses.
  warehouseIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Warehouse' 
  }],
  invitedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

// Ensure a user can only have one membership per company
membershipSchema.index({ userId: 1, companyId: 1 }, { unique: true });
membershipSchema.index({ companyId: 1, status: 1 });
membershipSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Membership', membershipSchema);
