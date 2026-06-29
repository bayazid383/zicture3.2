import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dir = path.join(__dirname, '..', 'photo', 'flags');
if (!fs.existsSync(dir)) {
  console.error('Flags directory not found:', dir);
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

async function run() {
  for (const f of files) {
    const base = f.replace(/\.svg$/i, '');
    const inPath = path.join(dir, f);
    const outPath = path.join(dir, `${base}.png`);
    try {
      await sharp(inPath).png().toFile(outPath);
      console.log('Wrote', outPath);
    } catch (err) {
      console.error('Failed to convert', inPath, err);
    }
  }
  console.log('Conversion complete');
}

run().catch(err => console.error(err));
