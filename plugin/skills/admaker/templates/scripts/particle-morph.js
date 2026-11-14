// script 어댑터 "particle-morph": 입자 한 무리가 정해 둔 모양들 사이를 차례로 모핑한다.
// 모양: scatter(화면에 흩어짐) · vortex(가운데 도는 소용돌이 고리) · text(글자) · rings(동심원 호) · burst(밖으로 터짐).
// 입자는 짧은 꼬리(streak)를 끌며 움직여 속도감이 난다. 위치는 time만의 함수라 결정적이다(이전 프레임 상태 없음).
// params: { name: "particle-morph",
//   keys: [{ t: 0, form: "scatter" }, { t: 0.4, form: "vortex", dur: 0.8 }, { t: 1.6, form: "text", dur: 0.9 }, { t: 2.8, form: "rings", dur: 0.8 }],
//     (t초에 앞 모양에서 이 모양으로 dur초 동안 옮겨 감. 입자마다 0–spread초 늦게 출발)
//   text: "TIME", font: "Archivo", fontUrl?, weight: 400, size: 300 (클립 폭 1920 기준 px), step: 6,
//   count: 2400, seed: 7, dot: 2.2, streak: 3 (꼬리 길이, 프레임), spread: 0.25, swirl: 1.4,
//   vortex: { r0: 0.12, r1: 0.32, spin: 2.2 } (반지름은 클립 짧은 변 비율, spin 라디안/초),
//   rings: { radii: [0.12, 0.2, 0.28, 0.36], spin: 0.6, gap: 0.22 },
//   color: "#FF5A1F", color2: "#FFE2C4", blend: "lighter" }
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };

const cache = new Map();

