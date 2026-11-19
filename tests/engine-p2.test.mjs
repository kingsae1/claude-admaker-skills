// 엔진 3.0.31 P2 기능이 validate.mjs를 통과하고 to-admaker-import가 앱(#545) 형식으로 넘기는지
// node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TPL = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/skills/admaker/templates");
const FONT = { fontFamily: "Pretendard", fontUrl: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/public/static/Pretendard-Bold.otf" };
const span = (from, to) => ({ display: { from, to }, trim: { from: 0, to: to - from }, duration: to - from });
const box = (x, y, w, h, z = 1) => ({ x, y, width: w, height: h, zIndex: z });
const D = 6_000_000;

function project() {
  const clips = {
    bg: { id: "bg", type: "Video", src: "https://example.com/a.mp4", timing: span(0, D), transform: box(0, 0, 1080, 1920, 0),
      holdRanges: [{ at: 1_000_000, length: 500_000 }],
      effects: [{ key: "lensDistort", startTime: 0, duration: D, values: { mode: "barrel", amount: 0.3 } }] },
    still: { id: "still", type: "Video", src: "https://example.com/b.mp4", holdAt: 2_000_000, timing: span(0, 2_000_000), transform: box(100, 100, 300, 300, 2) },
    gif: { id: "gif", type: "Image", src: "https://example.com/s.gif", style: { animation: { loop: true, playbackRate: 1 } }, timing: span(0, D), transform: box(700, 200, 200, 200, 3),
      afterimage: { count: 4, gap: 50_000, fade: 0.6 },
      animations: [{ type: "keyframes", params: { colorSpace: "oklab", "0%": { tint: "#ffffff", x: 0 }, "100%": { tint: "#ff3b30", x: 40 } }, options: { duration: 1_000_000 } }] },
    screen: { id: "screen", type: "Image", src: "https://example.com/c.png", cornerPin: { tl: [0.1, 0], tr: [0.9, 0.1], br: [1, 1], bl: [0, 0.9] }, repeat: { every: 1_000_000, count: 3 },
      timing: span(0, D), transform: box(200, 800, 600, 400, 4),
      animations: [{ type: "keyframes", params: { "0%": { skewX: 0, pinTLx: 0 }, "100%": { skewX: 12, pinTLx: 0.05 } }, options: { duration: 1_000_000 } }],
      effects: [{ key: "transitionFx", startTime: 0, duration: 800_000, values: { transition: "am-ink-bleed", direction: "in" } }] },
    title: { id: "title", type: "Text", text: "SALE", style: { ...FONT, fontSize: 120 }, timing: span(0, D), transform: box(100, 1400, 880, 200, 5),
      animations: [{ type: "keyframes", params: { "0%": { color: "#ff3b30" }, "100%": { color: "#ffd60a" } }, options: { duration: 1_000_000 } }] },
    star: { id: "star", type: "Shape", shapeType: "sparkle", src: "shape", style: { fill: "#fff", points: 4, inner: 0.18, curve: 1 }, timing: span(0, D), transform: box(80, 80, 120, 120, 6),
      animations: [{ type: "keyframes", params: { "0%": { fill: "#ffffff" }, "100%": { fill: "#ffd60a" } }, options: { duration: 500_000 } }] },
    snow: { id: "snow", type: "Backdrop", src: "backdrop", backdropType: "particles", params: { kind: "snow", count: 200, seed: 3 }, timing: span(0, D), transform: box(0, 0, 1080, 1920, 7) },
    paper: { id: "paper", type: "Backdrop", src: "backdrop", backdropType: "watercolor", colors: ["#f2efe8", "#c9b79c"], timing: span(0, 1_000_000), transform: box(0, 0, 1080, 1920, 8) },
    bgm: { id: "bgm", type: "Audio", src: "https://example.com/m.mp3", timing: span(0, D) },
    viz: { id: "viz", type: "AudioSpectrum", src: "spectrum", source: "bgm", style: "bars", bands: 24, colors: ["#ffffff"], timing: span(0, D), transform: box(140, 1700, 800, 120, 9) },
    logo3d: { id: "logo3d", type: "Adapter", adapter: "three", src: "three", params: { scene: "extrude", text: "A", depth: 0.2, material: "metal" }, timing: span(0, D), transform: box(300, 500, 480, 480, 10) },
    curl: { id: "curl", type: "Effect", effectKey: "pageCurl", src: "", values: { progress: 0.2 }, timing: span(0, 1_000_000) },
    grain: { id: "grain", type: "Effect", effectKey: "paperOverlay", src: "", values: { kind: "paperTexture", intensity: 0.3 }, timing: span(0, D) },
    vig: { id: "vig", type: "Effect", effectKey: "vignette", src: "", timing: span(0, D) },
  };
  const tracks = Object.keys(clips).map((id) => ({ id: `t_${id}`, name: id, type: clips[id].type, clipIds: [id] }));
  return { name: "p2", settings: { width: 1080, height: 1920, fps: 30, duration: D, shutter: { angle: 180, samples: 8 } }, clips, tracks };
}

function run(script, p, extra = []) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p2-"));
  fs.writeFileSync(path.join(dir, "project.json"), JSON.stringify(p));
  try {
    return { ok: true, out: execFileSync("node", [path.join(TPL, script), "project.json", ...extra], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }), dir };
  } catch (e) { return { ok: false, out: `${e.stdout}${e.stderr}`, dir }; }
}

