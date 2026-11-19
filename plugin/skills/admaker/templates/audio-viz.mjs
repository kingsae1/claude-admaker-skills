// 오디오 반응 막대·원형·파형 (audio visualizer) — 1단계: 키프레임으로 굽기
// admaker-plugin cleanroom/remotion/specs/audio-viz.md (클린룸 사양서)를 보고 처음부터 만든 구현.
// 음악·팟캐스트·보이스 광고에서 소리에 맞춰 움직이는 이퀄라이저 막대, 원형 스펙트럼, 파형.
// Shape 클립 + keyframes(scaleY·x·y)만 쓰므로 엔진 렌더와 admaker 앱 가져오기(to-admaker-import.mjs) 둘 다 그대로 됩니다.
// (2단계 엔진 클립 `AudioSpectrum`이 나오면 같은 계산을 엔진이 실시간으로 합니다.)
//
//   import { analyzeAudio, vizClips } from "./audio-viz.mjs";
//   const a = analyzeAudio("bgm.mp3", { fps: 30, bands: 24 });
//   for (const c of vizClips(a, { style: "bars", box: { x: 140, y: 1300, width: 800, height: 260 }, color: "#FFD23F", at: 0, duration: 15 })) add(c);
//
// 계산 (참고: Short-time Fourier transform, Hann function, Cooley–Tukey FFT — 위키백과·교과서)
//   프레임 k의 중심 시각 c = k / fps. c를 중심으로 N = 2048 샘플(모노 44.1kHz)에 Hann 창을 곱하고 FFT.
//   크기는 창의 합(N/2)으로 나눠 풀스케일 사인파가 0 dBFS가 되게 한 뒤 dB = 20·log10(|X| + 1e-9).
//   대역 경계 = minHz~maxHz를 로그 간격으로 bands+1개. 대역 값 = 그 안 bin들의 평균 dB (bin이 없으면 대역 중심 bin).
//   정규화: [-70, -10] dB → [0, 1] 선형, clamp. 평활: 오르면 즉시, 내리면 v = 이전·smoothing + 새 값·(1 − smoothing).

import { execFileSync } from "node:child_process";

export const SAMPLE_RATE = 44100;
export const WINDOW = 2048;
const DB_FLOOR = -70, DB_CEIL = -10;
const MIN_BAR = 0.04; // 막대 높이 = 4% + v × 96%

const us = (s) => Math.round(s * 1e6);
const r2 = (v) => Math.round(v * 100) / 100;
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// ── FFT (반복형 radix-2 Cooley–Tukey, 제자리) ──────────────────────────
const twiddles = new Map();
function table(n) {
  let t = twiddles.get(n);
  if (!t) {
    t = { cos: new Float64Array(n / 2), sin: new Float64Array(n / 2), rev: new Uint32Array(n) };
    for (let i = 0; i < n / 2; i++) { t.cos[i] = Math.cos((2 * Math.PI * i) / n); t.sin[i] = -Math.sin((2 * Math.PI * i) / n); }
    const bits = Math.log2(n);
    for (let i = 0; i < n; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); t.rev[i] = r; }
    twiddles.set(n, t);
  }
  return t;
}
/** re, im (길이 2의 거듭제곱)을 제자리에서 이산 푸리에 변환 */
export function fft(re, im) {
  const n = re.length, t = table(n);
  for (let i = 0; i < n; i++) {
    const j = t.rev[i];
    if (j > i) { let x = re[i]; re[i] = re[j]; re[j] = x; x = im[i]; im[i] = im[j]; im[j] = x; }
  }
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2, step = n / size;
    for (let start = 0; start < n; start += size) {
      for (let k = 0; k < half; k++) {
        const wr = t.cos[k * step], wi = t.sin[k * step];
        const a = start + k, b = a + half;
        const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
      }
    }
  }
}

/** 대역마다 [첫 bin, 끝 bin) — 로그 간격 경계. 경계 사이에 bin이 없으면 대역 중심 주파수의 bin 하나 */
export function bandBins(bands, minHz, maxHz, sampleRate = SAMPLE_RATE, n = WINDOW) {
  const hzPerBin = sampleRate / n, maxBin = n / 2;
  const edges = Array.from({ length: bands + 1 }, (_, i) => minHz * (maxHz / minHz) ** (i / bands));
  return Array.from({ length: bands }, (_, b) => {
    let lo = Math.ceil(edges[b] / hzPerBin), hi = Math.ceil(edges[b + 1] / hzPerBin);
    lo = clamp(lo, 1, maxBin); hi = clamp(hi, 1, maxBin + 1);
    if (hi <= lo) { const c = clamp(Math.round(Math.sqrt(edges[b] * edges[b + 1]) / hzPerBin), 1, maxBin); lo = c; hi = c + 1; }
    return [lo, hi, edges[b], edges[b + 1]];
  });
}

