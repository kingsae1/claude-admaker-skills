// 줄거리 요약(리캡) 기획 검사: 원작 시간순 사건표(events)와 영상 서술순 설계(beats)를 따로 적고,
// 궁금증 설계 규칙(references/recap-highlight.md §2, 쇼츠는 references/recap-shorts.md)을 지켰는지 본다.
// 순수 모듈 + CLI(파일·네트워크 없음, 결정적).
//
//   checkRecapPlan(plan) → { ok, errors, warnings, order, questions, stats }
//   toStoryShots(plan)   → place_story_shots shots (beat 순서, stage·keyLine 포함; beat.src가 있는 것만)
//
// CLI:  node recap-plan.mjs check plan.json [--json]
//       node recap-plan.mjs shots plan.json      (place_story_shots에 넘길 shots JSON)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 본편 단계 (반복 가능: escalation·twist·payoff는 작은 고리로 여러 번) */
export const FULL_STAGES = Object.freeze(["hook", "setup", "inciting", "escalation", "twist", "payoff", "cliffhanger"]);
/** 쇼츠 단계 */
export const SHORTS_STAGES = Object.freeze(["hook", "context", "dialogue", "commentary", "payoff"]);
/** 내레이션 역할 — 한 문장에 하나 */
export const NARRATION_ROLES = Object.freeze({
  situation: "상황 설명 — 장면을 빠르게 이해시킴",
  character: "인물 해석 — 속마음·특징을 한 줄로",
  causal: "인과 연결 — 장면 사이 공백을 메움",
  withhold: "정보 지연 — 답을 미루고 궁금증 유지",
  twist: "반전 강조 — 앞 장면의 의미를 다시 읽게 함",
  emotion: "감정 해석 — 장면의 감정적 의미",
  tease: "다음 예고 — 새 갈등으로 넘김",
  wit: "재치 해석 — 상황을 한 박자 비틀어 한 줄로 (쇼츠·위트 줄)",
});
/** 정보 공개 방식 */
export const REVEALS = Object.freeze(["withhold", "partial", "full", "recontext"]);

/** 앱 place_story_shots stage로 바꿀 때 (앱은 둘 다 받지만 옛 이름도 맞춰 둔다) */
export const APP_STAGE = Object.freeze({
  hook: "hook", setup: "setup", inciting: "inciting", escalation: "escalation", twist: "twist", payoff: "payoff", cliffhanger: "cliffhanger",
  context: "setup", dialogue: "escalation", commentary: "escalation",
});

