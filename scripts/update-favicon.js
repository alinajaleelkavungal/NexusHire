const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. DIB generator for Windows ICO format (32-bit RGBA)
function createDib(rgbaBuffer, w, h) {
  const header = Buffer.alloc(40);
  header.writeUInt32LE(40, 0);          // biSize
  header.writeInt32LE(w, 4);            // biWidth
  header.writeInt32LE(h * 2, 8);        // biHeight (XOR image + AND mask)
  header.writeUInt16LE(1, 12);          // biPlanes
  header.writeUInt16LE(32, 14);         // biBitCount
  header.writeUInt32LE(0, 16);          // biCompression (BI_RGB)
  header.writeUInt32LE(w * h * 4, 20);   // biSizeImage
  header.writeInt32LE(0, 24);           // biXPelsPerMeter
  header.writeInt32LE(0, 28);           // biYPelsPerMeter
  header.writeUInt32LE(0, 32);          // biClrUsed
  header.writeUInt32LE(0, 36);          // biClrImportant

  const pixelData = Buffer.alloc(w * h * 4);
  const andRowBytes = Math.ceil(w / 32) * 4;
  const andMask = Buffer.alloc(andRowBytes * h);

  // Bottom-up rows for BMP
  for (let y = 0; y < h; y++) {
    const srcY = h - 1 - y;
    for (let x = 0; x < w; x++) {
      const srcIdx = (srcY * w + x) * 4;
      const dstIdx = (y * w + x) * 4;
      pixelData[dstIdx] = rgbaBuffer[srcIdx + 2];     // B
      pixelData[dstIdx + 1] = rgbaBuffer[srcIdx + 1]; // G
      pixelData[dstIdx + 2] = rgbaBuffer[srcIdx];     // R
      pixelData[dstIdx + 3] = rgbaBuffer[srcIdx + 3]; // A

      // 1-bit mask: 1 = transparent, 0 = opaque
      if (rgbaBuffer[srcIdx + 3] === 0) {
        const maskByteIdx = y * andRowBytes + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        andMask[maskByteIdx] |= (1 << bitIdx);
      }
    }
  }

  return Buffer.concat([header, pixelData, andMask]);
}

// 2. Assemble ICO file from sized entries
function assembleIco(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);              // reserved
  header.writeUInt16LE(1, 2);              // 1 = icon
  header.writeUInt16LE(entries.length, 4); // count

  let offset = 6 + entries.length * 16;
  const dirEntries = [];
  const dataBlocks = [];

  for (const entry of entries) {
    const de = Buffer.alloc(16);
    de.writeUInt8(entry.size >= 256 ? 0 : entry.size, 0); // width
    de.writeUInt8(entry.size >= 256 ? 0 : entry.size, 1); // height
    de.writeUInt8(0, 2);                                  // colors
    de.writeUInt8(0, 3);                                  // reserved
    de.writeUInt16LE(1, 4);                               // planes
    de.writeUInt16LE(32, 6);                              // bpp
    de.writeUInt32LE(entry.data.length, 8);               // size
    de.writeUInt32LE(offset, 12);                         // offset
    dirEntries.push(de);
    dataBlocks.push(entry.data);
    offset += entry.data.length;
  }

  return Buffer.concat([header, ...dirEntries, ...dataBlocks]);
}