/** 옵션 정리: bands 4..128, minHz < maxHz ≤ 나이퀴스트, smoothing 0..0.99 */
export function normOptions({ fps = 30, bands = 32, minHz = 40, maxHz = 16000, smoothing = 0.5 } = {}, sampleRate = SAMPLE_RATE) {
  const nyq = sampleRate / 2;
  const b = clamp(Math.round(num(bands, 32)), 4, 128);
  const hi = clamp(num(maxHz, 16000), 2, nyq);
  const lo = clamp(num(minHz, 40), 1, hi / 1.01);
  return { fps: clamp(num(fps, 30), 1, 240), bands: b, minHz: lo, maxHz: hi, smoothing: clamp(num(smoothing, 0.5), 0, 0.99) };
}

/**
 * 모노 PCM → 프레임별 대역 값(0..1). analyzeAudio가 ffmpeg로 읽은 뒤 부르는 순수 함수(테스트용으로도 씀).
 * @param {Float32Array} samples  모노 PCM (-1..1)
 * @param {number} sampleRate
 * @returns {{ fps, bands, minHz, maxHz, smoothing, sampleRate, duration, frames: Float32Array[], raw: Float32Array[], wave: Float32Array[] }}
 *   frames = 평활한 값, raw = 평활 전 값, wave = 프레임 중심 창의 시간 영역 샘플을 waveP개로 줄인 값(-1..1, 구간 최대 크기 부호 유지)
 */
export function analyzePcm(samples, sampleRate = SAMPLE_RATE, opts = {}) {
  const o = normOptions(opts, sampleRate);
  const waveP = clamp(Math.round(num(opts.wavePoints, 96)), 8, 512);
  const N = WINDOW, half = N / 2;
  const duration = samples.length / sampleRate;
  const count = Math.max(1, Math.ceil(duration * o.fps));
  const hann = new Float64Array(N);
  for (let i = 0; i < N; i++) hann[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));
  const gain = 2 / hann.reduce((a, b) => a + b, 0); // 풀스케일 사인 → |X|·gain = 1
  const bins = bandBins(o.bands, o.minHz, o.maxHz, sampleRate, N);
  const re = new Float64Array(N), im = new Float64Array(N), db = new Float64Array(N / 2 + 1);
  const frames = [], raw = [], wave = [];
  let prev = new Float32Array(o.bands);
  for (let k = 0; k < count; k++) {
    const c = k / o.fps;
    const out = new Float32Array(o.bands), sm = new Float32Array(o.bands), wv = new Float32Array(waveP);
    if (c > duration) { frames.push(sm); raw.push(out); wave.push(wv); prev = sm; continue; } // 오디오 밖 = 0
    const center = Math.round(c * sampleRate);
    for (let i = 0; i < N; i++) {
      const s = center - half + i;
      re[i] = (s >= 0 && s < samples.length ? samples[s] : 0) * hann[i];
      im[i] = 0;
    }
    // 파형: 창 원본(Hann 곱하기 전) 샘플을 waveP 구간으로 나눠 구간마다 절대값이 가장 큰 샘플
    for (let p = 0; p < waveP; p++) {
      const a = Math.floor((p * N) / waveP), b = Math.floor(((p + 1) * N) / waveP);
      let best = 0;
      for (let i = a; i < b; i++) { const s = center - half + i, v = s >= 0 && s < samples.length ? samples[s] : 0; if (Math.abs(v) > Math.abs(best)) best = v; }
      wv[p] = best;
    }
    fft(re, im);
    for (let i = 0; i <= N / 2; i++) db[i] = 20 * Math.log10(Math.hypot(re[i], im[i]) * gain + 1e-9);
    for (let b = 0; b < o.bands; b++) {
      const [lo, hi] = bins[b];
      let sum = 0;
      for (let i = lo; i < hi; i++) sum += db[i];
      const v = clamp((sum / (hi - lo) - DB_FLOOR) / (DB_CEIL - DB_FLOOR), 0, 1);
      out[b] = v;
      sm[b] = v >= prev[b] ? v : prev[b] * o.smoothing + v * (1 - o.smoothing);
    }
    frames.push(sm); raw.push(out); wave.push(wv); prev = sm;
  }
  return { ...o, sampleRate, duration, frames, raw, wave };
}

