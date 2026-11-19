// 렌더 수용 기준 검사 (엔진 브라우저 렌더 스틸로 확인)
//  - 방사선: 9:16·16:9에서 어느 회전 각도든 화면 모서리가 비지 않음, 비트 회전 한 주기 뒤 프레임 = 처음 프레임
//  - 패턴: 6종 각각 patternDrift 한 주기 뒤 프레임 = 처음 프레임 (+ 9:16 시트)
// 사용: node check-render.mjs build   → check_9x16.json, check_16x9.json
//       (렌더 폴더에서) node render/render.mjs check_9x16.json out/c916 --stills 0.5:24:0.5  (16:9도 같게)
//       node check-render.mjs verify out/c916 out/c169
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { image, us } from "../../plugin/skills/admaker/templates/effects.mjs";
import { raysSvg, raysBox, raysSpin } from "../../plugin/skills/admaker/templates/rays.mjs";
import { patternSvg, patternBox, patternDrift } from "../../plugin/skills/admaker/templates/patterns.mjs";
import { svgUrl } from "../../plugin/skills/admaker/templates/paper.mjs";

const SEG = 2; // 구간마다 2초, 한 주기 = 1초 → 구간 시작 + 0.5초와 + 1.5초가 같아야 함
const segments = (W, H) => [
  { name: "rays-beat", rays: { rays: 16, colors: ["#FFD23F", "#FF8A1F"], center: [0.5, 0.5] }, spin: { mode: "beat", beat: 1 } },
  { name: "rays-twist-soft", rays: { rays: 20, colors: ["#FF4F79", "#FFC2D1"], center: [0.5, 0.35], twist: 40, softness: 0.5 }, spin: { mode: "beat", beat: 0.5, step: "swap" } },
  { name: "rays-smooth-offcenter", rays: { rays: 24, colors: ["#2D5BFF", "#9DB4FF"], center: [0.2, 0.8] }, spin: { mode: "smooth", period: 4 / 3 }, corners: true, noLoop: true },
  ...["checker", "grid", "dots", "stripes", "rings", "zigzag"].map((kind, i) => ({
    name: `pat-${kind}`, pat: { kind, size: 56, colors: [["#111111", "#FFFFFF", "#FFE14D", "#FF5A36", "#0E3B2E", "#7B2CFF"][i], ["#F2F2F2", "#2D5BFF", "#1A1A1A", "#FFD9CC", "#B9F5D0", "#F3EAFF"][i]], angle: [0, 15, 20, 45, 0, -10][i] },
  })),
  { name: "pat-checker-xy-30", pat: { kind: "checker", size: 40, colors: ["#FF5A36", "#FFF3E8"], angle: 30 }, dir: "xy" },
].map((s, i) => ({ ...s, from: i * SEG, to: (i + 1) * SEG }));

function build(W, H) {
  const clips = [];
  for (const s of segments(W, H)) {
    if (s.rays) {
      const o = { width: W, height: H, ...s.rays };
      clips.push(image(s.name, svgUrl(raysSvg(o)), s.from, s.to, raysBox(o), { animations: [raysSpin({ rays: o.rays, ...s.spin, duration: SEG })] }));
    } else {
      const box = patternBox({ width: W, height: H, ...s.pat });
      clips.push(image(s.name, svgUrl(patternSvg({ ...s.pat, width: box.width, height: box.height })), s.from, s.to, box,
        { animations: [patternDrift({ ...s.pat, period: 1, dir: s.dir, duration: SEG, width: W, height: H })] }));
    }
  }
  clips.forEach((c, i) => { c.transform.zIndex = i + 1; });
  return { settings: { width: W, height: H, fps: 30, duration: us(clips.length * SEG), backgroundColor: "#000000" },
    tracks: clips.map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })), clips: Object.fromEntries(clips.map((c) => [c.id, c])), transitions: [] };
}

const still = (dir, t) => path.join(dir, `t${String(+t.toFixed(3)).padStart(6, "0")}.png`);
const rgbAt = (file, x, y) => [...execFileSync("ffmpeg", ["-v", "error", "-i", file, "-vf", `crop=1:1:${x}:${y}`, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])];
// 두 PNG의 PSNR(dB). 같은 그림이면 inf, 40 이상이면 눈으로 구별 안 됨
function psnrOf(a, b) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", a, "-i", b, "-lavfi", "psnr", "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/average:(inf|[\d.]+)/); return m ? (m[1] === "inf" ? Infinity : Number(m[1])) : NaN;
}

function verify(dirs) {
  let fail = 0;
  for (const [dir, W, H] of [[dirs[0], 1080, 1920], [dirs[1], 1920, 1080]]) {
    for (const s of segments(W, H)) {
      const a = still(dir, s.from + 0.5), b = still(dir, s.from + 1.5);
      if (!s.noLoop) {
        const p = psnrOf(a, b), ok = p >= 40;
        if (!ok) fail++;
        console.log(`${ok ? "ok  " : "FAIL"} ${W}x${H} ${s.name}: 한 주기(1초) 뒤 PSNR ${p === Infinity ? "inf" : p.toFixed(1)} dB`);
        if (s.pat) { // 실제로 움직였는지: 반 주기 뒤 프레임은 달라야 함
          const h = psnrOf(a, still(dir, s.from + 1)), moved = h < 40;
          if (!moved) fail++;
          console.log(`${moved ? "ok  " : "FAIL"} ${W}x${H} ${s.name}: 반 주기 뒤는 다름 (PSNR ${h.toFixed(1)} dB)`);
        }
      }
      if (s.rays) {
        for (const t of [0.5, 1, 1.5]) for (const [x, y] of [[1, 1], [W - 2, 1], [1, H - 2], [W - 2, H - 2]]) {
          const px = rgbAt(still(dir, s.from + t), x, y);
          const empty = px.every((v) => v < 24);
          if (empty) { fail++; console.log(`FAIL ${W}x${H} ${s.name} t=${s.from + t} 모서리(${x},${y}) 비어 있음 ${px}`); }
        }
        console.log(`ok   ${W}x${H} ${s.name}: 3개 시각 × 4모서리 채워짐`);
      }
    }
  }
  console.log(fail ? `${fail}개 실패` : "모두 통과");
  process.exitCode = fail ? 1 : 0;
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === "build") {
  fs.writeFileSync("check_9x16.json", JSON.stringify(build(1080, 1920)));
  fs.writeFileSync("check_16x9.json", JSON.stringify(build(1920, 1080)));
  console.log("check_9x16.json, check_16x9.json", segments(1, 1).length * SEG, "초");
} else if (cmd === "verify") verify(rest);
else console.log("node check-render.mjs build | verify <9x16 stills> <16x9 stills>");
