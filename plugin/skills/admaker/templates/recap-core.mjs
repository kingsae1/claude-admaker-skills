// 줄거리 요약(리캡) 하이라이트 — 앱 없이(로컬) 쓰는 계산 부분. recap.mjs(ffmpeg CLI)와 테스트가 쓴다.
// 앱 MCP 도구(transcribe_clip·detect_scenes·detect_edge_overlays·place_story_shots·check_voice_consistency)와
// 같은 규칙으로 계산하도록 앱 src/services/admaker/mcpRecap.ts·mcpVoiceConsistency.ts의 순수 함수를 그대로 옮겼다.
// 규칙을 바꿀 때는 두 곳을 같이 고친다. 아래쪽 "로컬 배치"는 이 스킬의 ProjectJSON(FOOTAGE·SHOTS)용으로 새로 쓴 부분이다.

// ── 대사·장면·띠·배치 (앱 mcpRecap.ts) ──
// 단계 이름 — 본편 7단계(hook·setup·inciting·escalation·twist·payoff·cliffhanger), 옛 이름과 쇼츠 단계도 받는다 (앱 normalizeStage)
const STAGE_ALIAS = {
  hook: "hook", setup: "setup", inciting: "inciting", escalation: "escalation", twist: "twist", payoff: "payoff", cliffhanger: "cliffhanger",
  incident: "inciting", rise: "escalation", ending: "payoff", closing: "cliffhanger",
  context: "setup", dialogue: "escalation", commentary: "escalation",
};
export function normalizeStage(stage) {
  return typeof stage === "string" ? STAGE_ALIAS[stage.trim().toLowerCase()] : undefined;
}
const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
export function groupWordsToSegments(words, opts = {}) {
  const gapSec = opts.gapSec ?? 0.7;
  const maxChars = opts.maxChars ?? 60;
  const maxSec = opts.maxSec ?? 12;
  const sorted = words.filter((w) => w && typeof w.word === "string" && w.word.trim() && Number.isFinite(w.start) && Number.isFinite(w.end)).sort((a, b) => a.start - b.start);
  const out = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const text = cur.map((w) => w.word.trim()).join(" ").replace(/\s+([,.?!…])/g, "$1");
    out.push({ index: out.length + 1, fromSec: round(cur[0].start), toSec: round(Math.max(...cur.map((w) => w.end))), text });
    cur = [];
  };
  for (const w of sorted) {
    if (cur.length) {
      const last = cur[cur.length - 1];
      const len = cur.reduce((n, x) => n + x.word.length + 1, 0) + w.word.length;
      if (w.start - last.end > gapSec || len > maxChars || w.end - cur[0].start > maxSec) flush();
    }
    cur.push(w);
    if (/[.?!…。？！]["'”’)]?$/.test(w.word.trim())) flush();
  }
  flush();
  return out;
}
export function cuesToSegments(cues) {
  return cues.filter((c) => c.text.trim() && c.to > c.from).map((c, i) => ({ index: i + 1, fromSec: round(c.from / 1e6), toSec: round(c.to / 1e6), text: c.text.replace(/\s*\n\s*/g, " ").trim() }));
}
export function segmentsInRange(segments, fromSec, toSec) {
  const lo = fromSec ?? -Infinity;
  const hi = toSec ?? Infinity;
  return segments.filter((s) => s.toSec > lo && s.fromSec < hi).map((s, i) => ({ ...s, index: i + 1 }));
}
export function frameDifference(a, b) {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let pix = 0;
  const ha = new Array(16).fill(0);
  const hb = new Array(16).fill(0);
  for (let i = 0; i < n; i++) {
    pix += Math.abs(a[i] - b[i]);
    ha[a[i] >> 4]++;
    hb[b[i] >> 4]++;
  }
  let hist = 0;
  for (let k = 0; k < 16; k++) hist += Math.abs(ha[k] - hb[k]);
  return (pix / (n * 255) + hist / (2 * n)) / 2;
}
export function findShotCuts(diffs, times, opts = {}) {
  const threshold = opts.threshold ?? 0.28;
  const contrast = opts.contrast ?? 2.5;
  const minShotSec = opts.minShotSec ?? 0.8;
  const cuts = [];
  const W = 4;
  for (let i = 1; i < diffs.length; i++) {
    const d = diffs[i];
    if (d < threshold) continue;
    const around = [];
    for (let k = Math.max(1, i - W); k <= Math.min(diffs.length - 1, i + W); k++) if (k !== i) around.push(diffs[k]);
    around.sort((x, y) => x - y);
    const median = around.length ? around[Math.floor(around.length / 2)] : 0;
    if (d < contrast * Math.max(median, 0.02)) continue;
    const prev = cuts[cuts.length - 1];
    if (prev !== void 0 && times[i] - times[prev] < minShotSec) {
      if (d > diffs[prev]) cuts[cuts.length - 1] = i;
      continue;
    }
    if (prev === void 0 && times[i] - times[0] < minShotSec * 0.5) continue;
    cuts.push(i);
  }
  return cuts;
}
export function shotsFromCuts(cutTimes, fromSec, toSec) {
  const edges = [{ t: fromSec, score: 0 }, ...cutTimes.filter((c) => c.t > fromSec && c.t < toSec), { t: toSec, score: 0 }];
  const shots = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const a = edges[i].t;
    const b = edges[i + 1].t;
    if (b - a <= 0.01) continue;
    shots.push({ index: shots.length + 1, fromSec: round(a), toSec: round(b), durationSec: round(b - a), midSec: round((a + b) / 2), cutScore: round(edges[i].score, 3) });
  }
  return shots;
}
export function pickSampleStep(durationSec, requested, maxSamples = 1500) {
  if (requested && requested > 0) return Math.max(requested, durationSec / maxSamples, 0.1);
  return Math.min(3, Math.max(0.25, durationSec / maxSamples));
}
export const CAMERA_MOVES = ["none", "push-in", "pull-out", "punch-in", "punch-out", "drift-left", "drift-right"];
export function cameraAnimations(cam, lenSec, canvasWidth) {
  const us = (sec) => Math.max(1, Math.round(sec * 1e6));
  const a = cam.amount;
  switch (cam.move) {
    case "push-in":
      return [{ type: "keyframes", options: { duration: us(lenSec), easing: "easeInOutSine" }, params: { "0%": { scale: 1 }, "100%": { scale: round(1 + a, 3) } } }];
    case "pull-out":
      return [{ type: "keyframes", options: { duration: us(lenSec), easing: "easeInOutSine" }, params: { "0%": { scale: round(1 + a, 3) }, "100%": { scale: 1 } } }];
    case "punch-in": {
      const at = Math.min(Math.max(0, cam.atSec ?? lenSec * 0.4), Math.max(0, lenSec - 0.25));
      return [{ type: "keyframes", options: { delay: us(at), duration: us(0.22), easing: "easeOutCubic" }, params: { "0%": { scale: 1 }, "100%": { scale: round(1 + a, 3) } } }];
    }
    case "punch-out":
      return [{ type: "keyframes", options: { duration: us(Math.min(0.6, lenSec)), easing: "easeOutCubic" }, params: { "0%": { scale: round(1 + a, 3) }, "100%": { scale: 1 } } }];
    case "drift-left":
    case "drift-right": {
      const dx = Math.round(canvasWidth * a * 0.5) * (cam.move === "drift-left" ? -1 : 1);
      return [
        {
          type: "keyframes",
          options: { duration: us(lenSec), easing: "linear" },
          params: { "0%": { scale: round(1 + a, 3), x: -dx }, "100%": { scale: round(1 + a, 3), x: dx } }
        }
      ];
    }
    default:
      return [];
  }
}
const DEFAULT_AMOUNT = {
  none: 0,
  "push-in": 0.1,
  "pull-out": 0.1,
  "punch-in": 0.18,
  "punch-out": 0.25,
  "drift-left": 0.08,
  "drift-right": 0.08
};
function transitionDefaultSec(type) {
  if (/^am-cut-curve|^am-push|^slide|^wipe/.test(type)) return 0.35;
  if (/^fade|dip/.test(type)) return 0.5;
  return 0.45;
}
export function suggestStoryEffects(planned) {
  const out = [];
  planned.forEach((p, i) => {
    const len = p.endSec - p.startSec;
    const next = planned[i + 1];
    const sug = { shot: p.index };
    if (p.camera) {
    } else if (i === 0 && (p.stage === "hook" || !p.stage)) sug.camera = { move: "punch-out", amount: DEFAULT_AMOUNT["punch-out"], reason: "\uD6C5 \uCCAB \uC7A5\uBA74 \u2014 \uD655 \uBB3C\uB7EC\uB098\uBA70 \uC2DC\uC120 \uC7A1\uAE30" };
    else if (p.keyLine) sug.camera = { move: "punch-in", amount: DEFAULT_AMOUNT["punch-in"], atSec: p.keyLine.localFromSec, reason: "\uBC30\uC6B0 \uB300\uC0AC \uAC15\uC870 \u2014 \uB300\uC0AC \uC2DC\uC791\uC5D0 \uD655 \uB4E4\uC5B4\uAC10" };
    else if (p.stage === "twist") sug.camera = { move: "punch-in", amount: DEFAULT_AMOUNT["punch-in"], atSec: Math.min(0.3, len / 3), reason: "\uBC18\uC804 \u2014 \uC7A5\uBA74 \uC2DC\uC791\uC5D0 \uD655 \uB4E4\uC5B4\uAC10" };
    else if (!next && len > 1.5) sug.camera = { move: "pull-out", amount: DEFAULT_AMOUNT["pull-out"], reason: "\uB9C8\uC9C0\uB9C9 \uC7A5\uBA74 \u2014 \uCC9C\uCC9C\uD788 \uBB3C\uB7EC\uB098\uBA70 \uC5EC\uC6B4" };
    else if (len > 4 && (p.stage === "setup" || p.stage === "payoff" || !p.stage)) sug.camera = { move: "push-in", amount: DEFAULT_AMOUNT["push-in"], reason: "4\uCD08 \uB118\uB294 \uC7A5\uBA74 \u2014 \uC815\uC9C0 \uD654\uBA74 \uD53C\uD558\uAE30" };
    if (next && !p.transitionOut) {
      const continuous = Math.abs(next.srcFromSec - p.srcToSec) < 0.25;
      const backInTime = next.srcFromSec < p.srcFromSec - 30;
      const stageChange = !!p.stage && !!next.stage && p.stage !== next.stage;
      if (continuous) {
      } else if (backInTime && i > 0) {
        sug.transitionOut = { type: "fadeIn", durationSec: 0.5, reason: "\uC6D0\uBCF8 \uC2DC\uAC04\uC774 \uB4A4\uB85C \uAC10 \u2014 \uC9E7\uC740 \uB525\uC73C\uB85C \uC2DC\uAC04 \uC774\uB3D9 \uC54C\uB9AC\uAE30" };
      } else if (stageChange) {
        sug.transitionOut = { type: "am-cut-curve", durationSec: 0.35, reason: `\uB2E8\uACC4 \uBC14\uB01C(${p.stage} \u2192 ${next.stage}) \u2014 \uD750\uB984 \uC787\uAE30` };
      }
    }
    if (sug.camera || sug.transitionOut) out.push(sug);
  });
  return out;
}
export function keyLineVolumeCurve(lenSec, fromSec, toSec, base, peak = 1) {
  const a = Math.max(0, Math.min(fromSec, lenSec));
  const b = Math.max(a, Math.min(toSec, lenSec));
  const pts = [];
  const add = (t, v) => {
    const tt = round(Math.max(0, Math.min(lenSec, t)), 3);
    if (pts.length && tt <= pts[pts.length - 1][0]) {
      pts[pts.length - 1] = [pts[pts.length - 1][0], v];
      return;
    }
    pts.push([tt, v]);
  };
  add(0, a <= 1e-3 ? peak : base);
  if (a > 0.15) add(a - 0.15, base);
  add(a, peak);
  add(b, peak);
  if (b < lenSec) add(Math.min(lenSec, b + 0.25), base);
  add(lenSec, b >= lenSec - 1e-3 ? peak : base);
  return pts;
}
export function planStoryShots(shots, opts = {}) {
  const errors = [];
  const warnings = [];
  const planned = [];
  const dur = opts.mediaDurationSec ?? null;
  let cursor = Math.max(0, opts.startSec ?? 0);
  const gap = Math.max(0, opts.gapSec ?? 0);
  shots.forEach((s, i) => {
    const n = i + 1;
    let from = Number(s.from);
    let to = Number(s.to);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return void errors.push(`${n}\uBC88: from\xB7to(\uC6D0\uBCF8 \uCD08)\uAC00 \uC22B\uC790\uAC00 \uC544\uB2D9\uB2C8\uB2E4.`);
    if (from < 0) {
      warnings.push(`${n}\uBC88: from ${from}\uCD08 \u2192 0\uCD08`);
      from = 0;
    }
    if (dur && to > dur) {
      warnings.push(`${n}\uBC88: to ${to}\uCD08\uAC00 \uC6D0\uBCF8 \uAE38\uC774(${round(dur)}\uCD08)\uB97C \uB118\uC5B4 ${round(dur)}\uCD08\uB85C \uC904\uC784`);
      to = dur;
    }
    if (to - from < 0.1) return void errors.push(`${n}\uBC88: \uC6D0\uBCF8 \uAD6C\uAC04\uC774 0.1\uCD08\uBCF4\uB2E4 \uC9E7\uC2B5\uB2C8\uB2E4 (${from}~${to}).`);
    let speed = Number(s.speed ?? 1) || 1;
    if (speed < 0.25 || speed > 4) {
      warnings.push(`${n}\uBC88: speed ${speed} \u2192 ${Math.min(4, Math.max(0.25, speed))}`);
      speed = Math.min(4, Math.max(0.25, speed));
    }
    const start = typeof s.at === "number" && s.at >= 0 ? s.at : cursor;
    const len = (to - from) / speed;
    if (len > 6.5 && speed === 1 && !s.keyLine) warnings.push(`${n}\uBC88: \uD55C \uC7A5\uBA74\uC774 ${round(len, 1)}\uCD08 \u2014 \uB9AC\uCEA1\uC740 \uD55C \uCEF7 6\uCD08 \uC774\uD558\uB97C \uAD8C\uC7A5`);
    let keyLine;
    let volume = s.volume;
    if (s.keyLine) {
      const kf = Math.max(from, Number(s.keyLine.from ?? from));
      const kt = Math.min(to, Number(s.keyLine.to ?? to));
      if (!(kt > kf)) {
        errors.push(`${n}\uBC88: keyLine \uAD6C\uAC04(${s.keyLine.from}~${s.keyLine.to})\uC774 \uC7A5\uBA74 \uC6D0\uBCF8 \uAD6C\uAC04(${from}~${to}) \uBC16\uC785\uB2C8\uB2E4.`);
      } else {
        const lf = (kf - from) / speed;
        const lt = (kt - from) / speed;
        if (speed !== 1) warnings.push(`${n}\uBC88: \uB300\uC0AC \uAC15\uC870 \uC7A5\uBA74\uC758 speed\uAC00 ${speed}\uB77C \uB300\uC0AC \uC18C\uB9AC\uAC00 \uBE68\uB77C\uC9C0\uAC70\uB098 \uB290\uB824\uC9D1\uB2C8\uB2E4(\uC74C\uB192\uC774\uB294 \uC720\uC9C0).`);
        keyLine = {
          shot: n,
          startSec: round(start + lf, 3),
          endSec: round(start + lt, 3),
          localFromSec: round(lf, 3),
          localToSec: round(lt, 3),
          ...s.keyLine.text ? { text: s.keyLine.text } : {},
          push: s.keyLine.push !== false
        };
        if (Array.isArray(volume)) warnings.push(`${n}\uBC88: volume \uACE1\uC120\uC774 \uC788\uC5B4 \uB300\uC0AC \uAC15\uC870 \uBCFC\uB968\uC740 \uB123\uC9C0 \uC54A\uC74C`);
        else volume = keyLineVolumeCurve(round(len, 3), lf, lt, typeof volume === "number" ? volume : opts.baseVolume ?? 0.15);
      }
    }
    let camera;
    if (s.camera) {
      const c = typeof s.camera === "string" ? { move: s.camera } : s.camera;
      if (!CAMERA_MOVES.includes(c.move)) errors.push(`${n}\uBC88: camera "${c.move}"\uB294 ${CAMERA_MOVES.join("\xB7")} \uC911 \uD558\uB098\uC785\uB2C8\uB2E4.`);
      else if (c.move !== "none")
        camera = {
          move: c.move,
          amount: Math.min(0.4, Math.max(0.02, Number(c.amount ?? DEFAULT_AMOUNT[c.move]))),
          ...typeof c.atSec === "number" ? { atSec: c.atSec } : {}
        };
      else camera = { move: "none", amount: 0 };
    }
    let transitionOut;
    if (s.transitionOut) {
      const t = typeof s.transitionOut === "string" ? { type: s.transitionOut } : s.transitionOut;
      transitionOut = { type: t.type, durationSec: round(Math.min(2, Math.max(0.1, Number(t.durationSec ?? transitionDefaultSec(t.type)))), 2) };
    }
    planned.push({
      index: n,
      ...s.label ? { label: s.label } : {},
      ...normalizeStage(s.stage) ? { stage: normalizeStage(s.stage) } : {},
      ...camera ? { camera } : {},
      ...transitionOut ? { transitionOut } : {},
      srcFromSec: round(from, 3),
      srcToSec: round(to, 3),
      startSec: round(start, 3),
      endSec: round(start + len, 3),
      speed,
      ...volume !== void 0 ? { volume } : {},
      ...keyLine ? { keyLine } : {}
    });
    cursor = start + len + gap;
  });
  const sorted = [...planned].sort((a, b) => a.startSec - b.startSec);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startSec < sorted[i - 1].endSec - 1e-3)
      errors.push(`${sorted[i - 1].index}\uBC88(${sorted[i - 1].startSec}~${sorted[i - 1].endSec}\uCD08)\uACFC ${sorted[i].index}\uBC88\uC774 \uD0C0\uC784\uB77C\uC778\uC5D0\uC11C \uACB9\uCE69\uB2C8\uB2E4.`);
  }
  const totalSec = planned.length ? round(Math.max(...planned.map((p) => p.endSec)) - Math.min(...planned.map((p) => p.startSec)), 3) : 0;
  const keyLines = planned.flatMap((p) => p.keyLine ? [p.keyLine] : []);
  return { planned, keyLines, errors, warnings, totalSec };
}
export function detectEdgeBands(frames, W, H, opts = {}) {
  const maxF = opts.maxFraction ?? 0.3;
  const margin = opts.margin ?? 0.015;
  const n = frames.length;
  const empty = { top: 0, bottom: 0, left: 0, right: 0, found: [] };
  if (n < 3 || W < 8 || H < 8) return empty;
  const N = W * H;
  const mean = new Float32Array(N);
  const sq = new Float32Array(N);
  for (const f of frames) for (let i = 0; i < N; i++) {
    mean[i] += f[i];
    sq[i] += f[i] * f[i];
  }
  const std = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    mean[i] /= n;
    std[i] = Math.sqrt(Math.max(0, sq[i] / n - mean[i] * mean[i]));
  }
  const meanEdge = (x, y) => {
    const i = y * W + x;
    const dx = x + 1 < W ? Math.abs(mean[i + 1] - mean[i]) : 0;
    const dy = y + 1 < H ? Math.abs(mean[i + W] - mean[i]) : 0;
    return dx + dy;
  };
  const textHit = (f, x, y) => {
    const i = y * W + x;
    if (f[i] < 170 || x + 1 >= W) return false;
    return f[i] - f[i + 1] > 40 || x > 0 && f[i] - f[i - 1] > 40;
  };
  let staticBase = 0;
  let textBase = 0;
  const lineInfo = (cells) => {
    let dark = 0;
    let staticEdge = 0;
    for (const [x, y] of cells) {
      const i = y * W + x;
      if (mean[i] < 24 && std[i] < 8) dark++;
      if (std[i] < 10 && meanEdge(x, y) > 28) staticEdge++;
    }
    let textFrames = 0;
    for (const f of frames) {
      let hits = 0;
      for (const [x, y] of cells) if (textHit(f, x, y)) hits++;
      if (hits / cells.length > 0.04) textFrames++;
    }
    const staticRate = staticEdge / cells.length;
    const textRate = textFrames / n;
    const kinds = [];
    if (dark / cells.length > 0.92) kinds.push("letterbox");
    if (staticRate > Math.max(0.02, staticBase * 3) && staticEdge >= 2) kinds.push("logo");
    if (textRate > Math.max(0.3, textBase * 2)) kinds.push("text");
    return { kinds, staticRate, textRate };
  };
  const scan = (count, cellsAt) => {
    const limit = Math.floor(count * maxF);
    let deepest = -1;
    const kinds = /* @__PURE__ */ new Set();
    let gap = 0;
    for (let k = 0; k < limit; k++) {
      const info = lineInfo(cellsAt(k));
      if (info.kinds.length) {
        deepest = k;
        gap = 0;
        info.kinds.forEach((x) => kinds.add(x));
      } else if (deepest >= 0 && ++gap > Math.max(2, Math.round(count * 0.06))) break;
    }
    if (deepest < 0) return { fraction: 0, kinds: [] };
    return { fraction: Math.min(maxF, (deepest + 1) / count + margin), kinds: [...kinds] };
  };
  const row = (y) => Array.from({ length: W }, (_, x) => [x, y]);
  const col = (x) => Array.from({ length: H }, (_, y) => [x, y]);
  {
    let sr = 0;
    let tr = 0;
    let m = 0;
    for (let y = Math.floor(H * 0.4); y < Math.ceil(H * 0.6); y++) {
      const info = lineInfo(row(y));
      sr += info.staticRate;
      tr += info.textRate;
      m++;
    }
    staticBase = m ? sr / m : 0;
    textBase = m ? tr / m : 0;
  }
  const out = { ...empty, found: [] };
  const edges = [
    ["top", H, (k) => row(k)],
    ["bottom", H, (k) => row(H - 1 - k)]
  ];
  if (opts.sides !== false) edges.push(["left", W, (k) => col(k)], ["right", W, (k) => col(W - 1 - k)]);
  for (const [edge, count, at] of edges) {
    const r = scan(count, at);
    if (r.fraction > 0 && (edge === "top" || edge === "bottom" || r.kinds.includes("letterbox"))) {
      out[edge] = round(r.fraction, 3);
      out.found.push({ edge, fraction: out[edge], kinds: r.kinds });
    }
  }
  return out;
}
export function cropForBands(source, bands, canvasAspect, opts = {}) {
  const maxTotal = opts.maxTotal ?? 0.45;
  let { top, bottom, left, right } = bands;
  const v = top + bottom;
  if (v > maxTotal) {
    top = top * maxTotal / v;
    bottom = bottom * maxTotal / v;
  }
  const h = left + right;
  if (h > maxTotal) {
    left = left * maxTotal / h;
    right = right * maxTotal / h;
  }
  const rx = source.width * left;
  const ry = source.height * top;
  const rw = source.width * (1 - left - right);
  const rh = source.height * (1 - top - bottom);
  if (opts.fit === "contain") return { x: Math.round(rx), y: Math.round(ry), width: Math.round(rw), height: Math.round(rh) };
  let w = rw;
  let hh = w / canvasAspect;
  if (hh > rh) {
    hh = rh;
    w = hh * canvasAspect;
  }
  const fy = opts.focusY ?? 0.5;
  return {
    x: Math.round(rx + (rw - w) / 2),
    y: Math.round(ry + (rh - hh) * Math.min(1, Math.max(0, fy))),
    width: Math.round(w),
    height: Math.round(hh)
  };
}

