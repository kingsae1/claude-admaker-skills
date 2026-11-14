// 모션 전용 씬(인터루드)과 화려한 전환을 템포에 맞춰 얼마나·어디에 둘지 정하는 순수 모듈 + CLI.
// 규칙은 references/interludes.md. timeline.mjs·validate.mjs·앱 MCP가 같이 쓴다(파일·네트워크 없음, 결정적).
//
//   tempoClass({ bpm, direction, request })                → "fast" | "mid" | "slow"
//   dosage(tempo, duration)                                  → { interludes, maxShare, beats: [min, max], graphicTransitions, accents, intensity }
//   planInterludes({ bpm, duration, scenes, peaks, drop, direction, request, beatSec, firstBeatSec })
//       → { tempo, dose, intensity, interludes: [{ at, dur, beats, after, kind, entry, exit, why }], accents: [...], seams: [{ at, kind }] }
//   checkInterludes({ tempo, duration, windows })            → [{ level: "✗"|"△", msg }]
//
// CLI:  node templates/interludes.mjs plan --bpm 128 --duration 15 [--scenes scenes.json] [--direction beat-montage] [--request "…"]
//       scenes.json = [{ id, from, to, role: "hook"|"hero"|"feature"|"proof"|"offer"|"endcard" }] (초)

/** 요청 낱말 중 '천천히·제품을 크게 보여 줌' 쪽 */
const SLOW_WORDS = /프리미엄|고급|럭셔리|차분|잔잔|미니멀|우아|감성|힐링|제품\s*(?:극대화|중심|강조|클로즈업)|상품\s*(?:극대화|중심|강조)|디테일|질감|시네마틱|슬로우|느린/;
const FAST_WORDS = /빠른|역동|에너지|힙|스트릿|게임|페스티벌|세일|할인|타임\s*딜|몽타주|비트|EDM|댄스|스포츠|런칭\s*쇼/;
const FAST_DIRECTIONS = new Set(["beat-montage", "glitch-tech", "offer-punch", "editorial-kinetic"]);
const SLOW_DIRECTIONS = new Set(["product-hero", "handwritten-warm", "glossy-signature"]);

export function tempoClass({ bpm = 120, direction, request = "" } = {}) {
  let score = bpm >= 118 ? 1 : bpm < 95 ? -1 : 0;
  if (FAST_DIRECTIONS.has(direction)) score += 0.5;
  if (SLOW_DIRECTIONS.has(direction)) score -= 0.5;
  if (FAST_WORDS.test(request)) score += 0.75;
  if (SLOW_WORDS.test(request)) score -= 1;
  return score >= 0.75 ? "fast" : score <= -0.75 ? "slow" : "mid";
}

/**
 * 모션 세기. 샷 카드·전환 헬퍼의 props에 그대로 넘긴다.
 * stagger(초)·scatter(배율)·durScale(길이 배율)·ease(들어옴/나감)·motionBlur(이동이 빠른 층)·hitsPerBar(박 반응 수)
 */
export const INTENSITY = Object.freeze({
  fast: { stagger: 0.035, scatter: 1, durScale: 0.8, easeIn: "easeInExpo", easeOut: "easeOutExpo", overshoot: "easeOutBack", motionBlur: true, hitsPerBar: 4 },
  mid: { stagger: 0.05, scatter: 0.7, durScale: 1, easeIn: "easeInQuart", easeOut: "easeOutQuart", overshoot: "easeOutBack", motionBlur: true, hitsPerBar: 2 },
  slow: { stagger: 0.08, scatter: 0.35, durScale: 1.6, easeIn: "easeInOutCubic", easeOut: "easeOutCubic", overshoot: "easeOutCubic", motionBlur: false, hitsPerBar: 1 },
});

