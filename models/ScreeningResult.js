const mongoose = require('mongoose');

const ScreeningResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
  },
  jobDescription: {
    type: String,
    required: [true, 'Job description is required'],
  },
  resumeText: {
    type: String,
    required: [true, 'Resume text is required'],
  },
  matchScore: {
    type: Number,
    required: [true, 'Match score is required'],
    min: 0,
    max: 100,
  },
  missingSkills: {
    type: [String],
    required: [true, 'Missing skills array is required'],
    default: [],
  },
  strengths: {
    type: [String],
    required: [true, 'Strengths array is required'],
    default: [],
  },
  suggestions: {
    type: [String],
    required: [true, 'Suggestions array is required'],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ScreeningResult', ScreeningResultSchema);
