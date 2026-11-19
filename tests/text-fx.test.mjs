// text-fx.mjs — 텍스트 애니메이션 20종 클립 묶음
// node --test tests/*.test.mjs   (렌더 확인 샘플: samples/text-animations-20)
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { textFx, TEXT_FX, inkBox } from "../plugin/skills/admaker/templates/text-fx.mjs";

const TPL = path.join(path.dirname(fileURLToPath(import.meta.url)), "../plugin/skills/admaker/templates");
const base = { box: { x: 90, y: 800, width: 900, height: 200 }, style: { fontFamily: "Pretendard", fontUrl: "https://example.com/p.woff2", fontWeight: "400", fontSize: 140, color: "#FFFFFF" }, startSec: 0.5, endSec: 3.5 };

test("20종 모두 클립을 만들고 id가 겹치지 않음", () => {
  assert.equal(TEXT_FX.length, 20);
  const seen = new Set();
  for (const { id } of TEXT_FX) {
    const r = textFx(id, { ...base, text: "SALE 50", next: "NEW" });
    assert.ok(r.clips.length >= 1, id);
    assert.equal(r.tracks.length, r.clips.length, id);
    for (const c of r.clips) {
      assert.ok(!seen.has(c.id), `${id}: ${c.id} 중복`);
      seen.add(c.id);
      assert.ok(c.timing.display.from >= 500000 && c.timing.display.to <= 3500000, `${id}: ${c.id} 시간`);
      for (const a of c.animations) assert.ok(a.options.duration > 0, `${id}: ${c.id} ${a.type}`);
    }
  }
});

test("엔진 모션·프리셋을 쓰는 효과", () => {
  const types = (id) => textFx(id, { ...base, text: "DECODE" }).clips.flatMap((c) => [...c.animations.map((a) => a.type), ...(c.style?.characterAnimation ?? []).map((a) => a.type)]);
  assert.ok(types("scramble").includes("scramble"));
  assert.ok(types("decode-marker").includes("scramble"));
  assert.ok(types("typewriter").includes("typewrite"));
  assert.ok(types("sine-wave").includes("charWave"));
  assert.ok(types("blur-in").includes("focus_in"));
  assert.ok(types("blur-bounce").includes("blur_drop"));
});

test("매트는 같은 묶음 안의 클립을 가리킴", () => {
  for (const id of ["split-reveal", "liquid-fill", "decode-marker"]) {
    const { clips } = textFx(id, { ...base, text: "FILL" });
    const ids = new Set(clips.map((c) => c.id));
    const mattes = clips.filter((c) => c.style?.matte);
    assert.ok(mattes.length >= 1, id);
    for (const c of mattes) assert.ok(ids.has(c.style.matte.clipId), `${id}: ${c.style.matte.clipId}`);
  }
});

test("측정한 ink가 있으면 그 범위를 씀, 없으면 box 가운데 어림", () => {
  const ink = { x: 300, y: 850, width: 480, height: 100 };
  assert.deepEqual(inkBox({ ...base, text: "X", ink }), ink);
  const est = inkBox({ ...base, text: "ABCD" });
  assert.ok(Math.abs(est.x + est.width / 2 - 540) < 1);
  const u = textFx("marker-highlight", { ...base, text: "Highlight", ink }).clips.find((c) => c.id.endsWith("_marker"));
  assert.ok(u.transform.x < ink.x && u.transform.x + u.transform.width > ink.x + ink.width);
});

test("모르는 효과·빠진 입력은 오류", () => {
  assert.throws(() => textFx("nope", { ...base, text: "A" }), /모르는 텍스트 효과/);
  assert.throws(() => textFx("scramble", { box: base.box, style: {}, text: "A" }), /fontSize/);
});

test("validate.mjs가 20종 묶음을 오류 없이 통과", () => {
  const clips = {}, tracks = [];
  for (const { id } of TEXT_FX) {
    const r = textFx(id, { ...base, text: "SALE", next: "NEW" });
    for (const c of r.clips) clips[c.id] = c;
    tracks.push(...r.tracks);
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "textfx-"));
  const file = path.join(dir, "project.json");
  fs.writeFileSync(file, JSON.stringify({ settings: { width: 1080, height: 1920, fps: 30, duration: 3500000 }, tracks, clips, transitions: [] }));
  let out = "";
  try { out = execFileSync("node", [path.join(TPL, "validate.mjs"), file], { cwd: dir, encoding: "utf8" }); }
  catch (e) { out = String(e.stdout) + String(e.stderr); }
  assert.ok(!/✗/.test(out), out);
});