/** 길이별 양. interludes는 최대 개수(엔드카드 제외), maxShare는 전체 길이 중 소재 없는 시간의 상한 */
export function dosage(tempo, duration) {
  const d = Math.max(1, duration);
  if (tempo === "fast") return {
    interludes: d < 10 ? 1 : Math.min(4, Math.round(d / 9)), maxShare: 0.3, beats: [2, 4],
    graphicTransitions: "경계마다(같은 것 연속 금지)", accents: 1, intensity: INTENSITY.fast,
  };
  if (tempo === "mid") return {
    interludes: d < 12 ? 0 : Math.min(2, Math.floor(d / 14)), maxShare: 0.18, beats: [4, 4],
    graphicTransitions: "경계 두 곳 중 한 곳", accents: 1, intensity: INTENSITY.mid,
  };
  return {
    interludes: d < 28 ? 0 : 1, maxShare: 0.08, beats: [2, 4],
    graphicTransitions: "시그니처 한 곳", accents: d < 10 ? 1 : 2, intensity: INTENSITY.slow,
  };
}

/** 템포별 메뉴 (references/interludes.md §3). 앞에 있는 것부터 고른다 */
export const KINDS = Object.freeze({
  fast: ["particle-morph", "bauhaus-grid-flip", "kinetic-typo-beat", "variable-type-breath", "countup-hud"],
  mid: ["variable-type-breath", "kinetic-typo-beat", "bauhaus-grid-flip", "countup-hud"],
  slow: ["variable-type-breath", "countup-hud"],
});
/** 소재 위에 얹는 '살짝' 버전 — 화면을 덮지 않고 제품 옆에 붙는다 */
export const ACCENTS = Object.freeze({
  fast: ["ring-progress", "orbit-text"],
  mid: ["orbit-text", "ring-progress", "type-breath-label"],
  slow: ["ring-progress", "orbit-text", "type-breath-label", "timecode-hud"],
});
/** 인터루드로 들어가는 전환 / 나오는 전환 (shots/transition-*.mjs, am-*) */
const ENTRY = { fast: ["transition-shape-grid", "transition-whip-pan", "transition-flash-streak"], mid: ["transition-shape-grid", "transition-cover-flood"], slow: ["transition-cut-the-curve"] };
const EXIT = { fast: ["transition-ring-iris", "transition-zoom-through", "transition-cover-flood"], mid: ["transition-ring-iris", "transition-cut-the-curve"], slow: ["transition-ring-iris"] };
/** 인터루드 없는 소재 ↔ 소재 경계 */
const PLAIN = { fast: ["am-push", "transition-whip-pan", "am-rgb-split", "transition-cut-the-curve"], mid: ["transition-cut-the-curve", "am-zoom-blur", "am-card-swap"], slow: ["transition-cut-the-curve", "am-rack-focus", "transition-match-cut"] };

const snapBar = (t, beatSec, firstBeatSec = 0) => {
  const bar = beatSec * 4;
  return firstBeatSec + Math.round((t - firstBeatSec) / bar) * bar;
};

/**
 * 씬표(소재 씬들)를 받아 인터루드를 넣을 경계를 고른다. 소재 씬은 그대로 두고 경계에 인터루드 길이만큼 끼운다고 보고,
 * 실제로 끼울 때는 앞 씬 끝을 당기거나(at − dur) 뒤를 민다(호출하는 쪽 timeline.mjs가 정함).
 * 점수: 드롭·피크 +3, 주인공·제품 공개 직전 +2(숨을 모았다 터뜨림), 섹션이 바뀜 +1, 훅 1초 안 −∞, 엔드카드 직전 −2(느린 템포는 −∞).
 */