// ── 내레이션 목소리 일관성 (앱 mcpVoiceConsistency.ts) ──
export function countSpokenChars(text) {
  const plain = String(text ?? "").replace(/\[[^\]]*\]/g, " ").replace(/<[^>]*>/g, " ");
  const m = plain.match(/[\p{L}\p{N}]/gu);
  return m ? m.length : 0;
}
export function leadingStyleTag(text) {
  const m = String(text ?? "").trim().match(/^\[([^\]]+)\]/);
  return m ? m[1].trim().toLowerCase() : "";
}
function mixToMono(channels) {
  if (channels.length === 1) return channels[0];
  const n = channels[0].length;
  const out = new Float32Array(n);
  for (const ch of channels) for (let i = 0; i < n; i += 1) out[i] += ch[i] / channels.length;
  return out;
}
function downsample(x, factor) {
  if (factor <= 1) return x;
  const n = Math.floor(x.length / factor);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    for (let k = 0; k < factor; k += 1) s += x[i * factor + k];
    out[i] = s / factor;
  }
  return out;
}
export function detectPitch(frame, sampleRate, minHz = 60, maxHz = 400, threshold = 0.15) {
  const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
  const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(frame.length / 2));
  if (maxLag <= minLag) return null;
  const W = frame.length - maxLag;
  const d = new Float32Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau += 1) {
    let s = 0;
    for (let i = 0; i < W; i += 1) {
      const v = frame[i] - frame[i + tau];
      s += v * v;
    }
    d[tau] = s;
  }
  let running = 0;
  let best = -1;
  for (let tau = 1; tau <= maxLag; tau += 1) {
    running += d[tau];
    const cmnd = running > 0 ? d[tau] * tau / running : 1;
    d[tau] = cmnd;
  }
  for (let tau = minLag; tau <= maxLag; tau += 1) {
    if (d[tau] < threshold) {
      while (tau + 1 <= maxLag && d[tau + 1] < d[tau]) tau += 1;
      best = tau;
      break;
    }
  }
  if (best < 0) return null;
  const a = d[best - 1] ?? d[best];
  const b = d[best];
  const c = d[best + 1] ?? d[best];
  const denom = a - 2 * b + c;
  const shift = denom !== 0 ? 0.5 * (a - c) / denom : 0;
  return sampleRate / (best + Math.max(-1, Math.min(1, shift)));
}
function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
export function median(values) {
  return quantile([...values].sort((x, y) => x - y), 0.5);
}
export function measureVoiceLine(channels, sampleRate, text) {
  const mono = mixToMono(channels);
  const totalSec = mono.length / sampleRate;
  const hopSec = 0.01;
  const winSec = 0.03;
  const hop = Math.max(1, Math.round(sampleRate * hopSec));
  const win = Math.max(hop, Math.round(sampleRate * winSec));
  const nFrames = Math.max(0, Math.floor((mono.length - win) / hop) + 1);
  const rmsDb = new Float32Array(nFrames);
  let peakDb = -120;
  for (let f = 0; f < nFrames; f += 1) {
    let s = 0;
    const o = f * hop;
    for (let i = 0; i < win; i += 1) s += mono[o + i] * mono[o + i];
    const db = 10 * Math.log10(s / win + 1e-12);
    rmsDb[f] = db;
    if (db > peakDb) peakDb = db;
  }
  const gate = Math.max(peakDb - 35, -60);
  const active = new Uint8Array(nFrames);
  for (let f = 0; f < nFrames; f += 1) active[f] = rmsDb[f] > gate ? 1 : 0;
  const bridge = Math.round(0.15 / hopSec);
  let lastOn = -1;
  for (let f = 0; f < nFrames; f += 1) {
    if (!active[f]) continue;
    if (lastOn >= 0 && f - lastOn > 1 && f - lastOn <= bridge) for (let k = lastOn + 1; k < f; k += 1) active[k] = 1;
    lastOn = f;
  }
  let first = -1;
  let last = -1;
  let activeCount = 0;
  let energySum = 0;
  for (let f = 0; f < nFrames; f += 1) {
    if (!active[f]) continue;
    if (first < 0) first = f;
    last = f;
    activeCount += 1;
    energySum += Math.pow(10, rmsDb[f] / 10);
  }
  const speechSec = activeCount * hopSec;
  const leadSilenceSec = first < 0 ? totalSec : first * hopSec;
  const tailSilenceSec = last < 0 ? 0 : Math.max(0, totalSec - (last * hop + win) / sampleRate);
  const loudnessDb = activeCount ? round(10 * Math.log10(energySum / activeCount), 1) : null;
  const factor = Math.max(1, Math.floor(sampleRate / 16e3));
  const ds = downsample(mono, factor);
  const dsRate = sampleRate / factor;
  const pFrame = Math.round(dsRate * 0.04);
  const pHop = Math.round(dsRate * 0.02);
  const pitches = [];
  for (let o = 0; o + pFrame <= ds.length; o += pHop) {
    const f = Math.min(nFrames - 1, Math.round(o * factor / hop));
    if (f < 0 || !active[f] || rmsDb[f] < peakDb - 25) continue;
    const hz = detectPitch(ds.subarray(o, o + pFrame), dsRate);
    if (hz) pitches.push(hz);
  }
  let pitchHz = null;
  let pitchRangeSt = null;
  if (pitches.length >= 5) {
    const m = median(pitches);
    const clean = pitches.filter((p) => p > m * 0.6 && p < m * 1.7);
    pitchHz = round(median(clean), 1);
    const st = clean.map((p) => 12 * Math.log2(p / pitchHz)).sort((x, y) => x - y);
    pitchRangeSt = round(quantile(st, 0.75) - quantile(st, 0.25), 2);
  }
  const chars = countSpokenChars(text);
  return {
    speechSec: round(speechSec, 2),
    totalSec: round(totalSec, 2),
    leadSilenceSec: round(leadSilenceSec, 2),
    tailSilenceSec: round(tailSilenceSec, 2),
    chars,
    charsPerSec: speechSec > 0.2 && chars > 0 ? round(chars / speechSec, 2) : null,
    pitchHz,
    pitchRangeSt,
    loudnessDb
  };
}
export const DEFAULT_CONSISTENCY_THRESHOLDS = { rate: 0.12, pitchSt: 1.5, rangeRatio: 1.6, loudnessDb: 2.5 };
function mode(values) {
  const counts = /* @__PURE__ */ new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best;
  let bestN = 0;
  for (const [v, n] of counts) if (n > bestN) [best, bestN] = [v, n];
  return best;
}
export function compareVoiceLines(lines, th = DEFAULT_CONSISTENCY_THRESHOLDS) {
  const nums = (pick) => lines.map((l) => pick(l.metrics)).filter((v) => typeof v === "number" && Number.isFinite(v));
  const rateBase = nums((m) => m.charsPerSec);
  const pitchBase = nums((m) => m.pitchHz);
  const rangeBase = nums((m) => m.pitchRangeSt);
  const loudBase = nums((m) => m.loudnessDb);
  const baseline = {
    voiceId: mode(lines.map((l) => l.voiceId).filter((v) => !!v)),
    styleTag: mode(lines.map((l) => leadingStyleTag(l.text))) ?? "",
    charsPerSec: rateBase.length ? round(median(rateBase), 2) : null,
    pitchHz: pitchBase.length ? round(median(pitchBase), 1) : null,
    pitchRangeSt: rangeBase.length ? round(median(rangeBase), 2) : null,
    loudnessDb: loudBase.length ? round(median(loudBase), 1) : null
  };
  let outliers = 0;
  const reports = lines.map((l, index) => {
    const m = l.metrics;
    const issues = [];
    const fix = {};
    const tag = leadingStyleTag(l.text);
    if (baseline.voiceId && l.voiceId && l.voiceId !== baseline.voiceId)
      issues.push({ kind: "voice", message: `\uB2E4\uB978 \uBAA9\uC18C\uB9AC(${l.voiceId}) \u2014 \uAE30\uC900 ${baseline.voiceId}\uB85C \uB2E4\uC2DC \uC0DD\uC131` });
    if (lines.length >= 3 && tag !== baseline.styleTag)
      issues.push({ kind: "styleTag", message: `\uB9E8 \uC55E \uC2A4\uD0C0\uC77C \uD0DC\uADF8\uAC00 \uB2E4\uB984 ("${tag || "\uC5C6\uC74C"}" \u2194 \uAE30\uC900 "${baseline.styleTag || "\uC5C6\uC74C"}")` });
    if (baseline.charsPerSec && m.charsPerSec) {
      const r = m.charsPerSec / baseline.charsPerSec;
      if (Math.abs(r - 1) > th.rate) {
        issues.push({ kind: "tempo", delta: round(r - 1, 3), message: `${r > 1 ? "\uBE60\uB984" : "\uB290\uB9BC"} ${Math.round(Math.abs(r - 1) * 100)}% (${m.charsPerSec} \u2194 \uAE30\uC900 ${baseline.charsPerSec}\uC790/\uCD08)` });
        const want = 1 / r;
        if (want >= 0.75 && want <= 1.33) fix.tempoRate = round(want, 3);
      }
    }
    if (baseline.pitchHz && m.pitchHz) {
      const st = 12 * Math.log2(m.pitchHz / baseline.pitchHz);
      if (Math.abs(st) > th.pitchSt)
        issues.push({ kind: "pitch", delta: round(st, 2), message: `\uC74C\uB192\uC774 ${st > 0 ? "\uB192\uC74C" : "\uB0AE\uC74C"} ${Math.abs(round(st, 1))}\uBC18\uC74C (${m.pitchHz} \u2194 \uAE30\uC900 ${baseline.pitchHz}Hz)` });
    }
    if (baseline.pitchRangeSt && m.pitchRangeSt) {
      const ratio = m.pitchRangeSt / baseline.pitchRangeSt;
      if (ratio > th.rangeRatio || ratio < 1 / th.rangeRatio)
        issues.push({ kind: "emotion", delta: round(ratio, 2), message: `\uC5B5\uC591\xB7\uAC10\uC815 \uD3ED\uC774 ${ratio > 1 ? "\uD07C(\uACFC\uC7A5)" : "\uC791\uC74C(\uBC0B\uBC0B)"} ${round(ratio, 2)}\uBC30` });
    }
    if (baseline.loudnessDb !== null && m.loudnessDb !== null) {
      const db = m.loudnessDb - baseline.loudnessDb;
      if (Math.abs(db) > th.loudnessDb) {
        issues.push({ kind: "loudness", delta: round(db, 1), message: `\uC74C\uB7C9 ${db > 0 ? "\uD07C" : "\uC791\uC74C"} ${Math.abs(round(db, 1))}dB` });
        fix.volumeGain = round(Math.min(3, Math.max(0.3, Math.pow(10, -db / 20))), 3);
      }
    }
    const regenKinds = issues.filter((i) => i.kind === "voice" || i.kind === "styleTag" || i.kind === "pitch" || i.kind === "emotion" || i.kind === "tempo" && !fix.tempoRate);
    if (regenKinds.length) {
      const body = String(l.text).trim().replace(/^\[[^\]]+\]\s*/, "");
      const text = baseline.styleTag ? `[${restoreTagCase(lines, baseline.styleTag)}] ${body}` : body;
      fix.regenerate = { reason: regenKinds.map((i) => i.kind).join(", "), text, ...baseline.voiceId ? { voiceId: baseline.voiceId } : {} };
    }
    if (issues.length) outliers += 1;
    return { index: index + 1, clipId: l.clipId, text: l.text, metrics: m, styleTag: tag, issues, fix };
  });
  return { baseline, lines: reports, outliers, ok: outliers === 0 };
}
function restoreTagCase(lines, lower) {
  for (const l of lines) {
    const m = String(l.text).trim().match(/^\[([^\]]+)\]/);
    if (m && m[1].trim().toLowerCase() === lower) return m[1].trim();
  }
  return lower;
}

