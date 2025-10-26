const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  // Removed role field - all users are now the same
  avatar: {
    type: String,
    default: 'default.jpg'
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  // Email verification fields
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  // OTP fields for email verification
  otp: {
    type: String,
    select: false
  },
  otpExpires: Date,
  // Temporary password for first-time login
  tempPassword: {
    type: String,
    select: false
  },
  tempPasswordExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password using bcrypt
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  // Check if password exists and is a string
  if (!this.password || typeof this.password !== 'string') {
    return next(new Error('Password is required and must be a string'));
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  if (!this._id) {
    throw new Error('User ID is required for JWT token generation');
  }
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function(enteredPassword) {
  if (!enteredPassword || typeof enteredPassword !== 'string') {
    throw new Error('Entered password must be a non-empty string');
  }
  if (!this.password || typeof this.password !== 'string') {
    throw new Error('Stored password is invalid');
  }
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password token
UserSchema.methods.getPasswordResetToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to passwordResetToken field
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Generate email verification token
UserSchema.methods.getEmailVerificationToken = function() {
  // Generate token
  const verificationToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to emailVerificationToken field
  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // Set expire
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  return verificationToken;
};

// Generate OTP for email verification
UserSchema.methods.generateOTP = function() {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash OTP and set to otp field
  this.otp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expire (10 minutes)
  this.otpExpires = Date.now() + 10 * 60 * 1000;

  return otp;
};

// Generate temporary password (6-digit)
UserSchema.methods.generateTempPassword = function() {
  // Generate 6-digit temporary password
  const tempPassword = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Set temporary password and set to tempPassword field
  this.tempPassword = tempPassword;
  
  // Set expire (10 minutes)
  this.tempPasswordExpires = Date.now() + 10 * 60 * 1000;

  return tempPassword;
};

// Match temporary password
UserSchema.methods.matchTempPassword = function(enteredPassword) {
  // Check if temp password exists, is not expired, and matches
  if (this.tempPassword && 
      this.tempPasswordExpires > Date.now() && 
      enteredPassword === this.tempPassword) {
    return true;
  }
  return false;
};

module.exports = mongoose.model('User', UserSchema);