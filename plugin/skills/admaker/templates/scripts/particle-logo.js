// script 어댑터 "particle-logo": 화면에 흩어져 반짝이던 작은 입자들이 소용돌이치며 모여 워드마크(글자 또는 로고 이미지)가 된다.
// 결정적: 입자 배치는 시드 RNG로 한 번만 만들고, 위치는 time의 함수. Canvas2D라 소재 위에 투명하게 얹힌다.
// params: { name: "particle-logo", text: "CREATE", font: "Pretendard", weight: 400 (엔진처럼 굵은 파일을 normal로 등록), size: 230 (클립 폭 1080 기준 px), fontUrl?,
//           image?: 로고 PNG/SVG URL(있으면 text 대신 알파로 샘플링), color: "#7FA8FF", color2: "#FFFFFF",
//           count: 1600, step: 5 (샘플 간격 px), dot: 4, seed: 11, gather: [0.4, 1.9] (모이기 시작·끝 초), swirl: 1.2, hold: true }
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };

const cache = new Map(); // 크기·문구별 입자 배치

async function targets(width, height, p) {
  const key = JSON.stringify([width, height, p.text, p.image, p.font, p.weight, p.size, p.step, p.count, p.seed]);
  if (cache.has(key)) return cache.get(key);
  const k = width / 1080;
  const cv = new OffscreenCanvas(width, height), g = cv.getContext("2d");
  if (p.image) {
    const img = await createImageBitmap(await (await fetch(p.image)).blob());
    const s = Math.min((width * 0.8) / img.width, (height * 0.8) / img.height);
    g.drawImage(img, (width - img.width * s) / 2, (height - img.height * s) / 2, img.width * s, img.height * s);
  } else {
    const family = p.font ?? "Pretendard", weight = p.weight ?? 400, size = Math.round((p.size ?? 230) * k);
    if (p.fontUrl && ![...document.fonts].some((f) => f.family.replace(/"/g, "") === family)) {
      const face = new FontFace(family, `url(${p.fontUrl})`); await face.load(); document.fonts.add(face);
    }
    await document.fonts.load(`${weight} ${size}px "${family}"`);
    g.font = `${weight} ${size}px "${family}"`;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#fff";
    g.fillText(p.text ?? "CREATE", width / 2, height / 2);
  }
  const data = g.getImageData(0, 0, width, height).data, step = Math.max(2, Math.round((p.step ?? 5) * k));
  const pts = [];
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) if (data[(y * width + x) * 4 + 3] > 128) pts.push([x, y]);
  const rand = rng(p.seed ?? 11), count = Math.min(p.count ?? 1600, pts.length);
  // 고르게 덜어내기(섞은 뒤 앞에서 count개) + 입자마다 시작점·지연·반짝임 위상
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
  const parts = pts.slice(0, count).map(([tx, ty]) => ({
    tx, ty, sx: rand() * width, sy: rand() * height, delay: rand() * 0.35, ph: rand() * 6.283, tw: 2 + rand() * 4, mix: rand(), r: 0.6 + rand() * 0.8,
  }));
  cache.set(key, parts);
  return parts;
}

export default async function render(ctx, { width, height, time, params }) {
  const parts = await targets(width, height, params);
  const [g0, g1] = params.gather ?? [0.4, 1.9], span = Math.max(0.1, g1 - g0 - 0.35);
  const swirl = params.swirl ?? 1.2, dot = (params.dot ?? 4) * (width / 1080);
  const c1 = params.color ?? "#7FA8FF", c2 = params.color2 ?? "#FFFFFF";
  const cx = width / 2, cy = height / 2;
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = "lighter";
  for (const q of parts) {
    const k = ease((time - g0 - q.delay) / span);                   // 0 흩어짐 → 1 자리
    // 흩어진 동안 천천히 떠다님
    const fx = q.sx + Math.sin(time * 0.7 + q.ph) * 18, fy = q.sy + Math.cos(time * 0.6 + q.ph) * 18;
    // 모이는 동안 화면 중심을 축으로 소용돌이 (끝에서 0)
    const a = swirl * (1 - k) * (1 - k) * (q.mix > 0.5 ? 1 : -1);
    let x = fx + (q.tx - fx) * k, y = fy + (q.ty - fy) * k;
    const dx = x - cx, dy = y - cy;
    x = cx + dx * Math.cos(a) - dy * Math.sin(a); y = cy + dx * Math.sin(a) + dy * Math.cos(a);
    // 반짝임: 흩어졌을 땐 깜빡이고, 자리 잡으면 거의 고정
    const tw = 0.5 + 0.5 * Math.sin(time * q.tw + q.ph);
    const alpha = (0.65 + 0.35 * k) * (1 - (1 - k) * 0.5 * tw);
    const s = dot * q.r * (0.7 + 0.3 * k);
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.fillStyle = q.mix < 0.25 ? c2 : c1;
    ctx.fillRect(x - s / 2, y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
export const options = { fps: 30 };
