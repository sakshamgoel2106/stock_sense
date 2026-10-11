const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Company name is required'],
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  code: { 
    type: String, 
    required: [true, 'Company code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Company code cannot exceed 20 characters']
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  gstin: {
    type: String,
    trim: true,
    uppercase: true,
    default: '27AABCS1429B1Z1'
  },
  address: { type: String, default: 'Plot 42, Logistics Park, Bhiwandi' },
  city: { type: String, default: 'Thane / Mumbai' },
  state: { type: String, default: 'Maharashtra' },
  pincode: { type: String, default: '421302' },
  phone: { type: String, default: '+91 98200 12345' },
  email: { type: String, default: 'operations@stocksense.in' },
  isMNC: { type: Boolean, default: true },
  primaryCountry: { type: String, default: 'India' },
  operatingCountries: [{
    code: { type: String, uppercase: true, trim: true }, // 'IN', 'US', 'GB', 'AE', 'SG', 'DE'
    name: { type: String }, // 'India', 'United States', etc.
    currency: { type: String, default: 'INR' },
    currencySymbol: { type: String, default: '₹' },
    taxSystem: { type: String, default: 'GST' }, // 'GST', 'SALES_TAX', 'VAT'
    taxIdName: { type: String, default: 'GSTIN' }, // 'GSTIN', 'EIN', 'VAT_NO', 'TRN', 'UEN'
    taxIdNumber: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false }
  }],
  settings: {
    currency: { type: String, default: 'INR' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    requireTransferApproval: { type: Boolean, default: true },
    lowStockThreshold: { type: Number, default: 10 },
    valuationMethod: { type: String, default: 'FIFO' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Company', companySchema);
