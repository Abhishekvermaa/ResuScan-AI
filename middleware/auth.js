const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    req.user = user;
    req.user.userId = user._id.toString(); // standard key matching for results ownership checks

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};
