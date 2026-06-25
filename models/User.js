const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 8, // PRD specifies min 8 characters
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Encrypt password using bcrypt with 12 salt rounds (as per PRD Section 6)
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign JWT and return
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { userId: this._id }, // PRD specifies userId payload
    process.env.JWT_SECRET || 'fallback_secret_key',
    {
      expiresIn: process.env.JWT_EXPIRE || '7d', // PRD specifies 7 days expiry
    }
  );
};

module.exports = mongoose.model('User', UserSchema);
