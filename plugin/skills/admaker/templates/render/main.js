// 헤드리스 렌더 페이지. render.mjs가 Playwright로 열고 window.renderProject를 호출한다.
// 엔진은 프로젝트에 설치된 @admaker/engine을 쓴다(소스를 복사하지 않는다).
import { Exporter, Preview, registerScript, registerAdmakerTransitions } from "@admaker/engine";
import "@admaker/engine/adapters/lottie";
import { registerThreeScene } from "@admaker/engine/adapters/three";

// script 어댑터: 프로젝트 scripts/*.js 를 같은 이름으로 등록 (admaker 앱에도 같은 이름으로 등록해야 함)
const scripts = import.meta.glob("../scripts/*.js", { eager: true });
for (const [file, mod] of Object.entries(scripts)) {
  const name = file.split("/").pop().replace(/\.js$/, "");
  registerScript(name, mod.default, mod.options ?? {});
}

const toBase64 = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};

window.renderProject = async (project) => {
  const { width, height, fps = 30, bitrate = 8e6 } = project.settings;
  if (!(await Exporter.isSupported({ width, height, bitrate }))) throw new Error("이 브라우저는 WebCodecs 인코딩을 지원하지 않습니다");
  const exporter = await Exporter.create({ width, height, fps, bitrate, format: "mp4", audio: true });
  try {
    await exporter.load(project);
    const reader = exporter.export().getReader();
    const parts = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); }
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return toBase64(out);
  } finally { exporter.dispose(); }
};

// 투명 배경(--alpha): 엔진은 프레임을 straight 알파 RGBA PNG로만 넘기고, 인코딩은 render.mjs가 ffmpeg로 한다.
let alpha = null;
window.alphaOpen = async (project) => {
  const { width, height, fps = 30 } = project.settings;
  const exporter = await Exporter.create({ width, height, fps, transparent: true, audio: false });
  if (typeof exporter.framePNG !== "function") {
    exporter.dispose();
    throw new Error("이 엔진 버전에는 투명 내보내기(framePNG)가 없습니다. @admaker/engine을 올려 주세요");
  }
  await exporter.load(project);
  const frames = Math.max(1, Math.ceil((exporter.durationOf() * fps) / 1e6 - 1e-6));
  alpha = { exporter, fps, project };
  return { frames, fps };
};
window.alphaFrame = async (i) => {
  const blob = await alpha.exporter.framePNG(Math.round((i * 1e6) / alpha.fps));
  return toBase64(new Uint8Array(await blob.arrayBuffer()));
};
// 오디오만 따로 (영상 트랙 없이 width/height 0). 소리 나는 클립이 없거나 실패하면 null.
window.alphaAudio = async () => {
  const clips = Object.values(alpha.project.clips ?? {});
  if (!clips.some((c) => c?.type === "Audio" || c?.type === "Video")) return null;
  const ex = await Exporter.create({ width: 0, height: 0, audio: true, format: "mp4" });
  try {
    await ex.load(alpha.project);
    const reader = ex.export().getReader();
    const parts = [];
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); }
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out.length ? toBase64(out) : null;
  } catch (e) {
    console.warn("오디오 없이 내보냅니다:", e?.message ?? e);
    return null;
  } finally { ex.dispose(); }
};
window.alphaClose = () => { alpha?.exporter.dispose(); alpha = null; };

window.captureStills = async (project, timesSec) => {
  const { width, height, fps = 30 } = project.settings;
  const canvas = document.createElement("canvas");
  document.body.appendChild(canvas);
  const preview = await Preview.create({ width, height, fps, canvas, previewScale: 1 });
  try {
    await preview.loadFromJSON(project);
    await preview.whenMediaReady();
    const shots = [];
    for (const t of timesSec) shots.push(await preview.capture(Math.round(t * 1e6)));
    return shots; // PNG data URL
  } finally { preview.dispose(); }
};

// three 커스텀 씬: 프로젝트 scenes/*.js (export default setup, export const options)
const scenes = import.meta.glob("../scenes/*.js", { eager: true });
for (const [file, mod] of Object.entries(scenes)) {
  const name = file.split("/").pop().replace(/\.js$/, "");
  registerThreeScene(name, mod.default, mod.options ?? {});
}

// admaker 전환 팩 am-* (am-push, am-ink-bleed …) 등록
await registerAdmakerTransitions();

window.RENDER_READY = true;