/** ffmpeg로 모노 44.1kHz f32 PCM을 읽는다 */
export function readPcm(file, sampleRate = SAMPLE_RATE) {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(sampleRate), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/**
 * 오디오 파일 분석. ffmpeg가 있어야 한다.
 * @param {string} file
 * @param {object} [o] fps=30, bands=32 (4..128), minHz=40, maxHz=16000, smoothing=0.5 (0..0.99), wavePoints=96
 */
export function analyzeAudio(file, opts = {}) {
  return analyzePcm(readPcm(file, SAMPLE_RATE), SAMPLE_RATE, opts);
}

/** 프레임 k의 값(오디오 밖이면 0) */
export function valuesAt(analysis, k) {
  return analysis.frames[k] ?? new Float32Array(analysis.bands);
}

// ── 1단계 클립 굽기 ─────────────────────────────────────────────

/** "#rrggbb" 둘 사이 보간 */
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
/** 대역 i의 색: color 문자열 하나, 또는 colors 배열을 대역 순서로 보간 */
export function bandColor(color, i, n) {
  const list = Array.isArray(color) ? color : [color ?? "#ffffff"];
  if (list.length === 1 || n <= 1) return list[0];
  const t = (i / (n - 1)) * (list.length - 1), j = Math.min(list.length - 2, Math.floor(t));
  return mix(list[j], list[j + 1], t - j);
}

/** 막대 배치: 상자 안 bands칸, gap(px, 기본 칸 너비의 25%) */
export function barLayout(box, bands, gap) {
  const slot = box.width / bands;
  const g = clamp(gap == null ? slot * 0.25 : Number(gap), 0, slot - 1);
  const w = slot - g;
  return Array.from({ length: bands }, (_, i) => ({ x: box.x + i * slot + g / 2, y: box.y, width: w, height: box.height }));
}

/** 키 프레임 목록: analysis.fps에서 keyFps로 줄일 때는 구간 안 최대값(짧은 타격이 사라지지 않게) */
function keySeries(analysis, keyFps, at0, n) {
  const step = analysis.fps / keyFps;
  return Array.from({ length: n }, (_, j) => {
    const a = Math.round(at0 + j * step), b = Math.max(a + 1, Math.round(at0 + (j + 1) * step));
    const out = new Float32Array(analysis.bands);
    for (let k = a; k < b; k++) { const v = valuesAt(analysis, k); for (let i = 0; i < out.length; i++) out[i] = Math.max(out[i], v[i]); }
    return step <= 1 ? valuesAt(analysis, Math.round(at0 + j * step)) : out;
  });
}

/**
 * 시각화 클립(Shape + keyframes). 앞 = 아래.
 * @param {object} analysis  analyzeAudio 결과
 * @param {object} o
 * @param {"bars"|"radial"|"wave"} [o.style="bars"]
 * @param {{x,y,width,height}} o.box      그릴 상자(px). radial은 상자 안 가장 큰 원, wave는 상자 세로 가운데가 0선
 * @param {string|string[]} [o.color="#ffffff"]  색 하나, 또는 대역 순서로 보간할 색 배열
 * @param {number} [o.gap]           막대 사이(px). bars 기본 칸의 25%, radial 기본 둘레 칸의 35%
 * @param {boolean|number} [o.round=true]  막대 끝 둥글게(true = 너비 절반, 숫자 = px)
 * @param {number} [o.at=0]          클립 시작(초, 타임라인)
 * @param {number} [o.from=0]        오디오의 어디서부터(초) — 타임라인 at에 오디오 from 지점이 온다
 * @param {number} [o.duration]      길이(초). 기본 = 오디오 끝까지
 * @param {number} [o.keyFps]        키 개수(초당). 기본 analysis.fps. 앱에서 무거우면 15
 * @param {number} [o.innerRadius=0.45]  radial 안쪽 반지름(바깥 반지름 대비)
 * @param {number} [o.strokeWidth=4]  wave 선 굵기
 * @param {string} [o.id="viz"]
 * @returns {object[]}
 */
export function vizClips(analysis, { style = "bars", box, color = "#ffffff", gap, round = true, at = 0, from = 0, duration, keyFps, innerRadius = 0.45, strokeWidth = 4, id = "viz" } = {}) {
  if (!analysis?.frames) throw new Error("vizClips: analyzeAudio 결과가 필요합니다");
  if (!box || !(box.width > 0) || !(box.height > 0)) throw new Error("vizClips: box {x, y, width, height}가 필요합니다");
  if (!["bars", "radial", "wave"].includes(style)) throw new Error(`vizClips: style은 bars·radial·wave 중 하나 (받은 값: ${style})`);
  const D = duration ?? Math.max(0, analysis.duration - from);
  if (!(D > 0)) throw new Error("vizClips: 길이가 0입니다 (from이 오디오 끝 뒤?)");
  const kf = clamp(num(keyFps, analysis.fps), 1, analysis.fps);
  const n = Math.max(2, Math.round(D * kf) + 1);
  const at0 = from * analysis.fps;
  const series = keySeries(analysis, kf, at0, n);
  const pct = (j) => `${+Math.min(100, ((j / kf) / D) * 100).toFixed(3)}%`;
  const timing = (a, d) => ({ display: { from: us(a), to: us(a + d) }, duration: us(d), playbackRate: 1 });
  const bands = analysis.bands, clips = [];

  if (style === "wave") {
    // 프레임마다 path 하나(1/keyFps초씩 보임). 키프레임으로 path를 바꿀 수 없어서 클립을 나눈다
    const H = box.height, W = box.width, mid = H / 2, sw = num(strokeWidth, 4);
    const col = Array.isArray(color) ? color[0] : color;
    const step = analysis.fps / kf, frameD = 1 / kf;
    for (let j = 0; j < n - 1; j++) {
      const wv = analysis.wave[Math.round(at0 + j * step)] ?? new Float32Array(analysis.wave[0]?.length ?? 96);
      const P = wv.length;
      const d = Array.from(wv, (v, p) => `${p ? "L" : "M"}${r2((p / (P - 1)) * W)} ${r2(mid - v * (mid - sw))}`).join("");
      const a = at + j * frameD, len = Math.min(frameD, at + D - a);
      if (len <= 1e-6) break;
      const cid = `${id}_w${String(j).padStart(4, "0")}`;
      clips.push({
        id: cid, name: cid, type: "Shape", src: "shape", shapeType: "path", timing: timing(a, len),
        transform: { x: box.x, y: box.y, width: W, height: H, angle: 0, opacity: 1 },
        style: { path: d, viewBox: [0, 0, W, H], fill: "transparent", fillOpacity: 0, stroke: { color: col, width: sw, cap: "round", join: "round" } },
        animations: [],
      });
    }
    return clips;
  }

  // bars·radial: 대역마다 막대 하나, scaleY(4%..100%) + 한쪽 끝을 붙잡는 x·y 오프셋
  let rects;
  if (style === "bars") {
    rects = barLayout(box, bands, gap).map((r) => ({ ...r, angle: 0, dir: [0, -1] }));
  } else {
    const R = Math.min(box.width, box.height) / 2, cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const r0 = R * clamp(num(innerRadius, 0.45), 0.05, 0.95), L = R - r0;
    const slot = (2 * Math.PI * r0) / bands, g = clamp(gap == null ? slot * 0.35 : Number(gap), 0, slot - 1), bw = slot - g;
    rects = Array.from({ length: bands }, (_, i) => {
      const phi = -Math.PI / 2 + (i / bands) * 2 * Math.PI; // 12시 방향부터 시계방향
      const dir = [Math.cos(phi), Math.sin(phi)], mr = r0 + L / 2;
      return { x: cx + dir[0] * mr - bw / 2, y: cy + dir[1] * mr - L / 2, width: bw, height: L, angle: (phi * 180) / Math.PI + 90, dir };
    });
  }
  rects.forEach((r, i) => {
    const params = {};
    series.forEach((vals, j) => {
      const s = MIN_BAR + (1 - MIN_BAR) * clamp(vals[i] ?? 0, 0, 1);
      // 가운데 기준으로 줄어드는 만큼 바깥 방향 반대로 옮겨 안쪽(bars는 바닥) 끝을 고정
      const back = (r.height * (1 - s)) / 2;
      params[pct(j)] = { scaleY: r4(s), x: r2(-r.dir[0] * back), y: r2(-r.dir[1] * back) };
    });
    const radius = round === true ? r.width / 2 : round ? num(round, 0) : 0;
    const cid = `${id}_${String(i).padStart(3, "0")}`;
    clips.push({
      id: cid, name: cid, type: "Shape", src: "shape", shapeType: radius > 0 ? "rounded" : "rectangle", timing: timing(at, D),
      transform: { x: r2(r.x), y: r2(r.y), width: r2(r.width), height: r2(r.height), angle: r2(r.angle), opacity: 1 },
      style: { fill: bandColor(color, i, bands), fillOpacity: 1, borderRadius: r2(radius) },
      animations: [{ type: "keyframes", options: { duration: us(D), delay: 0, easing: "linear" }, params }],
    });
  });
  return clips;
}
