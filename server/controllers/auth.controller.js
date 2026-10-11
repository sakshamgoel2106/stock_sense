const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
    expiresIn: '30d',
  });
};

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Security hardening: Public registration must always assign least-privileged WORKER role.
  // Role elevation to MANAGER/ADMIN is restricted to internal administrative workflows.
  const user = await User.create({
    name,
    email,
    password,
    role: 'WORKER'
  });

  if (user) {
    res.status(201).json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error('Invalid credentials');
  }
});

const getMe = asyncHandler(async (req, res) => {
  const Membership = require('../models/Membership');
  const memberships = await Membership.find({ userId: req.user._id, status: 'ACTIVE' }).populate('companyId');

  res.status(200).json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.membership ? req.membership.role : req.user.role,
    systemRole: req.user.role,
    hasCompany: Boolean(req.company),
    activeCompany: req.company,
    activeMembership: req.membership ? {
      _id: req.membership._id,
      role: req.membership.role,
      status: req.membership.status,
      warehouseIds: req.membership.warehouseIds
    } : null,
    companies: memberships.map(m => ({
      membershipId: m._id,
      company: m.companyId,
      role: m.role,
      status: m.status,
      warehouseIds: m.warehouseIds
    }))
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  const sendGenericResponse = () => res.status(200).json({ message: 'If that email address is in our database, we will send you an OTP to reset your password.' });

  if (!user) {
    return sendGenericResponse();
  }

  if (user.resetPasswordLastSent && Date.now() - user.resetPasswordLastSent.getTime() < 60000) {
    res.status(429);
    throw new Error('Please wait 60 seconds before requesting another OTP');
  }

  const otp = crypto.randomInt(100000, 999999).toString();
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(otp, salt);
  
  user.resetPasswordOtpHash = otpHash;
  user.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000;
  user.resetPasswordAttempts = 0;
  user.resetPasswordLastSent = Date.now();
  await user.save();

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    });

    await transporter.sendMail({
      from: `"StockSense" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Your Password Reset OTP',
      text: `Your OTP for password reset is: ${otp}. It is valid for 5 minutes. Do not share it with anyone.`,
      html: `<p>Your OTP for password reset is: <b>${otp}</b></p><p>It is valid for 5 minutes. Do not share it with anyone.</p>`
    });
  } catch (error) {
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();
    console.error('Email delivery failed:', error);
    res.status(500);
    throw new Error('Email could not be sent');
  }

  sendGenericResponse();
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpires || user.resetPasswordOtpExpires < Date.now()) {
    res.status(400);
    throw new Error('Invalid or expired OTP');
  }

  if (user.resetPasswordAttempts >= 5) {
    user.resetPasswordOtpHash = undefined;
    user.resetPasswordOtpExpires = undefined;
    await user.save();
    res.status(429);
    throw new Error('Maximum verification attempts exceeded. Please start over.');
  }

  const isMatch = await bcrypt.compare(otp, user.resetPasswordOtpHash);
  if (!isMatch) {
    user.resetPasswordAttempts += 1;
    await user.save();
    res.status(400);
    throw new Error('Invalid OTP');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const salt = await bcrypt.genSalt(10);
  const tokenHash = await bcrypt.hash(resetToken, salt);
  
  user.resetPasswordToken = tokenHash;
  user.resetPasswordTokenExpires = Date.now() + 15 * 60 * 1000;
  
  user.resetPasswordOtpHash = undefined;
  user.resetPasswordOtpExpires = undefined;
  user.resetPasswordAttempts = 0;
  await user.save();

  res.status(200).json({ message: 'OTP verified successfully', resetToken });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetToken, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !user.resetPasswordToken || !user.resetPasswordTokenExpires || user.resetPasswordTokenExpires < Date.now()) {
    res.status(400);
    throw new Error('Invalid or expired reset session. Please start over.');
  }

  if (!password || password.length < 6) {
    res.status(400);
    throw new Error('Password must be at least 6 characters');
  }

  const isMatch = await bcrypt.compare(resetToken, user.resetPasswordToken);
  if (!isMatch) {
    res.status(400);
    throw new Error('Invalid reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpires = undefined;
  await user.save();

  res.status(200).json({ message: 'Password reset successful' });
});

const googleAuth = asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    res.status(400);
    throw new Error('No Google credential provided');
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    res.status(401);
    throw new Error('Invalid Google token');
  }

  const payload = ticket.getPayload();
  const { sub, email, email_verified, name } = payload;

  if (!email_verified) {
    res.status(401);
    throw new Error('Google email is not verified');
  }

  let user = await User.findOne({ email });

  if (user) {
    if (!user.googleId) {
      user.googleId = sub;
      await user.save();
    }
  } else {
    user = await User.create({
      name: name,
      email: email,
      googleId: sub,
      role: 'ADMIN'
    });
  }

  // Ensure user has access to demo company so all products and features are immediately accessible
  const Membership = require('../models/Membership');
  const Company = require('../models/Company');
  let mem = await Membership.findOne({ userId: user._id, status: { $in: ['ACTIVE', 'PENDING_REMOVAL'] } });
  if (!mem) {
    const demoCompany = (await Company.findOne({ code: 'SS-INDIA' })) || 
                        (await Company.findOne({ code: 'SS-GLOBAL' })) || 
                        (await Company.findOne({}));
    if (demoCompany) {
      await Membership.create({
        userId: user._id,
        companyId: demoCompany._id,
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        warehouseIds: []
      });
    }
  }

  res.json({
    _id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken(user._id),
  });
});

// @desc    Update user profile details (e.g. name)
// @route   PUT /api/v1/auth/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.body.name) {
    user.name = req.body.name.trim();
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    role: req.membership ? req.membership.role : updatedUser.role,
    message: 'Profile updated successfully'
  });
});

// @desc    Change password
// @route   PUT /api/v1/auth/password
// @access  Private
const updatePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (!newPassword || newPassword.length < 6) {
    res.status(400);
    throw new Error('New password must be at least 6 characters');
  }

  // If user registered with email/password, verify old password
  if (user.password) {
    if (!currentPassword) {
      res.status(400);
      throw new Error('Current password is required');
    }
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      res.status(400);
      throw new Error('Current password does not match');
    }
  }

  user.password = newPassword;
  await user.save();

  res.json({ message: 'Password updated successfully' });
});

module.exports = {
  register,
  login,
  getMe,
  forgotPassword,
  verifyOTP,
  resetPassword,
  googleAuth,
  updateProfile,
  updatePassword
};
