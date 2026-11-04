// 전환 구간 밀집 컨택트 시트 (aesthetic-rules Q18, P1).
// 바닥 소재 컷과 Transition 클립 시각을 찾아, 각 시각 앞뒤 0.5초를 초당 20장으로 뽑아 한 장으로 붙인다.
// 리뷰어(깨끗한 컨텍스트)는 이 시트로 빈 프레임·튀는 프레임·고정점 어긋남을 프레임 단위로 본다.
// 사용: node render/sheet.mjs project.json out/sheets [--at 2.0,4.0] [--span 0.5] [--rate 20] [--cols 10]
// 필요: render/render.mjs 가 도는 환경(vite·playwright·@admaker/engine) + ffmpeg
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const [projectFile, outDir = "out/sheets", ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const span = Number(opt.span ?? 0.5), rate = Number(opt.rate ?? 20), cols = Number(opt.cols ?? 10);
const project = JSON.parse(fs.readFileSync(projectFile, "utf8"));
const end = project.settings.duration / 1e6;

let times = opt.at ? opt.at.split(",").map(Number) : [];
if (!times.length) {
  const clips = Object.values(project.clips);
  const cuts = new Set();
  for (const c of clips) {
    const from = c.timing.display.from / 1e6, to = c.timing.display.to / 1e6;
    if (/^footage-/.test(c.name ?? "")) { if (from > 0.01) cuts.add(+from.toFixed(3)); if (to < end - 0.01) cuts.add(+to.toFixed(3)); }
    if (c.type === "Transition") cuts.add(+((from + to) / 2).toFixed(3));
  }
  // 0.3초 안에 붙은 시각은 하나로 (겹치는 소재의 시작·끝)
  for (const t of [...cuts].sort((a, b) => a - b)) if (!times.length || t - times.at(-1) > 0.3) times.push(t);
}
if (!times.length) { console.log("전환 시각이 없습니다 (--at 으로 지정)"); process.exit(0); }

fs.mkdirSync(outDir, { recursive: true });
const step = 1 / rate, n = Math.round((2 * span) / step) + 1, rows = Math.ceil(n / cols);
const tw = Math.round(project.settings.width / 5), th = Math.round(project.settings.height / 5);
for (const t of times) {
  const a = Math.max(0, t - span), b = Math.min(end, t + span);
  const dir = path.join(outDir, `t${t.toFixed(2)}`);
  fs.rmSync(dir, { recursive: true, force: true });
  execFileSync("node", ["render/render.mjs", projectFile, dir, "--stills", `${a}:${b}:${step}`], { stdio: "inherit" });
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort((x, y) => parseFloat(x.slice(1)) - parseFloat(y.slice(1)));
  fs.writeFileSync(path.join(dir, "list.txt"), files.map((f) => `file '${f}'`).join("\n") + "\n");
  const sheet = path.join(outDir, `sheet_${t.toFixed(2)}s.png`);
  // 칸마다 시각을 적는다 (drawtext 대신 파일 순서 = 시각 순서, 왼쪽 위부터 step초 간격)
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", path.join(dir, "list.txt"),
    "-vf", `scale=${tw}:${th},tile=${cols}x${rows}:padding=4:color=white`, "-frames:v", "1", sheet]);
  console.log(`${sheet}: ${files.length}장, ${a.toFixed(2)}–${b.toFixed(2)}초, ${step.toFixed(3)}초 간격 (왼쪽 위부터)`);
}
