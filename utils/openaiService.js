const OpenAI = require('openai');

// Initialize OpenAI client
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.warn('WARNING: No valid OPENAI_API_KEY found. Mock AI screening mode will be active.');
    return null;
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL && !process.env.OPENAI_BASE_URL.includes('curl') ? process.env.OPENAI_BASE_URL : undefined,
  });
};

/**
 * Screen resume text against job description using OpenAI or Gemini native REST API
 * @param {string} resumeText - Raw text extracted from PDF
 * @param {string} jobDescription - Job description details pasted by user
 * @returns {Promise<object>} - JSON evaluation result containing matchScore, missingSkills, strengths, suggestions
 */
const screenResume = async (resumeText, jobDescription) => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    return generateMockScreening(resumeText, jobDescription);
  }

  const prompt = `
You are a professional resume screener. Given the resume and job description below, respond ONLY with a JSON object with keys: matchScore (number 0-100), missingSkills (array), strengths (array), suggestions (array). No explanation, no markdown.

Job Description:
${jobDescription}

Candidate Resume Text:
${resumeText}
`;

  // Check if we should use Google Gemini native REST API directly (required when key starts with AQ. or is a Gemini key)
  const isGeminiKey = apiKey.startsWith('AQ.') || apiKey.startsWith('AIzaSy');
  const hasGeminiBase = process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes('generativelanguage.googleapis.com');
  
  if (isGeminiKey || hasGeminiBase) {
    const model = process.env.OPENAI_MODEL || 'gemini-3.1-flash-lite';
    // Use the native v1beta models endpoint
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });

      const resJson = await response.json();
      if (!response.ok) {
        throw new Error(resJson.error?.message || 'Gemini API call failed');
      }

      const generatedText = resJson.candidates[0].content.parts[0].text;
      // Parse the JSON block returned by Gemini
      return JSON.parse(generatedText);
    } catch (error) {
      console.error(`Gemini native API error: ${error.message}`);
      throw new Error('AI service unavailable');
    }
  }

  // Otherwise, fall back to standard OpenAI Node SDK
  const client = getOpenAIClient();
  if (!client) {
    return generateMockScreening(resumeText, jobDescription);
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional resume screening tool that outputs structured JSON containing keys: matchScore, missingSkills, strengths, suggestions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;
  } catch (error) {
    console.error(`OpenAI API error: ${error.message}`);
    throw new Error('AI service unavailable');
  }
};

/**
 * Generate a mock screening result when OpenAI is not configured
 */
const generateMockScreening = (resumeText, jobDescription) => {
  let score = 50;
  const strengths = [];
  const missingSkills = [];
  const suggestions = [];

  const checkWords = jobDescription.toLowerCase().split(/[\s,]+/);
  checkWords.forEach(word => {
    if (word.length > 4) {
      if (resumeText.toLowerCase().includes(word)) {
        if (!strengths.includes(word) && strengths.length < 5) {
          strengths.push(word.charAt(0).toUpperCase() + word.slice(1));
          score += 6;
        }
      } else {
        if (!missingSkills.includes(word) && missingSkills.length < 4) {
          missingSkills.push(word.charAt(0).toUpperCase() + word.slice(1));
        }
      }
    }
  });

  score = Math.min(Math.max(score, 15), 95);

  if (strengths.length > 0) {
    strengths.unshift('Strong baseline match');
  } else {
    strengths.push('General professional qualifications');
  }

  if (score < 60) {
    suggestions.push('Consider adding specific projects highlighting core technologies.');
    suggestions.push('Format resume to show clear quantitative results.');
  } else {
    suggestions.push('Highlight advanced cloud infrastructure or system architecture achievements.');
    suggestions.push('Include metrics representing team collaborations or lead experience.');
  }

  return {
    matchScore: score,
    missingSkills: missingSkills.slice(0, 4),
    strengths: strengths.slice(0, 4),
    suggestions: suggestions,
  };
};

module.exports = { screenResume };
