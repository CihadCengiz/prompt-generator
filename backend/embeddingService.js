import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { EmbeddingLog } from './models/EmbeddingLog.js';
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const pinecone = new Pinecone();

const indexName = 'repo-embeddings';
const index = pinecone.Index(indexName);

export function chunkText(text, chunkSize = 1000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export function getTextHash(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

export async function embedAndStoreFileChunks(
  filePath,
  content,
  repoTag,
  commitHash
) {
  const contentHash = getTextHash(content);
  const chunks = chunkText(content);
  const fileHash = getTextHash(filePath);

  const existing = await index.query({
    vector: new Array(1536).fill(0),
    topK: 1000,
    includeMetadata: true,
    filter: { fileHash, contentHash, commitHash, repoTag },
  });

  const existingHashes = new Set(
    (existing.matches || []).map((m) => m.metadata.hash)
  );

  const embeddings = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  const vectors = chunks
    .map((chunk, i) => {
      const hash = getTextHash(chunk);
      if (existingHashes.has(hash)) return null;

      return {
        id: uuidv4(),
        values: embeddings.data[i].embedding,
        metadata: {
          text: chunk,
          hash,
          filePath,
          fileHash,
          contentHash,
          commitHash,
          repoTag,
        },
      };
    })
    .filter(Boolean);

  if (vectors.length > 0) {
    await index.upsert(vectors);
  }

  const log = await EmbeddingLog.create({
    type: 'embedding',
    filePath,
    commitHash,
    repoTag,
    embeddedCount: vectors.length,
    skippedCount: chunks.length - vectors.length,
  });

  return {
    embeddedCount: vectors.length,
    skippedCount: chunks.length - vectors.length,
    filePath,
    commitHash,
    logId: log._id,
  };
}

export async function deleteChunksByCommit(repoTag, commitHash) {
  try {
    const result = await index.query({
      vector: new Array(1536).fill(0),
      topK: 1000,
      includeMetadata: true,
      filter: { repoTag, commitHash },
    });

    const idsToDelete = result.matches.map((m) => m.id);
    if (idsToDelete.length > 0) {
      await index.deleteMany({ ids: idsToDelete });
    }

    await EmbeddingLog.create({
      type: 'delete-all',
      commitHash,
      repoTag,
      deletedCount: idsToDelete.length,
    });

    return {
      deletedCount: idsToDelete.length,
      commitHash,
    };
  } catch (err) {
    console.error('Failed to delete vectors for commit:', err);
    return { deletedCount: 0, commitHash, error: true };
  }
}

export async function deleteChunksByFileList(repoTag, commitHash, filePaths) {
  try {
    const deletions = [];

    for (const filePath of filePaths) {
      const result = await index.query({
        vector: new Array(1536).fill(0),
        topK: 1000,
        includeMetadata: true,
        filter: { repoTag, commitHash, filePath },
      });

      const idsToDelete = result.matches.map((m) => m.id);
      if (idsToDelete.length > 0) {
        deletions.push(...idsToDelete);
      }
    }

    if (deletions.length > 0) {
      await index.deleteMany({ ids: deletions });
    }

    await EmbeddingLog.create({
      type: 'delete-changed',
      commitHash,
      repoTag,
      deletedCount: deletions.length,
      affectedFiles: filePaths.length,
    });

    return {
      deletedCount: deletions.length,
      commitHash,
      affectedFiles: filePaths.length,
    };
  } catch (err) {
    console.error('Failed to delete specific file chunks from commit:', err);
    return { deletedCount: 0, commitHash, error: true };
  }
}

export async function getRelevantChunks(query, topK = 5) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: [query],
  });

  const queryEmbedding = response.data[0].embedding;
  const result = await index.query({
    vector: queryEmbedding,
    topK,
    includeMetadata: true,
  });

  return result.matches.map((m) => m.metadata.text);
}
