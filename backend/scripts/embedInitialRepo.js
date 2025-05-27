import fs from 'fs';
import path from 'path';
import ignore from 'ignore';
import { fileURLToPath } from 'url';
import { embedAndStoreFileChunks } from '../services/embeddingService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../');
const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.md'];

// Merge .gitignore rules from backend, and frontend
function loadIgnoreRules() {
  const ig = ignore();
  const locations = ['backend/.gitignore', 'frontend/.gitignore'];
  for (const file of locations) {
    const fullPath = path.join(repoRoot, file);
    if (fs.existsSync(fullPath)) {
      ig.add(fs.readFileSync(fullPath, 'utf8'));
    }
  }
  return ig;
}

const ig = loadIgnoreRules();

async function walkFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(repoRoot, fullPath);

    if (ig.ignores(relPath)) continue;

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (supportedExtensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const commitHash = `initial-${Date.now()}`;
  const repoTag = 'codex-agent';
  const allFiles = await walkFiles(repoRoot);

  for (const filePath of allFiles) {
    const relativePath = path.relative(repoRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    const result = await embedAndStoreFileChunks(
      relativePath,
      content,
      repoTag,
      commitHash
    );
    console.log(
      `✅ ${relativePath} — chunks: ${result.embeddedCount}, skipped: ${result.skippedCount}`
    );
  }

  console.log('✅ Initial repo embedding complete.');
  process.exit();
}

main().catch((err) => {
  console.error('❌ Error during initial embedding:', err);
  process.exit(1);
});
