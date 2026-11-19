// 수용 기준 검사 — audio-viz 1단계 (admaker-plugin cleanroom/remotion/specs/audio-viz.md)
// node --test tests/*.test.mjs   (ffmpeg 필요)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { analyzeAudio, analyzePcm, bandBins, vizClips, fft } from "../plugin/skills/admaker/templates/audio-viz.mjs";

const TPL = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/skills/admaker/templates");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "viz-"));

/** 16-bit PCM 모노 WAV 쓰기 */
function writeWav(file, samples, rate = 44100) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + samples.length * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  fs.writeFileSync(file, buf);
  return file;
}
const sine = (hz, seconds, amp = 0.5, rate = 44100) => Array.from({ length: Math.round(seconds * rate) }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / rate));
const SINE = writeWav(path.join(dir, "sine1k.wav"), sine(1000, 2));
const SILENCE = writeWav(path.join(dir, "silence.wav"), new Array(44100 * 2).fill(0));
// 1초 소리(넓은 대역: 여러 사인 합) 뒤 1초 무음
const CUT = writeWav(path.join(dir, "cut.wav"), [
  ...Array.from({ length: 44100 }, (_, i) => [110, 440, 1700, 5200].reduce((a, hz) => a + 0.2 * Math.sin((2 * Math.PI * hz * i) / 44100), 0)),
  ...new Array(44100).fill(0),
]);

test("FFT: 알려진 bin에 사인 에너지", () => {
  const n = 64, re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = Math.cos((2 * Math.PI * 5 * i) / n);
  fft(re, im);
  assert.ok(Math.abs(re[5] - n / 2) < 1e-9 && Math.abs(re[n - 5] - n / 2) < 1e-9);
  for (let k = 0; k < n; k++) if (k !== 5 && k !== n - 5) assert.ok(Math.hypot(re[k], im[k]) < 1e-9);
});

test("1kHz 사인파: 1kHz를 포함하는 대역이 가장 크고, 다른 대역 평균의 3배 이상", () => {
  const a = analyzeAudio(SINE, { fps: 30, bands: 32 });
  const bins = bandBins(a.bands, a.minHz, a.maxHz);
  const target = bins.findIndex(([, , lo, hi]) => lo <= 1000 && 1000 < hi);
  assert.ok(target >= 0);
  // 앞뒤 경계(창이 파일 밖에 걸친 프레임)를 뺀 가운데 프레임 전부
  for (let k = 3; k < a.frames.length - 3; k++) {
    const v = a.raw[k];
    const max = Math.max(...v);
    assert.equal(v[target], max, `frame ${k}`);
    const others = [...v].filter((_, i) => i !== target);
    const mean = others.reduce((s, x) => s + x, 0) / others.length;
    assert.ok(v[target] >= 3 * mean, `frame ${k}: ${v[target]} vs mean ${mean}`);
  }
});

test("무음 파일: 모든 값 0", () => {
  const a = analyzeAudio(SILENCE, { fps: 30, bands: 32 });
  assert.equal(a.frames.length, 60);
  for (const f of a.frames) assert.ok(f.every((v) => v === 0));
});

test("같은 파일 두 번 → 같은 Float32 배열", () => {
  const a = analyzeAudio(CUT, { bands: 48, smoothing: 0.6 }), b = analyzeAudio(CUT, { bands: 48, smoothing: 0.6 });
  assert.equal(a.frames.length, b.frames.length);
  a.frames.forEach((f, k) => { assert.ok(f instanceof Float32Array); assert.deepEqual(f, b.frames[k]); });
});

test("하강 평활: 소리가 끊긴 뒤(창 전체가 무음인 첫 프레임) 값 = 이전 × smoothing (±1e-6)", () => {
  for (const smoothing of [0.5, 0.8]) {
    const a = analyzeAudio(CUT, { fps: 30, bands: 32, smoothing });
    // 창 절반 = 1024 샘플. 중심이 1초 + 1024 샘플 이후인 첫 프레임
    const k = Math.ceil((1 + 1024 / 44100) * 30);
    assert.ok(a.raw[k].every((v) => v === 0), "창이 전부 무음");
    assert.ok(a.frames[k - 1].some((v) => v > 0.1), "이전 프레임은 소리 있음");
    for (let i = 0; i < a.bands; i++) assert.ok(Math.abs(a.frames[k][i] - a.frames[k - 1][i] * smoothing) <= 1e-6, `band ${i}`);
    // 오르는 쪽은 즉시
    const up = a.raw.findIndex((f, j) => j > 0 && f.some((v, i) => v > a.frames[j - 1][i]));
    assert.ok(up >= 0);
    a.raw[up].forEach((v, i) => { if (v >= a.frames[up - 1][i]) assert.equal(a.frames[up][i], v); });
  }
});

test("경계값: bands 4..128 clamp, 오디오 밖 프레임 0", () => {
  const pcm = Float32Array.from(sine(1000, 0.5));
  assert.equal(analyzePcm(pcm, 44100, { bands: 1 }).bands, 4);
  assert.equal(analyzePcm(pcm, 44100, { bands: 999 }).bands, 128);
  assert.equal(analyzePcm(pcm, 44100, { bands: 999 }).frames[3].length, 128);
  const a = analyzePcm(pcm, 44100, { bands: 16 });
  const clips = vizClips(a, { box: { x: 0, y: 0, width: 400, height: 100 }, at: 0, duration: 1 }); // 오디오(0.5초)보다 김
  const stops = Object.entries(clips[0].animations[0].params);
  const late = stops.filter(([p]) => parseFloat(p) > 60);
  assert.ok(late.length && late.every(([, v]) => v.scaleY === 0.04), "오디오 밖은 최소 높이");
});

