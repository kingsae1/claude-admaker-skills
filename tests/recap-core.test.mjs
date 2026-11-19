// recap-core 받은 자막 맞추기 — references/recap-highlight.md §0.5
import test from "node:test";
import assert from "node:assert/strict";

test("받은 자막 맞추기 — anchors 1개는 밀기, 2개는 프레임레이트 차이까지 (앱 mcpRecap과 같음)", async () => {
  const { fitSubtitleAlignment, alignSegments } = await import("../plugin/skills/admaker/templates/recap-core.mjs");
  assert.deepEqual(fitSubtitleAlignment([{ subtitleSec: 100, videoSec: 112.5 }]), { shiftSec: 12.5, rate: 1, residualSec: 0 });
  const r = 25 / 23.976;
  const f = fitSubtitleAlignment([{ subtitleSec: 60, videoSec: 60 * r - 3 }, { subtitleSec: 3000, videoSec: 3000 * r - 3 }]);
  assert.ok(Math.abs(f.rate - r) < 1e-4 && Math.abs(f.shiftSec + 3) < 0.01);
  const segs = [{ index: 1, fromSec: 1, toSec: 2, text: "a" }, { index: 2, fromSec: 10, toSec: 12, text: "b" }];
  assert.deepEqual(alignSegments(segs, -5), [{ index: 1, fromSec: 5, toSec: 7, text: "b" }]);
});
