// 씬 이음새(seam) 계산: 클립의 keyframes 모션을 시각별로 풀어 위치·크기·투명도를 구하고, 컷 양쪽의 움직임을 비교한다.
// validate.mjs가 쓰고, 샷 함수에서 직접 불러 확인해도 된다. 규칙은 references/transitions.md §0(이음새 원칙).
// 이음새 원칙(같은 축·같은 방향·컷 순간 속도 맞춤·Z축 크기 변화 부호)은 HyperFrames motion-doctrine·cut-the-curve의
// Seam Gate 아이디어를 admaker ProjectJSON용으로 다시 쓴 것 (https://github.com/heygen-com/hyperframes, Apache-2.0).
//
// 장부(SEAMS, timeline.mjs에서 export): 컷마다 한 줄.
//   { at: 4.2, technique: "cut-the-curve LEFT",
//     exit:  { clip: "footage_1", axis: "x", dir: -1 },
//     entry: { clip: "footage_2", axis: "x", dir: -1 } }
//   axis: "x" | "y" | "z"(크기). dir: x −1 왼쪽 / +1 오른쪽, y −1 위 / +1 아래, z +1 앞으로(커짐) / −1 뒤로(작아짐).
//   type: "cut"(기본, 한 프레임에 한쪽만 보임) | "transition"(Transition 클립·겹침 전환, 겹침 검사 안 함) | "match-cut"(방향 검사 대신 carrier 위치만)
//   carrier: { out: 클립 id, in: 클립 id } — 컷 앞뒤 1프레임에서 두 클립의 중심·크기가 맞는지 (12px · 5%)

const POW = { Quad: 2, Cubic: 3, Quart: 4, Quint: 5 };
const GSAP_POW = { power1: 2, power2: 3, power3: 4, power4: 5, quad: 2, cubic: 3, quart: 4, quint: 5, strong: 5 };
const inOf = {
  Sine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  Expo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  Circ: (t) => 1 - Math.sqrt(1 - t * t),
  Back: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  Elastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))),
  Bounce: (t) => 1 - bounceOut(1 - t),
};
function bounceOut(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}
const dirs = (f) => ({ In: f, Out: (t) => 1 - f(1 - t), InOut: (t) => (t < 0.5 ? f(2 * t) / 2 : 1 - f(2 - 2 * t) / 2) });

/** 이징 이름(엔진 easeOutCubic 계열, gsap power2.out 계열, steps(n)) → 함수. 모르는 이름은 선형 */
export function easingFn(name) {
  if (!name || name === "linear" || name === "none") return (t) => t;
  let m = /^ease(In|Out|InOut)(\w+)$/.exec(name);
  if (m) {
    const base = POW[m[2]] ? (t) => Math.pow(t, POW[m[2]]) : inOf[m[2]];
    return base ? dirs(base)[m[1]] : (t) => t;
  }
  m = /^(\w+?)(?:\.(in|out|inOut))?(?:\(.*\))?$/.exec(name);
  if (m) {
    const d = m[2] === "in" ? "In" : m[2] === "inOut" ? "InOut" : "Out";
    const k = m[1].toLowerCase();
    if (k === "steps") {
      const n = Number(/\((\d+)\)/.exec(name)?.[1] ?? 1);
      return (t) => Math.min(1, Math.floor(t * n) / n);
    }
    const base = GSAP_POW[k] ? (t) => Math.pow(t, GSAP_POW[k]) : inOf[k[0].toUpperCase() + k.slice(1)];
    if (base) return dirs(base)[d];
  }
  return (t) => t;
}

const ADD = ["x", "y", "angle", "blur", "motionBlur"];
const MUL = ["scale", "scaleX", "scaleY", "opacity"];
const pct = (k) => (/^from$/i.test(k) ? 0 : /^to$/i.test(k) ? 100 : parseFloat(k));

