// 사용:
//   node render/render.mjs project.json out/ad_9x16.mp4            # 영상
//   node render/render.mjs project.json out/stills --stills 0:15:1  # 1초마다 스틸 (시작:끝:간격)
// 프로젝트 폴더에 vite, playwright, @admaker/engine 이 설치되어 있어야 한다.
// WebCodecs·WebGL이 필요하다: GPU 있는 Chromium을 쓰고, 안 되면 admaker 앱의 내보내기를 쓴다.
import fs from "node:fs";
import path from "node:path";
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
  page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
  await page.goto(url);
  await page.waitForFunction(() => window.RENDER_READY === true, null, { timeout: 60_000 });

  if (flag === "--stills") {
    const [a, b, step] = range.split(":").map(Number);
    const times = []; for (let t = a; t <= b + 1e-9; t += step) times.push(+t.toFixed(3));
    const shots = await page.evaluate(([p, ts]) => window.captureStills(p, ts), [project, times]);
    fs.mkdirSync(outPath, { recursive: true });
    shots.forEach((d, i) => fs.writeFileSync(path.join(outPath, `t${String(times[i]).padStart(6, "0")}.png`), Buffer.from(d.split(",")[1], "base64")));
    console.log(`${shots.length} stills → ${outPath}`);
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