export function planInterludes({ bpm = 120, beatSec, firstBeatSec = 0, duration, scenes = [], peaks = [], drop, direction, request = "" } = {}) {
  const tempo = tempoClass({ bpm, direction, request });
  const B = beatSec ?? 60 / bpm;
  const dur = duration ?? scenes.at(-1)?.to ?? 15;
  const dose = dosage(tempo, dur);
  const intensity = dose.intensity;
  const hot = [...peaks, ...(drop != null ? [drop] : [])];
  const near = (t) => hot.some((p) => Math.abs(p - t) <= B * 1.01);

  const bounds = [];
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1], next = scenes[i];
    const at = snapBar(next.from, B, firstBeatSec);
    let score = 0; const why = [];
    if (at < 1.0 || prev.role === "hook" && tempo === "slow") { score = -Infinity; why.push("훅 1초 안 / 느린 템포 훅 직후"); }
    if (next.role === "endcard") { score += tempo === "slow" ? -Infinity : -2; why.push("엔드카드 직전"); }
    if (near(at)) { score += 3; why.push("드롭·피크"); }
    if (next.role === "hero" || next.role === "offer") { score += 2; why.push(`${next.role === "hero" ? "주인공" : "혜택"} 공개 직전`); }
    if (prev.section && next.section && prev.section !== next.section) { score += 1; why.push("섹션 바뀜"); }
    bounds.push({ i, at, score, why, after: prev.id ?? `scene${i - 1}`, before: next.id ?? `scene${i}` });
  }

  const beatsLen = (k) => {
    const [lo, hi] = dose.beats;
    return k === "particle-morph" || k === "bauhaus-grid-flip" ? hi : lo + (hi - lo) / 2 >= 4 ? 4 : lo;
  };
  const picked = [];
  let used = 0;
  const minGap = tempo === "fast" ? B * 4 * 3 : dur / 2.5; // 인터루드끼리 최소 간격
  for (const b of [...bounds].filter((x) => x.score > -Infinity).sort((x, y) => y.score - x.score || x.at - y.at)) {
    if (picked.length >= dose.interludes) break;
    if (picked.some((p) => Math.abs(p.at - b.at) < minGap || Math.abs(p.i - b.i) < 2)) continue; // 연달아 두 경계 금지
    const kind = KINDS[tempo][picked.length % KINDS[tempo].length];
    const beats = beatsLen(kind);
    const len = beats * B;
    if ((used + len) / dur > dose.maxShare) continue;
    used += len;
    picked.push({ ...b, kind, beats, dur: +len.toFixed(3) });
  }
  picked.sort((x, y) => x.at - y.at);
  const interludes = picked.map((p, n) => ({
    at: +p.at.toFixed(3), dur: p.dur, beats: p.beats, after: p.after, before: p.before, kind: p.kind,
    entry: ENTRY[tempo][n % ENTRY[tempo].length], exit: EXIT[tempo][n % EXIT[tempo].length],
    why: p.why.join(", ") || "간격 채움",
  }));

  // 경계마다 전환. 인터루드 경계는 entry/exit, 나머지는 템포별 메뉴를 돌려 쓰되 같은 것 연속 금지.
  // 느린 템포는 그래픽 전환을 시그니처(주인공 직전) 한 곳에만 둔다.
  const seams = [];
  let k = 0, signatureDone = false;
  for (const b of bounds) {
    const il = interludes.find((x) => x.after === b.after);
    if (il) { seams.push({ at: il.at, kind: `${il.entry} → [${il.kind}] → ${il.exit}`, interlude: true }); continue; }
    let kind = PLAIN[tempo][k++ % PLAIN[tempo].length];
    if (tempo === "slow" && !signatureDone && (scenes[b.i]?.role === "hero" || b.score >= 2)) { kind = "transition-ring-iris (시그니처, 느리게 0.9–1.2초)"; signatureDone = true; }
    // 바로 앞 경계(인터루드의 들어감·나옴 포함)에 쓴 전환은 건너뜀
    for (let n = 0; n < PLAIN[tempo].length && seams.at(-1)?.kind.includes(kind.split(" ")[0]); n++) kind = PLAIN[tempo][k++ % PLAIN[tempo].length];
    seams.push({ at: +b.at.toFixed(3), kind });
  }

  // 액센트: 소재 위 '살짝'. 주인공·제품 씬에 먼저.
  const accentScenes = [...scenes].filter((s) => s.role !== "endcard").sort((a, b) => (b.role === "hero") - (a.role === "hero") || (b.role === "proof") - (a.role === "proof"));
  const accents = accentScenes.slice(0, dose.accents).map((s, n) => ({ scene: s.id, kind: ACCENTS[tempo][n % ACCENTS[tempo].length], from: s.from, to: s.to }));

  return { tempo, dose: { interludes: dose.interludes, maxShare: dose.maxShare, graphicTransitions: dose.graphicTransitions, accents: dose.accents }, intensity, interludes, accents, seams };
}

