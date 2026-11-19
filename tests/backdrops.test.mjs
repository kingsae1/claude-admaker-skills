// 수용 기준 검사 — starburst·patterns·wiggle-noise (admaker-plugin cleanroom/remotion/specs)
// node --test tests/*.test.mjs   (렌더가 필요한 기준은 samples/backdrops/check-render.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import { raysSvg, raysBox, raysSpin, normRays } from "../plugin/skills/admaker/templates/rays.mjs";
import { patternSvg, patternBox, patternDrift, patternPeriod, normPattern, driftVector, PATTERN_KINDS } from "../plugin/skills/admaker/templates/patterns.mjs";
import { wiggleKeys, sampleKeys, wiggleAt, noise1 } from "../plugin/skills/admaker/templates/noise.mjs";

// ── starburst
test("rays=16 → 부채꼴 16개, 두 색 교대", () => {
  const svg = raysSvg({ width: 1080, height: 1920, rays: 16, colors: ["#FFD23F", "#FF8A1F"] });
  const fills = [...svg.matchAll(/<path d="[^"]+" fill="([^"]+)" data-ray="(\d+)"/g)].map((m) => m[1]);
  assert.equal(fills.length, 16);
  fills.forEach((f, i) => assert.equal(f, i % 2 ? "#FF8A1F" : "#FFD23F"));
});
test("rays는 12–48 짝수로 맞춤", () => {
  assert.equal(normRays(15), 16); assert.equal(normRays(3), 12); assert.equal(normRays(99), 48); assert.equal(normRays(24), 24);
});
test("twist·softness도 부채꼴 수 유지, 곡선(Q)·마스크 사용", () => {
  const svg = raysSvg({ width: 1920, height: 1080, rays: 20, twist: 40, softness: 0.5 });
  assert.equal((svg.match(/data-ray=/g) || []).length, 20);
  assert.match(svg, /Q/); assert.match(svg, /<mask/);
});
test("raysBox: 정사각, 중심이 방사 중심, 어떤 회전에도 화면 모서리를 덮음", () => {
  for (const [W, H] of [[1080, 1920], [1920, 1080], [1080, 1080]]) for (const c of [[0.5, 0.5], [0.5, 0.3], [0.2, 0.8]]) {
    const b = raysBox({ width: W, height: H, center: c });
    assert.equal(b.width, b.height);
    assert.ok(Math.abs(b.x + b.width / 2 - c[0] * W) < 0.6 && Math.abs(b.y + b.height / 2 - c[1] * H) < 0.6);
    // 회전해도 덮으려면 반변 ≥ 중심에서 가장 먼 모서리 거리
    const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - c[0] * W, y - c[1] * H)));
    assert.ok(b.width / 2 >= far);
  }
});
test("raysSpin: 주기 끝 각도는 그림이 같은 각도(pair 720/rays, swap 2박, smooth 360)", () => {
  const p = raysSpin({ rays: 16, mode: "beat", beat: 0.5, duration: 3 });
  assert.equal(p.params["100%"].angle, 45); assert.equal(p.options.duration, 500000); assert.equal(p.options.iterCount, 6);
  const s = raysSpin({ rays: 16, mode: "beat", beat: 0.5, step: "swap", duration: 3 });
  assert.equal(s.params["100%"].angle, 45); assert.equal(s.options.duration, 1000000);
  const m = raysSpin({ rays: 24, period: 10, duration: 4 });
  assert.equal(m.params["100%"].angle, 360); assert.equal(m.options.iterCount, 1);
  // 그림이 같은 회전 = 720/rays의 배수
  for (const a of [p.params["100%"].angle, s.params["100%"].angle]) assert.equal((a * 16) % 720, 0);
});

