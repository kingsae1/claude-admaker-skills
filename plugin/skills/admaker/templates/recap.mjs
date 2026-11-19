// 줄거리 요약(리캡) 하이라이트 — 앱 없이(로컬) 쓰는 도구. ffmpeg·ffprobe만 있으면 된다.
// 앱 MCP 도구와 같은 계산(recap-core.mjs)을 쓰고, 결과는 이 스킬의 timeline.mjs(FOOTAGE·SHOTS)에 넣는다.
// references/recap-highlight.md §9.
//
//   node recap.mjs transcribe <자막.srt|.vtt|whisper.json> [--from 초] [--to 초]     ← transcribe_clip
//   node recap.mjs transcribe <영상> --whisper [모델]                               (whisper CLI가 깔려 있을 때만)
//   node recap.mjs scenes <영상> [--from --to --step --threshold --contrast --min-shot]  ← detect_scenes
//   node recap.mjs sheet <영상> (--at 1.2,5,9 | --shots scenes.json) [--cols N] --out sheet.jpg  ← view_shot_sheet
//   node recap.mjs edges <영상> [--size 1080x1920] [--samples 24] [--preview edges.jpg]  ← detect_edge_overlays
//   node recap.mjs place <plan.json> [--dry-run] [--auto-effects]                   ← place_story_shots
//   node recap.mjs voice <lines.json>                                               ← check_voice_consistency
//
// 결과는 JSON으로 표준 출력(또는 --out 파일)에 쓴다. 시각은 모두 원본 미디어 기준 초(place의 결과만 타임라인 초).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readSubtitles } from "./subtitles.mjs";
import {
  applySuggestions, compareVoiceLines, coverTransformForCrop, cropForBands, cuesToSegments, detectEdgeBands, findShotCuts,
  frameDifference, groupWordsToSegments, localRecapTimeline, measureVoiceLine, pickSampleStep, planStoryShots,
  segmentsInRange, shotsFromCuts, suggestStoryEffects,
} from "./recap-core.mjs";

const round = (v, d = 2) => Math.round(v * 10 ** d) / 10 ** d;
const clock = (sec) => { const m = Math.floor(sec / 60), s = sec - m * 60; return `${m}:${s < 10 ? "0" : ""}${s.toFixed(1)}`; };

// ── ffmpeg ──

function run(cmd, args, { binary = false } = {}) {
  const r = spawnSync(cmd, args, { maxBuffer: 1 << 30, encoding: binary ? "buffer" : "utf8" });
  if (r.error) throw new Error(r.error.code === "ENOENT" ? `${cmd}가 없습니다. ffmpeg를 설치하세요 (앱이 있으면 MCP 도구를 쓰세요)` : r.error.message);
  if (r.status !== 0) throw new Error(`${cmd} 실패: ${String(r.stderr).split("\n").filter(Boolean).slice(-3).join(" / ")}`);
  return r.stdout;
}