async function main() {
  const srcFile = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\6c0fc940-4bd0-4a49-bc23-107305cfa523\\.user_uploaded\\media_1793380191609.png';
  if (!fs.existsSync(srcFile)) {
    throw new Error('Source image not found: ' + srcFile);
  }

  console.log('Loading source image from:', srcFile);
  const trimmed = await sharp(srcFile).trim().toBuffer();
  const trimmedMeta = await sharp(trimmed).metadata();
  console.log(`Trimmed emblem bounds: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Helper to generate centered square icon with specified margin %
  async function generateSquareIcon(targetSize, marginPct = 0.05) {
    const innerSize = Math.max(12, Math.round(targetSize * (1 - marginPct * 2)));
    const pad = Math.floor((targetSize - innerSize) / 2);

    const resized = await sharp(trimmed)
      .resize(innerSize, innerSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    return sharp({
      create: {
        width: targetSize,
        height: targetSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: resized, top: pad, left: pad }])
    .png()
    .toBuffer();
  }

  // Generate high-resolution Master 512x512
  console.log('Generating 512x512 master icon...');
  const icon512 = await generateSquareIcon(512, 0.04);
  const apple180 = await generateSquareIcon(180, 0.06);
  const favicon48 = await generateSquareIcon(48, 0.04);
  const favicon32 = await generateSquareIcon(32, 0.02);
  const favicon16 = await generateSquareIcon(16, 0.0);

  // Generate Dark Mode adjusted variant (lift shadow tones for dark surfaces)
  console.log('Generating dark-mode optimized variant...');
  const raw512 = await sharp(icon512).raw().toBuffer({ resolveWithObject: true });
  const darkAdjustedData = Buffer.from(raw512.data);
  for (let i = 0; i < darkAdjustedData.length; i += 4) {
    const a = darkAdjustedData[i + 3];
    if (a > 10) {
      let r = darkAdjustedData[i];
      let g = darkAdjustedData[i + 1];
      let b = darkAdjustedData[i + 2];
      // Brighten dark espresso tones for dark background visibility
      if (r < 80 && g < 50 && b < 40) {
        darkAdjustedData[i] = Math.min(255, Math.round(r * 1.5 + 25));
        darkAdjustedData[i + 1] = Math.min(255, Math.round(g * 1.5 + 18));
        darkAdjustedData[i + 2] = Math.min(255, Math.round(b * 1.5 + 15));
      }
    }
  }
  const icon512Dark = await sharp(darkAdjustedData, {
    raw: { width: 512, height: 512, channels: 4 }
  }).png().toBuffer();

  // Generate multi-resolution ICO file: 16, 32, 48 (DIB) + 64, 256 (PNG)
  console.log('Generating multi-resolution ICO (16, 32, 48, 64, 256)...');
  const ico64 = await generateSquareIcon(64, 0.04);
  const ico256 = await generateSquareIcon(256, 0.04);

  const raw16 = await sharp(favicon16).raw().toBuffer({ resolveWithObject: true });
  const raw32 = await sharp(favicon32).raw().toBuffer({ resolveWithObject: true });
  const raw48 = await sharp(favicon48).raw().toBuffer({ resolveWithObject: true });

  const icoEntries = [
    { size: 16, data: createDib(raw16.data, 16, 16) },
    { size: 32, data: createDib(raw32.data, 32, 32) },
    { size: 48, data: createDib(raw48.data, 48, 48) },
    { size: 64, data: ico64 },
    { size: 256, data: ico256 }
  ];
  const icoBuffer = assembleIco(icoEntries);

  const pubDir = path.resolve(__dirname, '..', 'public');
  const appDir = path.resolve(__dirname, '..', 'app');

  // Write all favicon and icon assets
  console.log('Writing assets to public/ and app/...');

  // Favicons
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(pubDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(pubDir, 'favicon.png'), favicon48);

  // App & Web icons
  fs.writeFileSync(path.join(appDir, 'icon.png'), icon512);
  fs.writeFileSync(path.join(pubDir, 'icon.png'), icon512);

  // Apple touch icon
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), apple180);
  fs.writeFileSync(path.join(pubDir, 'apple-icon.png'), apple180);

  // Brand marks & Logo marks
  fs.writeFileSync(path.join(pubDir, 'logo-mark.png'), icon512);
  fs.writeFileSync(path.join(pubDir, 'logo-mark-dark.png'), icon512Dark);
  fs.writeFileSync(path.join(pubDir, 'brand-mark.png'), icon512);
  fs.writeFileSync(path.join(pubDir, 'brand-mark-dark.png'), icon512Dark);

  console.log('All favicon, icon, and brand mark assets successfully generated and replaced!');
}

main().catch(err => {
  console.error('Error generating favicon assets:', err);
  process.exit(1);
});