// ── 로컬 배치 (이 스킬의 ProjectJSON: timeline.mjs FOOTAGE·SHOTS) ──

/**
 * 띠를 뺀 영역(crop rect, 원본 px)이 캔버스를 꽉 채우도록 원본 전체를 키운 transform.
 * crop 필드 없이 클립을 키워 띠를 화면 밖으로 밀어내므로 엔진 렌더·앱 가져오기에서 똑같이 보인다(cover 전용).
 */
export function coverTransformForCrop(source, rect, canvas) {
  const scale = Math.max(canvas.width / rect.width, canvas.height / rect.height);
  return {
    x: Math.round((canvas.width - rect.width * scale) / 2 - rect.x * scale),
    y: Math.round((canvas.height - rect.height * scale) / 2 - rect.y * scale),
    width: Math.round(source.width * scale),
    height: Math.round(source.height * scale),
  };
}

/** 앱 장면 전환 키(속성 패널 '전환') → 엔진 전환 키. am-*·gl-*·hf-*·fade는 그대로 */
const APP_TO_ENGINE_TRANSITION = { fadeIn: "fade", fade: "fade", dip: "fade", zoomIn: "am-zoom-blur", slideLeft: "am-push", wipeLeft: "gl-wipe-left" };
export function engineTransitionKey(type) {
  const t = String(type ?? "");
  if (/^(am|gl|hf)-/.test(t) || t === "radialSwipe") return t;
  return APP_TO_ENGINE_TRANSITION[t] ?? null;
}

