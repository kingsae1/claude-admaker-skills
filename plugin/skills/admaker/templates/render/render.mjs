// 사용:
//   node render/render.mjs project.json out/ad_9x16.mp4            # 영상
//   node render/render.mjs project.json out/stills --stills 0:15:1  # 1초마다 스틸 (시작:끝:간격)
//   node render/render.mjs project.json out/logo.mov --alpha prores  # 투명 배경 (prores|webm|png)
//     prores → ProRes 4444 .mov · webm → VP9 알파 .webm · png → PNG 시퀀스 .zip
//     배경색(settings.backgroundColor)은 무시하고 알파를 남긴다. ffmpeg·ffprobe가 PATH에 있어야 한다.
//     앱 가져오기용이 아니라 프리미어·캡컷 등에 얹을 로컬 산출물이다. 엔진에 frameRGBA가 있어야 한다.
// 프로젝트 폴더에 vite, playwright, @admaker/engine 이 설치되어 있어야 한다.
// WebCodecs·WebGL이 필요하다: GPU 있는 Chromium을 쓰고, 안 되면 admaker 앱의 내보내기를 쓴다.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { encodeAlpha } from "./alpha.mjs";
import { createServer } from "vite";
import { chromium } from "playwright";

const [projectFile, outPath, flag, range] = process.argv.slice(2);
const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));

const server = await createServer({ root: path.resolve("render"), server: { port: 0 }, logLevel: "error" });
await server.listen();
const url = server.resolvedUrls.local[0];

const browser = await chromium.launch({ args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=default"] });
try {
  const page = await browser.newPage();
  page.on("console", (m) => (m.type() === "error" || m.type() === "warning") && !m.text().includes("GL Driver Message") && console.error("[page]", m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.RENDER_READY === true, null, { timeout: 60_000 });

  if (flag === "--stills") {
    const [a, b, step] = range.split(":").map(Number);
    const times = []; for (let t = a; t <= b + 1e-9; t += step) times.push(+t.toFixed(3));
    const shots = await page.evaluate(([p, ts]) => window.captureStills(p, ts), [project, times]);
    fs.mkdirSync(outPath, { recursive: true });
    shots.forEach((d, i) => fs.writeFileSync(path.join(outPath, `t${String(times[i]).padStart(6, "0")}.png`), Buffer.from(d.split(",")[1], "base64")));
    console.log(`${shots.length} stills → ${outPath}`);
  } else if (flag === "--alpha") {
    const kind = range ?? "prores";
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "admaker-alpha-"));
    try {
      const { frames, fps } = await page.evaluate((p) => window.alphaOpen(p), project);
      for (let i = 0; i < frames; i++) {
        const b64 = await page.evaluate((n) => window.alphaFrame(n), i);
        fs.writeFileSync(path.join(tmp, `frame_${String(i).padStart(6, "0")}.png`), Buffer.from(b64, "base64"));
        if (i % fps === 0) process.stdout.write(`\r프레임 ${i + 1}/${frames}`);
      }
      process.stdout.write(`\r프레임 ${frames}/${frames}\n`);
      let audio = null;
      if (kind !== "png") {
        const a = await page.evaluate(() => window.alphaAudio());
        if (a) fs.writeFileSync((audio = path.join(tmp, "audio.mp4")), Buffer.from(a, "base64"));
      }
      const { kind: used, out } = encodeAlpha(kind, { framesDir: tmp, fps, audio, outPath });
      console.log(`→ ${out} (${used}, ${frames}프레임${used === "png" ? "" : ", 알파 확인"}${audio ? ", 오디오 포함" : ""})`);
    } finally {
      await page.evaluate(() => window.alphaClose()).catch(() => {});
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  } else {
    const b64 = await page.evaluate((p) => window.renderProject(p), project);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
    console.log(`→ ${outPath}`);
  }
} finally {
  await browser.close();
  await server.close();
}
