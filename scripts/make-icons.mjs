// Draws the extension icons (a phone with a check mark) into icons/*.png without any dependencies.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const SIZES = [16, 32, 48, 128];
const SAMPLES = 4;

const BG_TOP = [74, 108, 240];
const BG_BOTTOM = [44, 62, 176];
const WHITE = [255, 255, 255];

function inRoundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Colour of one sample point in unit square coordinates, or null for transparent.
function sample(x, y) {
  if (!inRoundRect(x, y, 0, 0, 1, 1, 0.22)) return null;

  const phoneOuter = inRoundRect(x, y, 0.27, 0.14, 0.73, 0.86, 0.09);
  const phoneInner = inRoundRect(x, y, 0.33, 0.2, 0.67, 0.8, 0.045);
  if (phoneOuter && !phoneInner) return WHITE;

  const stroke = 0.045;
  const onCheck =
    distToSegment(x, y, 0.4, 0.5, 0.48, 0.6) <= stroke || distToSegment(x, y, 0.48, 0.6, 0.62, 0.4) <= stroke;
  if (onCheck) return WHITE;

  return BG_TOP.map((c, i) => c + (BG_BOTTOM[i] - c) * y);
}

function render(size) {
  const px = Buffer.alloc(size * size * 4);
  const total = SAMPLES * SAMPLES;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sj = 0; sj < SAMPLES; sj++) {
        for (let si = 0; si < SAMPLES; si++) {
          const c = sample((i + (si + 0.5) / SAMPLES) / size, (j + (sj + 0.5) / SAMPLES) / size);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; a++;
        }
      }
      const o = (j * size + i) * 4;
      if (a) {
        px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a;
        px[o + 3] = Math.round((a / total) * 255);
      }
    }
  }
  return px;
}

function crc32(buf) {
  let c;
  let crc = 0xffffffff;
  for (const byte of buf) {
    c = (crc ^ byte) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const raw = render(size);
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0;
    raw.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('icons', { recursive: true });
for (const size of SIZES) writeFileSync(`icons/icon-${size}.png`, png(size));
console.log(`wrote ${SIZES.length} icons to icons/`);
