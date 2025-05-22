const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
require('dotenv').config();

// MongoDB Connection
const dbURI = process.env.DB_URI;

mongoose
  .connect(dbURI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Define Interaction Schema
const interactionSchema = new mongoose.Schema({
  input: String,
  response: String,
  status: { type: String, default: 'Waiting' },
  timestamp: { type: Date, default: Date.now },
});

const Interaction = mongoose.model('Interaction', interactionSchema);

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
    const githubRepo = await fetch(
      'https://uithub.com/CihadCengiz/prompt-generator',
      {
        method: 'GET',
        headers: {
          accept: '',
          Accept:
            'application/json, text/yaml, text/markdown, text/html, text/plain',
          Authorization: `Bearer ${process.env.GITHUB_KEY}`, // Replace with your GitHub token
        },
      }
    );
    const repoContent = await githubRepo.text();
    // Use getGenerativeModel as recommended
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: `This is your task: "${inputValue}". Describe how to best do it with this repo: ${repoContent}`,
      config: {
        systemInstruction:
        "You are a coding assistance AI that helps translating vague feature requests into clear, comprehensive, implemantation-ready and effective prompts for an AI coding agent. You never generate code yourself. Your sole responsibility is to deeply understand what the user wants, analyze the existing codebase and technical environment and deliver high-quality prompts. Follow these guidelines: Write focused, single task prompts. Maintain clarity and precision. Avoid overly verbose descriptions. Write the prompt exactly like this and don't add anything. Keep it short: 'Task: [clear action statement] \nLocation: [file path or context] \nGoal: [desired outcome]'",
      },
    });

    const aiResponseText = response.text; // Get the text from the response
    console.log('AI Response:', aiResponseText);

    // Save interaction to database
    const newInteraction = new Interaction({
      input: inputValue,
      response: aiResponseText,
      status: 'Waiting',
    });
    await newInteraction.save();
    console.log('Interaction saved to database.');

    // Send the response back to the frontend, including the AI response
    res.json({
      message: 'Input received successfully!',
      receivedValue: inputValue,
      aiResponse: aiResponseText, // Include the AI response
      id: newInteraction._id, // Send back the MongoDB document ID
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

// New endpoint to fetch all interactions
app.get('/api/interactions', async (req, res) => {
  try {
    const interactions = await Interaction.find().sort({ timestamp: -1 });
    res.json(interactions);
  } catch (error) {
    console.error('Error fetching interactions:', error);
    res
      .status(500)
      .json({ message: 'Error fetching interactions.', error: error.message });
  }
});

// Endpoint to update the status of a specific interaction
app.patch('/api/interactions/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const updated = await Interaction.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Interaction not found.' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Error updating interaction status:', error);
    res
      .status(500)
      .json({ message: 'Error updating status.', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