// ── patterns
test("패턴 6종 SVG, size<4 → 4, weight>size/2 → size/2", () => {
  for (const kind of PATTERN_KINDS) {
    const svg = patternSvg({ kind, size: 40, width: 400, height: 300 });
    assert.match(svg, /^<svg /); assert.ok(svg.includes(kind === "rings" ? "<circle" : "<pattern"));
  }
  assert.equal(normPattern({ kind: "dots", size: 2 }).size, 4);
  assert.equal(normPattern({ kind: "grid", size: 40, weight: 100 }).weight, 20);
  assert.throws(() => patternSvg({ kind: "hex", width: 10, height: 10 }));
});
test("patternDrift: 한 주기 이동 = 격자 벡터(|d| = 주기), iterCount로 클립 길이 채움", () => {
  for (const kind of ["checker", "grid", "dots", "stripes", "zigzag"]) for (const angle of [0, 20, 45]) {
    const d = patternDrift({ kind, size: 48, angle, speed: 40, duration: 6 });
    const v = d.params["100%"], P = patternPeriod(kind, 48);
    assert.ok(Math.abs(Math.hypot(v.x, v.y) - P) < 0.01, `${kind} ${angle}`);
    // 패턴 좌표로 되돌리면 정수 격자 벡터
    const a = (-(normPattern({ kind, angle }).angle) * Math.PI) / 180;
    const px = (v.x * Math.cos(a) - v.y * Math.sin(a)) / P, py = (v.x * Math.sin(a) + v.y * Math.cos(a)) / P;
    assert.ok(Math.abs(px - Math.round(px)) < 1e-3 && Math.abs(py - Math.round(py)) < 1e-3);
    assert.ok(d.options.iterCount * d.options.duration >= 6e6 - 1);
  }
  const r = patternDrift({ kind: "rings", size: 60, duration: 6 });
  assert.equal(r.params["0%"].scale, 1); assert.equal(r.params["100%"].scale, 1);
});
test("patternBox: 대각 한 주기 흐름에도 화면을 덮음", () => {
  for (const kind of ["checker", "dots"]) {
    const b = patternBox({ width: 1080, height: 1920, kind, size: 48 });
    const { dx, dy } = driftVector({ kind, size: 48, angle: 30, dir: "xy" });
    assert.ok(-b.x >= Math.abs(dx) && -b.y >= Math.abs(dy));
    assert.ok(b.x + b.width - Math.abs(dx) >= 1080 && b.y + b.height - Math.abs(dy) >= 1920);
  }
});

// ── wiggle
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((s, v) => s + v, 0) / n, mb = b.reduce((s, v) => s + v, 0) / n;
  let c = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) { c += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; }
  return c / Math.sqrt(va * vb);
};
test("같은 seed → 같은 결과, 다른 seed → |상관계수| < 0.3", () => {
  const o = { freq: 1, amp: { x: 10, y: 8, angle: 2, scale: 0.04 }, duration: 120 };
  assert.deepEqual(wiggleKeys({ seed: 5, ...o }), wiggleKeys({ seed: 5, ...o }));
  for (let s = 1; s <= 30; s++) {
    const a = sampleKeys(wiggleKeys({ seed: s, ...o })).map((v) => v.x), b = sampleKeys(wiggleKeys({ seed: s + 1, ...o })).map((v) => v.x);
    assert.ok(Math.abs(corr(a, b)) < 0.3, `seed ${s}/${s + 1}: ${corr(a, b)}`);
  }
});
test("인접 프레임 변화량 ≤ amp × freq × 2π / fps × 1.5", () => {
  for (const freq of [0.4, 1, 2.5]) for (const octaves of [1, 2, 3]) for (let seed = 1; seed <= 10; seed++) {
    const amp = { x: 12, y: 7, angle: 1.5, scale: 0.03 }, fps = 30;
    const v = sampleKeys(wiggleKeys({ seed, freq, amp, duration: 10, fps, octaves }));
    for (const k of Object.keys(amp)) {
      const lim = amp[k] * freq * 2 * Math.PI / fps * 1.5;
      for (let i = 1; i < v.length; i++) assert.ok(Math.abs(v[i][k] - v[i - 1][k]) <= lim + 1e-3, `${k} f${freq} o${octaves} s${seed}`);
    }
  }
});
test("평균이 기준값 ± amp × 0.2 안 (scale은 1 기준)", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const amp = { x: 10, y: 10, angle: 2, scale: 0.05 };
    const v = sampleKeys(wiggleKeys({ seed, freq: 1, amp, duration: 10 }));
    for (const k of Object.keys(amp)) {
      const m = v.reduce((s, p) => s + p[k], 0) / v.length - (k === "scale" ? 1 : 0);
      assert.ok(Math.abs(m) <= amp[k] * 0.2, `${k} seed ${seed}: ${m}`);
    }
  }
});
test("freq ≤ 0 → 정지, amp에 없는 속성은 건너뜀, ease면 처음·끝이 기준값", () => {
  const z = sampleKeys(wiggleKeys({ freq: 0, amp: { x: 10 }, duration: 3 }));
  assert.ok(z.every((p) => p.x === 0));
  const w = wiggleKeys({ seed: 2, freq: 1, amp: { y: 10 }, duration: 3 });
  const s = sampleKeys(w);
  assert.ok(s.every((p) => !("x" in p) && "y" in p));
  assert.equal(s[0].y, 0); assert.equal(s.at(-1).y, 0);
  assert.equal(w.params["0%"].y, 0); assert.ok("100%" in w.params);
  // 노이즈 범위
  for (let x = 0; x < 200; x += 0.37) { const n = noise1(x, 9); assert.ok(n >= -1 && n <= 1); }
  assert.deepEqual(Object.keys(wiggleAt(1, { amp: { angle: 2 } })), ["angle"]);
});