async function textPoints(width, height, p) {
  const k = width / 1920;
  const cv = new OffscreenCanvas(width, height), g = cv.getContext("2d");
  const family = p.font ?? "sans-serif", weight = p.weight ?? 400, size = Math.round((p.size ?? 300) * k);
  if (p.fontUrl && ![...document.fonts].some((f) => f.family.replace(/"/g, "") === family)) {
    const face = new FontFace(family, `url(${p.fontUrl})`); await face.load(); document.fonts.add(face);
  }
  await document.fonts.load(`${weight} ${size}px "${family}"`);
  g.font = `${weight} ${size}px "${family}"`;
  if (p.letterSpacing) g.letterSpacing = `${p.letterSpacing * k}px`;
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
  g.fillText(p.text ?? "TIME", width / 2, height / 2);
  const data = g.getImageData(0, 0, width, height).data, step = Math.max(2, Math.round((p.step ?? 6) * k));
  const pts = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) if (data[(y * width + x) * 4 + 3] > 128) pts.push([x, y]);
  return pts;
}

async function particles(width, height, p) {
  const key = JSON.stringify([width, height, p.text, p.font, p.weight, p.size, p.step, p.count, p.seed, p.letterSpacing]);
  if (cache.has(key)) return cache.get(key);
  const rand = rng(p.seed ?? 7);
  const pts = (p.keys ?? []).some((k) => k.form === "text") ? await textPoints(width, height, p) : [];
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const count = p.count ?? 2400;
  const parts = [];
  for (let i = 0; i < count; i++) {
    const t = pts.length ? pts[i % pts.length] : [width / 2, height / 2];
    parts.push({
      tx: t[0] + (i >= pts.length ? (rand() - 0.5) * 3 : 0), ty: t[1] + (i >= pts.length ? (rand() - 0.5) * 3 : 0),
      sx: rand() * width, sy: rand() * height, a: rand() * Math.PI * 2, rr: rand(), m: rand(), sp: 0.6 + rand() * 0.8,
      delay: rand(), ph: rand() * 6.283, dir: rand() < 0.5 ? -1 : 1, mix: rand(), r: 0.6 + rand() * 0.9,
    });
  }
  cache.set(key, parts);
  return parts;
}

function formPos(q, form, time, W, H, p) {
  const cx = W / 2, cy = H / 2, S = Math.min(W, H);
  switch (form) {
    case "vortex": {
      const v = p.vortex ?? {}, r0 = (v.r0 ?? 0.12) * S, r1 = (v.r1 ?? 0.32) * S;
      const R = r0 + (r1 - r0) * q.rr ** 0.7;
      const a = q.a + time * (v.spin ?? 2.2) * q.sp * (S / Math.max(1, R)) * 0.25;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    }
    case "rings": {
      const g = p.rings ?? {}, radii = g.radii ?? [0.12, 0.2, 0.28, 0.36];
      const k = Math.min(radii.length - 1, Math.floor(q.m * radii.length));
      const gap = g.gap ?? 0.22;
      // 호: 각 고리를 둘로 나눠 사이를 비운다
      const half = Math.floor(q.a / Math.PI);
      const a = half * Math.PI + (q.a % Math.PI) * (1 - gap) + time * (g.spin ?? 0.6) * (k % 2 ? -1 : 1) + k * 0.7;
      const R = radii[k] * S + (q.rr - 0.5) * S * 0.012;
      return [cx + Math.cos(a) * R, cy + Math.sin(a) * R];
    }
    case "text":
      return [q.tx + Math.sin(time * 3 + q.ph) * 0.8, q.ty + Math.cos(time * 2.6 + q.ph) * 0.8];
    case "burst": {
      const R = (0.55 + q.rr * 0.6) * Math.max(W, H);
      return [cx + Math.cos(q.a) * R, cy + Math.sin(q.a) * R];
    }
    default:
      return [q.sx + Math.sin(time * 0.7 + q.ph) * 14, q.sy + Math.cos(time * 0.6 + q.ph) * 14];
  }
}

function posAt(q, time, W, H, p) {
  const keys = p.keys ?? [{ t: 0, form: "scatter" }];
  const spread = p.spread ?? 0.25, swirl = p.swirl ?? 1.4;
  let pos = formPos(q, keys[0].form, time, W, H, p);
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i];
    const k = ease((time - key.t - q.delay * spread) / Math.max(0.05, key.dur ?? 0.8));
    if (k <= 0) break;
    const to = formPos(q, key.form, time, W, H, p);
    let x = pos[0] + (to[0] - pos[0]) * k, y = pos[1] + (to[1] - pos[1]) * k;
    // 옮겨 가는 동안 가운데를 축으로 돌았다가(끝에서 0) 자리에 닿는다
    const a = (key.swirl ?? swirl) * (1 - k) * k * 4 * q.dir;
    if (a) {
      const dx = x - W / 2, dy = y - H / 2;
      x = W / 2 + dx * Math.cos(a) - dy * Math.sin(a); y = H / 2 + dx * Math.sin(a) + dy * Math.cos(a);
    }
    pos = [x, y];
  }
  return pos;
}

export default async function render(ctx, { width, height, time, params }) {
  const p = params ?? {};
  const parts = await particles(width, height, p);
  const k = width / 1920, dot = (p.dot ?? 2.2) * k;
  const back = (p.streak ?? 3) / 30;
  const c1 = p.color ?? "#FF5A1F", c2 = p.color2 ?? "#FFE2C4";
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = p.blend ?? "lighter";
  ctx.lineCap = "round";
  for (const q of parts) {
    const [x, y] = posAt(q, time, width, height, p);
    const [px, py] = posAt(q, Math.max(0, time - back), width, height, p);
    const tw = 0.75 + 0.25 * Math.sin(time * 5 + q.ph);
    ctx.globalAlpha = Math.min(1, 0.55 * tw + 0.35);
    ctx.strokeStyle = q.mix < 0.3 ? c2 : c1;
    ctx.lineWidth = dot * q.r;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x + 0.01, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
export const options = { fps: 30 };