test("validate: P2 기능(색·skew·핀 키프레임, 새 효과, 입자·종이 Backdrop, 클립 확장, AudioSpectrum, extrude, shutter) 오류 없음", () => {
  const r = run("validate.mjs", project());
  assert.ok(r.ok, r.out);
  assert.doesNotMatch(r.out, /✗/);
});

test("validate: 잘못된 P2 값은 잡는다", () => {
  const p = project();
  p.clips.title.animations[0].params["0%"].color = 12;
  p.clips.snow.params.kind = "hail";
  p.clips.gif.holdAt = 0;
  p.clips.screen.cornerPin = { tl: [0, 0] };
  p.clips.screen.effects[0].values = {};
  p.clips.viz.source = "nope";
  p.clips.logo3d.params = { scene: "extrude" };
  p.settings.shutter = { angle: 180, samples: 1 };
  const r = run("validate.mjs", p);
  assert.equal(r.ok, false);
  for (const re of [/CSS 색이 아님/, /particles kind "hail"/, /Video 클립 전용/, /cornerPin/, /values\.transition/, /source "nope"/, /extrude 씬에 params/, /settings\.shutter/]) assert.match(r.out, re);
});

test("to-admaker-import: engineFields·engineClip·output.shutter·extrude를 앱 형식으로", () => {
  const r = run("to-admaker-import.mjs", project(), ["admaker-import.json"]);
  assert.ok(r.ok, r.out);
  const w = JSON.parse(fs.readFileSync(path.join(r.dir, "admaker-import.json"), "utf8"));
  const clips = Object.fromEntries(w.tracks.flatMap((t) => t.clips).map((c) => [c.name, c]));
  assert.deepEqual(w.output.shutter, { angle: 180, samples: 8 });
  assert.deepEqual(clips.bg.transform.engineFields, { holdRanges: [{ at: 1_000_000, length: 500_000 }] });
  assert.equal(clips.still.transform.engineFields.holdAt, 2_000_000);
  assert.deepEqual(clips.gif.transform.engineFields, { afterimage: { count: 4, gap: 50_000, fade: 0.6 }, style: { animation: { loop: true, playbackRate: 1 } } });
  assert.deepEqual(Object.keys(clips.screen.transform.engineFields).sort(), ["cornerPin", "repeat"]);
  assert.equal(clips.screen.transform.clipEffects[0].key, "transitionFx");
  assert.equal(clips.snow.clipType, "effect");
  assert.equal(clips.snow.transform.engineClip.type, "Backdrop");
  assert.equal(clips.snow.transform.engineClip.backdropType, "particles");
  assert.equal(clips.paper.transform.engineClip.backdropType, "watercolor");
  assert.equal(clips.viz.transform.engineClip.type, "AudioSpectrum");
  assert.equal(clips.viz.transform.engineClip.source, "ep_bgm");
  assert.equal(clips.viz.transform.engineClip.timing, undefined);
  assert.equal(clips.logo3d.transform.adapter.params.scene, "extrude");
  assert.equal(clips.curl.transform.effect.effectKey, "pageCurl");
  assert.ok(clips.gif.transform.animation[0].params["100%"].tint);
});

test("to-admaker-import: am-page-curl은 서버 인코딩용 fade + engine.key", () => {
  const p = project();
  p.clips.b2 = { id: "b2", type: "Video", src: "https://example.com/d.mp4", timing: span(5_000_000, D), transform: box(0, 0, 1080, 1920, 0) };
  p.tracks.push({ id: "t_b2", name: "b2", type: "Video", clipIds: ["b2"] });
  p.clips.tr = { id: "tr", type: "Transition", transitionKey: "am-page-curl", fromClipId: "bg", toClipId: "b2", src: "", timing: span(5_000_000, D) };
  const r = run("to-admaker-import.mjs", p, ["admaker-import.json"]);
  assert.ok(r.ok, r.out);
  const w = JSON.parse(fs.readFileSync(path.join(r.dir, "admaker-import.json"), "utf8"));
  assert.equal(w.transitions[0].type, "fade");
  assert.equal(w.transitions[0].engine.key, "am-page-curl");
});
