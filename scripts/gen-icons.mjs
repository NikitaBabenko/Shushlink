import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const publicDir = resolve(repoRoot, 'public');

const DEFAULT_SOURCE = 'C:/Users/nikic/Downloads/Telegram Desktop/1777529692545.png';
const source = process.argv[2] ?? DEFAULT_SOURCE;

const sizes = [
  { name: 'icon-16.png', size: 16 },
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

const resizeTrimmed = (size) =>
  sharp(trimmed)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toBuffer();

for (const { name, size } of sizes) {
  const out = resolve(publicDir, name);
  await sharp(trimmed)
    .resize(size, size, { fit: 'cover', kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out);
  console.log(`wrote ${out}`);
}

// Maskable icon: brand mark inside 80% safe zone, dark brand fill outside.
// Android applies a circular/rounded mask on PWA install; corners of the
// white plate get masked, so we pad with the dark brand color (matches
// manifest theme/background) so the plate stays fully visible inside the mask.
const MASKABLE_SIZE = 512;
const SAFE_ZONE = 0.8;
const innerSize = Math.round(MASKABLE_SIZE * SAFE_ZONE);
const inner = await resizeTrimmed(innerSize);
const maskableOut = resolve(publicDir, 'icon-512-maskable.png');
await sharp({
  create: {
    width: MASKABLE_SIZE,
    height: MASKABLE_SIZE,
    channels: 3,
    background: '#0a0c12',
  },
})
  .composite([{ input: inner, gravity: 'center' }])
  .png({ compressionLevel: 9, palette: false })
  .toFile(maskableOut);
console.log(`wrote ${maskableOut}`);

// Multi-resolution favicon.ico (16+32+48) — browsers fetch /favicon.ico
// directly, bypassing <link rel="icon">.
const ico16 = await resizeTrimmed(16);
const ico32 = await resizeTrimmed(32);
const ico48 = await resizeTrimmed(48);
const icoOut = resolve(publicDir, 'favicon.ico');
const icoBuf = await pngToIco([ico16, ico32, ico48]);
await writeFile(icoOut, icoBuf);
console.log(`wrote ${icoOut}`);

// SVG wrapper around the 512px PNG. Modern browsers prefer SVG via
// `<link rel="icon" type="image/svg+xml">`; the wrapper keeps the asset
// self-contained without requiring a hand-drawn vector.
const png512 = await resizeTrimmed(512);
const svgOut = resolve(publicDir, 'icon.svg');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><image href="data:image/png;base64,${png512.toString('base64')}" width="512" height="512"/></svg>`;
await writeFile(svgOut, svg);
console.log(`wrote ${svgOut}`);
