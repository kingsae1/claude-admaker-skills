// 임시 사운드 키트 합성 (aesthetic-rules S7): 소재가 없을 때만 쓴다. 외부 파일 없이 16-bit mono WAV를 만든다.
// 사용: node gen-audio-kit.mjs [outDir=sfx]   (프로젝트 폴더에서 실행, timeline.mjs의 BPM·DURATION을 읽음)
// 시드 고정 PRNG라 매번 같은 파일이 나온다. 피크 지연(S5)은 파일마다 아래 PEAK에 적어 둔다.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SR = 44100;
const outDir = process.argv[2] ?? "sfx";
fs.mkdirSync(outDir, { recursive: true });
const tl = await import(pathToFileURL(path.resolve("timeline.mjs")).href);
const BPM = tl.BPM ?? 120;
const DURATION = tl.DURATION ?? 15;

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function writeWav(name, data, peak = 0.89) {
  let max = 0;
  for (const v of data) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? peak / max : 1;
  const buf = Buffer.alloc(44 + data.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + data.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(data.length * 2, 40);
  data.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * g)) * 32767), 44 + i * 2));
  fs.writeFileSync(path.join(outDir, name), buf);
}

const N = (sec) => Math.round(sec * SR);
// 잘라 쓸 수 있게 시작·끝 5ms 페이드
const declick = (d) => { const n = N(0.005); for (let i = 0; i < n; i++) { d[i] *= i / n; d[d.length - 1 - i] *= i / n; } return d; };

/** 이동: 저역통과 컷오프가 올라갔다 내려가는 노이즈. peakAt = 가장 큰 지점(초). */
function whoosh(seed, dur, peakAt, lo, hi) {
  const r = rng(seed), d = new Float32Array(N(dur));
  let y = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const p = t < peakAt ? t / peakAt : 1 - (t - peakAt) / (dur - peakAt);
    const env = Math.pow(Math.max(0, p), 2);
    const fc = lo + (hi - lo) * env;
    const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    y += a * (r() * 2 - 1 - y);
    d[i] = y * env;
  }
  return declick(d);
}

/** 착지: 120→45Hz로 떨어지는 사인 + 짧은 노이즈 트랜지언트. */
function impact() {
  const r = rng(7), d = new Float32Array(N(0.9));
  let ph = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const f = 45 + 75 * Math.exp(-t * 18);
    ph += (2 * Math.PI * f) / SR;
    d[i] = Math.sin(ph) * Math.exp(-t * 4.5) + (r() * 2 - 1) * 0.5 * Math.exp(-t * 60);
  }
  return declick(d);
}

/** 빌드업: 2초 동안 밝아지는 노이즈 + 상승 사인, 끝에서 정점. */
function riser(dur = 2) {
  const r = rng(11), d = new Float32Array(N(dur));
  let y = 0, ph = 0;
  for (let i = 0; i < d.length; i++) {
    const p = i / d.length;
    const fc = 300 + 7000 * p * p;
    y += (1 - Math.exp((-2 * Math.PI * fc) / SR)) * (r() * 2 - 1 - y);
    ph += (2 * Math.PI * (200 + 1000 * p * p)) / SR;
    d[i] = (y * 0.8 + Math.sin(ph) * 0.25) * Math.pow(p, 2.2);
  }
  return declick(d);
}

/** 카운터·UI: 짧은 고음 틱 / 스위치 클릭. */
function tick() {
  const d = new Float32Array(N(0.05));
  for (let i = 0; i < d.length; i++) { const t = i / SR; d[i] = Math.sin(2 * Math.PI * 3000 * t) * Math.exp(-t * 140); }
  return declick(d);
}
function click() {
  const r = rng(23), d = new Float32Array(N(0.03));
  let y = 0;
  for (let i = 0; i < d.length; i++) { const t = i / SR; y += 0.5 * (r() * 2 - 1 - y); d[i] = (r() * 2 - 1 - y) * Math.exp(-t * 250); }
  return declick(d);
}

/** 베드: 마디마다 바뀌는 4코드 패드 + 박마다 부드러운 킥. 음악적 정점은 timeline의 섹션과 맞지 않으므로 임시용. */
function bed() {
  const d = new Float32Array(N(DURATION));
  const beat = 60 / BPM;
  const chords = [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]]; // Am F G Em (MIDI)
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  for (let i = 0; i < d.length; i++) {
    const t = i / SR;
    const bar = Math.floor(t / (beat * 4));
    const notes = chords[bar % chords.length];
    let pad = 0;
    for (const m of notes) for (const det of [-0.08, 0.08]) {
      const f = hz(m + det);
      pad += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    }
    const tb = t % beat;
    const kick = Math.sin(2 * Math.PI * (50 + 60 * Math.exp(-tb * 30)) * tb) * Math.exp(-tb * 9);
    const fade = Math.min(1, t / 1.5, (DURATION - t) / 1.5);
    d[i] = (pad * 0.05 + kick * 0.5) * Math.max(0, fade);
  }
  return declick(d);
}

// 피크 지연(초): sfx.json 시작 시간 = 목표 프레임/fps − PEAK (S5)
const PEAK = { "whoosh_a.wav": 0.3, "whoosh_b.wav": 0.22, "impact.wav": 0, "riser.wav": 2, "tick.wav": 0, "click.wav": 0 };
writeWav("whoosh_a.wav", whoosh(1, 0.45, 0.3, 200, 5000));
writeWav("whoosh_b.wav", whoosh(2, 0.35, 0.22, 300, 6500));
writeWav("impact.wav", impact());
writeWav("riser.wav", riser(2));
writeWav("tick.wav", tick(), 0.6);
writeWav("click.wav", click(), 0.6);
writeWav("bed.wav", bed(), 0.7);
fs.writeFileSync(path.join(outDir, "PEAK.json"), JSON.stringify(PEAK, null, 2));
console.log(`${outDir}/: whoosh_a, whoosh_b, impact, riser, tick, click, bed (${DURATION}s @ ${BPM} BPM) — 합성 임시음, 납품 시 사용자에게 알릴 것`);
