import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const publicDir = resolve(repoRoot, 'public');

const DEFAULT_SOURCE = 'C:/Users/nikic/Downloads/Telegram Desktop/1777529692545.png';
const source = process.argv[2] ?? DEFAULT_SOURCE;

const sizes = [
  { name: 'icon-32.png', size: 32 },
  { name: 'icon-180.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

await mkdir(publicDir, { recursive: true });

for (const { name, size } of sizes) {
  const out = resolve(publicDir, name);
  await sharp(source)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out);
  console.log(`wrote ${out}`);
}
