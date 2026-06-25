const fs = require('fs');
const pdf = require('pdf-parse');

/**
 * Extracts raw text from a PDF file.
 * @param {string} filePath - Absolute path to the PDF file on disk.
 * @returns {Promise<string>} - Extracted text.
 */
const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

module.exports = { extractTextFromPDF };
