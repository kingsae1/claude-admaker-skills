// 도트 스프라이트 시트 PNG를 만든다 — 글자 격자(한 글자 = 한 픽셀)로 그린 프레임들을 한 장의 시트로.
// 사용: node pixel-sprite.mjs sprite.json out/hero [--scale 1]
//   sprite.json: {
//     "palette": { ".": null, "k": "#18142a", "r": "#dc4650", ... },   // null = 투명
//     "frames": { "walk": [["..kk..", ".krrk.", ...], [...], ...], "idle": [[...]] },
//     "cols": 6                                                     // 선택: 시트 가로 칸 수(기본 = 전체 프레임 수)
//   }
//   모든 프레임은 같은 크기여야 한다(짧은 줄은 오른쪽을 투명으로 채움).
// 결과: out/hero.png(시트, 기본 1배 — 엔진에서 style.pixelated로 키움)와 out/hero.json
//   { src, cellWidth, cellHeight, cols, rows, count, animations: { walk: { from, count } } }
//   → 애니메이션 하나만 쓰는 클립은 그 애니메이션의 프레임만 따로 뽑은 out/hero-<name>.png도 함께 만든다.
// 의존성 없음(node:zlib로 PNG 인코딩).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const [specFile, outBase, ...rest] = process.argv.slice(2);
if (!specFile || !outBase) {
  console.error("사용: node pixel-sprite.mjs sprite.json out/hero [--scale 1]");
  process.exit(1);
}
const scaleIdx = rest.indexOf("--scale");
const scale = Math.max(1, Math.floor(Number(scaleIdx >= 0 ? rest[scaleIdx + 1] : 1)) || 1);

const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
const palette = new Map();
for (const [ch, hex] of Object.entries(spec.palette ?? {})) palette.set(ch, hex ? parseHex(hex) : null);

function parseHex(hex) {
  const m = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(String(hex).trim());
  if (!m) throw new Error(`팔레트 색 형식이 틀립니다: ${hex} (#RRGGBB 또는 #RRGGBBAA)`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, m[2] ? parseInt(m[2], 16) : 255];
}

const groups = Object.entries(spec.frames ?? {});
if (!groups.length) throw new Error("frames가 비어 있습니다");
const all = [];
const animations = {};
for (const [name, frames] of groups) {
  animations[name] = { from: all.length, count: frames.length };
  all.push(...frames);
}
const cellH = Math.max(...all.map((f) => f.length));
const cellW = Math.max(...all.flatMap((f) => f.map((row) => [...row].length)));
for (const f of all) for (const row of f) for (const ch of row) if (!palette.has(ch)) throw new Error(`팔레트에 없는 글자: "${ch}"`);

function sheetOf(frames, cols) {
  const rows = Math.ceil(frames.length / cols);
  const w = cols * cellW * scale;
  const h = rows * cellH * scale;
  const px = Buffer.alloc(w * h * 4);
  frames.forEach((frame, i) => {
    const ox = (i % cols) * cellW;
    const oy = Math.floor(i / cols) * cellH;
    frame.forEach((row, y) =>
      [...row].forEach((ch, x) => {
        const c = palette.get(ch);
        if (!c) return;
        for (let dy = 0; dy < scale; dy++)
          for (let dx = 0; dx < scale; dx++) {
            const at = (((oy + y) * scale + dy) * w + (ox + x) * scale + dx) * 4;
            px[at] = c[0];
            px[at + 1] = c[1];
            px[at + 2] = c[2];
            px[at + 3] = c[3];
          }
      }),
    );
  });
  return { png: encodePng(w, h, px), cols, rows };
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePng(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(path.dirname(path.resolve(outBase)), { recursive: true });
const cols = Math.max(1, Math.min(all.length, Math.floor(Number(spec.cols)) || all.length));
const full = sheetOf(all, cols);
fs.writeFileSync(`${outBase}.png`, full.png);
const perAnim = {};
for (const [name, frames] of groups) {
  if (groups.length === 1) break;
  const one = sheetOf(frames, frames.length);
  const file = `${outBase}-${name}.png`;
  fs.writeFileSync(file, one.png);
  perAnim[name] = { src: path.basename(file), spriteSheet: { cols: frames.length, rows: 1, count: frames.length } };
}
const meta = {
  src: path.basename(`${outBase}.png`),
  cellWidth: cellW * scale,
  cellHeight: cellH * scale,
  cols: full.cols,
  rows: full.rows,
  count: all.length,
  animations,
  sheets: perAnim,
};
fs.writeFileSync(`${outBase}.json`, JSON.stringify(meta, null, 2));
console.log(`${outBase}.png ${full.cols}×${full.rows}칸, 칸 ${meta.cellWidth}×${meta.cellHeight}px, 프레임 ${all.length}`);
