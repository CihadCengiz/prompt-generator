import mongoose from 'mongoose';

const embeddingLogSchema = new mongoose.Schema({
    type: String,
    filePath: String,
    commitHash: String,
    repoTag: String,
    embeddedCount: Number,
    skippedCount: Number,
    deletedCount: Number,
    affectedFiles: Number,
    timestamp: { type: Date, default: Date.now }
  });
  
  export const EmbeddingLog = mongoose.model('EmbeddingLog', embeddingLogSchema);