// 번개(lightning) — references/shots/lightning-strike.md
// 에너지 드링크·게임·세일 광고의 번쩍 강조. 글자 뒤로 내리치는 번개, 화면 가장자리에서 튀는 전기.
// 경로는 중점 변위(midpoint displacement)로 만들고, Shape(path) 클립 + opacity·blur keyframes만 쓰므로
// 엔진 렌더와 admaker 앱 가져오기(to-admaker-import.mjs) 둘 다 그대로 됩니다.
//
//   import { boltPath, boltClips } from "./lightning.mjs";
//   const bolt = boltClips({ from: [700, 0], to: [420, 1100], seed: 7, at: 1.2, duration: 0.6, flashes: 2 });
//   for (const c of bolt) add(c);   // 배열 순서 = 겹침 순서(앞 = 아래: 바깥 빛 → 안쪽 심)
//
// 중점 변위(1D): 선분의 중점을 선분에 수직으로 밀고 두 반쪽에 같은 일을 depth번 되풀이한다.
// 참고: https://en.wikipedia.org/wiki/Midpoint_displacement  (Diamond-square 문서의 1D 변위 설명)

const r2 = (v) => Math.round(v * 100) / 100;
const us = (s) => Math.round(s * 1e6);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** 정수 해시 → [0, 1). 같은 (seed, a, b)는 언제나 같은 값(순서와 무관) */
function hash01(seed, a = 0, b = 0) {
  let h = (Math.imul(seed | 0, 0x27d4eb2d) ^ Math.imul(a | 0, 0x165667b1) ^ Math.imul(b | 0, 0x9e3779b1)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const seedNum = (s) => {
  if (Number.isFinite(Number(s))) return Math.round(Number(s));
  let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h | 0;
};

/**
 * 중점 변위 점 목록 (2^depth + 1개, 첫 점 = from, 끝 점 = to).
 * 단계 k(0부터)의 변위 = (주 길이 / 2^k) × roughness × u, u ∈ [-0.5, 0.5], 방향은 그 구간의 수직.
 * 단계마다 구간 길이의 공칭값(주 길이 / 2^k)을 쓰므로 모든 점은 from→to 선분에서 주 길이 × roughness 미만 거리에 있다
 * (변위 합 < 0.5 × r × L × (1 + 1/2 + 1/4 …) = r × L).
 */
function displace(from, to, seed, roughness, depth, salt = 0) {
  const L = Math.hypot(to[0] - from[0], to[1] - from[1]);
  let pts = [from.slice(), to.slice()];
  for (let k = 0; k < depth; k++) {
    const amp = (L / 2 ** k) * roughness;
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      const u = hash01(seed, k * 4096 + i, salt) - 0.5;
      const off = amp * u;
      next.push([(ax + bx) / 2 - (dy / len) * off, (ay + by) / 2 + (dx / len) * off], pts[i + 1]);
    }
    pts = next;
  }
  pts[0] = from.slice(); pts[pts.length - 1] = to.slice();
  return pts;
}

const toD = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${r2(x)} ${r2(y)}`).join("");

/**
 * 번개 경로 (SVG path d).
 * @param {object} o
 * @param {number[]} o.from, o.to     시작·끝 점 [x, y] (px)
 * @param {number|string} [o.seed=1]  같은 seed → 같은 경로
 * @param {number} [o.roughness=0.5] 0–1.5. 0이면 직선, 1 넘으면 크게 꺾임
 * @param {number} [o.depth=6]       1–9. 주 줄기 점 = 2^depth + 1
 * @param {number} [o.branches=2]    가지 최대 개수
 * @param {number} [o.branchChance=0.35] 주 줄기 점마다 가지가 날 확률
 * @returns {{ d: string, branches: string[], points: number[][], branchPoints: number[][][] }}
 */
export function boltPath({ from, to, seed = 1, roughness = 0.5, depth = 6, branches = 2, branchChance = 0.35 } = {}) {
  if (!Array.isArray(from) || !Array.isArray(to)) throw new Error("boltPath: from, to = [x, y]가 필요합니다");
  const A = [Number(from[0]), Number(from[1])], B = [Number(to[0]), Number(to[1])];
  if (![...A, ...B].every(Number.isFinite)) throw new Error("boltPath: from, to 좌표가 숫자가 아닙니다");
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
  if (L < 1e-6) { console.warn("boltPath: from과 to가 같아 빈 경로를 돌려줍니다"); return { d: "", branches: [], points: [], branchPoints: [] }; }
  const s = seedNum(seed), r = clamp(Number(roughness) || 0, 0, 1.5), dep = clamp(Math.round(Number.isFinite(Number(depth)) ? Number(depth) : 6), 1, 9);
  const pts = displace(A, B, s, r, dep);

  // 가지: 끝 점을 뺀 주 줄기 점 중 branchChance로 뽑힌 곳에서, 줄기 방향 ±(20°–45°)로 주 길이 0.3–0.6의 짧은 볼트
  const out = [], outPts = [], max = Math.max(0, Math.round(Number(branches) || 0)), chance = clamp(Number(branchChance) || 0, 0, 1);
  for (let i = 1; i < pts.length - 1 && out.length < max; i++) {
    if (hash01(s, i, 0xb1) >= chance) continue;
    const [px, py] = pts[i], [nx, ny] = pts[i + 1], [qx, qy] = pts[i - 1];
    const dir = Math.atan2(ny - qy, nx - qx);
    const side = hash01(s, i, 0xb2) < 0.5 ? -1 : 1;
    const ang = dir + side * ((20 + 25 * hash01(s, i, 0xb3)) * Math.PI) / 180;
    const len = L * (0.3 + 0.3 * hash01(s, i, 0xb4));
    const end = [px + Math.cos(ang) * len, py + Math.sin(ang) * len];
    const bp = displace([px, py], end, s, r, Math.max(1, dep - 2), 0x100 + i);
    out.push(toD(bp)); outPts.push(bp);
  }
  return { d: toD(pts), branches: out, points: pts, branchPoints: outPts };
}

/**
 * 깜빡임 정지점(초, 클립 기준 0부터). flashes번 0 → 1 → 0.2 → 1 → 0, 번쩍 하나(1 구간)는 60–120ms.
 * 번쩍 사이 간격은 duration을 flashes로 나눈 칸 안에서 정한다.
 */
export function flickerStops({ duration, flashes = 2, seed = 1, peak = 1 } = {}) {
  const n = Math.max(1, Math.round(Number(flashes) || 1)), slot = duration / n, s = seedNum(seed), stops = [];
  for (let k = 0; k < n; k++) {
    const t0 = k * slot;
    const on1 = 0.06 + 0.06 * hash01(s, k, 0xf1), dip = 0.03, on2 = 0.06 + 0.06 * hash01(s, k, 0xf2);
    // 칸이 짧으면 비율로 줄임(번쩍 한 세트 = on1 + dip + on2 + 꺼짐 0.02)
    const need = 0.005 + on1 + dip + on2 + 0.02, f = Math.min(1, (slot * 0.98) / need);
    let t = t0;
    stops.push([t, 0]);
    t += 0.005 * f; stops.push([t, peak]);
    t += on1 * f; stops.push([t, peak * 0.2]);
    t += dip * f; stops.push([t, peak]);
    t += on2 * f; stops.push([t, 0]);
  }
  return stops;
}

/**
 * 번개 클립 (Shape path, 앱 호환). 바깥 빛(넓고 0.4 투명 + blur) 아래, 안쪽 심(얇고 흰색) 위.
 * 가지는 굵기 × 0.5로 따로 클립을 만든다.
 * @param {object} o
 * @param {number[]} o.from, o.to
 * @param {number|string} [o.seed=1]
 * @param {string} [o.color="#e8f4ff"]  안쪽 심 색
 * @param {string} [o.glow="#7fb8ff"]   바깥 빛 색
 * @param {number} [o.width=6]          심 굵기(px). 바깥 빛은 × 4
 * @param {number} [o.flashes=2]        번쩍 횟수
 * @param {number} o.at                 시작(초)
 * @param {number} [o.duration=0.5]     길이(초). 번쩍 한 번에 0.2–0.3초가 적당
 * @param {boolean} [o.reshape=false]   true면 번쩍마다 seed+k로 다른 경로(클립을 번쩍 수만큼 나눔)
 * @param {number} [o.blur]             바깥 빛 blur (기본 width × 1.5)
 * @param {string} [o.id="bolt"]        클립 id 앞부분
 * @param {object} [o.path]             boltPath에 넘길 roughness·depth·branches·branchChance
 * @returns {object[]} 클립 배열(앞 = 아래)
 */
export function boltClips({ from, to, seed = 1, color = "#e8f4ff", glow = "#7fb8ff", width = 6, flashes = 2, at, duration = 0.5, reshape = false, blur, id = "bolt", glowScale = 4, glowOpacity = 0.4, path = {}, roughness, depth, branches, branchChance } = {}) {
  if (!(Number(at) >= 0)) throw new Error("boltClips: at(초)이 필요합니다");
  if (!(duration > 0)) throw new Error("boltClips: duration(초)은 0보다 커야 합니다");
  const pathOpt = { ...path, ...(roughness != null && { roughness }), ...(depth != null && { depth }), ...(branches != null && { branches }), ...(branchChance != null && { branchChance }) };
  const n = Math.max(1, Math.round(Number(flashes) || 1));
  const groups = reshape ? Array.from({ length: n }, (_, k) => ({ seed: seedNum(seed) + k, from: at + (k * duration) / n, to: at + ((k + 1) * duration) / n, flashes: 1, tag: `_${k + 1}` }))
    : [{ seed: seedNum(seed), from: at, to: at + duration, flashes: n, tag: "" }];
  const gBlur = blur ?? width * 1.5;
  const clips = [];
  for (const g of groups) {
    const bolt = boltPath({ from, to, seed: g.seed, ...pathOpt });
    if (!bolt.d) { console.warn("boltClips: 빈 경로라 클립을 만들지 않습니다"); return []; }
    const layers = [
      { part: "glow", pts: [bolt.points], w: width * glowScale, c: glow, peak: glowOpacity, blur: gBlur },
      ...(bolt.branchPoints.length ? [{ part: "branch_glow", pts: bolt.branchPoints, w: width * 0.5 * glowScale, c: glow, peak: glowOpacity, blur: gBlur }] : []),
      ...(bolt.branchPoints.length ? [{ part: "branch", pts: bolt.branchPoints, w: width * 0.5, c: color, peak: 1, blur: 0 }] : []),
      { part: "core", pts: [bolt.points], w: width, c: color, peak: 1, blur: 0 },
    ];
    const stops = flickerStops({ duration: g.to - g.from, flashes: g.flashes, seed: g.seed });
    const D = g.to - g.from;
    for (const ly of layers) {
      // 상자 = 점들의 경계 + 여백(선 굵기 절반 + blur 번짐). path는 상자 왼쪽 위 기준으로 옮긴다
      const all = ly.pts.flat(), pad = Math.ceil(ly.w / 2 + ly.blur * 3 + 2);
      const x0 = Math.floor(Math.min(...all.map((p) => p[0])) - pad), y0 = Math.floor(Math.min(...all.map((p) => p[1])) - pad);
      const x1 = Math.ceil(Math.max(...all.map((p) => p[0])) + pad), y1 = Math.ceil(Math.max(...all.map((p) => p[1])) + pad);
      const w = x1 - x0, h = y1 - y0;
      const d = ly.pts.map((p) => toD(p.map(([x, y]) => [x - x0, y - y0]))).join("");
      const params = {};
      for (const [t, v] of stops) params[`${+((t / D) * 100).toFixed(3)}%`] = { opacity: r2(v * ly.peak), ...(ly.blur ? { blur: r2(ly.blur) } : {}) };
      params["100%"] = { opacity: 0, ...(ly.blur ? { blur: r2(ly.blur) } : {}) };
      const cid = `${id}${g.tag}_${ly.part}`;
      clips.push({
        id: cid, name: cid, type: "Shape", src: "shape", shapeType: "path",
        timing: { display: { from: us(g.from), to: us(g.to) }, duration: us(D), playbackRate: 1 },
        transform: { x: x0, y: y0, width: w, height: h, angle: 0, opacity: 1 },
        style: { path: d, viewBox: [0, 0, w, h], fill: "transparent", fillOpacity: 0, stroke: { color: ly.c, width: r2(ly.w), cap: "round", join: "round" } },
        animations: [{ type: "keyframes", options: { duration: us(D), delay: 0, easing: "linear" }, params }],
      });
    }
  }
  return clips;
}