/** keyframes 하나를 국소 시각(초, 클립 시작 기준)에서 푼 값. 시작 전이면 null(엔진은 delay 전에 적용 안 함) */
function keyframesAt(a, local) {
  const delay = (a.options?.delay ?? 0) / 1e6, dur = (a.options?.duration ?? 0) / 1e6;
  if (dur <= 0 || local < delay) return null;
  const iter = Math.max(1, a.options?.iterCount ?? 1);
  let u = (local - delay) / dur;
  if (u >= iter) u = 1;
  else u -= Math.floor(u);
  if (a.options?.direction === "reverse") u = 1 - u;
  u = easingFn(a.options?.easing)(Math.min(1, Math.max(0, u)));
  const stops = Object.entries(a.params ?? {}).map(([k, v]) => [pct(k) / 100, v]).filter(([p]) => Number.isFinite(p)).sort((x, y) => x[0] - y[0]);
  if (!stops.length) return null;
  const out = {};
  for (const prop of [...ADD, ...MUL]) {
    const has = stops.filter(([, v]) => typeof v[prop] === "number");
    if (!has.length) continue;
    if (u <= has[0][0]) { out[prop] = has[0][1][prop]; continue; }
    if (u >= has.at(-1)[0]) { out[prop] = has.at(-1)[1][prop]; continue; }
    const i = has.findIndex(([p]) => p > u);
    const [p0, v0] = has[i - 1], [p1, v1] = has[i];
    // 구간 이징은 그 구간을 시작하는 stop(이 속성이 있는 stop 사이의 아무 stop)에 적힌 것
    const seg = stops.filter(([p]) => p >= p0 && p < p1).reverse().find(([, v]) => v.easing)?.[1].easing;
    const k = easingFn(seg)((u - p0) / (p1 - p0));
    out[prop] = v0[prop] + (v1[prop] - v0[prop]) * k;
  }
  return out;
}

/** 클립이 광고 시각 tSec에 어떤 모습인지: { visible, x, y, scale, opacity, cx, cy, w, h } (keyframes만 계산, 다른 모션은 무시) */
export function sampleClip(c, tSec) {
  const d = c.timing?.display ?? { from: 0, to: 0 };
  const from = d.from / 1e6, to = d.to / 1e6;
  const t = c.transform ?? {};
  const s = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, opacity: t.opacity ?? 1 };
  for (const a of c.animations ?? []) {
    if (a.type !== "keyframes") continue;
    const v = keyframesAt(a, tSec - from);
    if (!v) continue;
    for (const k of ADD) if (v[k] !== undefined) s[k] = (s[k] ?? 0) + v[k];
    for (const k of MUL) if (v[k] !== undefined) s[k] *= v[k];
  }
  const w = (t.width ?? 0) * s.scale * s.scaleX, h = (t.height ?? 0) * s.scale * s.scaleY;
  const cx = (t.x ?? 0) + (t.width ?? 0) / 2 + s.x, cy = (t.y ?? 0) + (t.height ?? 0) / 2 + s.y;
  return { visible: tSec >= from && tSec < to && s.opacity > 0.02, ...s, cx, cy, w, h };
}

/** 클립의 축 방향 속도(프레임당). x·y는 px, z는 크기 비율 변화. t0 → t1 */
export function velocity(c, axis, t0, t1, fps) {
  const a = sampleClip(c, t0), b = sampleClip(c, t1), n = Math.max(1e-6, (t1 - t0) * fps);
  if (axis === "x") return (b.cx - a.cx) / n;
  if (axis === "y") return (b.cy - a.cy) / n;
  return (b.scale * b.scaleX - a.scale * a.scaleX) / n;
}

const MOVING = { x: 2, y: 2, z: 0.002 }; // 프레임당 이만큼은 움직여야 "움직이는 중"
const AXES = new Set(["x", "y", "z"]);

/**
 * 장부(SEAMS)를 숫자로 검사한다. 반환: { errors: [], warnings: [] } (사람이 읽는 한국어 문장)
 * project: ProjectJSON, seams: 장부 배열
 */
