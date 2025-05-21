const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

// Dynamically import GoogleGenAI
let GoogleGenAI;
import('@google/genai')
  .then((module) => {
    GoogleGenAI = module.GoogleGenAI;
    console.log('GoogleGenAI module loaded successfully.');
  })
  .catch((err) => {
    console.error('Failed to load GoogleGenAI:', err);
    // Handle the error appropriately, e.g., exit or disable AI features
  });

app.use(cors());
const port = 3001; // Use a different port than Next.js

app.use(express.json());

app.post('/api/process-input', async (req, res) => {
  const { inputValue } = req.body;

  // Check if GoogleGenAI was successfully loaded
  if (!GoogleGenAI) {
    console.error('GoogleGenAI not loaded. AI service unavailable.');
    return res.status(500).json({ message: 'AI service is not available.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
    // Use getGenerativeModel as recommended
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: `This is your task: "${inputValue}". Describe how to best do it with this repo: "https://uithub.com/CihadCengiz/prompt-generator"`,
      config: {
        systemInstruction:
          "You are a coding assistance AI that helps translating vague feature requests into a clear, comprehensive, implemantation-ready and effective single prompt for an AI coding agent. You never generate code yourself. Your sole responsibility is to deeply understand what the user wants, analyze the existing codebase and technical environment and deliver high-quality prompts.Follow these guidelines: Write focused, single task prompts. Maintain clarity and precision. Avoid overly verbose descriptions. Write the prompt like this. Keep it short: 'Task: [clear action statement] Location: [file path or context] Goal: [desired outcome]'",
      },
    });

    const aiResponseText = response.text; // Get the text from the response
    console.log('AI Response:', aiResponseText);

    // Send the response back to the frontend, including the AI response
    res.json({
      message: 'Input received successfully!',
      receivedValue: inputValue,
      aiResponse: aiResponseText, // Include the AI response
    });
  } catch (error) {
    console.error('Error generating AI content:', error);
    // Send an error response back to the frontend
    res.status(500).json({
      message: 'Error processing input with AI.',
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
