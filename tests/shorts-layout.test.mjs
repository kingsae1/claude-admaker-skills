// 쇼츠 9:16 레이아웃 — references/recap-shorts.md §6 (앱 mcpShortsLayout.test.ts와 같은 검사)
// node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { anchorRect, computeLandscapeLayout, computeShortsLayout, containRect, fitCropToRect, parseHookTitle } from "../plugin/skills/admaker/templates/shorts-layout.mjs";

test("parseHookTitle — 줄 기본색 + {색|글자} 강조", () => {
  assert.deepEqual(parseHookTitle("{red|내 동생 죽이면} 1억"), [[{ text: "내 동생 죽이면", color: "#FF3B30" }, { text: " 1억", color: "#FFFFFF" }]]);
  assert.deepEqual(parseHookTitle(["무명배우가 알바하면서", "연기 연습을 하는 방법"]).map((l) => l[0].color), ["#3CFF5A", "#FFE45C"]);
  assert.deepEqual(parseHookTitle("그 남자의\n{#00ff00|진짜} 정체", ["white", "yellow"])[1], [{ text: "진짜", color: "#00FF00" }, { text: " 정체", color: "#FFE45C" }]);
});

test("computeShortsLayout — banded·wide·fullbleed", () => {
  const title = parseHookTitle(["그날 밤 내려진", "비밀 명령"]);
  const l = computeShortsLayout({ width: 1080, height: 1920, titleLines: title });
  assert.equal(l.topBand.height + l.video.height + l.bottomBand.height, 1920);
  assert.ok(l.title.box.y + l.title.box.height <= l.video.y);
  assert.ok(l.subtitle.box.y + l.subtitle.box.height <= l.video.y + l.video.height);
  assert.ok(l.show.titleBox.y >= l.bottomBand.y);
  assert.deepEqual(l.warnings, []);
  assert.equal(computeShortsLayout({ width: 1080, height: 1920, variant: "wide", titleLines: title }).video.height, 608);
  const f = computeShortsLayout({ width: 1080, height: 1920, variant: "fullbleed", titleLines: title });
  assert.deepEqual(f.video, { x: 0, y: 0, width: 1080, height: 1920 });
  assert.equal(f.topBand, null);
  assert.equal(computeShortsLayout({ width: 1920, height: 1080, titleLines: parseHookTitle("아주아주아주아주아주아주길고긴훅제목입니다요") }).warnings.length, 2);
});

test("fitCropToRect·containRect", () => {
  const c = fitCropToRect({ width: 1920, height: 1080 }, null, { width: 1080, height: 1114 });
  assert.equal(c.height, 1080);
  assert.ok(Math.abs(c.x - (1920 - c.width) / 2) <= 1);
  const d = fitCropToRect({ width: 1920, height: 1080 }, { x: 0, y: 120, width: 1920, height: 840 }, { width: 1080, height: 608 });
  assert.ok(d.y >= 120 && d.y + d.height <= 960);
  assert.deepEqual(containRect({ width: 400, height: 100 }, { x: 0, y: 0, width: 200, height: 200 }), { x: 0, y: 75, width: 200, height: 50 });
});

test("computeLandscapeLayout — 16:9 왼쪽 위 프로그램 로고, 오른쪽 위 채널 로고, 영화는 프로그램 로고 없음", () => {
  const l = computeLandscapeLayout({ width: 1920, height: 1080, contentType: "drama" });
  assert.deepEqual(l.video, { x: 0, y: 0, width: 1920, height: 1080 });
  assert.ok(l.programLogo.x < 200 && l.channelLogo.x + l.channelLogo.width > 1800);
  assert.equal(computeLandscapeLayout({ width: 1920, height: 1080, contentType: "movie" }).programLogo, null);
  assert.equal(anchorRect({ width: 100, height: 100 }, { x: 0, y: 0, width: 400, height: 100 }, "right").x, 300);
});
