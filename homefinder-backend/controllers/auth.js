const crypto = require('crypto');
const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const { sendEmail, loadTemplate } = require('../utils/email');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  console.log('=== REGISTER REQUEST RECEIVED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Request headers:', req.headers);
  
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    
    console.log('Missing required fields:', missingFields);
    return next(new ErrorResponse(`Please provide: ${missingFields.join(', ')}`, 400));
  }

  // Validate email format
  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!emailRegex.test(email)) {
    console.log('Invalid email format:', email);
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  // Validate password length
  if (password.length < 6) {
    console.log('Password too short:', password.length);
    return next(new ErrorResponse('Password must be at least 6 characters', 400));
  }

  // Validate name length
  if (name.length < 2) {
    console.log('Name too short:', name.length);
    return next(new ErrorResponse('Name must be at least 2 characters', 400));
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log('User already exists with email:', email);
    return next(new ErrorResponse('User already exists with this email', 400));
  }

  let user;
  try {
    console.log('Creating user with data:', { name, email, password: '[HIDDEN]' });
    // Create user
    user = await User.create({
      name,
      email,
      password
    });
    console.log('User created successfully:', user._id);
  } catch (error) {
    console.error('User creation error:', error);
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map(val => val.message).join(', ');
      return next(new ErrorResponse(message, 400));
    }
    return next(new ErrorResponse('Invalid user data provided', 400));
  }

  // In development mode, still require email verification for testing
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('Auto-verifying user in development mode');
  //   user.isEmailVerified = true;
  //   await user.save({ validateBeforeSave: false });
  //   
  //   res.status(201).json({
  //     success: true,
  //     message: 'Registration successful. Account auto-verified for development.',
  //     userId: user._id
  //   });
  // } else {
    try {
      // Generate OTP for email verification
      const otp = user.generateOTP();
      await user.save({ validateBeforeSave: false });
      
      console.log('Generated OTP for user:', user.email, 'OTP:', otp);

      // Load email template with OTP
      console.log('Loading email template for user:', user.email);
      const html = loadTemplate('otpVerification', {
        name: user.name,
        otp: otp
      });
      
      console.log('Email template loaded for:', user.email, 'Template length:', html ? html.length : 0);

      await sendEmail({
        email: user.email,
        subject: 'Homefinder Email Verification - OTP',
        html
      });
      
      console.log('Email sent successfully to:', user.email);

      res.status(201).json({
        success: true,
        message: 'Registration successful. Please check your email for the verification OTP.',
        userId: user._id
      });
    } catch (err) {
      console.error('Email sending error:', err);
      console.error('Error stack:', err.stack);
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save({ validateBeforeSave: false });

      // Provide more helpful error message to the user
      let errorMessage = 'Registration successful but we could not send the verification email. Please try the resend OTP option.';
      if (err.message.includes('timeout')) {
        errorMessage = 'Registration successful but we experienced a delay sending your verification email. Please try the resend OTP option.';
      } else if (err.message.includes('authentication')) {
        errorMessage = 'Registration successful but we had an authentication issue with our email service. Please contact support.';
      }
      
      return res.status(201).json({
        success: true,
        message: errorMessage,
        userId: user._id,
        emailSendError: true
      });
    }
  // }
});

