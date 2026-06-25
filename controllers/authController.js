const User = require('../models/User');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    // Input validation: reject empty strings or missing fields
    if (!name || name.trim() === '' || !email || email.trim() === '' || !password || password.trim() === '') {
      return res.status(400).json({ error: 'All fields are required and cannot be empty' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: password,
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      message: 'Registered',
      token,
      userId: user._id.toString(),
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const message = Object.values(error.errors).map((val) => val.message);
      return res.status(400).json({ error: message.join(', ') });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate inputs
    if (!email || email.trim() === '' || !password || password.trim() === '') {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      token,
      userId: user._id.toString(),
      name: user.name,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({
      userId: user._id.toString(),
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