test("무음 → 막대 전부 최소 높이(4%), 바닥 고정", () => {
  const a = analyzeAudio(SILENCE, { bands: 8 });
  const clips = vizClips(a, { box: { x: 100, y: 500, width: 800, height: 200 }, color: ["#ff0000", "#0000ff"] });
  assert.equal(clips.length, 8);
  assert.equal(clips[0].style.fill, "#ff0000"); assert.equal(clips[7].style.fill, "#0000ff");
  for (const c of clips) for (const v of Object.values(c.animations[0].params)) {
    assert.equal(v.scaleY, 0.04);
    // 가운데 기준 scaleY 뒤 바닥 = y + h/2 + yOffset + h·s/2 = y + h
    const h = c.transform.height, bottom = c.transform.y + h / 2 + v.y + (h * v.scaleY) / 2;
    assert.ok(Math.abs(bottom - (c.transform.y + h)) < 0.02);
  }
});

test("radial: 안쪽 끝 고정, wave: 프레임마다 path", () => {
  const a = analyzeAudio(CUT, { bands: 16 });
  const box = { x: 0, y: 0, width: 600, height: 600 }, cx = 300, cy = 300;
  const rad = vizClips(a, { style: "radial", box, duration: 1 });
  assert.equal(rad.length, 16);
  for (const c of rad) {
    const th = (c.transform.angle * Math.PI) / 180, h = c.transform.height;
    const ux = Math.sin(th), uy = -Math.cos(th); // 막대 바깥 방향(로컬 -y)
    for (const v of Object.values(c.animations[0].params)) {
      const mx = c.transform.x + c.transform.width / 2 + v.x, my = c.transform.y + h / 2 + v.y;
      const inner = Math.hypot(mx - ux * (h * v.scaleY) / 2 - cx, my - uy * (h * v.scaleY) / 2 - cy);
      assert.ok(Math.abs(inner - 300 * 0.45) < 0.1, `inner ${inner}`);
    }
  }
  const wave = vizClips(a, { style: "wave", box: { x: 0, y: 800, width: 1000, height: 200 }, duration: 1, keyFps: 15 });
  assert.equal(wave.length, 15);
  assert.ok(new Set(wave.map((c) => c.style.path)).size > 1);
  assert.equal(wave.at(-1).timing.display.to, 1000000);
});

test("keyFps 15: 키 수가 절반", () => {
  const a = analyzeAudio(CUT, { fps: 30, bands: 8 });
  const k30 = Object.keys(vizClips(a, { box: { x: 0, y: 0, width: 400, height: 100 } })[0].animations[0].params).length;
  const k15 = Object.keys(vizClips(a, { box: { x: 0, y: 0, width: 400, height: 100 }, keyFps: 15 })[0].animations[0].params).length;
  assert.equal(k30, 61); assert.equal(k15, 31);
});

test("앱 가져오기·검사 통과: to-admaker-import 경고 없음, validate 오류 없음", () => {
  const a = analyzeAudio(CUT, { bands: 12 });
  const W = 1080, H = 1920, D = 2;
  const bg = { id: "backdrop", name: "backdrop", type: "Shape", src: "shape", shapeType: "rectangle", timing: { display: { from: 0, to: D * 1e6 }, duration: D * 1e6, playbackRate: 1 },
    transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1 }, style: { fill: "#101018" }, animations: [] };
  const clips = [bg,
    ...vizClips(a, { id: "eq", box: { x: 140, y: 1300, width: 800, height: 260 }, color: ["#FFD23F", "#FF4F7B"], keyFps: 15 }),
    ...vizClips(a, { id: "ring", style: "radial", box: { x: 290, y: 400, width: 500, height: 500 }, color: "#7FE3FF", keyFps: 15 }),
    ...vizClips(a, { id: "wv", style: "wave", box: { x: 90, y: 1650, width: 900, height: 160 }, color: "#ffffff", keyFps: 15 })];
  clips.forEach((c, i) => { c.transform.zIndex = i + 1; });
  const project = { settings: { width: W, height: H, fps: 30, duration: D * 1e6, backgroundColor: "#000000" },
    tracks: [...clips].reverse().map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })),
    clips: Object.fromEntries(clips.map((c) => [c.id, c])), transitions: [] };
  const pdir = fs.mkdtempSync(path.join(os.tmpdir(), "viz-app-"));
  fs.writeFileSync(path.join(pdir, "project.json"), JSON.stringify(project));
  const imp = execFileSync("node", [path.join(TPL, "to-admaker-import.mjs"), "project.json", "import.json"], { cwd: pdir, encoding: "utf8" });
  assert.doesNotMatch(imp, /△/, imp);
  const wire = JSON.parse(fs.readFileSync(path.join(pdir, "import.json"), "utf8"));
  const shapes = wire.tracks.flatMap((t) => t.clips).filter((c) => c.transform?.shape);
  assert.equal(shapes.length, clips.length);
  const eq = shapes.filter((s) => JSON.stringify(s).includes("scaleY"));
  assert.equal(eq.length, 24); // 막대 12 + 원형 12
  let out = "";
  try { out = execFileSync("node", [path.join(TPL, "validate.mjs"), "project.json"], { cwd: pdir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { assert.fail(`validate 실패\n${e.stdout}\n${e.stderr}`); }
  assert.doesNotMatch(out, /✗/, out);
});
