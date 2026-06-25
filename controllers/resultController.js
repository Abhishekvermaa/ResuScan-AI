const fs = require('fs');
const ScreeningResult = require('../models/ScreeningResult');
const { extractTextFromPDF } = require('../utils/pdfExtractor');
const { screenResume } = require('../utils/openaiService');

// @desc    Upload, parse, screen resume against JD
// @route   POST /api/screen
// @access  Private
exports.screen = async (req, res, next) => {
  let filePath = null;
  try {
    const { jobDescription } = req.body;
    const file = req.file;

    // Check if resume or jobDescription is missing
    if (!file || !jobDescription || jobDescription.trim() === '') {
      // Clean up uploaded file if it exists
      if (file) {
        fs.unlinkSync(file.path);
      }
      return res.status(400).json({ error: 'Resume and job description required' });
    }

    filePath = file.path;

    // Extract text from PDF
    let resumeText;
    try {
      resumeText = await extractTextFromPDF(filePath);
    } catch (err) {
      console.error('PDF Extraction Error:', err);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(422).json({ error: 'Could not parse PDF' });
    }

    // Clean up: delete physical PDF upload file immediately after text extraction (PRD Section 7)
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        filePath = null; // cleared
      } catch (err) {
        console.error(`Error deleting temp upload: ${err.message}`);
      }
    }

    // AI Analysis via OpenAI
    let aiResponse;
    try {
      aiResponse = await screenResume(resumeText, jobDescription);
    } catch (err) {
      return res.status(500).json({ error: 'AI service unavailable' });
    }

    // Double check AI output formatting
    const matchScore = typeof aiResponse.matchScore === 'number' ? aiResponse.matchScore : 0;
    const missingSkills = Array.isArray(aiResponse.missingSkills) ? aiResponse.missingSkills : [];
    const strengths = Array.isArray(aiResponse.strengths) ? aiResponse.strengths : [];
    const suggestions = Array.isArray(aiResponse.suggestions) ? aiResponse.suggestions : [];

    // Save result to MongoDB
    const result = await ScreeningResult.create({
      userId: req.user._id,
      jobDescription: jobDescription.trim(),
      resumeText: resumeText,
      matchScore: matchScore,
      missingSkills: missingSkills,
      strengths: strengths,
      suggestions: suggestions,
    });

    // Return PRD-compliant success response
    res.status(200).json({
      matchScore: result.matchScore,
      missingSkills: result.missingSkills,
      strengths: result.strengths,
      suggestions: result.suggestions,
      resultId: result._id.toString(),
    });
  } catch (error) {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {}
    }
    res.status(500).json({ error: 'AI service unavailable' });
  }
};

// @desc    Get all screening results for logged-in user
// @route   GET /api/results
// @access  Private
exports.getResults = async (req, res, next) => {
  try {
    const results = await ScreeningResult.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Get single screening result by ID (with ownership check)
// @route   GET /api/results/:id
// @access  Private
exports.getResult = async (req, res, next) => {
  try {
    const result = await ScreeningResult.findById(req.params.id);
    
    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Ownership check (PRD Section 4.4)
    if (result.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// @desc    Delete specific result (with ownership check)
// @route   DELETE /api/results/:id
// @access  Private
exports.deleteResult = async (req, res, next) => {
  try {
    const result = await ScreeningResult.findById(req.params.id);

    if (!result) {
      return res.status(404).json({ error: 'Not found' });
    }

    // Ownership check
    if (result.userId.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await result.deleteOne();
    res.status(200).json({ message: 'Result deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
