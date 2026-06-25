const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const ScreeningResult = require('../models/ScreeningResult');
const User = require('../models/User');

// Mock DB connection
jest.mock('../config/db', () => jest.fn());

// Mock models
jest.mock('../models/ScreeningResult');
jest.mock('../models/User');

// Mock services
jest.mock('../utils/pdfExtractor', () => ({
  extractTextFromPDF: jest.fn().mockResolvedValue('Mock Extracted PDF Resume Text'),
}));
jest.mock('../utils/openaiService', () => ({
  screenResume: jest.fn().mockResolvedValue({
    matchScore: 85,
    missingSkills: ['React'],
    strengths: ['Node.js', 'Express'],
    suggestions: ['Improve layout spacing'],
  }),
}));

describe('Screening Result Endpoints', () => {
  let token;
  const mockUserId = '65f1234567890abcdef12345';
  const otherUserId = '65f1234567890abcdefabcde';

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock token
    token = jwt.sign(
      { userId: mockUserId },
      process.env.JWT_SECRET || 'fallback_secret_key',
      { expiresIn: '7d' }
    );

    // Mock User findById for auth middleware
    User.findById.mockResolvedValue({
      _id: mockUserId,
      name: 'Jane Recruiter',
      email: 'jane@example.com',
    });
  });

  describe('POST /api/screen', () => {
    it('should upload a PDF, parse it, run AI screening and save result', async () => {
      ScreeningResult.create.mockResolvedValue({
        _id: 'mockresult123',
        userId: mockUserId,
        jobDescription: 'Looking for Node developer with React',
        resumeText: 'Mock Extracted PDF Resume Text',
        matchScore: 85,
        missingSkills: ['React'],
        strengths: ['Node.js', 'Express'],
        suggestions: ['Improve layout spacing'],
      });

      const res = await request(app)
        .post('/api/screen')
        .set('Authorization', `Bearer ${token}`)
        .field('jobDescription', 'Looking for Node developer with React')
        .attach('resume', Buffer.from('%PDF-1.4 mock pdf data'), 'my_resume.pdf');

      expect(res.statusCode).toEqual(200);
      expect(res.body.matchScore).toEqual(85);
      expect(res.body.resultId).toEqual('mockresult123');
      expect(ScreeningResult.create).toHaveBeenCalled();
    });

    it('should return 400 if jobDescription is missing', async () => {
      const res = await request(app)
        .post('/api/screen')
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', Buffer.from('mock pdf'), 'my_resume.pdf');

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('Resume and job description required');
    });
  });

  describe('GET /api/results', () => {
    it('should retrieve all screening results for the logged-in user', async () => {
      const mockResults = [
        { _id: 'res1', userId: mockUserId, matchScore: 85 },
        { _id: 'res2', userId: mockUserId, matchScore: 70 },
      ];

      const sortMock = jest.fn().mockResolvedValue(mockResults);
      ScreeningResult.find.mockReturnValue({ sort: sortMock });

      const res = await request(app)
        .get('/api/results')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toEqual(2);
      expect(ScreeningResult.find).toHaveBeenCalledWith({ userId: mockUserId });
    });
  });

  describe('GET /api/results/:id', () => {
    it('should return the result if owned by the logged-in user', async () => {
      const mockResult = {
        _id: 'res1',
        userId: mockUserId,
        matchScore: 85,
      };

      ScreeningResult.findById.mockResolvedValue(mockResult);

      const res = await request(app)
        .get('/api/results/res1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.matchScore).toEqual(85);
    });

    it('should return 403 Forbidden if not owned by the logged-in user', async () => {
      const mockResult = {
        _id: 'res1',
        userId: otherUserId, // different owner
        matchScore: 85,
      };

      ScreeningResult.findById.mockResolvedValue(mockResult);

      const res = await request(app)
        .get('/api/results/res1')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.error).toEqual('Forbidden');
    });
  });
});
