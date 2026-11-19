// 리캡 로컬 대체 경로 — recap-core.mjs 계산과 recap.mjs(ffmpeg) 명령
// node --test tests/recap.test.mjs   (ffmpeg가 없으면 영상 검사는 건너뜀)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  planStoryShots, suggestStoryEffects, applySuggestions, localRecapTimeline, coverTransformForCrop, cropForBands,
  engineTransitionKey, shotAnimations, compareVoiceLines,
} from "../plugin/skills/admaker/templates/recap-core.mjs";
import { fromWhisperJson, scenes, edges, place } from "../plugin/skills/admaker/templates/recap.mjs";

const canvas = { width: 1080, height: 1920 };
const src = { width: 1920, height: 1080 };

test("planStoryShots: 스토리 순서로 이어 붙이고 keyLine 볼륨 곡선을 만든다", () => {
  const r = planStoryShots([{ from: 60, to: 63 }, { from: 10, to: 14, keyLine: { from: 11, to: 12.5, text: "대사" } }]);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.planned.map((p) => [p.startSec, p.endSec]), [[0, 3], [3, 7]]);
  assert.ok(Array.isArray(r.planned[1].volume));
  assert.deepEqual(r.keyLines.map((k) => [k.startSec, k.endSec, k.text]), [[4, 5.5, "대사"]]);
});

test("localRecapTimeline: 전환은 두 장면을 전환 길이만큼 겹치고 transition-shader 자리를 맞춘다 (engine-recipes §5.2)", () => {
  const r = planStoryShots([
    { from: 20, to: 23, stage: "hook" },
    { from: 5, to: 8, stage: "setup", transitionOut: "cut" },
    { from: 30, to: 33, stage: "rise", speed: 1.5 },
  ]);
  r.planned[0].transitionOut = { type: "am-cut-curve", durationSec: 0.4 };
  r.planned[1].transitionOut = { type: "fadeIn", durationSec: 0.5 };
  const t = localRecapTimeline(r.planned, r.keyLines, { src: "s.mp4", source: src, canvas, mediaDurationSec: 100 });
  const [A, B, C] = t.footage;
  assert.equal(A.to, 3.2); assert.equal(B.from, 2.8); assert.equal(B.trimFrom, 4.8);
  assert.equal(B.to, 6.25); assert.equal(C.from, 5.75);
  assert.equal(C.trimFrom, 30 - 0.25 * 1.5);
  const tr = t.shots.filter((s) => s.card === "transition-shader");
  assert.deepEqual(tr.map((s) => [s.props.key, s.props.at, s.props.from, s.props.to]), [["am-cut-curve", 3, 0, 1], ["fade", 6, 1, 2]]);
  // transition-shader 검사와 같은 식: 앞 to = at + dur/2, 뒤 from = at − dur/2
  for (const s of tr) {
    assert.ok(Math.abs(t.footage[s.props.from].to - (s.props.at + s.props.dur / 2)) < 1e-6);
    assert.ok(Math.abs(t.footage[s.props.to].from - (s.props.at - s.props.dur / 2)) < 1e-6);
  }
});

test("localRecapTimeline: 원본 앞에 여유가 없으면 전환을 컷으로 두고 알린다", () => {
  const r = planStoryShots([{ from: 50, to: 53 }, { from: 0, to: 3 }]);
  r.planned[0].transitionOut = { type: "am-push", durationSec: 0.5 };
  const t = localRecapTimeline(r.planned, [], { src: "s.mp4", source: src, canvas });
  assert.equal(t.shots.length, 0);
  assert.match(t.warnings.join(), /컷으로 둠/);
  assert.equal(t.footage[1].from, 3);
});

test("localRecapTimeline: 다음 장면이 일찍 시작하면 볼륨 곡선·카메라도 뒤로 민다", () => {
  const r = planStoryShots([{ from: 40, to: 43 }, { from: 10, to: 14, keyLine: { from: 11, to: 12 } }]);
  applySuggestions(r.planned, suggestStoryEffects(r.planned));
  r.planned[0].transitionOut = { type: "am-cut-curve", durationSec: 0.4 };
  const before = r.planned[1].volume.map(([s]) => s);
  const t = localRecapTimeline(r.planned, r.keyLines, { src: "s.mp4", source: src, canvas });
  const B = t.footage[1];
  assert.deepEqual(B.volume.slice(1).map(([s]) => s), before.map((s) => Math.round((s + 0.2) * 1000) / 1000));
  assert.equal(B.animations[0].options.delay, Math.round(r.planned[1].keyLine.localFromSec * 1e6) + 200000);
  assert.ok(t.shots.some((s) => s.card === "recap-keyline") === false, "text 없는 keyLine은 자막을 만들지 않는다");
});

