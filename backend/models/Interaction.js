import mongoose from "mongoose";

// Define Interaction Schema
const interactionSchema = new mongoose.Schema({
  input: String,
  response: String,
  status: { type: String, default: 'Waiting' },
  timestamp: { type: Date, default: Date.now },
});

export const Interaction = mongoose.model('Interaction', interactionSchema);