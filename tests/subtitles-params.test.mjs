// 수용 기준 검사 — captions-srt-params (admaker-plugin cleanroom/remotion/specs/captions-srt-params.md)
// node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readSubtitles, writeSubtitles, cuesToCaptionWords, addCaptionClips, captionCues } from "../plugin/skills/admaker/templates/subtitles.mjs";
import { applyParams, isCssColor, paramRefs } from "../plugin/skills/admaker/templates/params.mjs";

const SRT = "1\n00:00:01,500 --> 00:00:03,000\n안녕하세요\n두 번째 줄\n\n2\n00:00:03,200 --> 00:00:05,000\nHello world\n";
const quiet = { warn: () => {} };

// ── 자막
test("SRT 시간 → µs", () => {
  const [c] = readSubtitles(SRT);
  assert.equal(c.from, 1_500_000);
  assert.equal(c.to, 3_000_000);
});
test("SRT 읽기 → 쓰기 → 읽기 왕복 (VTT 경유도)", () => {
  const first = readSubtitles(SRT);
  const srt = writeSubtitles(first, "srt");
  assert.ok(srt.startsWith("1\r\n00:00:01,500 --> 00:00:03,000\r\n안녕하세요\r\n두 번째 줄\r\n\r\n2\r\n"));
  assert.deepEqual(readSubtitles(srt), first);
  const vtt = writeSubtitles(first, "vtt");
  assert.ok(vtt.startsWith("WEBVTT\n\n00:00:01.500 --> 00:00:03.000\n"));
  assert.deepEqual(readSubtitles(vtt), first);
});
test("VTT <v Kim>안녕</v> → 안녕, cue 설정·NOTE·STYLE 무시, MM:SS.mmm", () => {
  const vtt = "WEBVTT\n\nSTYLE\n::cue { color: red }\n\nNOTE 메모\n\nid1\n00:01.000 --> 00:02.000 align:start\n<v Kim>안녕</v>\n";
  assert.deepEqual(readSubtitles(vtt), [{ from: 1_000_000, to: 2_000_000, text: "안녕", lines: ["안녕"] }]);
});
test("CRLF·BOM 파일 읽기", () => {
  assert.deepEqual(readSubtitles("﻿" + SRT.replace(/\n/g, "\r\n")), readSubtitles(SRT));
});
test("거꾸로 된 cue는 버리고, 잘못된 블록은 건너뛰고 경고", () => {
  const warnings = [];
  const cues = readSubtitles("1\n00:00:05,000 --> 00:00:04,000\n거꾸로\n\n2\n시간 없음\n\n3\n00:00:06,000 --> 00:00:07,000\n정상\n", { warn: (m) => warnings.push(m) });
  assert.deepEqual(cues.map((c) => c.text), ["정상"]);
  assert.equal(warnings.length, 2);
});
test("cuesToCaptionWords: 글자 수 비례", () => {
  const w = cuesToCaptionWords([{ from: 1_000_000, to: 2_000_000, text: "ab abc de" }]);
  assert.deepEqual(w.map((x) => x.text), ["ab", "abc", "de"]);
  assert.equal(w[0].from, 1000);
  assert.ok(Math.abs(w[0].to - (1000 + 2000 / 7)) < 0.01);
  assert.equal(w[2].to, 2000);
});
test("addCaptionClips → Caption 클립(클립 기준 ms), captionCues로 다시 내보내기", () => {
  const project = { settings: { width: 1080, height: 1920, duration: 6_000_000 }, tracks: [], clips: {} };
  const p1 = addCaptionClips(project, readSubtitles(SRT));
  assert.equal(p1.tracks.at(-1).name, "자막");
  const c = p1.clips.sub_1;
  assert.equal(c.type, "Caption");
  assert.deepEqual(c.timing.display, { from: 1_500_000, to: 3_000_000 });
  assert.equal(c.caption.words[0].from, 0);
  assert.equal(c.caption.words.at(-1).to, 1500);
  // 다시 넣으면 같은 트랙의 자막을 바꿔 끼움
  const p2 = addCaptionClips(p1, readSubtitles(SRT).slice(0, 1));
  assert.equal(p2.tracks.find((t) => t.name === "자막").clipIds.length, 1);
  assert.deepEqual(captionCues(p1).map((x) => [x.from, x.to, x.text]), [[1_500_000, 3_000_000, "안녕하세요 두 번째 줄"], [3_200_000, 5_000_000, "Hello world"]]);
  assert.equal(project.clips.sub_1, undefined); // 원본은 그대로
});

// ── 템플릿 파라미터
const schema = {
  title: { type: "text", default: "기본 제목", label: "제목" },
  price: { type: "number", default: 4500, min: 0, max: 9999, label: "가격" },
  accent: { type: "color", default: "#FF5A1F", label: "강조색" },
  tone: { type: "enum", default: "day", options: ["day", "night"], label: "톤" },
};
const tpl = {
  params: { schema },
  clips: {
    a: { type: "Text", text: "{{title}}", style: { color: "{{accent}}" } },
    b: { type: "Text", text: "가격 {{price}}원" },
    c: { type: "Shape", metadata: { w: "{{ price }}", tone: "{{tone}}", miss: "{{nope}}" } },
  },
};
test('"{{title}}" → 값, "가격 {{price}}원" → 문자열 치환, 전체 참조는 타입 유지', () => {
  const p = applyParams(tpl, { title: "여름 한정", price: 3900 }, quiet);
  assert.equal(p.clips.a.text, "여름 한정");
  assert.equal(p.clips.b.text, "가격 3900원");
  assert.equal(p.clips.c.metadata.w, 3900);
  assert.equal(p.clips.a.style.color, "#FF5A1F"); // 값 없음 → default
  assert.deepEqual(p.params, tpl.params);
  assert.equal(tpl.clips.a.text, "{{title}}"); // 원본 그대로
});
test("number clamp", () => {
  assert.equal(applyParams(tpl, { price: 120000 }, quiet).clips.c.metadata.w, 9999);
  assert.equal(applyParams(tpl, { price: -5 }, quiet).clips.c.metadata.w, 0);
});
test("잘못된 color → default + 경고, enum 밖 → default + 경고, 모르는 참조는 그대로 + 경고", () => {
  const warnings = [];
  const p = applyParams(tpl, { accent: "not-a-color", tone: "noon" }, { warn: (m) => warnings.push(m) });
  assert.equal(p.clips.a.style.color, "#FF5A1F");
  assert.equal(p.clips.c.metadata.tone, "day");
  assert.equal(p.clips.c.metadata.miss, "{{nope}}");
  assert.ok(warnings.some((w) => w.includes("accent")));
  assert.ok(warnings.some((w) => w.includes("tone")));
  assert.ok(warnings.some((w) => w.includes("nope")));
  assert.deepEqual(paramRefs(p), ["nope"]);
});
test("isCssColor", () => {
  for (const ok of ["#fff", "#FF5A1Fcc", "red", "rgb(255, 0, 0)", "rgba(0,0,0,0.5)", "hsl(120 50% 50% / 0.3)", "transparent"]) assert.ok(isCssColor(ok), ok);
  for (const bad of ["#ggg", "reddish", "rgb(1,2)", "", 12]) assert.ok(!isCssColor(bad), String(bad));
});
