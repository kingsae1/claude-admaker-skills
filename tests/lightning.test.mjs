// 수용 기준 검사 — lightning (admaker-plugin cleanroom/remotion/specs/lightning.md)
// node --test tests/*.test.mjs   (렌더 확인은 samples/lightning/check-render.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { boltPath, boltClips, flickerStops } from "../plugin/skills/admaker/templates/lightning.mjs";

const TPL = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/skills/admaker/templates");
const distToSegment = ([px, py], [ax, ay], [bx, by]) => {
  const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};
const parseD = (d) => [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

test("같은 seed → 같은 d, 다른 seed → 다른 d", () => {
  const o = { from: [100, 0], to: [400, 1200], roughness: 0.6, depth: 6 };
  assert.equal(boltPath({ ...o, seed: 7 }).d, boltPath({ ...o, seed: 7 }).d);
  assert.deepEqual(boltPath({ ...o, seed: 7 }).branches, boltPath({ ...o, seed: 7 }).branches);
  const ds = new Set(Array.from({ length: 20 }, (_, s) => boltPath({ ...o, seed: s }).d));
  assert.equal(ds.size, 20);
  // 문자열 seed도 결정적
  assert.equal(boltPath({ ...o, seed: "sale" }).d, boltPath({ ...o, seed: "sale" }).d);
});

test("경로 시작점 = from, 끝점 = to (±0.5px)", () => {
  for (let s = 0; s < 30; s++) {
    const from = [s * 13.7, 5.25], to = [900 - s * 7.1, 1700.4];
    const pts = parseD(boltPath({ from, to, seed: s, roughness: (s % 4) * 0.5 }).d);
    assert.ok(Math.hypot(pts[0][0] - from[0], pts[0][1] - from[1]) <= 0.5);
    assert.ok(Math.hypot(pts.at(-1)[0] - to[0], pts.at(-1)[1] - to[1]) <= 0.5);
  }
});

test("모든 점이 from→to 선분에서 길이 × roughness 이하 거리", () => {
  for (const roughness of [0.1, 0.5, 1, 1.5]) for (const depth of [1, 4, 6, 9]) for (let s = 0; s < 25; s++) {
    const from = [200, 50], to = [800, 1500], L = Math.hypot(600, 1450);
    const { points, d } = boltPath({ from, to, seed: s, roughness, depth });
    for (const p of [...points, ...parseD(d)]) assert.ok(distToSegment(p, from, to) <= L * roughness + 0.01, `r=${roughness} depth=${depth} seed=${s}`);
  }
  // roughness 0이면 직선
  const flat = boltPath({ from: [0, 0], to: [0, 100], seed: 3, roughness: 0 });
  assert.ok(flat.points.every(([x]) => Math.abs(x) < 1e-9));
});

test("depth=6 → 주 줄기 점 2^6+1개, depth·roughness clamp", () => {
  assert.equal(parseD(boltPath({ from: [0, 0], to: [300, 900], depth: 6 }).d).length, 65);
  assert.equal(boltPath({ from: [0, 0], to: [300, 900], depth: 0 }).points.length, 3);   // → 1
  assert.equal(boltPath({ from: [0, 0], to: [300, 900], depth: 20 }).points.length, 513); // → 9
  // roughness 9 → 1.5로 clamp: 거리 상한이 1.5 × L
  const L = Math.hypot(300, 900), big = boltPath({ from: [0, 0], to: [300, 900], roughness: 9, seed: 2 });
  assert.ok(big.points.every((p) => distToSegment(p, [0, 0], [300, 900]) <= 1.5 * L));
  assert.deepEqual(big.d, boltPath({ from: [0, 0], to: [300, 900], roughness: 1.5, seed: 2 }).d);
});

test("가지: 최대 branches개, 주 줄기 점에서 시작, 길이 0.3–0.6 × L, 방향 ±20–45°", () => {
  const from = [540, 0], to = [400, 1400], L = Math.hypot(140, 1400);
  for (let s = 0; s < 40; s++) {
    const b = boltPath({ from, to, seed: s, branches: 3, branchChance: 0.5 });
    assert.ok(b.branches.length <= 3);
    assert.equal(b.branches.length, b.branchPoints.length);
    for (const bp of b.branchPoints) {
      const i = b.points.findIndex((p) => p[0] === bp[0][0] && p[1] === bp[0][1]);
      assert.ok(i > 0 && i < b.points.length - 1, "가지 시작 = 주 줄기 안쪽 점");
      const len = Math.hypot(bp.at(-1)[0] - bp[0][0], bp.at(-1)[1] - bp[0][1]);
      assert.ok(len >= 0.3 * L - 0.01 && len <= 0.6 * L + 0.01);
      const dir = Math.atan2(b.points[i + 1][1] - b.points[i - 1][1], b.points[i + 1][0] - b.points[i - 1][0]);
      let a = Math.abs(Math.atan2(bp.at(-1)[1] - bp[0][1], bp.at(-1)[0] - bp[0][0]) - dir) * 180 / Math.PI;
      if (a > 180) a = 360 - a;
      assert.ok(a >= 20 - 1e-6 && a <= 45 + 1e-6, `각도 ${a}`);
      assert.equal(bp.length, 2 ** 4 + 1); // depth 6 - 2
    }
  }
  assert.equal(boltPath({ from, to, branches: 0 }).branches.length, 0);
});

test("from = to → 빈 결과와 경고", () => {
  const warn = console.warn; let warned = 0; console.warn = () => warned++;
  try {
    const b = boltPath({ from: [10, 10], to: [10, 10] });
    assert.equal(b.d, ""); assert.deepEqual(b.branches, []);
    assert.deepEqual(boltClips({ from: [10, 10], to: [10, 10], at: 0 }), []);
    assert.ok(warned >= 2);
  } finally { console.warn = warn; }
});

test("깜빡임: 번쩍마다 0 → 1 → 0.2 → 1 → 0, 켜진 구간 60–120ms", () => {
  const st = flickerStops({ duration: 0.8, flashes: 3, seed: 5 });
  assert.equal(st.length, 15);
  for (let k = 0; k < 3; k++) {
    const f = st.slice(k * 5, k * 5 + 5);
    assert.deepEqual(f.map(([, v]) => v), [0, 1, 0.2, 1, 0]);
    for (const [a, b] of [[1, 2], [3, 4]]) { const on = f[b][0] - f[a][0]; assert.ok(on >= 0.06 - 1e-9 && on <= 0.12 + 1e-9, `on ${on}`); }
  }
  for (let i = 1; i < st.length; i++) assert.ok(st[i][0] > st[i - 1][0]);
  assert.ok(st.at(-1)[0] <= 0.8);
});

test("boltClips: 바깥 빛(0.4 + blur) 아래·심 위, 가지 굵기 × 0.5, 클립 상자 안에 경로", () => {
  const clips = boltClips({ from: [700, 0], to: [420, 1100], seed: 7, at: 1.2, duration: 0.6, flashes: 2, branches: 2, branchChance: 0.5, width: 6 });
  const parts = clips.map((c) => c.id.replace(/^bolt_/, ""));
  assert.deepEqual(parts, ["glow", "branch_glow", "branch", "core"]);
  const by = Object.fromEntries(clips.map((c) => [c.id.replace(/^bolt_/, ""), c]));
  assert.equal(by.core.style.stroke.width, 6); assert.equal(by.branch.style.stroke.width, 3);
  assert.ok(by.glow.style.stroke.width > by.core.style.stroke.width);
  const peak = (c) => Math.max(...Object.values(c.animations[0].params).map((p) => p.opacity));
  assert.equal(peak(by.glow), 0.4); assert.equal(peak(by.core), 1);
  assert.ok(Object.values(by.glow.animations[0].params).every((p) => p.blur > 0));
  assert.ok(Object.values(by.core.animations[0].params).every((p) => !("blur" in p)));
  for (const c of clips) {
    assert.equal(c.type, "Shape"); assert.equal(c.shapeType, "path");
    assert.deepEqual(c.style.viewBox, [0, 0, c.transform.width, c.transform.height]);
    for (const [x, y] of parseD(c.style.path)) assert.ok(x >= 0 && y >= 0 && x <= c.transform.width && y <= c.transform.height);
    assert.equal(c.timing.display.from, 1200000); assert.equal(c.timing.display.to, 1800000);
    assert.equal(c.animations[0].params["0%"].opacity, 0); assert.equal(c.animations[0].params["100%"].opacity, 0);
  }
  // 화면 좌표로 되돌리면 boltPath 결과와 같은 줄기
  const back = parseD(by.core.style.path).map(([x, y]) => [x + by.core.transform.x, y + by.core.transform.y]);
  const ref = boltPath({ from: [700, 0], to: [420, 1100], seed: 7, branches: 2, branchChance: 0.5 }).points;
  back.forEach((p, i) => assert.ok(Math.hypot(p[0] - ref[i][0], p[1] - ref[i][1]) < 0.02));
  // reshape: 번쩍마다 다른 경로·이어지는 시간
  const rs = boltClips({ from: [700, 0], to: [420, 1100], seed: 7, at: 0, duration: 0.6, flashes: 3, reshape: true, branches: 0 });
  const cores = rs.filter((c) => c.id.endsWith("_core"));
  assert.equal(cores.length, 3); assert.equal(new Set(cores.map((c) => c.style.path)).size, 3);
  assert.equal(cores[2].timing.display.to, 600000);
});

test("앱 가져오기·검사 통과: to-admaker-import 경고 없음, validate 오류 없음", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bolt-"));
  const W = 1080, H = 1920;
  const bg = { id: "sky", name: "sky", type: "Shape", src: "shape", shapeType: "rectangle", timing: { display: { from: 0, to: 2000000 }, duration: 2000000, playbackRate: 1 },
    transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1 }, style: { fill: "#0B0F1A" }, animations: [] };
  const clips = [bg, ...boltClips({ from: [700, 0], to: [420, 1100], seed: 7, at: 0.2, duration: 0.6, branches: 2, branchChance: 0.5 }),
    ...boltClips({ id: "b2", from: [0, 1500], to: [500, 1300], seed: 3, at: 1, duration: 0.6, flashes: 2, reshape: true })];
  clips.forEach((c, i) => { c.transform.zIndex = i + 1; });
  const project = { settings: { width: W, height: H, fps: 30, duration: 2000000, backgroundColor: "#000000" },
    tracks: [...clips].reverse().map((c) => ({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] })),
    clips: Object.fromEntries(clips.map((c) => [c.id, c])), transitions: [] };
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify(project));
  const imp = execFileSync("node", [path.join(TPL, "to-admaker-import.mjs"), "project.json", "import.json"], { cwd: dir, encoding: "utf8" });
  assert.doesNotMatch(imp, /△/, imp);
  const wire = JSON.parse(fs.readFileSync(path.join(dir, "import.json"), "utf8"));
  const shapes = wire.tracks.flatMap((t) => t.clips).filter((c) => c.transform?.shape?.shapeType === "path");
  assert.equal(shapes.length, clips.length - 1);
  for (const s of shapes) {
    assert.ok(s.transform.shape.style.path && s.transform.shape.style.stroke);
    assert.equal(s.animations?.[0]?.type ?? s.motions?.[0]?.type ?? "keyframes", "keyframes");
  }
  let out = "";
  try { out = execFileSync("node", [path.join(TPL, "validate.mjs"), "project.json"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }
  catch (e) { assert.fail(`validate 실패\n${e.stdout}\n${e.stderr}`); }
  assert.doesNotMatch(out, /✗/, out);
  assert.doesNotMatch(out, /(bolt|b2)_[\w]*: .*(R6|R7)|R7.*(bolt|b2)_/, "깜빡임은 입장 규칙(R6·R7) 대상이 아님");
});