// @desc    Verify email with OTP
// @route   POST /api/v1/auth/verify-email-otp
// @access  Public
exports.verifyEmailWithOTP = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  
  console.log('=== VERIFY EMAIL OTP REQUEST ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Email:', email);
  console.log('OTP:', otp);

  // Validate email is provided
  if (!email) {
    console.log('Email not provided');
    return next(new ErrorResponse('Please provide email', 400));
  }

  // Find user by email
  const user = await User.findOne({ email }).select('+otp');
  
  console.log('User found:', user ? user._id : 'Not found');

  if (!user) {
    console.log('User not found for email:', email);
    return next(new ErrorResponse('Invalid email', 400));
  }

  // Check if user is already verified
  if (user.isEmailVerified) {
    console.log('User already verified:', email);
    return next(new ErrorResponse('Email is already verified', 400));
  }

  // If OTP is not provided, send OTP
  if (!otp) {
    console.log('OTP not provided, sending new OTP to:', email);
    try {
      // Generate OTP for email verification
      const otpCode = user.generateOTP();
      await user.save({ validateBeforeSave: false });
      
      console.log('Generated OTP for user:', user.email, 'OTP:', otpCode);

      // Load email template with OTP
      console.log('Loading email template for user:', user.email);
      const html = loadTemplate('otpVerification', {
        name: user.name,
        otp: otpCode
      });
      
      console.log('Email template loaded for:', user.email, 'Template length:', html ? html.length : 0);

      await sendEmail({
        email: user.email,
        subject: 'Homefinder Email Verification - OTP',
        html
      });
      
      console.log('OTP email sent successfully to:', user.email);

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email address'
      });
    } catch (err) {
      console.error('Error sending OTP email:', err);
      console.error('Error stack:', err.stack);
      return next(new ErrorResponse('Failed to send OTP. Please try again.', 500));
    }
    return;
  }

  // If OTP is provided, verify it
  console.log('Verifying OTP for user:', email);
  // Check if OTP has expired
  if (user.otpExpires < Date.now()) {
    console.log('OTP expired for user:', email);
    return next(new ErrorResponse('OTP has expired', 400));
  }

  // Verify OTP
  const hashedOTP = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');
    
  console.log('Comparing OTPs - Provided:', hashedOTP, 'Stored:', user.otp);

  if (user.otp !== hashedOTP) {
    console.log('Invalid OTP for user:', email);
    return next(new ErrorResponse('Invalid OTP', 400));
  }

  // Set email to verified
  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;
  
  console.log('Email verified for user:', email);
  
  // Generate temporary password for first login
  const tempPassword = user.generateTempPassword();
  await user.save({ validateBeforeSave: false });
  
  console.log('Generated temporary password for user:', email);

  // Send temporary password to user
  const html = loadTemplate('tempPassword', {
    name: user.name,
    tempPassword: tempPassword,
    loginUrl: `${process.env.CLIENT_URL}/auth`
  });

  try {
    await sendEmail({
      email: user.email,
      subject: 'Homefinder - Temporary Password',
      html
    });
    console.log('Temporary password email sent to:', user.email);
  } catch (err) {
    console.error('Error sending temporary password email:', err);
    // Don't fail the verification if email sending fails
    // But notify the client that email sending failed
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. We could not send the temporary password email. Please use the forgot password feature if needed.',
      token: user.getSignedJwtToken(),
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      },
      emailSendError: true
    });
    return;
  }

  // Send token response to automatically log in the user
  console.log('Sending token response for user:', email);
  sendTokenResponse(user, 200, res);
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  console.log('=== LOGIN REQUEST RECEIVED ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { email, password } = req.body;

  // Validate email & password
  if (!email || !password) {
    console.log('Missing email or password');
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Check for user and include tempPassword field
  const user = await User.findOne({ email }).select('+password +tempPassword +tempPasswordExpires');
  
  console.log('User lookup result:', user ? 'Found' : 'Not found');

  if (!user) {
    console.log('User not found for email:', email);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  console.log('User found:', user.email);

  // Check if using temporary password
  let isMatch = false;
  let usingTempPassword = false;
  
  // First check if temp password is valid and not expired
  if (user.tempPassword && user.tempPasswordExpires > Date.now()) {
    console.log('Checking temporary password for user:', email);
    if (password === user.tempPassword) {
      isMatch = true;
      usingTempPassword = true;
      console.log('Temporary password matched for user:', email);
    }
  }
  
  // If temp password didn't match or is expired, check regular password
  if (!isMatch) {
    console.log('Checking regular password for user:', email);
    isMatch = await user.matchPassword(password);
    console.log('Regular password match result:', isMatch);
  }

  if (!isMatch) {
    console.log('Password mismatch for user:', email);
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // Disable auto-verification in development mode for testing
  // if (process.env.NODE_ENV === 'development' && !user.isEmailVerified) {
  //   console.log('Auto-verifying user in development mode');
  //   user.isEmailVerified = true;
  //   await user.save();
  // }
  
  // Check if email is verified
  console.log('Email verification status for user:', email, 'Verified:', user.isEmailVerified);
  if (!user.isEmailVerified) {
    console.log('User tried to login without email verification:', email);
    return next(new ErrorResponse('Please verify your email before logging in', 401));
  }

  // If user logged in with temporary password, transfer it to regular password
  if (usingTempPassword) {
    console.log('User logged in with temporary password, transferring to regular password for user:', email);
    user.password = password;
    user.tempPassword = undefined;
    user.tempPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });
    console.log('Password transferred for user:', email);
  }

  console.log('Login successful for user:', email);
  sendTokenResponse(user, 200, res);
});

// @desc    Log user out / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const fieldsToUpdate = {
    name: req.body.name,
    email: req.body.email,
    bio: req.body.bio
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save({ validateBeforeSave: false });

  sendTokenResponse(user, 200, res);
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new ErrorResponse('There is no user with that email', 404));
  }

  // Generate 6-digit temporary password
  const tempPassword = user.generateTempPassword();
  await user.save({ validateBeforeSave: false });

  // Create login url
  const loginUrl = `${process.env.CLIENT_URL}/auth`;

  // Load email template
  const html = loadTemplate('tempPassword', {
    name: user.name,
    tempPassword,
    loginUrl
  });

  try {
    await sendEmail({
      email: user.email,
      subject: 'Homefinder - Temporary Password',
      html
    });

    res.status(200).json({ success: true, data: 'Temporary password sent to your email' });
  } catch (err) {
    console.error(err);
    user.tempPassword = undefined;
    user.tempPasswordExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Provide a more graceful fallback
    return res.status(200).json({ 
      success: true, 
      data: 'We could not send the temporary password email. Please use the resend option or contact support.',
      emailSendError: true
    });
  }
});

// @desc    Verify email (deprecated - keeping for backward compatibility)
// @route   GET /api/v1/auth/verifyemail/:verificationtoken
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const emailVerificationToken = crypto
    .createHash('sha256')
    .update(req.params.verificationtoken)
    .digest('hex');

  const user = await User.findOne({
    emailVerificationToken,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Set email to verified
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  // Send token response to automatically log in the user
  sendTokenResponse(user, 200, res);
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // Create token
  const token = user.getSignedJwtToken();

  // Set cookie options
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user
    });
};
