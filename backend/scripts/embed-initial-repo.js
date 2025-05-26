import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { embedAndStoreFileChunks } from '../embeddingService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../'); // adjust if needed
const supportedExtensions = ['.js', '.ts', '.jsx', '.tsx', '.md'];

async function walkFiles(dir) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
    } else if (supportedExtensions.includes(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  await mongoose.connect(process.env.DB_URI);

  const commitHash = `initial-${Date.now()}`;
  const repoTag = 'codex-agent';

  const allFiles = await walkFiles(repoRoot);

  for (const filePath of allFiles) {
    const relativePath = path.relative(repoRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    const result = await embedAndStoreFileChunks(relativePath, content, repoTag, commitHash);
    console.log(`✅ Embedded: ${relativePath} — chunks: ${result.embeddedCount}, skipped: ${result.skippedCount}`);
  }

  console.log('✅ Initial embedding complete.');
  process.exit();
}

main().catch((err) => {
  console.error('❌ Error embedding repo:', err);
  process.exit(1);
});
