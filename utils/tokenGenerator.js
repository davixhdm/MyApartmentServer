const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT token
exports.generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Generate refresh token
exports.generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

// Generate email verification token
exports.generateEmailVerificationToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Generate password reset token
exports.generatePasswordResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  // Hash token and set to resetPasswordToken field
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  
  return { resetToken, hashedToken };
};