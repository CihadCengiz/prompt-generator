import express from 'express';
import {
  getRelevantChunks,
  embedAndStoreFileChunks,
  deleteChunksByFileList,
} from '../services/embeddingService.js';
import { Interaction } from '../models/Interaction.js';
import { GoogleGenAI } from '@google/genai';
import { recommendModels } from './llmRouter.js';

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

// Route for generating suggestions only
router.post('/suggest-model', async (req, res) => {
  try {
    const { userInput } = req.body;
    const recommendations = recommendModels(userInput);
    const inferredLocation = recommendations.inferredLocation;

    const relevantChunks = await getRelevantChunks(
      userInput,
      5,
      inferredLocation
    );
    const contextText = relevantChunks.join('\n\n');

    res.json({
      context: contextText,
      modelSuggestions: recommendations.suggestions,
      tokenEstimates: {
        input: recommendations.inputTokenEstimate,
        output: recommendations.outputTokenEstimate,
      },
    });
  } catch (err) {
    console.error('Error suggesting model:', err);
    res.status(500).json({ error: 'Failed to suggest model' });
  }
});

// Route for generating a prompt from user input
router.post('/generate-prompt', async (req, res) => {
  try {
    let { userInput, selectedModel, contextText } = req.body;
    if (!selectedModel || !userInput) {
      return res.status(400).json({ error: 'Missing required input' });
    }
    //fallback if no context provided
    if (!contextText) {
      const inferredLocation = recommendModels(userInput).inferredLocation;
      const relevantChunks = await getRelevantChunks(
        userInput,
        5,
        inferredLocation
      );
      contextText = relevantChunks.join('\n\n');
    }

    //Route model request
    let aiResponseText = '';
    if (selectedModel.startsWith('gemini')) {
      //Generate a structured prompt using Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: `Feature request: ${userInput}
             Context: ${contextText}`,
        config: {
          systemInstruction:
            "You are an expert prompt engineer. Your job is to transform vague feature requests into precise, single-task prompts for an AI coding agent. You never write or suggest code. Instead, you: \
            - Understand the user's intent. \
            - Analyze the provided codebase and environment. \
            - Deliver a short, structured, and clear prompt. \
            \
            Use the following format only (no extras): \
            Task: [concise action statement]  \
            Location: [file path, module, or relevant context]  \
            Goal: [intended behavior or outcome] \
            \
            Follow these rules: \
            - Be clear, not verbose. \
            - Keep the task atomic (one step at a time). \
            - If the feature request is too vague, still produce the best prompt you can based on available info. \
            - Never explain or comment. Just return the formatted prompt. \
            - Only choose a file path or module that appears in the provided context. Do not invent filenames like App.js, Main.jsx or index.html. If unsure, refer to the closest match.",
        },
      });
      aiResponseText = response.text;
    } else if (selectedModel.startsWith('gpt-')) {
      console.log('gpt selected');
      return
    } else if (selectedModel.startsWith('claude')) {
      console.log('claude selected');
      return
    }

    // Save interaction to database
    const newInteraction = new Interaction({
      input: userInput,
      response: aiResponseText,
      status: 'Waiting',
      selectedModel: selectedModel,
    });
    await newInteraction.save();
    console.log('Interaction saved to database.');

    // Send the response back to the frontend, including the AI response
    res.json({
      message: 'Input received successfully!',
      receivedValue: userInput,
      aiResponse: aiResponseText, // Include the AI response
      id: newInteraction._id, // Send back the MongoDB document ID
    });
  } catch (err) {
    console.error('Error generating prompt:', err);
    res.status(500).json({ error: 'Failed to generate prompt' });
  }
});

router.delete('/api/delete-commit-files', async (req, res) => {
  try {
    const { repoTag = 'codex-agent', commitHash, changedFiles } = req.body;
    if (
      !commitHash ||
      !Array.isArray(changedFiles) ||
      changedFiles.length === 0
    ) {
      return res
        .status(400)
        .json({ error: 'Missing commitHash or changedFiles array' });
    }

    await deleteChunksByFileList(repoTag, commitHash, changedFiles);
    res.json({
      status: 'success',
      message: `Deleted chunks for changed files in commit ${commitHash}.`,
    });
  } catch (err) {
    console.error('Error deleting specific file vectors:', err);
    res.status(500).json({ error: 'Failed to delete changed file chunks' });
  }
});

// Route to delete all chunks tied to a commit
router.delete('/delete-commit', async (req, res) => {
  try {
    const { repoTag = 'codex-agent', commitHash } = req.body;
    if (!commitHash) {
      return res
        .status(400)
        .json({ error: 'Missing required field: commitHash' });
    }

    await deleteChunksByCommit(repoTag, commitHash);
    res.json({
      status: 'success',
      message: `Deleted chunks for commit ${commitHash}.`,
    });
  } catch (err) {
    console.error('Error deleting vectors:', err);
    res.status(500).json({ error: 'Failed to delete commit chunks' });
  }
});

router.post('/embed-repo', async (req, res) => {
  try {
    const {
      filePath,
      repoContent,
      repoTag = 'codex-agent',
      commitHash,
    } = req.body;
    if (!filePath || !repoContent || !commitHash) {
      return res.status(400).json({
        error: 'Missing required fields: filePath, repoContent, or commitHash',
      });
    }

    await embedAndStoreFileChunks(filePath, repoContent, repoTag, commitHash);
    res.json({
      status: 'success',
      message: `Embedded ${filePath} successfully.`,
    });
  } catch (err) {
    console.error('Error embedding file:', err);
    res.status(500).json({ error: 'Failed to embed file' });
  }
});

export default router;
