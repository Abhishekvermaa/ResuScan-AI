const request = require('supertest');
const app = require('../app');
const User = require('../models/User');

// Mock DB connection
jest.mock('../config/db', () => jest.fn());

// Mock User Model
jest.mock('../models/User');

describe('Auth Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully and return message, token, userId', async () => {
      const userData = {
        name: 'Jane Recruiter',
        email: 'jane@example.com',
        password: 'password123',
      };

      const mockUser = {
        _id: 'mockuser123',
        name: userData.name,
        email: userData.email,
        getSignedJwtToken: jest.fn().mockReturnValue('mocktoken123'),
      };

      User.findOne.mockResolvedValue(null);
      User.create.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.message).toEqual('Registered');
      expect(res.body.token).toEqual('mocktoken123');
      expect(res.body.userId).toEqual('mockuser123');
      expect(User.findOne).toHaveBeenCalledWith({ email: userData.email });
      expect(User.create).toHaveBeenCalled();
    });

    it('should return 400 if user email already exists', async () => {
      User.findOne.mockResolvedValue({ _id: 'existinguser' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane Recruiter',
          email: 'jane@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('User already exists');
    });

    it('should return 400 if any field is empty', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Jane',
          email: '  ',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toEqual('All fields are required and cannot be empty');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return token, userId, name with valid credentials', async () => {
      const mockUser = {
        _id: 'mockuser123',
        name: 'Jane Recruiter',
        email: 'jane@example.com',
        matchPassword: jest.fn().mockResolvedValue(true),
        getSignedJwtToken: jest.fn().mockReturnValue('mocktoken123'),
      };

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockUser),
      };
      User.findOne.mockReturnValue(mockQuery);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'password123',
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body.token).toEqual('mocktoken123');
      expect(res.body.userId).toEqual('mockuser123');
      expect(res.body.name).toEqual('Jane Recruiter');
    });

    it('should return 401 with generic message for invalid credentials', async () => {
      const mockQuery = {
        select: jest.fn().mockResolvedValue(null),
      };
      User.findOne.mockReturnValue(mockQuery);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        });

      expect(res.statusCode).toEqual(401);
      expect(res.body.error).toEqual('Invalid credentials');
    });
  });
});