/** 장면 하나의 카메라·대사 줌 → animations (앱 place_story_shots와 같은 규칙: camera가 있으면 그것, 없으면 keyLine.push 줌인) */
export function shotAnimations(p, canvasWidth) {
  if (p.camera && p.camera.move !== "none") return cameraAnimations(p.camera, p.endSec - p.startSec, canvasWidth);
  if (p.keyLine?.push && p.camera?.move !== "none") {
    return [{
      type: "keyframes",
      options: { delay: Math.round(p.keyLine.localFromSec * 1e6), duration: Math.max(300000, Math.round((p.keyLine.localToSec - p.keyLine.localFromSec) * 1e6)), easing: "easeOutCubic" },
      params: { "0%": { scale: 1 }, "100%": { scale: 1.08 } },
    }];
  }
  return [];
}

/** effectSuggestions를 사용자가 정하지 않은 장면에만 채운다 (앱 autoEffects와 같음) */
export function applySuggestions(planned, suggestions) {
  for (const sug of suggestions) {
    const p = planned.find((x) => x.index === sug.shot);
    if (!p) continue;
    if (!p.camera && sug.camera) p.camera = { move: sug.camera.move, amount: sug.camera.amount, ...(sug.camera.atSec !== undefined ? { atSec: sug.camera.atSec } : {}) };
    if (!p.transitionOut && sug.transitionOut) p.transitionOut = { type: sug.transitionOut.type, durationSec: sug.transitionOut.durationSec };
  }
  return planned;
}

