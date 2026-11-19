// 번개 샘플 (9:16, 6초) — templates/lightning.mjs
// 1) 0–3초  에너지 드링크: 위에서 번개가 글자 뒤로 내리치고(화면도 같이 번쩍) "POWER UP"이 꽂힘, 1.7초에 작은 번개가 한 번 더
// 2) 3–6초  번개 특가: 화면 양쪽 가장자리에서 짧은 전기가 번갈아 튀고(번쩍마다 다른 경로, reshape) "70%"가 흔들림
// node build.mjs → project.json  (렌더: templates/render/render.mjs, 폰트는 render/fonts/에 Pretendard woff2)
// 앱으로: node <스킬>/templates/to-admaker-import.mjs project.json admaker-import.json  (경고 없이 그대로 넘어감)
// 실제 광고에서는 소재(제품 영상·사진) 위 글자 뒤, 모션 전용 씬(인터루드)·엔드카드에 씁니다.
import fs from "node:fs";
import { text, shape, keys, us } from "../../plugin/skills/admaker/templates/effects.mjs";
import { boltClips, flickerStops } from "../../plugin/skills/admaker/templates/lightning.mjs";

const W = 1080, H = 1920;
const BLACK = { fontFamily: "Pretendard", fontUrl: "/fonts/Pretendard-Black.woff2", fontWeight: "400" };
const BOLD = { fontFamily: "PretendardBold", fontUrl: "/fonts/Pretendard-Bold.woff2", fontWeight: "400" };
const layers = []; const add = (...c) => layers.push(...c);
const slam = (a, b, t) => [keys(a, b, [[t, { scale: 1.9, angle: -6 }, "easeOutBack"], [t + 0.18, { scale: 1, angle: 0 }]]), keys(a, b, [[t, { opacity: 0 }], [t + 0.05, { opacity: 1 }]])];
// 번개와 같은 시각에 화면 전체가 살짝 번쩍(같은 seed·duration·flashes → flickerStops가 같은 정지점)
const screenFlash = (name, at, duration, flashes, seed, peak = 0.28, color = "#CFE4FF") => {
  const params = {};
  for (const [t, v] of flickerStops({ duration, flashes, seed })) params[`${+((t / duration) * 100).toFixed(3)}%`] = { opacity: +(v * peak).toFixed(3) };
  params["100%"] = { opacity: 0 };
  return shape(name, "rectangle", at, at + duration, { x: 0, y: 0, width: W, height: H }, { fill: color },
    { animations: [{ type: "keyframes", options: { duration: us(duration), delay: 0, easing: "linear" }, params }] });
};

// ── 1) 0–3초: 내리치는 번개 + POWER UP
{
  const A = 0, B = 3;
  add(shape("bg1", "rectangle", A, B, { x: 0, y: 0, width: W, height: H }, { fill: "#0A0E1F" }));
  add(...boltClips({ id: "main", from: [780, -40], to: [470, 1180], seed: 7, at: 0.3, duration: 0.75, flashes: 3, width: 12, roughness: 0.55, branches: 3, branchChance: 0.4 }));
  add(screenFlash("flash1", 0.3, 0.75, 3, 7));
  add(...boltClips({ id: "small", from: [180, 360], to: [360, 900], seed: 21, at: 1.7, duration: 0.4, flashes: 1, width: 8, branches: 1, branchChance: 0.5, glow: "#9CC8FF" }));
  add(text("power", "POWER", A, B, { x: 60, y: 760, width: 960, height: 260 }, { ...BLACK, fontSize: 250, color: "#FFE14D", stroke: { color: "#0A0E1F", width: 12 } }, { animations: slam(A, B, 0.45) }));
  add(text("up", "UP", A, B, { x: 60, y: 1010, width: 960, height: 260 }, { ...BLACK, fontSize: 250, color: "#FFFFFF", stroke: { color: "#0A0E1F", width: 12 } }, { animations: slam(A, B, 0.6) }));
  add(text("sub1", "카페인 200mg · 무설탕", A, B, { x: 60, y: 1320, width: 960, height: 100 }, { ...BOLD, fontSize: 54, color: "#A9C4FF" },
    { animations: [keys(A, B, [[0.9, { y: 30, opacity: 0 }, "easeOutCubic"], [1.2, { y: 0, opacity: 1 }]])] }));
}

// ── 2) 3–6초: 가장자리 전기 + 번개 특가
{
  const A = 3, B = 6;
  // 앞 장면과 배경 밝기가 비슷한 어두운 색이면 브라우저 인코더가 평평한 곳을 앞 프레임으로 건너뛰어(skip) 앞 장면이 1초쯤 흐리게 남는다 → 확실히 다른 색
  add(shape("bg2", "rectangle", A, B, { x: 0, y: 0, width: W, height: H }, { fill: "#2A1052" }));
  // 왼쪽·오른쪽 가장자리에서 안쪽으로 짧게 튀는 전기. reshape → 번쩍마다 다른 경로
  const sparks = [[0, 520, 480, 660], [W, 980, 600, 1100], [0, 1420, 440, 1280], [W, 380, 620, 540], [0, 900, 500, 1020], [W, 1500, 640, 1360]];
  sparks.forEach(([x0, y0, x1, y1], i) => add(...boltClips({ id: `edge${i + 1}`, from: [x0, y0], to: [x1, y1], seed: 100 + i, at: A + 0.15 + i * 0.42, duration: 0.5, flashes: 2, reshape: true,
    width: 8, color: "#F4ECFF", glow: "#B98CFF", roughness: 0.7, depth: 5, branches: 1, branchChance: 0.4 })));
  add(text("tag", "⚡ 번개 특가", A, B, { x: 60, y: 600, width: 960, height: 140 }, { ...BLACK, fontSize: 110, color: "#FFFFFF" }, { animations: slam(A, B, A + 0.1) }));
  add(text("p70", "70%", A, B, { x: 60, y: 760, width: 960, height: 360 }, { ...BLACK, fontSize: 330, color: "#FFE14D", stroke: { color: "#12051F", width: 14 } },
    { animations: [...slam(A, B, A + 0.3), keys(A, B, [[A + 0.6, { x: 0 }], [A + 0.64, { x: -10 }], [A + 0.68, { x: 8 }], [A + 0.72, { x: 0 }]])] }));
  add(text("until", "오늘 밤 12시까지", A, B, { x: 60, y: 1160, width: 960, height: 110 }, { ...BOLD, fontSize: 60, color: "#D9C8FF" },
    { animations: [keys(A, B, [[A + 0.7, { y: 30, opacity: 0 }, "easeOutCubic"], [A + 1.0, { y: 0, opacity: 1 }]])] }));
}

layers.forEach((c, i) => { c.transform.zIndex = i + 1; });
const project = {
  settings: { width: W, height: H, fps: 30, duration: us(6), backgroundColor: "#000000" },
  tracks: [...layers].reverse().map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })),
  clips: Object.fromEntries(layers.map((c) => [c.id, c])),
  transitions: [],
};
fs.writeFileSync("project.json", JSON.stringify(project));
console.log(layers.length, "clips", (fs.statSync("project.json").size / 1e3).toFixed(1), "KB");
