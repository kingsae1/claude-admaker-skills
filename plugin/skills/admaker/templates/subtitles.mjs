// 자막 파일(SRT·WebVTT) 가져오기·내보내기 — references/subtitles-params.md
// 엔진 3.0.31+의 readSubtitles·writeSubtitles·cuesToCaptionWords와 같은 동작을 엔진 없이도 쓸 수 있게 둔다.
// 시간: cue는 µs(클립 timing과 같음), Caption words는 클립 시작 기준 ms.
//
//   node subtitles.mjs in.srt --to project.json [--track 자막] [--whole]   # 자막 파일 → Caption 클립(cue마다 하나)
//   node subtitles.mjs project.json --export out.srt|out.vtt [--track 자막] # 프로젝트의 Caption → 자막 파일
//   node subtitles.mjs in.vtt --export out.srt                            # 형식 바꾸기
//
// 형식 근거: WebVTT https://www.w3.org/TR/webvtt1/ · SubRip https://en.wikipedia.org/wiki/SubRip
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fontStyle } from "./fonts.mjs";

const ARROW = "-->";
const TIME_RE = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})(?:[,.](\d{1,3}))?$/;

/** "00:00:01,500" / "01:02.250" → µs (아니면 null). 시는 생략 가능, 소수점은 , 또는 . */
export function parseSubtitleTime(raw) {
  const m = TIME_RE.exec(String(raw).trim());
  if (!m) return null;
  const [, h = "0", mm, ss, frac = "0"] = m;
  if (Number(mm) > 59 || Number(ss) > 59) return null;
  return ((Number(h) * 3600 + Number(mm) * 60 + Number(ss)) * 1000 + Number(frac.padEnd(3, "0"))) * 1000;
}