/** 길이·크기 (회전 메타데이터를 반영한 화면 크기) */
export function probe(file) {
  const j = JSON.parse(run("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]));
  const v = j.streams.find((s) => s.codec_type === "video");
  const rot = Math.abs(Number(v?.tags?.rotate ?? v?.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0)) % 180 === 90;
  const w = Number(v?.width ?? 0), h = Number(v?.height ?? 0);
  return { durationSec: Number(j.format?.duration ?? v?.duration ?? 0), width: rot ? h : w, height: rot ? w : h, hasAudio: j.streams.some((s) => s.codec_type === "audio") };
}

/** 구간을 일정 간격으로 훑어 작은 회색조 프레임들 (W×H, 한 번 디코딩) */
function grayFrames(file, from, to, step, W, H) {
  const buf = run("ffmpeg", ["-v", "error", "-ss", String(from), "-t", String(to - from), "-i", file, "-an",
    "-vf", `fps=${1 / step},scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], { binary: true });
  const n = Math.floor(buf.length / (W * H));
  return Array.from({ length: n }, (_, k) => ({ t: from + k * step, f: new Uint8Array(buf.buffer, buf.byteOffset + k * W * H, W * H) }));
}

/** 한 시각의 회색조 프레임 */
function grayAt(file, t, W, H) {
  const buf = run("ffmpeg", ["-v", "error", "-ss", String(Math.max(0, t)), "-i", file, "-an", "-frames:v", "1",
    "-vf", `scale=${W}:${H}:flags=area,format=gray`, "-f", "rawvideo", "-"], { binary: true });
  return new Uint8Array(buf.buffer, buf.byteOffset, W * H);
}

// ── 명령 ──

/** transcribe_clip: 자막 파일 또는 whisper 결과 → [{ index, fromSec, toSec, text }] */
export function transcribe(file, o = {}) {
  let segments;
  if (o.whisper !== undefined) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "recap-stt-"));
    const model = typeof o.whisper === "string" && o.whisper !== "true" ? o.whisper : "small";
    run("whisper", [file, "--model", model, "--output_format", "json", "--word_timestamps", "True", "--output_dir", dir]);
    const out = path.join(dir, `${path.basename(file, path.extname(file))}.json`);
    segments = fromWhisperJson(JSON.parse(fs.readFileSync(out, "utf8")));
  } else if (/\.json$/i.test(file)) segments = fromWhisperJson(JSON.parse(fs.readFileSync(file, "utf8")));
  else if (/\.(srt|vtt)$/i.test(file)) segments = cuesToSegments(readSubtitles(fs.readFileSync(file, "utf8")));
  else throw new Error("자막(.srt·.vtt)이나 whisper JSON을 주거나, 영상이면 --whisper를 붙이세요 (whisper CLI 필요). 둘 다 없으면 앱의 transcribe_clip을 씁니다.");
  const inRange = segmentsInRange(segments, num(o.from), num(o.to));
  return { segments: inRange, count: inRange.length, note: "시각은 원본 초입니다. place의 shots from·to와 keyLine에 그대로 씁니다." };
}

/** openai-whisper JSON(segments[].words) 또는 whisper.cpp -oj(transcription[].offsets ms) */
export function fromWhisperJson(j) {
  if (Array.isArray(j.segments)) {
    const words = j.segments.flatMap((s) => (s.words ?? []).map((w) => ({ word: w.word, start: w.start, end: w.end })));
    if (words.length) return groupWordsToSegments(words);
    return j.segments.filter((s) => String(s.text ?? "").trim()).map((s, i) => ({ index: i + 1, fromSec: round(s.start), toSec: round(s.end), text: String(s.text).trim() }));
  }
  if (Array.isArray(j.transcription)) {
    return j.transcription.filter((s) => String(s.text ?? "").trim()).map((s, i) => ({ index: i + 1, fromSec: round(s.offsets.from / 1000), toSec: round(s.offsets.to / 1000), text: String(s.text).trim() }));
  }
  throw new Error("whisper JSON 형식을 알 수 없습니다 (segments[] 또는 transcription[])");
}

/** detect_scenes: 화면 변화로 컷을 찾아 장면 목록. 컷마다 두 표본 사이를 8칸으로 다시 훑어 경계를 좁힌다 */
export function scenes(file, o = {}) {
  const info = probe(file);
  if (!info.durationSec) throw new Error("영상 길이를 알 수 없습니다.");
  const from = Math.max(0, num(o.from) ?? 0), to = Math.min(info.durationSec, num(o.to) ?? info.durationSec);
  if (to - from < 0.5) throw new Error("나눌 구간이 0.5초보다 짧습니다.");
  const step = pickSampleStep(to - from, num(o.step));
  const W = 48, H = 27;
  const samples = grayFrames(file, from, to, step, W, H);
  const times = samples.map((s) => s.t);
  const diffs = samples.map((s, i) => (i ? frameDifference(samples[i - 1].f, s.f) : 0));
  const idx = findShotCuts(diffs, times, { threshold: num(o.threshold), contrast: num(o.contrast), minShotSec: num(o["min-shot"]) });
  const cutTimes = idx.map((i) => {
    const lo = times[i - 1], fine = grayFrames(file, lo, times[i] + step / 16, step / 8, W, H);
    const hit = fine.find((x) => frameDifference(samples[i - 1].f, x.f) >= diffs[i] * 0.5);
    return { t: hit ? hit.t : times[i], score: diffs[i] };
  });
  const shots = shotsFromCuts(cutTimes, from, to).map((s) => ({ ...s, ...readability(s, samples) }));
  return { mediaDurationSec: round(info.durationSec, 3), stepSec: round(step, 3), samples: samples.length, shots,
    note: "flags는 밝기·길이로만 본 어림값입니다(dark 어두움, short 0.7초 미만). 누가 무엇을 하는지 보이는지는 sheet로 직접 봅니다 (§1.1)." };
}

/** 장면 안 표본들의 평균 밝기로 어두운 장면, 길이로 짧은 장면 표시 */
function readability(shot, samples) {
  const inside = samples.filter((s) => s.t >= shot.fromSec && s.t < shot.toSec);
  const luma = inside.length ? inside.reduce((n, s) => n + s.f.reduce((a, b) => a + b, 0) / s.f.length, 0) / inside.length : null;
  const flags = [];
  if (luma !== null && luma < 35) flags.push("dark");
  if (shot.durationSec < 0.7) flags.push("short");
  return { luma: luma === null ? null : Math.round(luma), ...(flags.length ? { flags } : {}) };
}

/** view_shot_sheet: 여러 시각의 프레임을 번호·시각 라벨과 함께 격자 한 장으로 */
export function sheet(file, o = {}) {
  let items;
  if (o.shots) items = JSON.parse(fs.readFileSync(o.shots, "utf8")).shots.map((s) => ({ atSec: s.midSec, label: `${s.index} · ${clock(s.midSec)}` }));
  else items = String(o.at ?? "").split(",").filter(Boolean).map((t, i) => ({ atSec: Number(t), label: `${i + 1} · ${clock(Number(t))}` }));
  if (!items.length) throw new Error("--at 1.2,5,9 또는 --shots scenes.json이 필요합니다.");
  if (!o.out) throw new Error("--out sheet.jpg가 필요합니다.");
  const info = probe(file);
  const aspect = info.width && info.height ? info.width / info.height : 16 / 9;
  const pages = [];
  const perPage = 36;
  for (let p = 0; p * perPage < items.length; p++) {
    const page = items.slice(p * perPage, (p + 1) * perPage);
    const cols = Math.max(1, Math.min(page.length, num(o.cols) ?? (page.length <= 4 ? page.length : page.length <= 9 ? 3 : page.length <= 16 ? 4 : page.length <= 25 ? 5 : 6)));
    const rows = Math.ceil(page.length / cols);
    const cellW = aspect >= 1 ? 256 : 160, cellH = Math.round(cellW / Math.max(aspect, 0.2)) & ~1, labelH = 22;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "recap-sheet-"));
    const font = fontFile();
    page.forEach((it, k) => {
      const label = String(it.label).replace(/[\\:']/g, (c) => `\\${c}`);
      const draw = font ? `,pad=${cellW}:${cellH + labelH}:0:0:black,drawtext=fontfile='${font}':text='${label}':x=6:y=${cellH + 4}:fontsize=14:fontcolor=0xFFD400` : `,pad=${cellW}:${cellH + labelH}:0:0:black`;
      run("ffmpeg", ["-v", "error", "-ss", String(Math.max(0, it.atSec)), "-i", file, "-frames:v", "1", "-vf", `scale=${cellW}:${cellH}${draw}`, "-y", path.join(dir, `c${String(k).padStart(3, "0")}.png`)]);
    });
    const out = items.length > perPage ? o.out.replace(/(\.\w+)?$/, `-${p + 1}$1`) : o.out;
    run("ffmpeg", ["-v", "error", "-framerate", "1", "-i", path.join(dir, "c%03d.png"), "-vf", `tile=${cols}x${rows}:padding=4:margin=4:color=0x111111`, "-frames:v", "1", "-q:v", "3", "-y", out]);
    pages.push({ file: out, cols, rows, items: page });
  }
  return { pages, note: pages.length > 1 ? "36칸씩 나눠 저장했습니다." : undefined };
}

function fontFile() {
  try {
    const f = spawnSync("fc-match", ["-f", "%{file}", "sans:lang=ko"], { encoding: "utf8" }).stdout?.trim();
    return f && fs.existsSync(f) ? f : null;
  } catch { return null; }
}

/** detect_edge_overlays: 위아래 로고·워터마크·구워진 자막·검은 띠 → 잘라 낼 비율 + 캔버스를 채우는 FOOTAGE box */
export function edges(file, o = {}) {
  const info = probe(file);
  const [cw, ch] = String(o.size ?? "1080x1920").split("x").map(Number);
  const count = Math.max(6, Math.min(60, num(o.samples) ?? 24));
  const from = Math.max(0, num(o.from) ?? 0), to = Math.min(info.durationSec, num(o.to) ?? info.durationSec);
  const W = 160, H = Math.max(16, Math.round(W / (info.width / info.height || 16 / 9)));
  const times = Array.from({ length: count }, (_, k) => from + ((k + 0.5) / count) * (to - from));
  const frames = times.map((t) => grayAt(file, t, W, H));
  const bands = detectEdgeBands(frames, W, H);
  const source = { width: info.width, height: info.height };
  const crop = cropForBands(source, bands, cw / ch, { fit: "cover" });
  const box = coverTransformForCrop(source, crop, { width: cw, height: ch });
  if (o.preview) {
    const at = [times[Math.floor(count * 0.2)], times[Math.floor(count * 0.5)], times[Math.floor(count * 0.8)]];
    const pw = 360, ph = Math.round((pw * info.height) / info.width) & ~1;
    const sx = pw / info.width, sy = ph / info.height;
    const red = (x, y, w, h) => (w > 0 && h > 0 ? `,drawbox=x=${Math.round(x)}:y=${Math.round(y)}:w=${Math.round(w)}:h=${Math.round(h)}:color=red@0.45:t=fill` : "");
    const vf = `scale=${pw}:${ph}` + red(0, 0, pw, ph * bands.top) + red(0, ph * (1 - bands.bottom), pw, ph * bands.bottom) + red(0, 0, pw * bands.left, ph) + red(pw * (1 - bands.right), 0, pw * bands.right, ph)
      + `,drawbox=x=${Math.round(crop.x * sx)}:y=${Math.round(crop.y * sy)}:w=${Math.round(crop.width * sx)}:h=${Math.round(crop.height * sy)}:color=0x00ff66:t=2`;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "recap-edges-"));
    at.forEach((t, k) => run("ffmpeg", ["-v", "error", "-ss", String(t), "-i", file, "-frames:v", "1", "-vf", vf, "-y", path.join(dir, `e${k}.png`)]));
    run("ffmpeg", ["-v", "error", "-framerate", "1", "-i", path.join(dir, "e%d.png"), "-vf", "tile=3x1:padding=4:margin=4:color=0x111111", "-frames:v", "1", "-q:v", "3", "-y", o.preview]);
  }
  return { bands: { top: bands.top, bottom: bands.bottom, left: bands.left, right: bands.right }, found: bands.found, source, crop, box,
    ...(o.preview ? { preview: o.preview } : {}),
    note: "빨강 = 잘라 낼 띠, 초록 = 캔버스 비율로 남길 영역. 맞으면 plan.json의 crop에 bands 값(또는 \"auto\")을 넣습니다. 띠가 모자라면 값을 늘립니다." };
}

/**
 * place_story_shots: 스토리 순서 장면 목록 → timeline.mjs에 넣을 FOOTAGE·SHOTS.
 * plan.json: { src, size?: "1080x1920", shots: [{ from, to, label?, stage?, speed?, volume?, keyLine?, camera?, transitionOut? }],
 *              crop?: "auto" | { top, bottom, left, right }, autoEffects?, dryRun?, startSec?, gapSec?, volume?, footageOffset? }
 */
export function place(plan, o = {}) {
  const info = probe(plan.src);
  const [cw, ch] = String(plan.size ?? o.size ?? "1080x1920").split("x").map(Number);
  const res = planStoryShots(plan.shots ?? [], { startSec: plan.startSec, gapSec: plan.gapSec, mediaDurationSec: info.durationSec || null, baseVolume: plan.volume ?? 0.15 });
  if (res.errors.length) return { placed: false, errors: res.errors, warnings: res.warnings, note: "고친 뒤 다시 부릅니다." };
  const suggestions = suggestStoryEffects(res.planned);
  if (plan.autoEffects || o["auto-effects"] !== undefined) applySuggestions(res.planned, suggestions);
  if (plan.dryRun || o["dry-run"] !== undefined) {
    return { dryRun: true, planned: res.planned, keyLines: res.keyLines, totalSec: res.totalSec, warnings: res.warnings, effectSuggestions: suggestions,
      note: "effectSuggestions(전환·줌 추천)를 사용자와 검토해 shots의 camera·transitionOut에 고쳐 넣거나 autoEffects: true로 다시 부릅니다." };
  }
  let box, cropInfo;
  if (plan.crop) {
    const bands = plan.crop === "auto" || plan.crop === true ? edges(plan.src, { size: `${cw}x${ch}` }).bands
      : Object.fromEntries(["top", "bottom", "left", "right"].map((k) => [k, Math.min(0.45, Math.max(0, Number(plan.crop[k]) || 0))]));
    const source = { width: info.width, height: info.height };
    const crop = cropForBands(source, bands, cw / ch, { fit: "cover" });
    box = coverTransformForCrop(source, crop, { width: cw, height: ch });
    cropInfo = { bands, crop };
  }
  const local = localRecapTimeline(res.planned, res.keyLines, {
    src: plan.src, source: { width: info.width, height: info.height }, canvas: { width: cw, height: ch }, box,
    mediaDurationSec: info.durationSec || null, baseVolume: plan.volume ?? 0.15, footageOffset: plan.footageOffset ?? 0,
  });
  const totalSec = round(Math.max(...local.footage.map((f) => f.to)) - Math.min(...local.footage.map((f) => f.from)), 3);
  return { footage: local.footage, shots: local.shots, keyLines: res.keyLines, totalSec, ...(cropInfo ? { crop: cropInfo } : {}),
    warnings: [...res.warnings, ...local.warnings], effectSuggestions: suggestions,
    note: "footage는 timeline.mjs FOOTAGE에, shots는 SHOTS에 그대로 넣습니다(transition-shader·recap-keyline 카드). 내레이션은 keyLines 구간을 비웁니다." };
}

/**
 * check_voice_consistency: 내레이션 줄 파일들의 속도·음높이·감정 폭·음량 비교.
 * lines.json: [{ file, text, voiceId? }]. 고치는 법은 fix(volumeGain·tempoRate·regenerate)와 ffmpeg 명령으로 준다.
 */
export function voice(lines, o = {}) {
  const sr = 16000;
  const inputs = lines.map((l, i) => {
    const buf = run("ffmpeg", ["-v", "error", "-i", l.file, "-ac", "1", "-ar", String(sr), "-f", "f32le", "-"], { binary: true });
    const pcm = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + (buf.length & ~3)));
    return { clipId: l.id ?? l.file ?? `line${i + 1}`, text: l.text ?? "", voiceId: l.voiceId, metrics: measureVoiceLine([pcm], sr, l.text ?? "") };
  });
  const report = compareVoiceLines(inputs);
  for (const r of report.lines) {
    const filters = [];
    if (r.fix.volumeGain) filters.push(`volume=${r.fix.volumeGain}`);
    if (r.fix.tempoRate) filters.push(`atempo=${r.fix.tempoRate}`);
    if (filters.length) r.fix.ffmpeg = `ffmpeg -i "${r.clipId}" -af "${filters.join(",")}" "${String(r.clipId).replace(/(\.\w+)?$/, "_fixed$1")}"`;
  }
  return { ...report, note: "음량·속도는 fix.ffmpeg로 맞추고(atempo는 음높이 유지), regenerate 줄은 사용자에게 확인받고 같은 voiceId·같은 맨 앞 스타일 태그로 다시 생성합니다." };
}

// ── CLI ──

function num(v) {
  if (v === undefined || v === null || v === "" || v === true) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) { pos.push(a); continue; }
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) opt[a.slice(2)] = "true";
    else { opt[a.slice(2)] = next; i++; }
  }
  return { pos, opt };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("recap.mjs")) {
  const [cmd, ...rest] = process.argv.slice(2);
  const { pos, opt } = parseArgs(rest);
  const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
  const cmds = {
    transcribe: () => transcribe(pos[0], opt),
    scenes: () => scenes(pos[0], opt),
    sheet: () => sheet(pos[0], opt),
    edges: () => edges(pos[0], opt),
    place: () => place(readJson(pos[0]), opt),
    voice: () => voice(readJson(pos[0]), opt),
  };
  if (!cmds[cmd] || (!pos[0] && cmd)) {
    console.error("사용: node recap.mjs <transcribe|scenes|sheet|edges|place|voice> <파일> [옵션] (파일 맨 위 설명 참고)");
    process.exit(2);
  }
  try {
    const out = JSON.stringify(cmds[cmd](), null, 2);
    if (opt.out && cmd !== "sheet") fs.writeFileSync(opt.out, out);
    else process.stdout.write(out + "\n");
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
