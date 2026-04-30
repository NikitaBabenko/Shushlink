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

// Detect bounds of the white rounded-square plate by scanning for rows/columns
// where MANY (>5%) pixels are very bright — that filters out stray near-white
// pixels (watermarks, AI sparkles) and only counts the actual plate.
const srcMeta = await sharp(source).metadata();
const W = srcMeta.width;
const H = srcMeta.height;
const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const stride = info.channels;
const BRIGHT = 200;
const MIN_RUN = Math.floor(W * 0.05);

const rowBrightCount = new Int32Array(H);
const colBrightCount = new Int32Array(W);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * stride;
    if ((data[i] + data[i + 1] + data[i + 2]) / 3 > BRIGHT) {
      rowBrightCount[y]++;
      colBrightCount[x]++;
    }
  }
}
let top = 0, bottom = H - 1, left = 0, right = W - 1;
for (let y = 0; y < H; y++) if (rowBrightCount[y] > MIN_RUN) { top = y; break; }
for (let y = H - 1; y >= 0; y--) if (rowBrightCount[y] > MIN_RUN) { bottom = y; break; }
for (let x = 0; x < W; x++) if (colBrightCount[x] > MIN_RUN) { left = x; break; }
for (let x = W - 1; x >= 0; x--) if (colBrightCount[x] > MIN_RUN) { right = x; break; }

// Square the bbox around its center, then inset slightly to drop the
// rounded-corner antialias band that still leaks dark pixels.
const INSET = 14;
const cx = (left + right) / 2, cy = (top + bottom) / 2;
const half = Math.max(right - left, bottom - top) / 2 - INSET;
const cropLeft = Math.max(0, Math.round(cx - half));
const cropTop = Math.max(0, Math.round(cy - half));
const cropSize = Math.min(W - cropLeft, H - cropTop, Math.round(half * 2));
console.log(`source: ${W}x${H}, plate bbox (${left}, ${top})-(${right}, ${bottom}) → cropped to ${cropSize}x${cropSize} at (${cropLeft}, ${cropTop})`);

const trimmed = await sharp(source)
  .extract({ left: cropLeft, top: cropTop, width: cropSize, height: cropSize })
  .toBuffer();

for (const { name, size } of sizes) {
  const out = resolve(publicDir, name);
  await sharp(trimmed)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out);
  console.log(`wrote ${out}`);
}