export function checkSeams(project, seams, fps = project.settings?.fps ?? 30) {
  const errors = [], warnings = [];
  const clips = project.clips ?? {};
  const f = 1 / fps;
  const W = project.settings?.width ?? 1080;
  for (const [i, s] of (seams ?? []).entries()) {
    const id = `seam[${i}]${s.technique ? ` ${s.technique}` : ""} @${s.at}s`;
    const type = s.type ?? "cut";
    const ex = s.exit, en = s.entry;
    if (type !== "match-cut") {
      if (!ex || !en) { errors.push(`${id}: exit·entry가 없음`); continue; }
      if (!AXES.has(ex.axis) || !AXES.has(en.axis)) { errors.push(`${id}: axis는 x·y·z 중 하나`); continue; }
      // 1. 계획: 축과 방향이 같아야 한다 (축 바꾸기·거울 금지)
      if (ex.axis !== en.axis) errors.push(`${id}: 나가는 축(${ex.axis})과 들어오는 축(${en.axis})이 다름 — 컷 양쪽은 같은 축 (transitions.md §0)`);
      else if (Math.sign(ex.dir) !== Math.sign(en.dir)) errors.push(`${id}: 나가는 방향(${ex.dir})과 들어오는 방향(${en.dir})이 반대 — ${ex.axis === "z" ? "Z축은 크기 변화 부호가 같아야 함(멀어지며 나간 뒤 작은 데서 커지며 들어오면 금지)" : "거울처럼 뒤집힌 이음새"}`);
      const A = clips[ex.clip], B = clips[en.clip];
      if (!A || !B) { errors.push(`${id}: 클립 ${!A ? ex.clip : en.clip} 없음`); continue; }
      const axis = ex.axis;
      // 2. 컷 직전 나가는 쪽, 직후 들어오는 쪽이 움직이는 중인지, 방향이 장부와 같은지
      const vOut = velocity(A, axis, s.at - 2 * f, s.at - f, fps);
      const vIn = velocity(B, en.axis, s.at, s.at + f, fps);
      const fmt = (v) => (axis === "z" ? v.toFixed(4) : v.toFixed(1));
      if (Math.abs(vOut) < MOVING[axis]) errors.push(`${id}: 나가는 쪽(${ex.clip})이 컷 직전에 멈춰 있음 (${fmt(vOut)}/프레임) — 컷은 움직이는 도중에`);
      else if (Math.sign(vOut) !== Math.sign(ex.dir)) errors.push(`${id}: 나가는 쪽 실제 방향(${fmt(vOut)})이 장부(${ex.dir})와 반대`);
      if (Math.abs(vIn) < MOVING[axis]) errors.push(`${id}: 들어오는 쪽(${en.clip})이 컷 직후 멈춘 데서 출발함 (${fmt(vIn)}/프레임) — 경로 중간에서 이어 들어오게`);
      else if (Math.sign(vIn) !== Math.sign(en.dir)) errors.push(`${id}: 들어오는 쪽 실제 방향(${fmt(vIn)})이 장부(${en.dir})와 반대`);
      // 3. 속도 맞춤 (경고): 0.5–2배
      if (Math.abs(vOut) >= MOVING[axis] && Math.abs(vIn) >= MOVING[axis]) {
        const r = Math.abs(vIn) / Math.abs(vOut);
        if (r < 0.5 || r > 2) warnings.push(`${id}: 컷 양쪽 속도 차이 ${r.toFixed(2)}배 (나감 ${fmt(vOut)}, 들어옴 ${fmt(vIn)}/프레임) — 나갈 때 easeIn·들어올 때 easeOut을 같은 거리·길이로`);
      }
      // 4. 겹침: 컷이면 같은 프레임에 두 쪽이 다 보이면 안 됨 (디졸브가 됨)
      if (type === "cut") {
        for (let t = s.at - 3 * f; t <= s.at + 3 * f + 1e-9; t += f) {
          const a = sampleClip(A, t), b = sampleClip(B, t);
          if (a.visible && b.visible && a.opacity > 0.05 && b.opacity > 0.05) {
            warnings.push(`${id}: ${t.toFixed(3)}초에 두 장면이 겹쳐 보임 (불투명도 ${a.opacity.toFixed(2)} / ${b.opacity.toFixed(2)}) — 컷이면 한쪽만, 겹치는 전환이면 type: "transition"`);
            break;
          }
        }
      }
      // 5. Z축: 들어오는 장면의 다른 클립 입장이 크기 변화 부호를 거스르는지 (컷 후 0.5초)
      if (axis === "z") {
        for (const [cid, c] of Object.entries(clips)) {
          if (cid === en.clip || cid === ex.clip || c.type === "Audio" || c.type === "Transition") continue;
          const from = (c.timing?.display?.from ?? 0) / 1e6;
          if (from < s.at - f || from > s.at + 0.5) continue;
          const v = velocity(c, "z", from + f, from + 2 * f, fps);
          if (Math.abs(v) >= MOVING.z && Math.sign(v) !== Math.sign(en.dir)) {
            warnings.push(`${id}: 들어오는 장면의 ${cid}가 ${en.dir > 0 ? "작아지며" : "커지며"} 등장해 Z축 방향을 거스름 — 이음새 0.5초 동안은 자리 잡은 채로 두거나 같은 부호로`);
          }
        }
      }
    }
    // 6. carrier: 컷 앞뒤 1프레임에서 같은 자리·크기
    if (s.carrier) {
      const O = clips[s.carrier.out], I = clips[s.carrier.in];
      if (!O || !I) errors.push(`${id}: carrier 클립 없음`);
      else {
        const a = sampleClip(O, s.at - f), b = sampleClip(I, s.at);
        const dc = Math.hypot(a.cx - b.cx, a.cy - b.cy) * (1080 / W), ds = Math.abs(a.w - b.w) / Math.max(1, b.w);
        if (dc > 12 || ds > 0.05) errors.push(`${id}: carrier가 컷에서 어긋남 (중심 ${dc.toFixed(0)}px, 크기 ${(ds * 100).toFixed(0)}%) — 12px·5% 안으로`);
      }
    } else if (type === "match-cut") errors.push(`${id}: match-cut에는 carrier { out, in }가 필요`);
  }
  return { errors, warnings };
}

