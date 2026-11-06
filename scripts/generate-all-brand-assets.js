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

async function run() {
  const rootDir = path.resolve(__dirname, '..');
  const pubDir = path.join(rootDir, 'public');
  const appDir = path.join(rootDir, 'app');
  const cleanMasterPath = 'C:/Users/Administrator/.gemini/antigravity/brain/7f62708d-b369-4d1e-87e5-f7dda17bbe1c/scratch/clean_master.png';

  console.log('1. Loading and cropping clean master mark...');
  // Tight bounds: minX: 61, maxX: 377, minY: 54, maxY: 253, w: 317, h: 200
  const croppedMark = await sharp(cleanMasterPath)
    .extract({ left: 61, top: 54, width: 317, height: 200 })
    .toBuffer();

  const markAspect = 317 / 200; // ~1.585

  // Helper to fit mark in a canvas with target width
  async function createSquareIcon(canvasSize, markWidth) {
    const markHeight = Math.round(markWidth / markAspect);
    const scaled = await sharp(croppedMark)
      .resize(markWidth, markHeight, { kernel: 'lanczos3' })
      .toBuffer();
    const padX = Math.round((canvasSize - markWidth) / 2);
    const padY = Math.round((canvasSize - markHeight) / 2);

    return sharp({
      create: {
        width: canvasSize,
        height: canvasSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([{ input: scaled, left: padX, top: padY }])
    .png()
    .toBuffer();
  }

  // Generate Square Icons
  console.log('2. Generating master square marks (512x512, 180x180, 48x48, etc.)...');
  const icon512 = await createSquareIcon(512, 440);
  const icon512Dark = icon512; // Colors #E75D3F and #F7C167 are vibrant on both light and dark
  const apple180 = await createSquareIcon(180, 154);
  const favicon48 = await createSquareIcon(48, 42);
  const favicon32 = await createSquareIcon(32, 28);
  const favicon16 = await createSquareIcon(16, 14);
  const ico64 = await createSquareIcon(64, 56);
  const ico256 = await createSquareIcon(256, 220);

  // Generate ICO file
  console.log('3. Assembling multi-resolution ICO file...');
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

  // Generate Horizontal Logos (816x136)
  console.log('4. Generating horizontal brand logos with preserved typography...');
  const logoMarkWidth = 138;
  const logoMarkHeight = Math.round(logoMarkWidth / markAspect); // 87
  const scaledLogoMark = await sharp(croppedMark)
    .resize(logoMarkWidth, logoMarkHeight, { kernel: 'lanczos3' })
    .toBuffer();
  const logoMarkTop = Math.round((136 - logoMarkHeight) / 2); // 24-25
  const logoMarkLeft = 10;

  // Process Light Logo: keep x >= 155 from existing brand-logo.png
  const oldBrandLogo = await sharp(path.join(pubDir, 'brand-logo.png')).raw().toBuffer({ resolveWithObject: true });
  const lightLogoRaw = Buffer.from(oldBrandLogo.data);
  // Clear the left icon area (x < 155) to transparent
  for (let y = 0; y < 136; y++) {
    for (let x = 0; x < 155; x++) {
      const idx = (y * 816 + x) * 4;
      lightLogoRaw[idx] = 0;
      lightLogoRaw[idx + 1] = 0;
      lightLogoRaw[idx + 2] = 0;
      lightLogoRaw[idx + 3] = 0;
    }
  }
  const textLightPng = await sharp(lightLogoRaw, { raw: { width: 816, height: 136, channels: 4 } }).png().toBuffer();
  const brandLogoLight = await sharp(textLightPng)
    .composite([{ input: scaledLogoMark, left: logoMarkLeft, top: logoMarkTop }])
    .png()
    .toBuffer();

  // Process Dark Logo: keep x >= 155 from existing brand-logo-dark.png
  const oldBrandLogoDark = await sharp(path.join(pubDir, 'brand-logo-dark.png')).raw().toBuffer({ resolveWithObject: true });
  const darkLogoRaw = Buffer.from(oldBrandLogoDark.data);
  for (let y = 0; y < 136; y++) {
    for (let x = 0; x < 155; x++) {
      const idx = (y * 816 + x) * 4;
      darkLogoRaw[idx] = 0;
      darkLogoRaw[idx + 1] = 0;
      darkLogoRaw[idx + 2] = 0;
      darkLogoRaw[idx + 3] = 0;
    }
  }
  const textDarkPng = await sharp(darkLogoRaw, { raw: { width: 816, height: 136, channels: 4 } }).png().toBuffer();
  const brandLogoDark = await sharp(textDarkPng)
    .composite([{ input: scaledLogoMark, left: logoMarkLeft, top: logoMarkTop }])
    .png()
    .toBuffer();

  // Solid white background logo
  const logoWhite = await sharp({
    create: { width: 816, height: 136, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } }
  })
  .composite([{ input: brandLogoLight }])
  .png()
  .toBuffer();

  // Generate Emblem & Watermark
  console.log('5. Generating signature onboarding emblem & login watermark...');
  // Onboarding emblem: 1200x1200 canvas, mark width 1050
  const emblemWidth = 1050;
  const emblemHeight = Math.round(emblemWidth / markAspect); // ~662
  const scaledEmblem = await sharp(croppedMark).resize(emblemWidth, emblemHeight, { kernel: 'lanczos3' }).toBuffer();
  const onboardingEmblem = await sharp({
    create: { width: 1200, height: 1200, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([{ input: scaledEmblem, left: Math.round((1200 - emblemWidth) / 2), top: Math.round((1200 - emblemHeight) / 2) }])
  .png()
  .toBuffer();

  // Login watermark: 900x912 canvas, mark width 820
  const watermarkWidth = 820;
  const watermarkHeight = Math.round(watermarkWidth / markAspect); // ~517
  const scaledWatermark = await sharp(croppedMark).resize(watermarkWidth, watermarkHeight, { kernel: 'lanczos3' }).toBuffer();
  const loginWatermark = await sharp({
    create: { width: 900, height: 912, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([{ input: scaledWatermark, left: Math.round((900 - watermarkWidth) / 2), top: Math.round((912 - watermarkHeight) / 2) }])
  .png()
  .toBuffer();

  // 6. Write all assets to public/ and app/
  console.log('6. Writing all brand assets to disk...');
  
  // Public directory
  fs.writeFileSync(path.join(pubDir, 'brand-logo.png'), brandLogoLight);
  fs.writeFileSync(path.join(pubDir, 'logo.png'), brandLogoLight);
  fs.writeFileSync(path.join(pubDir, 'brand-logo-dark.png'), brandLogoDark);
  fs.writeFileSync(path.join(pubDir, 'logo-dark.png'), brandLogoDark);
  fs.writeFileSync(path.join(pubDir, 'logo-white.png'), logoWhite);

  fs.writeFileSync(path.join(pubDir, 'brand-mark.png'), icon512);
  fs.writeFileSync(path.join(pubDir, 'brand-mark-dark.png'), icon512Dark);
  fs.writeFileSync(path.join(pubDir, 'logo-mark.png'), icon512);
  fs.writeFileSync(path.join(pubDir, 'logo-mark-dark.png'), icon512Dark);
  fs.writeFileSync(path.join(pubDir, 'icon.png'), icon512);

  fs.writeFileSync(path.join(pubDir, 'apple-icon.png'), apple180);
  fs.writeFileSync(path.join(pubDir, 'favicon.png'), favicon48);
  fs.writeFileSync(path.join(pubDir, 'favicon.ico'), icoBuffer);

  fs.writeFileSync(path.join(pubDir, 'onboarding-emblem.png'), onboardingEmblem);
  fs.writeFileSync(path.join(pubDir, 'login-watermark.png'), loginWatermark);

  // App directory (Next.js metadata icon fallback)
  fs.writeFileSync(path.join(appDir, 'icon.png'), icon512);
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), apple180);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);

  console.log('DONE! All brand assets have been successfully updated with the new icon.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

