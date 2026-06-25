# ResuScan AI - AI-Powered Resume Screener

ResuScan AI is a modern web application designed to help recruiters and hiring managers efficiently screen candidate resumes against job descriptions. Powered by Google Gemini AI, the system parses PDF resumes, compares candidate profiles to specific job qualifications, and provides key metrics, including a match score, strengths list, missing requirements, and improvement suggestions.

**Live Application Link:** [https://resuscan-ai.onrender.com](https://resuscan-ai.onrender.com)

---

## Features

- **User Authentication:** Secure user registration, login, and profile verification using JSON Web Tokens (JWT) and `bcryptjs` password hashing.
- **PDF Parsing:** Automatic extraction of clean text content from uploaded PDF resumes using `pdf-parse`.
- **AI-Powered Evaluation:** Leverages the native Google Gemini REST API (`gemini-3.1-flash-lite`) to produce structured JSON analyses.
- **Detailed Insights:** Evaluates resumes to yield:
  - **Match Score (0-100%):** A quantitative score matching candidate suitability.
  - **Strengths:** Key candidate assets alignment.
  - **Missing Skills:** Critical requirements missing from the resume.
  - **Suggestions:** Actionable insights for the applicant to improve alignment.
- **History Tracking:** Secure storage of all past evaluation results in MongoDB, allowing users to search, view detailed summaries, or delete past results.
- **Security & Rate Limiting:** Enforces strict rate limits on authentication, uploading/screening, and results querying.
- **Responsive Web Interface:** Modern, glassmorphism-themed frontend built with HTML, CSS, and Vanilla JavaScript.

---

## Tech Stack

- **Frontend:** HTML5, CSS3 (Custom styling with Outfit Google Font & FontAwesome), Vanilla JavaScript
- **Backend:** Node.js, Express
- **Database:** MongoDB (using Mongoose ODM)
- **AI Integration:** Google Gemini API (`gemini-3.1-flash-lite` model)
- **Testing:** Jest & Supertest

---

## File Structure

```text
RESUME SCRENER/
├── config/            # Database configuration
├── controllers/       # Business logic controllers (auth & results)
├── middleware/        # Authentication protect and multer file upload configurations
├── models/            # Mongoose Schemas (User & ScreeningResult)
├── public/            # Statically-served frontend assets (HTML, CSS, JS)
├── routes/            # Express endpoint routers
├── tests/             # Jest integration tests
├── utils/             # Helper utilities (Gemini/OpenAI service & PDF extractor)
├── server.js          # Entry point of the application
├── app.js             # Express application initialization and middleware configuration
├── .env               # Local environment secrets configuration
└── package.json       # Project dependencies and test configurations
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18.0.0 or higher recommended)
- MongoDB running locally or a MongoDB Atlas URI

### 1. Clone the Project & Install Dependencies
Navigate to the project root directory and install dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (using `.env.example` as a template):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai_resume_screener
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=24h
OPENAI_API_KEY=your_gemini_api_key_here
OPENAI_MODEL=gemini-3.1-flash-lite
```
> **Note:** The application checks if the API key starts with `AQ.` or `AIzaSy`. If it detects a Gemini/Google AI Studio key, it automatically calls the native Gemini REST API instead of the standard OpenAI Node SDK.

### 3. Run the Server
For development mode (with hot reloading via `nodemon`):
```bash
npm run dev
```

For production mode:
```bash
npm start
```
The server will start running on `http://localhost:5000`.

### 4. Running the Tests
To run the integration tests:
```bash
npm test
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new recruiter account
- `POST /api/auth/login` - Authenticate and retrieve JWT token
- `GET /api/auth/me` - Retrieve current user profile (requires Auth header)

### Resume Screening
- `POST /api/screen` - Upload a resume (file form data `resume`) and job description string (`jobDescription`) to run AI analysis (requires Auth header)
- `GET /api/results` - Get all screening history for the logged-in user (requires Auth header)
- `GET /api/results/:id` - Fetch details for a specific screening result (requires Auth header)
- `DELETE /api/results/:id` - Delete a specific screening result (requires Auth header)

### Health Check
- `GET /health` - Check backend API status

---

## License
This project is licensed under the MIT License.