/**
 * 만든 광고 검사. windows = 소재 없는 구간 [{ from, to }](초, 엔드카드 제외)
 * ✗: 훅 첫 1초가 소재 없이 비어 있는데 템포가 fast가 아님 / 인터루드에 바닥(화면 가득한 불투명 층)이 없음은 validate가 따로 봄
 * △: 개수·비율이 템포 상한을 넘음, 연달아 붙음, 한 구간이 6박 넘음
 */
export function checkInterludes({ tempo, duration, windows = [], beatSec = 0.5 }) {
  const out = [];
  const dose = dosage(tempo, duration);
  const total = windows.reduce((s, w) => s + (w.to - w.from), 0);
  if (windows.length > dose.interludes) out.push({ level: "△", msg: `소재 없는 모션 씬 ${windows.length}개 (템포 ${tempo}, ${duration}초 기준 ${dose.interludes}개까지, interludes.md §2)` });
  if (total / duration > dose.maxShare + 0.01) out.push({ level: "△", msg: `소재 없는 시간 ${(100 * total / duration).toFixed(0)}% (템포 ${tempo} 상한 ${Math.round(dose.maxShare * 100)}%)` });
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i];
    if (w.from < 1 && tempo !== "fast") out.push({ level: "△", msg: `첫 1초가 소재 없이 시작 (${tempo} 템포는 소재로 시작, §4)` });
    if (w.to - w.from > beatSec * 6 + 0.05) out.push({ level: "△", msg: `${w.from.toFixed(2)}초 모션 씬이 ${(w.to - w.from).toFixed(2)}초 (6박 이하로, §4)` });
    if (i && w.from - windows[i - 1].to < beatSec * 8) out.push({ level: "△", msg: `${w.from.toFixed(2)}초 모션 씬이 앞 모션 씬과 너무 가까움 (2마디 이상 띄움)` });
  }
  return out;
}

// ── CLI ──
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
  if (args[0] !== "plan") { console.log("node interludes.mjs plan --bpm 128 --duration 15 [--scenes scenes.json] [--direction id] [--request 문장] [--peaks 4.2,9.1]"); process.exit(0); }
  const fs = await import("node:fs");
  const duration = Number(opt("duration", 15)), bpm = Number(opt("bpm", 120));
  let scenes = opt("scenes") ? JSON.parse(fs.readFileSync(opt("scenes"), "utf8")) : null;
  if (!scenes) { // 기본: 훅 · 주인공 · 기능 · 증거 · 엔드카드
    const cut = [0, 0.16, 0.38, 0.58, 0.8, 1].map((f) => +(f * duration).toFixed(2));
    scenes = ["hook", "hero", "feature", "proof", "endcard"].map((role, i) => ({ id: `s${i + 1}`, role, from: cut[i], to: cut[i + 1] }));
  }
  const peaks = (opt("peaks", "") || "").split(",").filter(Boolean).map(Number);
  const plan = planInterludes({ bpm, duration, scenes, peaks, direction: opt("direction"), request: opt("request", "") });
  console.log(`템포 ${plan.tempo} · 모션 씬 최대 ${plan.dose.interludes}개 · 소재 없는 시간 ≤ ${Math.round(plan.dose.maxShare * 100)}% · 그래픽 전환 ${plan.dose.graphicTransitions} · 액센트 ${plan.dose.accents}`);
  console.log(`세기: ${JSON.stringify(plan.intensity)}`);
  for (const i of plan.interludes) console.log(`  모션 씬 ${i.at}s +${i.dur}s (${i.beats}박) ${i.after}→${i.before}: ${i.kind} | 들어감 ${i.entry} · 나옴 ${i.exit} | ${i.why}`);
  for (const s of plan.seams) console.log(`  경계 ${s.at}s: ${s.kind}`);
  for (const a of plan.accents) console.log(`  액센트 ${a.scene}: ${a.kind}`);
}