/**
 * planStoryShots 결과 → timeline.mjs의 FOOTAGE 항목 + 전환 SHOTS(transition-shader) + 배우 대사 SHOTS(recap-keyline).
 * 전환은 engine-recipes §5.2 규칙대로 두 장면을 전환 길이만큼 겹친다: 앞 장면 끝을 dur/2 늘리고(원본도 더 씀), 다음 장면 시작을 dur/2 당긴다.
 * 원본에 여유가 없으면 그 전환은 컷으로 두고 warnings에 적는다.
 * @param {object} o { src, source: {width,height}, canvas: {width,height}, box?: transform(띠 자르기), mediaDurationSec?, baseVolume?, footageOffset?, section? }
 */
export function localRecapTimeline(planned, keyLines, o) {
  const warnings = [];
  const offset = o.footageOffset ?? 0;
  const section = o.section ?? "recap";
  const base = o.baseVolume ?? 0.15;
  const dur = o.mediaDurationSec ?? Infinity;
  const footage = planned.map((p) => ({
    type: "Video",
    src: o.src,
    name: p.label ? `${p.index}. ${p.label}` : `장면 ${p.index}`,
    from: p.startSec,
    to: p.endSec,
    trimFrom: p.srcFromSec,
    playbackRate: p.speed,
    size: [o.source.width, o.source.height],
    ...(o.box ? { box: { ...o.box } } : {}),
    volume: p.volume ?? base,
    animations: shotAnimations(p, o.canvas.width),
  }));
  const shots = [];
  planned.forEach((p, i) => {
    const t = p.transitionOut;
    if (!t || /^(cut|none)$/i.test(t.type)) return;
    const next = planned[i + 1];
    if (!next) return void warnings.push(`${p.index}번: 마지막 장면이라 전환을 넣지 않음`);
    const key = engineTransitionKey(t.type);
    if (!key) return void warnings.push(`${p.index}번: 전환 "${t.type}"은 엔진 키로 바꿀 수 없어 컷으로 둠 (am-*·gl-*·fade)`);
    if (key.startsWith("hf-")) warnings.push(`${p.index}번: ${key}는 로컬 렌더에서만 보이고 앱으로 가져가면 fade가 됨`);
    const A = footage[i], B = footage[i + 1];
    if (Math.abs(B.from - A.to) > 0.02) return void warnings.push(`${p.index}번: 다음 장면과 붙어 있지 않아(${A.to}→${B.from}초) 전환을 넣지 않음`);
    const half = t.durationSec / 2;
    const aSrcEnd = A.trimFrom + (A.to - A.from + half) * A.playbackRate;
    const bSrcStart = B.trimFrom - half * B.playbackRate;
    if (aSrcEnd > dur + 1e-3 || bSrcStart < -1e-3) return void warnings.push(`${p.index}번: 원본 앞뒤 여유가 ${round(half, 2)}초 없어 전환 "${t.type}"을 컷으로 둠`);
    const at = A.to;
    A.to = round(at + half, 3);
    B.from = round(at - half, 3);
    B.trimFrom = round(bSrcStart, 3);
    // 다음 장면이 dur/2 일찍 시작하니 볼륨 곡선·애니메이션도 그만큼 뒤로 민다
    if (Array.isArray(B.volume)) B.volume = [[0, B.volume[0][1]], ...B.volume.map(([s, g]) => [round(s + half, 3), g])];
    B.animations = B.animations.map((a) => ({ ...a, options: { ...a.options, delay: (a.options?.delay ?? 0) + Math.round(half * 1e6) } }));
    shots.push({ card: "transition-shader", section: "transitions", from: B.from, to: A.to, props: { at, from: offset + i, to: offset + i + 1, key, dur: t.durationSec } });
  });
  for (const k of keyLines.filter((x) => x.text)) {
    shots.push({ card: "recap-keyline", section, from: k.startSec, to: k.endSec, props: { text: k.text, shot: k.shot } });
  }
  return { footage, shots, warnings };
}