/** µs → "HH:MM:SS,mmm"(srt) / "HH:MM:SS.mmm"(vtt) */
export function formatSubtitleTime(us, format) {
  const t = Math.max(0, Math.round(us / 1000));
  const p = (n, w = 2) => String(n).padStart(w, "0");
  const s = Math.floor(t / 1000);
  return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}${format === "srt" ? "," : "."}${p(t % 1000, 3)}`;
}

const ENT = { amp: "&", lt: "<", gt: ">", nbsp: " ", lrm: "‎", rlm: "‏", quot: '"', apos: "'" };
const stripMarkup = (line) =>
  line.replace(/<[^>\n]*>/g, "").replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, r) => {
    if (r[0] === "#") {
      const code = /^#x/i.test(r) ? parseInt(r.slice(2), 16) : parseInt(r.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : all;
    }
    return ENT[r.toLowerCase()] ?? all;
  });
const escapeVtt = (line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function blocksOf(text) {
  const blocks = [];
  let cur = [];
  for (const line of String(text).replace(/^﻿/, "").replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "") { if (cur.length) blocks.push(cur); cur = []; } else cur.push(line);
  }
  if (cur.length) blocks.push(cur);
  return blocks;
}

export const detectFormat = (text) => (/^﻿?WEBVTT(?:[ \t]|\r?\n|$)/.test(String(text)) ? "vtt" : "srt");

function parseTiming(line) {
  const i = line.indexOf(ARROW);
  if (i < 0) return null;
  const from = parseSubtitleTime(line.slice(0, i));
  const to = parseSubtitleTime(line.slice(i + ARROW.length).trim().split(/\s+/)[0] ?? ""); // 뒤의 cue 설정(align: 등)은 무시
  return from == null || to == null ? null : [from, to];
}

/**
 * SRT/VTT 문자열 → [{ from, to, text, lines }] (µs). 잘못된 블록은 건너뛰고, 끝이 시작보다 앞인 cue는 버린다(경고).
 * @param {{ format?: "srt"|"vtt", warn?: (msg: string) => void }} [opts]
 */
export function readSubtitles(text, opts = {}) {
  const warn = opts.warn ?? ((m) => console.warn(`△ ${m}`));
  const format = opts.format ?? detectFormat(text);
  const cues = [];
  blocksOf(text).forEach((block, bi) => {
    const where = `자막 블록 ${bi + 1}`;
    if (format === "vtt") {
      const head = block[0].trim();
      if (bi === 0 && /^WEBVTT\b/.test(head)) return;
      if (/^(NOTE|STYLE|REGION)(\s|$)/.test(head)) return;
    }
    const ti = block.findIndex((l) => l.includes(ARROW));
    if (ti < 0 || ti > 1) return warn(`${where}: 시간 줄이 없어 건너뜀`);
    const timing = parseTiming(block[ti]);
    if (!timing) return warn(`${where}: 시간 형식이 잘못됨 "${block[ti].trim()}", 건너뜀`);
    const [from, to] = timing;
    if (to < from) return warn(`${where}: 끝(${formatSubtitleTime(to, format)})이 시작(${formatSubtitleTime(from, format)})보다 앞이라 버림`);
    const lines = block.slice(ti + 1).map((l) => stripMarkup(l).trim()).filter(Boolean);
    if (!lines.length) return warn(`${where}: 글자가 없어 건너뜀`);
    cues.push({ from, to, text: lines.join("\n"), lines });
  });
  return cues;
}

const linesOf = (c) => (c.lines?.length ? c.lines : String(c.text ?? "").split(/\r?\n/));

/** cue 목록 → 문자열. SRT: 1부터 번호, `,` 소수점, CRLF. VTT: `WEBVTT` + 빈 줄, `.` 소수점, LF. */
export function writeSubtitles(cues, format) {
  if (format === "srt")
    return cues.map((c, i) => [String(i + 1), `${formatSubtitleTime(c.from, "srt")} ${ARROW} ${formatSubtitleTime(c.to, "srt")}`, ...linesOf(c)].join("\r\n") + "\r\n").join("\r\n");
  return ["WEBVTT\n", ...cues.map((c) => [`${formatSubtitleTime(c.from, "vtt")} ${ARROW} ${formatSubtitleTime(c.to, "vtt")}`, ...linesOf(c).map(escapeVtt)].join("\n") + "\n")].join("\n");
}

/**
 * cue → 엔진 Caption words(클립 시작 기준 ms). 단어 시간은 cue 안에서 글자 수 비례, paragraphIndex = cue 번호.
 * @param {{ splitWords?: boolean, offset?: number }} [opts] offset: 클립이 타임라인에서 시작하는 시각(µs)
 */
export function cuesToCaptionWords(cues, { splitWords = true, offset = 0 } = {}) {
  const ms = (us) => Math.round(us - offset) / 1000;
  const words = [];
  cues.forEach((cue, paragraphIndex) => {
    const text = String(cue.text ?? "").trim();
    if (!text) return;
    const parts = splitWords ? text.split(/\s+/).filter(Boolean) : [text.replace(/\s*\n\s*/g, " ")];
    const total = parts.reduce((n, p) => n + Array.from(p).length, 0);
    const dur = cue.to - cue.from;
    let acc = 0;
    parts.forEach((part, i) => {
      const start = cue.from + (dur * acc) / total;
      acc += Array.from(part).length;
      const end = i === parts.length - 1 ? cue.to : cue.from + (dur * acc) / total;
      words.push({ text: part, from: ms(start), to: ms(end), paragraphIndex });
    });
  });
  return words;
}

// ── 프로젝트 JSON 연결

const DEFAULT_TRACK = "자막";
const clipFrom = (c) => c.timing?.display?.from ?? c.display?.from ?? 0;
const clipTo = (c) => c.timing?.display?.to ?? c.display?.to ?? clipFrom(c);

/** 자막 위치·스타일 기본값: 이미 있는 Caption 클립이 있으면 그 모양을 따른다. */
function captionLook(project) {
  const sample = Object.values(project.clips ?? {}).find((c) => c.type === "Caption");
  if (sample) return { transform: { ...sample.transform }, style: structuredClone(sample.style ?? {}), caption: { colors: sample.caption?.colors, wordAnimation: sample.caption?.wordAnimation }, wordsPerLine: sample.wordsPerLine };
  const W = project.settings?.width ?? 1080, H = project.settings?.height ?? 1920;
  const fontSize = Math.round(Math.min(W, H) * 0.05);
  const height = Math.round(fontSize * 3);
  return {
    transform: { x: Math.round(W * 0.06), y: Math.round(H * (W >= H ? 0.8 : 0.72)), width: Math.round(W * 0.88), height, angle: 0, opacity: 1, zIndex: 900 },
    style: { ...fontStyle({ name: "Pretendard", weight: 700 }), fontSize, color: "#FFFFFF", align: "center", verticalAlign: "center", stroke: { color: "#000000", width: Math.max(2, Math.round(fontSize / 12)) } },
    caption: {},
  };
}

/**
 * cue를 Caption 클립으로 바꿔 프로젝트 트랙에 넣는다. 같은 이름 트랙의 기존 Caption 클립은 바꿔 끼운다.
 * @param {object} project ProjectJSON (복사본을 돌려준다)
 * @param {Array} cues readSubtitles 결과
 * @param {{ track?: string, whole?: boolean, idPrefix?: string }} [opts] whole: 단어로 쪼개지 않고 cue 한 덩어리
 */
export function addCaptionClips(project, cues, { track = DEFAULT_TRACK, whole = false, idPrefix = "sub" } = {}) {
  const out = structuredClone(project);
  out.clips ??= {};
  out.tracks ??= [];
  let t = out.tracks.find((tr) => tr.name === track);
  if (t) {
    for (const id of t.clipIds) if (out.clips[id]?.type === "Caption") delete out.clips[id];
    t.clipIds = t.clipIds.filter((id) => out.clips[id]);
  } else {
    t = { id: `track_${idPrefix}`, name: track, type: "Caption", clipIds: [] };
    out.tracks.push(t); // 마지막 트랙 = 맨 위
  }
  const look = captionLook(project);
  cues.forEach((cue, i) => {
    let id = `${idPrefix}_${i + 1}`;
    while (out.clips[id]) id += "_";
    const dur = cue.to - cue.from;
    const words = cuesToCaptionWords([cue], { splitWords: !whole, offset: cue.from }).map((w) => ({ ...w, paragraphIndex: 0 }));
    out.clips[id] = {
      type: "Caption",
      id,
      name: `자막 ${i + 1}`,
      text: words.map((w) => w.text).join(" "),
      timing: { display: { from: cue.from, to: cue.to }, duration: dur, playbackRate: 1 },
      transform: { ...look.transform },
      style: structuredClone(look.style),
      caption: { ...structuredClone(look.caption), words },
      ...(look.wordsPerLine ? { wordsPerLine: look.wordsPerLine } : {}),
    };
    t.clipIds.push(id);
  });
  const end = cues.reduce((m, c) => Math.max(m, c.to), 0);
  if (out.settings?.duration != null && end > out.settings.duration) console.warn(`△ 자막이 영상 길이(${out.settings.duration / 1e6}s)보다 길게 끝남(${end / 1e6}s)`);
  return out;
}

/** 프로젝트의 Caption 클립 → cue 목록(시작 순). track을 주면 그 트랙만. */
export function captionCues(project, { track } = {}) {
  let ids = Object.keys(project.clips ?? {});
  if (track) ids = project.tracks?.find((tr) => tr.name === track)?.clipIds ?? [];
  return ids
    .map((id) => project.clips[id])
    .filter((c) => c?.type === "Caption")
    .map((c) => {
      const words = c.caption?.words ?? [];
      const text = (words.length ? words.map((w) => w.text).join(" ") : String(c.text ?? "")).trim();
      return { from: clipFrom(c), to: clipTo(c), text, lines: text.split("\n") };
    })
    .filter((c) => c.text)
    .sort((a, b) => a.from - b.from);
}

// ── CLI
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const input = args[0];
  if (!input || (!opt("--to") && !opt("--export"))) {
    console.log("사용: node subtitles.mjs in.srt --to project.json [--track 자막] [--whole]\n      node subtitles.mjs project.json|in.vtt --export out.srt|out.vtt [--track 자막]");
    process.exit(1);
  }
  const raw = fs.readFileSync(input, "utf8");
  const isProject = input.endsWith(".json");
  if (opt("--to")) {
    const target = opt("--to");
    const cues = readSubtitles(raw);
    const project = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : { settings: {}, tracks: [], clips: {} };
    const next = addCaptionClips(project, cues, { track: opt("--track") ?? DEFAULT_TRACK, whole: args.includes("--whole") });
    fs.writeFileSync(target, JSON.stringify(next, null, 2));
    console.log(`✓ 자막 ${cues.length}개 → ${target} (트랙 "${opt("--track") ?? DEFAULT_TRACK}")`);
  } else {
    const dest = opt("--export");
    const format = dest.toLowerCase().endsWith(".vtt") ? "vtt" : "srt";
    const cues = isProject ? captionCues(JSON.parse(raw), { track: opt("--track") }) : readSubtitles(raw);
    fs.writeFileSync(dest, writeSubtitles(cues, format));
    console.log(`✓ 자막 ${cues.length}개 → ${dest}`);
  }
}