const sentences = (t) => String(t ?? "").split(/(?<=[.!?。…])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
const tokens = (t) => new Set(String(t ?? "").replace(/\[[^\]]*\]/g, " ").toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
function overlap(a, b) {
  const A = tokens(a), B = tokens(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const x of A) if (B.has(x)) n++;
  return n / Math.min(A.size, B.size);
}

export function checkRecapPlan(plan) {
  const errors = [];
  const warnings = [];
  const mode = plan?.mode === "shorts" ? "shorts" : "full";
  const STAGES = mode === "shorts" ? SHORTS_STAGES : FULL_STAGES;
  const events = Array.isArray(plan?.events) ? plan.events : [];
  const beats = Array.isArray(plan?.beats) ? plan.beats : [];
  const byId = new Map(events.map((e) => [e.id, e]));
  if (!beats.length) errors.push("beats(영상 서술순)가 비었습니다.");
  if (mode === "full" && !events.length) errors.push("events(원작 시간순 사건표)가 비었습니다.");

  beats.forEach((b, i) => {
    const at = `${i + 1}번 beat`;
    if (!STAGES.includes(b.stage)) errors.push(`${at}: stage "${b.stage}"는 ${mode} 단계(${STAGES.join("·")})가 아닙니다.`);
    if (b.event && !byId.has(b.event)) errors.push(`${at}: 사건표에 없는 event "${b.event}"`);
    if (b.reveal && !REVEALS.includes(b.reveal)) errors.push(`${at}: reveal "${b.reveal}"는 ${REVEALS.join("·")} 중 하나`);
    const n = b.narration;
    if (n && n.role && !NARRATION_ROLES[n.role]) errors.push(`${at}: 내레이션 역할 "${n.role}"는 ${Object.keys(NARRATION_ROLES).join("·")} 중 하나`);
    if (n?.text && sentences(n.text).length > (mode === "shorts" ? 1 : 2))
      warnings.push(`${at}: 내레이션이 ${sentences(n.text).length}문장 — 한 문장에 한 역할, ${mode === "shorts" ? "쇼츠는 한 문장" : "beat당 두 문장까지"}`);
    if (n?.text && b.dialogueText && overlap(n.text, b.dialogueText) >= 0.5)
      warnings.push(`${at}: 내레이션이 같은 beat 대사를 되풀이함 — 대사가 말한 사실은 빼고 빈 정보만`);
  });
  if (!beats.length) return { ok: false, mode, errors, warnings, order: [], questions: [], stats: {} };

  const stages = beats.map((b) => b.stage);
  if (stages[0] !== "hook") errors.push("첫 beat는 hook이어야 합니다 (결과·모순·위기를 먼저).");

  // 질문 장부 — 연 질문은 나중에 답하거나 마지막에 열어 둔다(cliffhanger). 열지 않은 질문에 답하면 안 됨
  const open = new Map();
  const questions = [];
  beats.forEach((b, i) => {
    for (const q of [].concat(b.answers ?? [])) {
      if (!open.has(q)) errors.push(`${i + 1}번 beat: 열지 않은 질문 "${q}"에 답함 — 먼저 궁금증을 던지고 답합니다.`);
      else {
        const o = open.get(q);
        o.answeredAt = i + 1;
        open.delete(q);
      }
    }
    for (const q of [].concat(b.opens ?? [])) {
      const rec = { id: q, text: b.question ?? q, openedAt: i + 1, answeredAt: null };
      questions.push(rec);
      open.set(q, rec);
    }
  });
  const lastIdx = beats.length;
  const dangling = questions.filter((q) => q.answeredAt === null && q.openedAt < lastIdx - (mode === "shorts" ? 0 : 1));

  if (mode === "full") {
    if (!stages.includes("twist")) errors.push("twist가 없습니다 — 앞의 해석을 뒤집는 beat를 하나 이상 둡니다.");
    if (!stages.includes("payoff")) warnings.push("payoff가 없습니다 — 검거·탈출·반격·감동 같은 보상을 둡니다.");
    if (stages[stages.length - 1] !== "cliffhanger") warnings.push("마지막이 cliffhanger가 아닙니다 — 해결 뒤에 새 인물·과거의 비밀·남은 사건 하나를 열어 둡니다(사용자가 완결을 원하면 무시).");
    if (stages.indexOf("setup") > 3) warnings.push("setup이 늦습니다 — 훅 바로 뒤에 인물·처지를 짧게.");
    const dur = Number(plan.durationSec) || 0;
    const twists = stages.filter((s) => s === "twist").length;
    if (dur >= 120 && twists < 2) warnings.push(`${dur}초짜리인데 반전이 ${twists}개 — 작은 반전(사건 A → 작은 반전 → 사건 B → 작은 반전 → 메인 반전)을 반복합니다.`);
    // 훅은 결과·모순: 원작에서 뒤쪽 사건을 앞으로 당겼는지
    const hookEv = byId.get(beats[0]?.event);
    const chronos = events.map((e) => Number(e.chrono)).filter(Number.isFinite);
    if (hookEv && Number.isFinite(Number(hookEv.chrono)) && chronos.length > 2 && Number(hookEv.chrono) === Math.min(...chronos))
      warnings.push("훅이 원작 첫 사건입니다 — 결과나 모순(뒤쪽 사건의 일부)을 먼저 보여 주는 편이 궁금증이 큽니다.");
    // 메인·서브 교차
    const plots = beats.map((b) => byId.get(b.event)?.plot ?? "main");
    const hasSub = events.some((e) => e.plot === "sub");
    let run = 0;
    for (let i = 0; i < plots.length; i++) {
      run = plots[i] === "main" ? run + 1 : 0;
      if (hasSub && run === 6) warnings.push(`${i - 4}–${i + 1}번 beat: 메인 플롯만 6번 연속 — 인물의 과거·관계·감정(서브)을 사이에 끼웁니다.`);
    }
    if (!hasSub && dur >= 120) warnings.push("서브 플롯(인물 과거·관계·감정)이 없습니다 — 긴 영상은 긴장과 감정을 번갈아 둡니다.");
    // 감정 교차
    const emos = beats.map((b) => b.emotion ?? byId.get(b.event)?.emotion ?? null);
    for (let i = 3; i < emos.length; i++)
      if (emos[i] && emos[i] === emos[i - 1] && emos[i] === emos[i - 2] && emos[i] === emos[i - 3])
        warnings.push(`${i - 2}–${i + 1}번 beat: 감정 "${emos[i]}"가 4번 연속 — 긴장·유머·분노·감동을 번갈아.`);
    // 인물은 행동으로 소개
    const seen = new Set();
    beats.forEach((b, i) => {
      const chars = [].concat(byId.get(b.event)?.characters ?? [], b.characters ?? []);
      for (const c of chars) {
        if (seen.has(c)) continue;
        seen.add(c);
        if (b.introBy === "narration") warnings.push(`${i + 1}번 beat: "${c}" 첫 소개가 설명뿐 — 그 인물의 특징이 드러나는 행동 장면으로 소개합니다.`);
      }
    });
    if (dangling.length) warnings.push(`답하지 않은 질문: ${dangling.map((q) => `"${q.text}"(${q.openedAt}번)`).join(", ")} — 답하거나 마지막 cliffhanger로 넘깁니다.`);
    // 같은 내레이션 역할 3연속
    const roles = beats.map((b) => b.narration?.role ?? null);
    for (let i = 2; i < roles.length; i++)
      if (roles[i] && roles[i] === roles[i - 1] && roles[i] === roles[i - 2]) warnings.push(`${i - 1}–${i + 1}번 beat: 내레이션 역할 "${roles[i]}" 3연속 — 역할을 바꿔 리듬을 만듭니다.`);
  } else {
    if (stages[stages.length - 1] !== "payoff") warnings.push("마지막이 payoff가 아닙니다 — 반전·황당한 대사·통쾌한 행동으로 끝냅니다.");
    if (!stages.includes("dialogue")) errors.push("dialogue beat가 없습니다 — 쇼츠는 원작 대사가 주인공입니다.");
    const narrated = beats.filter((b) => b.narration?.text).length;
    const ratio = narrated / beats.length;
    if (ratio > 0.4) warnings.push(`내레이션 있는 beat가 ${Math.round(ratio * 100)}% — 쇼츠는 40% 이하, 대사로 이해되는 구간은 비웁니다.`);
    const comments = beats.filter((b) => b.stage === "commentary").length;
    if (comments > 2) warnings.push(`commentary가 ${comments}번 — 한두 번, 인물의 황당한 논리·예상 밖 행동에만.`);
    beats.forEach((b, i) => {
      if (b.stage === "dialogue" && b.narration?.text) warnings.push(`${i + 1}번 beat: dialogue 구간에 내레이션 — 대사에 맡깁니다.`);
      if (b.narration?.text && b.needsNarration === false) warnings.push(`${i + 1}번 beat: 대사만으로 이해된다고 표시했는데 내레이션이 있음`);
    });
  }

  const order = beats.map((b, i) => {
    const e = byId.get(b.event);
    return { pos: i + 1, stage: b.stage, event: b.event ?? null, chrono: e?.chrono ?? null, plot: e?.plot ?? null, reveal: b.reveal ?? null, narration: b.narration?.role ?? null };
  });
  const stats = {
    beats: beats.length,
    stages: Object.fromEntries(STAGES.map((s) => [s, stages.filter((x) => x === s).length])),
    narratedBeats: beats.filter((b) => b.narration?.text).length,
    reordered: order.filter((o, i) => i > 0 && o.chrono !== null && order[i - 1].chrono !== null && o.chrono < order[i - 1].chrono).length,
  };
  return { ok: errors.length === 0, mode, errors, warnings, order, questions, stats };
}

/** beats → place_story_shots shots (beat.src {from,to} 또는 [{from,to}...]가 있는 것만, keyLine은 beat.keyLine) */
export function toStoryShots(plan) {
  const shots = [];
  for (const b of plan?.beats ?? []) {
    const srcs = [].concat(b.src ?? []);
    for (const s of srcs) {
      if (!(Number.isFinite(Number(s?.from)) && Number.isFinite(Number(s?.to)))) continue;
      shots.push({
        from: Number(s.from),
        to: Number(s.to),
        stage: APP_STAGE[b.stage] ?? b.stage,
        ...(b.label || b.question ? { label: b.label ?? b.question } : {}),
        ...(s.keyLine ?? b.keyLine ? { keyLine: s.keyLine ?? b.keyLine } : {}),
      });
    }
  }
  return shots;
}

function main(argv) {
  const [cmd, file, ...rest] = argv;
  if (!cmd || !file || !["check", "shots"].includes(cmd)) {
    console.log("usage: node recap-plan.mjs check|shots plan.json [--json]");
    process.exit(cmd ? 1 : 0);
  }
  const plan = JSON.parse(fs.readFileSync(file, "utf8"));
  if (cmd === "shots") {
    console.log(JSON.stringify(toStoryShots(plan), null, 2));
    return;
  }
  const r = checkRecapPlan(plan);
  if (rest.includes("--json")) {
    console.log(JSON.stringify(r, null, 2));
  } else {
    console.log(`${r.mode} · beat ${r.stats.beats ?? 0}개 · 원작 순서를 바꾼 곳 ${r.stats.reordered ?? 0}곳 · 내레이션 beat ${r.stats.narratedBeats ?? 0}개`);
    for (const o of r.order) console.log(`  ${String(o.pos).padStart(2)}. ${o.stage.padEnd(11)} ${o.event ?? "-"}${o.chrono !== null ? ` (원작 ${o.chrono}번째)` : ""}${o.narration ? ` · ${o.narration}` : ""}`);
    for (const e of r.errors) console.log(`✗ ${e}`);
    for (const w of r.warnings) console.log(`△ ${w}`);
    if (r.ok && !r.warnings.length) console.log("✓ 통과");
  }
  process.exit(r.ok ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
