const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const authRoutes = require('./routes/authRoutes');
const resultRoutes = require('./routes/resultRoutes');

const app = express();

// Enable CORS
app.use(cors());

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting Rules (PRD Section 5)
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5,
  message: { error: 'Too many requests' },
});

const screenLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many requests' },
});

const resultsLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,
  message: { error: 'Too many requests' },
});

// Mount limiters and routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/screen', screenLimiter);
app.use('/api/results', resultsLimiter);
app.use('/api', resultRoutes);

// Base route for healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ success: true, message: 'AI Resume Screener API is running' });
});

// SPA fallback - Serve index.html for any non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler (only reached if API or health check route doesn't match)
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Multer errors
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Handle other specific errors
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((val) => val.message);
    return res.status(400).json({ error: message.join(', ') });
  }

  if (err.code === 11000) {
    return res.status(400).json({ error: 'Duplicate field value entered' });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

module.exports = app;
