import sharp from 'sharp';
import { readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const publicDir = path.join(process.cwd(), 'public');
const svg = await readFile(path.join(publicDir, 'favicon.svg'));

async function writePng(name, size) {
  await sharp(svg).resize(size, size).png().toFile(path.join(publicDir, name));
}

await Promise.all([
  writePng('favicon-16x16.png', 16),
  writePng('favicon-32x32.png', 32),
  writePng('apple-touch-icon.png', 180),
  writePng('favicon-192x192.png', 192),
  writePng('favicon-512x512.png', 512),
]);

const icoPng = await sharp(svg).resize(32, 32).png().toBuffer();
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(32, 6);
icoHeader.writeUInt8(32, 7);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(icoPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile(path.join(publicDir, 'favicon.ico'), Buffer.concat([icoHeader, icoPng]));

const socialPath = path.join(publicDir, 'maiya-social-preview.png');
await sharp(socialPath)
  .resize(1200, 630, { fit: 'cover', position: 'centre' })
  .png({ compressionLevel: 9, palette: true, quality: 90 })
  .toFile(`${socialPath}.tmp`);
await rename(`${socialPath}.tmp`, socialPath);
