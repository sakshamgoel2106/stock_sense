const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company', 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true 
  },
  role: { 
    type: String, 
    enum: ['WORKER', 'MANAGER'], 
    default: 'WORKER',
    required: true 
  },
  warehouseIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Warehouse' 
  }],
  tokenHash: { 
    type: String, 
    required: true, 
    unique: true 
  },
  invitedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'], 
    default: 'PENDING' 
  },
  expiresAt: { 
    type: Date, 
    required: true 
  },
  acceptedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  acceptedAt: { 
    type: Date 
  }
}, { timestamps: true });

invitationSchema.index({ companyId: 1, email: 1 });
invitationSchema.index({ companyId: 1, status: 1 });

module.exports = mongoose.model('Invitation', invitationSchema);
