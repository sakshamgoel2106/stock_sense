const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { 
    type: String, 
    required: function() {
      return !this.googleId;
    } 
  }, 
  googleId: { type: String, sparse: true, unique: true },
  role: { type: String, enum: ['ADMIN', 'MANAGER', 'WORKER', 'COMPANY_ADMIN'], default: 'WORKER' },
  resetPasswordOtpHash: String,
  resetPasswordOtpExpires: Date,
  resetPasswordAttempts: { type: Number, default: 0 },
  resetPasswordLastSent: Date,
  resetPasswordToken: String,
  resetPasswordTokenExpires: Date,
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