/**
 * 장부 없이도 잡는 Z축 뒤집힘: 컷에서 끝나는 소재의 크기 변화와, 그 컷에 시작하는 클립(소재·그래픽)의 크기 변화가 반대면 경고.
 * 흔한 경우: Ken Burns 줌아웃(작아짐)으로 나간 소재 다음에 작은 데서 커지는 pop·zoom_settle 입장.
 */
export function autoZSign(project, fps = project.settings?.fps ?? 30) {
  const out = [];
  const f = 1 / fps;
  const clips = Object.entries(project.clips ?? {});
  const footage = clips.filter(([id]) => /^footage_/.test(id));
  for (const [aid, a] of footage) {
    const end = (a.timing?.display?.to ?? 0) / 1e6;
    const vOut = velocity(a, "z", end - 2 * f, end - f, fps);
    if (Math.abs(vOut) < 0.004) continue; // Ken Burns처럼 느린 변화(프레임당 0.4% 미만)는 방향으로 읽히지 않음
    for (const [bid, b] of clips) {
      if (bid === aid || ["Audio", "Transition"].includes(b.type)) continue;
      const from = (b.timing?.display?.from ?? 0) / 1e6;
      if (Math.abs(from - end) > f) continue;
      const vIn = velocity(b, "z", from, from + f, fps);
      if (Math.abs(vIn) >= 0.004 && Math.sign(vIn) !== Math.sign(vOut)) {
        out.push(`${aid}→${bid} @${end.toFixed(2)}s: 앞 장면은 ${vOut > 0 ? "커지며(앞으로)" : "작아지며(뒤로)"} 끝나는데 ${bid}는 ${vIn > 0 ? "커지며" : "작아지며"} 등장 — Z축 방향이 뒤집힘 (transitions.md §0)`);
      }
    }
  }
  return out;
}

/**
 * 앱이 전환 클립을 어디에 두는지 (admaker 앱 clip-exit-transition computeTransitionDisplayUs와 같은 규칙).
 * 두 클립이 겹치면 겹침 안에서 앞 클립 끝 − 길이부터, 안 겹치면 앞 클립 끝에서 끝나도록(뒤 클립은 첫 프레임에 멈춤).
 * 반환: { from, to, mode } (μs)
 */
export function appTransitionWindow(fromClip, toClip, durUs) {
  const a = fromClip.timing?.display, b = toClip.timing?.display;
  const dur = Math.max(1, durUs);
  const os = Math.max(a.from, b.from), oe = Math.min(a.to, b.to);
  if (!(oe > os)) return { from: Math.max(a.from, a.to - dur), to: a.to, mode: "freeze_overlay" };
  const start = Math.max(a.to - dur, os);
  return { from: start, to: Math.max(start + 1, Math.min(start + dur, oe)), mode: "crossover" };
}