test("coverTransformForCrop: 띠를 뺀 영역이 캔버스를 꽉 채우고 띠는 화면 밖", () => {
  const bands = { top: 0.1, bottom: 0.12, left: 0, right: 0 };
  const crop = cropForBands(src, bands, canvas.width / canvas.height, { fit: "cover" });
  const box = coverTransformForCrop(src, crop, canvas);
  const k = box.width / src.width;
  assert.ok(Math.abs(box.x + crop.x * k) <= 1 && Math.abs(box.y + crop.y * k) <= 1);
  assert.ok(Math.abs(box.x + (crop.x + crop.width) * k - canvas.width) <= 1);
  assert.ok(box.y + src.height * 0.1 * k <= 1, "위 띠는 화면 위로 나간다");
  assert.ok(box.y + src.height * (1 - 0.12) * k >= canvas.height - 1, "아래 띠는 화면 아래로 나간다");
});

test("engineTransitionKey: 앱 전환 키 → 엔진 키", () => {
  assert.equal(engineTransitionKey("fadeIn"), "fade");
  assert.equal(engineTransitionKey("am-cut-curve"), "am-cut-curve");
  assert.equal(engineTransitionKey("gl-cube"), "gl-cube");
  assert.equal(engineTransitionKey("nope"), null);
});

test("shotAnimations: camera none이면 keyLine 줌도 넣지 않는다", () => {
  const r = planStoryShots([{ from: 0, to: 3, keyLine: { from: 1, to: 2 }, camera: "none" }]);
  assert.deepEqual(shotAnimations(r.planned[0], 1080), []);
  const r2 = planStoryShots([{ from: 0, to: 3, keyLine: { from: 1, to: 2 } }]);
  assert.equal(shotAnimations(r2.planned[0], 1080)[0].params["100%"].scale, 1.08);
});

test("fromWhisperJson: openai-whisper 단어 시각과 whisper.cpp 형식", () => {
  const a = fromWhisperJson({ segments: [{ start: 0, end: 2, text: "x", words: [{ word: " 안녕", start: 0.1, end: 0.5 }, { word: " 하세요.", start: 0.5, end: 1 }, { word: " 다음", start: 2.5, end: 3 }] }] });
  assert.deepEqual(a.map((s) => s.text), ["안녕 하세요.", "다음"]);
  const b = fromWhisperJson({ transcription: [{ offsets: { from: 1200, to: 2500 }, text: " 대사 " }] });
  assert.deepEqual(b, [{ index: 1, fromSec: 1.2, toSec: 2.5, text: "대사" }]);
});

test("compareVoiceLines: 음량이 튀는 줄에 volumeGain", () => {
  const m = (loud) => ({ speechSec: 2, totalSec: 2.2, leadSilenceSec: 0.1, tailSilenceSec: 0.1, chars: 20, charsPerSec: 10, pitchHz: 180, pitchRangeSt: 2, loudnessDb: loud });
  const r = compareVoiceLines([-20, -20.5, -14].map((l, i) => ({ clipId: `l${i}`, text: "[calm] 문장", metrics: m(l) })));
  assert.equal(r.outliers, 1);
  assert.ok(r.lines[2].fix.volumeGain < 1);
});

const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
test("recap.mjs scenes·edges·place: 합성 영상(컷 2번, 위 로고 띠)", { skip: !hasFfmpeg && "ffmpeg 없음" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "recap-test-"));
  const file = path.join(dir, "src.mp4");
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=320x180:rate=25:duration=2", "-f", "lavfi", "-i", "mandelbrot=size=320x180:rate=25",
    "-f", "lavfi", "-i", "smptehdbars=size=320x180:rate=25:duration=2", "-filter_complex",
    "[1]trim=duration=2,setpts=PTS-STARTPTS[b];[0][b][2]concat=n=3:v=1:a=0,format=yuv420p,drawbox=x=0:y=0:w=320:h=16:color=black:t=fill,drawbox=x=270:y=4:w=40:h=8:color=white:t=fill[v]",
    "-map", "[v]", "-c:v", "libx264", file]);
  assert.equal(r.status, 0, String(r.stderr));
  const s = scenes(file);
  assert.equal(s.shots.length, 3);
  assert.ok(Math.abs(s.shots[1].fromSec - 2) < 0.1 && Math.abs(s.shots[2].fromSec - 4) < 0.1);
  const e = edges(file, { size: "1080x1920" });
  assert.ok(e.bands.top > 0.05 && e.bands.top < 0.2, `top ${e.bands.top}`);
  const out = place({ src: file, size: "1080x1920", crop: "auto", autoEffects: true, shots: [{ from: 4.2, to: 5.8, stage: "hook" }, { from: 0.3, to: 1.8, stage: "setup", keyLine: { from: 0.5, to: 1.2, text: "대사" } }] });
  assert.equal(out.footage.length, 2);
  assert.ok(out.footage.every((f) => f.box && f.box.y < 0));
  assert.ok(out.shots.some((x) => x.card === "transition-shader"));
  assert.ok(out.shots.some((x) => x.card === "recap-keyline" && x.props.text === "대사"));
});
