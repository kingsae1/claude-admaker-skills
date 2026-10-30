// 헤드리스 렌더 페이지. render.mjs가 Playwright로 열고 window.renderProject를 호출한다.
// 엔진은 프로젝트에 설치된 @admaker/engine을 쓴다(소스를 복사하지 않는다).
import { Exporter, Preview, registerScript } from "@admaker/engine";
import "@admaker/engine/adapters/lottie";

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

window.RENDER_READY = true;
