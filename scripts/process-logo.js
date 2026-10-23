const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.slice(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function encodePng(width, height, rgbaBuffer) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgbaBuffer.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const idat = zlib.deflateSync(raw);
  const chunkIHDR = makeChunk('IHDR', ihdr);
  const chunkIDAT = makeChunk('IDAT', idat);
  const chunkIEND = makeChunk('IEND', Buffer.alloc(0));
  return Buffer.concat([header, chunkIHDR, chunkIDAT, chunkIEND]);
}

function decodePng(filePath) {
  const buf = fs.readFileSync(filePath);
  let offset = 8;
  const idatChunks = [];
  let width, height;
  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    if (type === 'IHDR') {
      width = buf.readUInt32BE(offset + 8);
      height = buf.readUInt32BE(offset + 12);
    } else if (type === 'IDAT') {
      idatChunks.push(buf.slice(offset + 8, offset + 8 + len));
    }
    offset += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * 4;
  const rgba = Buffer.alloc(width * height * 4);
  let prevRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const row = raw.slice(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const curRow = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= 4 ? curRow[i - 4] : 0;
      const b = prevRow[i];
      const c = i >= 4 ? prevRow[i - 4] : 0;
      let val = row[i];
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        val = (val + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c))) & 0xff;
      }
      curRow[i] = val;
    }
    curRow.copy(rgba, y * stride);
    prevRow = curRow;
  }
  return { width, height, rgba };
}

function cropRgba(srcRgba, srcW, srcH, minX, minY, w, h) {
  const dst = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = minY + y;
    if (sy < 0 || sy >= srcH) continue;
    for (let x = 0; x < w; x++) {
      const sx = minX + x;
      if (sx < 0 || sx >= srcW) continue;
      const srcIdx = (sy * srcW + sx) * 4;
      const dstIdx = (y * w + x) * 4;
      dst[dstIdx] = srcRgba[srcIdx];
      dst[dstIdx + 1] = srcRgba[srcIdx + 1];
      dst[dstIdx + 2] = srcRgba[srcIdx + 2];
      dst[dstIdx + 3] = srcRgba[srcIdx + 3];
    }
  }
  return dst;
}

function unmatPixel(r, g, b) {
  if (r >= 252 && g >= 252 && b >= 252) {
    return [0, 0, 0, 0];
  }

  const minC = Math.min(r, g, b);
  const maxC = Math.max(r, g, b);
  const saturation = maxC - minC;

  let alpha, fgR, fgG, fgB;

  if (saturation < 25) {
    // Neutral dark/black line & font
    if (minC <= 40) {
      alpha = 255;
      fgR = r; fgG = g; fgB = b;
    } else {
      const a = (255 - minC) / (255 - 40);
      alpha = Math.round(Math.max(0, Math.min(255, a * 255)));
      const aNorm = Math.max(alpha / 255, 0.04);
      fgR = Math.max(0, Math.min(255, Math.round(255 - (255 - r) / aNorm)));
      fgG = Math.max(0, Math.min(255, Math.round(255 - (255 - g) / aNorm)));
      fgB = Math.max(0, Math.min(255, Math.round(255 - (255 - b) / aNorm)));
    }
  } else {
    // Terracotta 'Hire' or copper swoosh
    if (b <= 80) {
      alpha = 255;
      fgR = r; fgG = g; fgB = b;
    } else {
      const a = (255 - b) / (255 - 80);
      alpha = Math.round(Math.max(0, Math.min(255, a * 255)));
      const aNorm = Math.max(alpha / 255, 0.04);
      fgR = Math.max(0, Math.min(255, Math.round(255 - (255 - r) / aNorm)));
      fgG = Math.max(0, Math.min(255, Math.round(255 - (255 - g) / aNorm)));
      fgB = Math.max(0, Math.min(255, Math.round(255 - (255 - b) / aNorm)));
    }
  }
  return [fgR, fgG, fgB, alpha];
}

function makeTransparent(rgba, w, h) {
  const dst = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const [r, g, b, a] = unmatPixel(rgba[idx], rgba[idx + 1], rgba[idx + 2]);
    dst[idx] = r;
    dst[idx + 1] = g;
    dst[idx + 2] = b;
    dst[idx + 3] = a;
  }
  return dst;
}

const srcFile = 'C:\\Users\\Administrator\\.gemini\\antigravity-ide\\brain\\6c0fc940-4bd0-4a49-bc23-107305cfa523\\.user_uploaded\\media_1792777432353.png';
const { width, height, rgba } = decodePng(srcFile);

// 1. Full logo crop
const fullCropX = 22;
const fullCropY = 44;
const fullCropW = 920;
const fullCropH = 200;

const fullOpaque = cropRgba(rgba, width, height, fullCropX, fullCropY, fullCropW, fullCropH);
const fullTrans = makeTransparent(fullOpaque, fullCropW, fullCropH);

// 2. Icon / Mark crop (square frame with NN emblem)
// Frame bounds: x 23..198 (w=176), y 44..220 (h=176) -> a perfect 176x176 square!
const markCropX = 23;
const markCropY = 44;
const markCropW = 176;
const markCropH = 176;

const markOpaque = cropRgba(rgba, width, height, markCropX, markCropY, markCropW, markCropH);
const markTrans = makeTransparent(markOpaque, markCropW, markCropH);

// Square 180x180 padded mark
const markPad = 4;
const markSquareTrans = Buffer.alloc(184 * 184 * 4);
for (let y = 0; y < markCropH; y++) {
  for (let x = 0; x < markCropW; x++) {
    const sIdx = (y * markCropW + x) * 4;
    const dIdx = ((y + markPad) * 184 + (x + markPad)) * 4;
    markSquareTrans[dIdx] = markTrans[sIdx];
    markSquareTrans[dIdx + 1] = markTrans[sIdx + 1];
    markSquareTrans[dIdx + 2] = markTrans[sIdx + 2];
    markSquareTrans[dIdx + 3] = markTrans[sIdx + 3];
  }
}

const pubDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'app');

fs.writeFileSync(path.join(pubDir, 'logo.png'), encodePng(fullCropW, fullCropH, fullTrans));
fs.writeFileSync(path.join(pubDir, 'logo-white.png'), encodePng(fullCropW, fullCropH, fullOpaque));
fs.writeFileSync(path.join(pubDir, 'logo-mark.png'), encodePng(184, 184, markSquareTrans));
fs.writeFileSync(path.join(appDir, 'icon.png'), encodePng(184, 184, markSquareTrans));

console.log('Successfully generated high-fidelity logo assets:');
console.log(' - public/logo.png: Full logo (transparent)');
console.log(' - public/logo-white.png: Full logo (white background)');
console.log(' - public/logo-mark.png: Monogram mark icon (transparent)');
console.log(' - app/icon.png: Browser tab favicon');
