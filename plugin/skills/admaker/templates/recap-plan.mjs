// 줄거리 요약(리캡) 기획 검사: 원작 시간순 사건표(events)와 영상 서술순 설계(beats)를 따로 적고,
// 규칙을 지켰는지 본다. mode: full(궁금증 설계형, references/recap-highlight.md §2) · chrono(시간순 해설형, references/recap-chrono.md) · review(해설형 리뷰 + tone, references/recap-review.md) · shorts(references/recap-shorts.md)
// · news(뉴스 쇼츠 + newsType, references/news-shorts.md — 인용 원문 일치·숫자·출처·날짜·의견어·재구성 영상 출처 표시).
// 순수 모듈 + CLI(파일·네트워크 없음, 결정적).
//
//   checkRecapPlan(plan) → { ok, errors, warnings, order, questions, stats }
//   toStoryShots(plan)   → place_story_shots shots (beat 순서, stage·keyLine 포함; beat.src가 있는 것만)
//   suggestFinishing(plan) → 마지막 단계 효과음·장면 전환·모션그래픽 후보 (필요한 beat에만, 길이별 상한)
//
// CLI:  node recap-plan.mjs check plan.json [--json]
//       node recap-plan.mjs shots plan.json      (place_story_shots에 넘길 shots JSON)
//       node recap-plan.mjs finish plan.json     (마무리 효과 후보)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** 본편 단계 (반복 가능: escalation·twist·payoff는 작은 고리로 여러 번) */
export const FULL_STAGES = Object.freeze(["hook", "setup", "inciting", "escalation", "twist", "payoff", "cliffhanger"]);
/** 쇼츠 단계 */
export const SHORTS_STAGES = Object.freeze(["hook", "context", "dialogue", "commentary", "payoff"]);
/** 시간순 해설형 단계 (references/recap-chrono.md) — 맨 앞 짧은 hook 예고는 선택, twist는 여러 번 */
export const CHRONO_STAGES = Object.freeze(["hook", "intro", "incident", "sequence", "conflict", "twist", "ending", "outro"]);
/** 해설형 리뷰 단계 (references/recap-review.md) — 줄거리 단계 + 줄거리 뒤 따로 두는 review(작품 평가) */
export const REVIEW_STAGES = Object.freeze([...CHRONO_STAGES, "review"]);
/** 해설형 리뷰 주제형(tone: topic) 단계 — 작품 한 편이 아니라 한 주제의 사례 모음 */
export const TOPIC_STAGES = Object.freeze(["hook", "concept", "case", "explain", "review", "outro"]);
/** 뉴스 쇼츠 단계 (references/news-shorts.md) — 리드 → 사실 → 원문(인터뷰·발언) → 맥락 → 마무리. fact·quote·context는 여러 번 */
export const NEWS_STAGES = Object.freeze(["lead", "fact", "quote", "context", "close"]);
/** 뉴스 쇼츠 유형 */
export const NEWS_TYPES = Object.freeze({
  breaking: { name: "속보", maxSec: 45 },
  explainer: { name: "원인·배경 설명", maxSec: 75 },
  investigative: { name: "탐사·단독", maxSec: 90 },
  brief: { name: "경제·데이터 브리핑", maxSec: 60 },
  story: { name: "사연·인물", maxSec: 75 },
});
/** 뉴스 내레이션에 쓰지 않는 의견·과장어 (인용 안에 있는 것은 괜찮음) */
export const NEWS_LOADED_WORDS = Object.freeze(["충격", "경악", "역대급", "발칵", "참담", "어처구니", "말도 안 되", "소름", "최악", "분노 폭발", "논란 폭발", "결국 터졌", "난리", "초토화", "대참사", "미쳤", "황당", "기가 막"]);
/** 재구성(기사 기반) 영상 종류 — own(자사 원본)이 아니면 출처·성격 표시가 있어야 함 */
export const FOOTAGE_KINDS = Object.freeze(["own", "archive", "stock", "ai", "graphic"]);
/** 해설형 리뷰 톤 — 작품의 장르·목적에 따라 내레이션 성격을 바꾼다 */
export const REVIEW_TONES = Object.freeze({
  social: { name: "스토리 + 사회적 해석", humorMax: 0.25 },
  comedy: { name: "인물 관찰 + 개그 해설", humorMax: 0.6, humorMin: 0.2 },
  mystery: { name: "미스터리 추적 + 정보 통제", humorMax: 0.2, suspenseMin: 2 },
  critical: { name: "비판 리뷰 + 풍자", humorMax: 0.6, humorMin: 0.2 },
  emotional: { name: "감정 몰입 + 시대 맥락", humorMax: 0.1 },
  topic: { name: "주제형 사례 모음 + 지식", humorMax: 0.4 },
});
/** 시간순 해설형 장면 잇는 말 — 문장 맨 앞 */
export const CONNECTIVES = Object.freeze(["그때", "한편", "그런데", "그렇게", "이제", "다음 날", "다음날", "결국", "마침내", "알고 보니", "사실", "하지만", "그러던 중", "그 사이", "얼마 후", "그날 밤"]);
/** 내레이션 역할 — 한 문장에 하나 */
export const NARRATION_ROLES = Object.freeze({
  situation: "상황 설명 — 장면을 빠르게 이해시킴",
  character: "인물 해석 — 속마음·특징을 한 줄로",
  causal: "인과 연결 — 장면 사이 공백을 메움",
  withhold: "정보 지연 — 답을 미루고 궁금증 유지",
  twist: "반전 강조 — 앞 장면의 의미를 다시 읽게 함",
  emotion: "감정 해석 — 장면의 감정적 의미",
  tease: "다음 예고 — 새 갈등으로 넘김",
  wit: "재치 해석 — 상황을 한 박자 비틀어 한 줄로 (쇼츠·위트 줄, 시간순 해설형의 구어체 한마디)",
  transition: "장면 연결 — 그때·한편·그런데로 다음 사건으로 넘김 (시간순 해설형)",
  suspense: "질문형 궁금증 — 시청자에게 직접 묻고 다음 장면에서 답함",
  outro: "마무리 — 주인공의 마지막 상태와 작품명으로 끝냄",
  reaction: "즉각 반응 — 시청자가 할 반응을 대신 한마디 (해설형 리뷰)",
  knowledge: "지식 — 배경지식·개념·시대 맥락 설명",
  review: "평가 — 작품의 주제·완성도·추천 대상 (줄거리 뒤 리뷰 파트)",
  lead: "리드 — 가장 중요한 사실 한 문장(누가·무엇을·언제), 뉴스 첫 문장",
  fact: "사실 — 보도·원문으로 확인된 사실만, 출처를 붙여서 (뉴스)",
});
/** 정보 공개 방식 */
export const REVEALS = Object.freeze(["withhold", "partial", "full", "recontext"]);

/** 앱 place_story_shots stage로 바꿀 때 (앱은 둘 다 받지만 옛 이름도 맞춰 둔다) */
export const APP_STAGE = Object.freeze({
  hook: "hook", setup: "setup", inciting: "inciting", escalation: "escalation", twist: "twist", payoff: "payoff", cliffhanger: "cliffhanger",
  context: "setup", dialogue: "escalation", commentary: "escalation",
  intro: "setup", incident: "inciting", sequence: "escalation", conflict: "escalation", ending: "payoff", outro: "payoff",
  review: "payoff", concept: "setup", case: "escalation", explain: "escalation",
  lead: "hook", fact: "setup", quote: "escalation", close: "payoff",
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

const startsWithConnective = (t) => {
  const x = String(t ?? "").replace(/^\s*(\[[^\]]*\]\s*)+/, "").trim();
  return CONNECTIVES.find((c) => x.startsWith(c)) ?? null;
};

/** 시간순 해설형 검사 — 내레이션이 사건을 원작 순서대로 끌고 가고, 잇는 말·구어체 한마디·질문·반전 공개로 리듬을 만든다 */
function checkChrono(plan, beats, stages, byId, events, errors, warnings, opts = {}) {
  const dur = Number(plan.durationSec) || 0;
  const styleName = opts.styleName ?? "시간순 해설형";
  const humorMax = opts.humorMax ?? 0.3;
  const minNarr = opts.minNarr ?? 0.7;
  const storyBeats = opts.storyBeats ?? beats;
  const first = stages.indexOf("intro");
  if (first < 0 || first > 1) errors.push("intro가 맨 앞(짧은 hook 예고 뒤까지)에 없습니다 — 주인공의 이름·지금 상황·특징부터 소개합니다.");
  if (!stages.includes("incident")) errors.push("incident가 없습니다 — 주인공에게 일어난 핵심 사건을 둡니다.");
  if (!stages.includes("ending")) warnings.push("ending이 없습니다 — 사건의 결과와 주인공의 마지막 상태(변화)를 정리합니다.");
  const last = stages[stages.length - 1];
  if (!opts.skipEndCheck && last !== "ending" && last !== "outro") warnings.push("마지막이 ending·outro가 아닙니다 — 결말을 정리하고 작품명 한 줄로 끝냅니다.");
  // 원작 순서대로 — 회상은 한 번까지
  const chronos = beats.map((b) => Number(byId.get(b.event)?.chrono)).map((c) => (Number.isFinite(c) ? c : null));
  let back = 0;
  for (let i = 1; i < chronos.length; i++) if (chronos[i] !== null && chronos[i - 1] !== null && chronos[i] < chronos[i - 1]) back++;
  const hookOffset = stages[0] === "hook" ? 1 : 0;
  if (back - hookOffset > 1) warnings.push(`원작 순서를 거슬러 간 곳이 ${back - hookOffset}곳 — ${styleName}은 사건 순서대로, 회상은 한 번까지(나머지는 궁금증 설계형 recap-highlight.md).`);
  if (!events.length) warnings.push("events(원작 시간순 사건표)가 없어 순서를 확인하지 못했습니다.");
  // 내레이션이 끌고 감
  const narrated = storyBeats.filter((b) => b.narration?.text);
  if (storyBeats.length && narrated.length / storyBeats.length < minNarr)
    warnings.push(`내레이션 있는 beat가 ${Math.round((narrated.length / storyBeats.length) * 100)}% — ${styleName}은 내레이션이 사건을 끌고 갑니다(${Math.round(minNarr * 100)}% 이상, 대사 강조 beat만 비움).`);
  // 잇는 말
  const cons = beats.map((b, i) => (i > 0 && b.narration?.text ? startsWithConnective(b.narration.text) : null));
  const after = narrated.length - (beats[0]?.narration?.text ? 1 : 0);
  const withCon = cons.filter(Boolean);
  if (after >= 4 && withCon.length / after < 0.25)
    warnings.push(`잇는 말로 시작하는 줄이 ${withCon.length}/${after} — 장면이 바뀌는 곳은 "그때·한편·그런데·그렇게·결국" 등으로 이어 줍니다.`);
  const count = new Map();
  for (const c of withCon) count.set(c, (count.get(c) ?? 0) + 1);
  for (const [c, k] of count) if (k >= 3 && k / Math.max(1, after) > 0.35) warnings.push(`"${c}"로 시작하는 줄이 ${k}번 — 같은 잇는 말이 반복됩니다. 바꾸거나 빼세요.`);
  for (let i = 2; i < cons.length; i++) if (cons[i] && cons[i] === cons[i - 1] && cons[i] === cons[i - 2]) warnings.push(`${i - 1}–${i + 1}번 beat: "${cons[i]}" 3연속`);
  // 구어체 한마디(wit·reaction)는 양념 — 톤마다 양이 다름
  const wits = narrated.filter((b) => b.narration.role === "wit" || b.narration.role === "reaction").length;
  const witShare = narrated.length ? wits / narrated.length : 0;
  if (opts.humorMin === undefined && opts.requireWit !== false && dur >= 90 && wits === 0) warnings.push("구어체 한마디(wit)가 없습니다 — 인물의 행동을 관찰하는 짧은 한마디를 한두 번 넣으면 친근해집니다.");
  if (opts.humorMin !== undefined && narrated.length >= 5 && witShare < opts.humorMin)
    warnings.push(`반응·재치 줄(wit·reaction)이 ${Math.round(witShare * 100)}% — ${styleName}은 ${Math.round(opts.humorMin * 100)}% 이상, 인물의 행동에 계속 반응합니다.`);
  if (narrated.length >= 5 && witShare > humorMax) warnings.push(`wit·reaction이 ${wits}줄(${Math.round(witShare * 100)}%) — ${styleName}은 ${Math.round(humorMax * 100)}% 아래로, 사건 설명이 중심입니다.`);
  // 반전 앞에는 의심이나 질문
  const ti = stages.indexOf("twist");
  if (ti > 0) {
    const before = beats.slice(0, ti);
    if (!before.some((b) => ["suspense", "withhold"].includes(b.narration?.role) || b.opens || b.question))
      warnings.push("twist 앞에 의심·질문이 없습니다 — 수상한 단서나 \"~일까요?\" 한 줄로 추측을 먼저 만들고 반전에서 고칩니다.");
  }
  // 인물 첫 소개 — 이름이 내레이션에 나와야
  const seen = new Set();
  beats.forEach((b, i) => {
    const chars = [].concat(byId.get(b.event)?.characters ?? [], b.characters ?? []);
    for (const c of chars) {
      if (seen.has(c)) continue;
      seen.add(c);
      if (b.narration?.text && !b.narration.text.includes(c)) warnings.push(`${i + 1}번 beat: "${c}" 첫 등장인데 내레이션에 이름이 없습니다 — 이름 + 지금 상황(행동)으로 소개합니다.`);
    }
  });
  // 대사 강조 구간에는 내레이션을 얹지 않음
  beats.forEach((b, i) => {
    if (b.keyLine && b.narration?.text && b.narrationOverLine === true) warnings.push(`${i + 1}번 beat: 배우 대사 위에 내레이션 — 대사 앞뒤 쉼에 둡니다.`);
  });
  const emos = beats.map((b) => b.emotion ?? byId.get(b.event)?.emotion ?? null);
  for (let i = 3; i < emos.length; i++)
    if (emos[i] && emos[i] === emos[i - 1] && emos[i] === emos[i - 2] && emos[i] === emos[i - 3])
      warnings.push(`${i - 2}–${i + 1}번 beat: 감정 "${emos[i]}"가 4번 연속 — 긴장·유머·감동을 번갈아.`);
}

/** 해설형 리뷰 검사 — 줄거리(시간순 해설) 뒤에 리뷰 파트, 톤마다 반응·풍자·질문·감정 양이 다름. tone: topic이면 주제·사례·설명 구조 */
function checkReview(plan, beats, stages, byId, events, errors, warnings) {
  const toneKey = REVIEW_TONES[plan.tone] ? plan.tone : null;
  if (!toneKey) errors.push(`tone이 필요합니다 — ${Object.entries(REVIEW_TONES).map(([k, v]) => `${k}(${v.name})`).join(", ")} 중 작품에 맞는 하나.`);
  const tone = REVIEW_TONES[toneKey ?? "social"];
  const styleName = `해설형 리뷰(${tone.name})`;
  const narrated = beats.filter((b) => b.narration?.text);
  const roles = narrated.map((b) => b.narration.role);
  const reviewIdx = stages.map((s, i) => (s === "review" ? i : -1)).filter((i) => i >= 0);
  if (toneKey === "topic") {
    const ci = stages.indexOf("concept");
    if (ci < 0 || ci > 1) errors.push("concept가 맨 앞(짧은 hook 뒤까지)에 없습니다 — 주제가 무엇인지 한두 문장으로 정의합니다.");
    const cases = stages.filter((s) => s === "case").length;
    if (cases < 3) warnings.push(`사례(case)가 ${cases}개 — 주제형은 사례 3개 이상을 분야를 바꿔 가며.`);
    let run = 0;
    stages.forEach((s, i) => {
      run = s === "case" ? run + 1 : s === "explain" ? 0 : run;
      if (s === "case" && run === 4) warnings.push(`${i - 2}–${i + 1}번 beat: 사례만 4번 연속 — 사이에 explain(왜 그런지, 추가 지식)을 끼웁니다.`);
    });
    if (!stages.includes("explain")) warnings.push("explain이 없습니다 — 사례 나열만으로 끝내지 말고 이유·유래 같은 지식을 더합니다.");
    if (stages[stages.length - 1] !== "outro") warnings.push("마지막이 outro가 아닙니다 — 이름의 유래나 정리 한 줄로 끝냅니다.");
  } else {
    const storyBeats = beats.filter((b) => b.stage !== "review");
    checkChrono(plan, beats, stages, byId, events, errors, warnings, {
      styleName,
      humorMax: tone.humorMax,
      humorMin: tone.humorMin,
      requireWit: toneKey === "comedy" || toneKey === "critical",
      minNarr: 0.6,
      storyBeats,
      skipEndCheck: true,
    });
    if (!reviewIdx.length) warnings.push("review 파트가 없습니다 — 줄거리가 끝난 뒤 작품의 주제·완성도·추천 대상을 따로 말합니다.");
    const lastEnding = stages.lastIndexOf("ending");
    if (reviewIdx.some((i) => i < lastEnding)) warnings.push("review beat가 줄거리 결말 앞에 있습니다 — 평가는 줄거리 뒤에 따로 모읍니다(풍자 톤은 중간 평가를 reaction·wit로).");
    if (reviewIdx.length / beats.length > 0.3) warnings.push(`review가 ${reviewIdx.length}/${beats.length} beat — 리뷰 파트는 전체의 30% 이하.`);
    const last = stages[stages.length - 1];
    if (last !== "review" && last !== "outro") warnings.push("마지막이 review·outro가 아닙니다 — 평가와 추천 대상 한 줄로 끝냅니다.");
    if (toneKey === "mystery") {
      const sus = roles.filter((r) => r === "suspense" || r === "withhold").length;
      if (sus < (tone.suspenseMin ?? 2)) warnings.push(`의문 줄(suspense·withhold)이 ${sus}개 — 미스터리 톤은 단서가 쌓일 때마다 질문을 다시 던집니다(2개 이상).`);
      if (!beats.some((b) => b.reveal === "recontext" || b.reveal === "partial")) warnings.push("정보를 나눠 공개한 곳(reveal partial·recontext)이 없습니다 — 아는 것과 새로 드러난 것을 구분합니다.");
    }
    if (toneKey === "emotional" && !roles.includes("knowledge") && !roles.includes("emotion"))
      warnings.push("감정 톤인데 시대·배경(knowledge)이나 감정(emotion) 줄이 없습니다 — 배경을 먼저 세우고 인물의 꿈과 관계로 감정을 쌓습니다.");
    if (toneKey === "comedy") {
      const callbacks = beats.filter((b) => b.callback).length;
      if (beats.length >= 6 && callbacks < 2) warnings.push("다시 불러 쓰는 별명·말버릇(callback)이 없습니다 — 한 번 붙인 별명을 두세 번 다시 쓰면 짧은 장면이 한 개그 흐름으로 이어집니다.");
    }
  }
  // 한 역할이 절반을 넘으면 단조로움
  const count = new Map();
  for (const r of roles) if (r) count.set(r, (count.get(r) ?? 0) + 1);
  for (const [r, k] of count) if (roles.length >= 8 && k / roles.length > 0.5) warnings.push(`내레이션의 ${Math.round((k / roles.length) * 100)}%가 "${r}" — 설명·반응·질문·지식·평가를 장면에 맞게 섞습니다(모든 장면에 유머·반전을 넣지는 않음).`);
}

const squash = (t) => String(t ?? "").replace(/[\s"'“”‘’「」『』.,·…!?~]/g, "");
const numbersIn = (t) => (String(t ?? "").match(/\d[\d,.]*/g) ?? []).map((x) => x.replace(/[,.]+$/, "").replace(/,/g, "")).filter(Boolean);
const quotedIn = (t) => [...String(t ?? "").matchAll(/["“]([^"”]{2,})["”]/g)].map((m) => m[1].trim());

/**
 * 뉴스 쇼츠 검사 — 사실·인용·출처가 원문과 맞는지가 먼저, 재미는 그다음.
 * plan.source { outlet, date, url? } · plan.origin own|article · plan.newsType · plan.transcript(원본 보도 STT·기사 본문)
 * beat.quote { speaker, role?, text } · beat.footage { kind, label } · plan.people [{ name, public }]
 */
function checkNews(plan, beats, stages, errors, warnings) {
  const type = plan?.newsType;
  if (!type) warnings.push(`newsType이 없습니다 — ${Object.entries(NEWS_TYPES).map(([k, v]) => `${k}(${v.name})`).join("·")} 중 하나`);
  else if (!NEWS_TYPES[type]) errors.push(`newsType "${type}"는 ${Object.keys(NEWS_TYPES).join("·")} 중 하나`);
  const src = plan?.source ?? {};
  if (!src.outlet) errors.push("source.outlet(보도한 매체)이 없습니다 — 화면 아래 매체명과 출처 표시에 씁니다.");
  if (!src.date) errors.push("source.date(보도·발생 날짜)가 없습니다 — 오래된 뉴스를 새 뉴스처럼 보이게 하지 않습니다.");
  const origin = plan?.origin === "article" ? "article" : "own";
  const transcript = String(plan?.transcript ?? "");
  const pool = squash([transcript, ...beats.map((b) => b.dialogueText ?? "")].join("\n"));
  const poolNums = new Set(numbersIn([transcript, ...beats.map((b) => b.dialogueText ?? "")].join("\n")));
  const verifiable = pool.length > 0;
  if (!verifiable) warnings.push("transcript(원본 보도 자막·기사 본문)가 없어 인용·숫자를 대조하지 못했습니다 — 넣고 다시 검사합니다.");

  if (stages[0] !== "lead") errors.push("첫 beat는 lead여야 합니다 — 가장 중요한 사실(누가·무엇을·언제)을 첫 문장에.");
  if (!stages.includes("fact")) errors.push("fact beat가 없습니다 — 확인된 사실을 하나 이상.");
  const last = stages[stages.length - 1];
  if (!["close", "context"].includes(last)) warnings.push("마지막이 close·context가 아닙니다 — 다음 일정·남은 쟁점·확인된 결과로 담담하게 끝냅니다.");
  const dur = Number(plan?.durationSec) || 0;
  const maxSec = NEWS_TYPES[type]?.maxSec ?? 90;
  if (dur > maxSec) warnings.push(`${dur}초 — ${NEWS_TYPES[type]?.name ?? "뉴스"} 쇼츠는 ${maxSec}초 안쪽이 좋습니다.`);
  if (type === "breaking" && !plan?.tag) warnings.push("속보인데 tag(\"속보\")가 없습니다 — 제목 위 꼬리표로 씁니다.");
  if (plan?.tag && Array.from(String(plan.tag)).length > 6) warnings.push(`tag "${plan.tag}"가 깁니다 — 두세 글자(속보·단독·이슈).`);

  const headline = [].concat(plan?.headline ?? []).join(" ");
  const textsToCheck = [{ where: "제목", text: headline }, ...beats.map((b, i) => ({ where: `${i + 1}번 beat`, text: b.narration?.text ?? "" }))];
  for (const { where, text } of textsToCheck) {
    if (!text) continue;
    // 따옴표 인용은 원문 그대로
    for (const q of quotedIn(text)) if (verifiable && !pool.includes(squash(q))) errors.push(`${where}: 따옴표 안 "${q}"가 원문에 없습니다 — 인용은 원문 그대로(줄이면 말줄임 없이 앞뒤만 자름).`);
    const outside = text.replace(/["“][^"”]*["”]/g, " ");
    for (const w of NEWS_LOADED_WORDS) if (outside.includes(w)) warnings.push(`${where}: "${w}" — 의견·과장어는 따옴표(인용) 밖에서 쓰지 않습니다. 사실과 숫자로 보여 줍니다.`);
    if (verifiable) for (const n of numbersIn(outside)) if (!poolNums.has(n)) warnings.push(`${where}: 숫자 "${n}"가 원문에 없습니다 — 단위·반올림까지 원문과 맞춥니다.`);
  }
  beats.forEach((b, i) => {
    const at = `${i + 1}번 beat`;
    const role = b.narration?.role;
    if (["wit", "reaction", "review", "twist", "withhold"].includes(role)) warnings.push(`${at}: 내레이션 역할 "${role}" — 뉴스는 반응·재치·평가·반전 연출 없이 사실·맥락으로.`);
    if (b.stage === "quote") {
      const q = b.quote;
      if (!q?.text && !b.dialogueText) errors.push(`${at}: quote beat에 quote.text(원문 발언)가 없습니다.`);
      if (q?.text && verifiable && !pool.includes(squash(q.text))) errors.push(`${at}: 인용 "${q.text}"가 원문과 다릅니다 — 글자 그대로 옮깁니다.`);
      if (q && !q.speaker) warnings.push(`${at}: 인용에 speaker(누가 말했는지)가 없습니다 — 하단 이름표에 이름·직함.`);
      if (b.narration?.text) warnings.push(`${at}: 발언 구간에 내레이션 — 원문 소리에 맡기고 앞뒤 쉼에만 둡니다.`);
    }
    const f = b.footage;
    if (f?.kind && !FOOTAGE_KINDS.includes(f.kind)) errors.push(`${at}: footage.kind "${f.kind}"는 ${FOOTAGE_KINDS.join("·")} 중 하나`);
    if (origin === "article") {
      const kind = f?.kind ?? (b.src ? "own" : null);
      if (kind && kind !== "own" && kind !== "graphic" && !f?.label) errors.push(`${at}: 재구성 영상(${kind})에 출처·성격 표시(footage.label)가 없습니다 — 예: "자료화면", "AI 생성 영상", "출처: 매체명".`);
      if (kind === "ai" && f?.label && !/AI/i.test(f.label)) errors.push(`${at}: AI 영상 표시 "${f.label}"에 AI라는 말이 없습니다 — "AI 생성 영상"처럼 분명히.`);
      if (kind === "ai" && (f?.realPerson || f?.realEvent)) errors.push(`${at}: AI 영상으로 실제 인물·실제 현장을 재현하지 않습니다 — 자료화면·그래픽으로 바꿉니다.`);
    }
  });
  // 공인이 아닌 사람은 보도된 범위만
  const allText = [headline, ...beats.map((b) => b.narration?.text ?? "")].join("\n");
  for (const p of [].concat(plan?.people ?? [])) {
    if (!p?.name || p.public) continue;
    if (allText.includes(p.name) && verifiable && !pool.includes(squash(p.name))) errors.push(`"${p.name}"(일반인)의 이름이 원문에 없습니다 — 보도된 범위(익명·가명)만 씁니다.`);
  }
  const narr = beats.filter((b) => b.narration?.text).length;
  if (origin === "own" && beats.length >= 4 && narr / beats.length > 0.8) warnings.push(`내레이션 beat가 ${Math.round((narr / beats.length) * 100)}% — 자사 원본은 기자 리포트·현장음·발언을 살리고 내레이션은 빈 곳만.`);
}

export function checkRecapPlan(plan) {
  const errors = [];
  const warnings = [];
  const mode = ["shorts", "chrono", "review", "news"].includes(plan?.mode) ? plan.mode : "full";
  const STAGES =
    mode === "news" ? NEWS_STAGES : mode === "shorts" ? SHORTS_STAGES : mode === "chrono" ? CHRONO_STAGES : mode === "review" ? (plan?.tone === "topic" ? TOPIC_STAGES : REVIEW_STAGES) : FULL_STAGES;
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
  if (!["chrono", "review", "news"].includes(mode) && stages[0] !== "hook") errors.push("첫 beat는 hook이어야 합니다 (결과·모순·위기를 먼저).");

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
  } else if (mode === "chrono") {
    checkChrono(plan, beats, stages, byId, events, errors, warnings);
  } else if (mode === "review") {
    checkReview(plan, beats, stages, byId, events, errors, warnings);
  } else if (mode === "news") {
    checkNews(plan, beats, stages, errors, warnings);
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

/**
 * 마무리 효과 패스 — 다 만든 뒤 효과음·장면 전환·모션그래픽이 "필요한" beat만 고른다(references/recap-highlight.md §8.2).
 * 원칙: 원작 대사·내레이션이 주인공. 대사 위에는 효과음을 얹지 않고(앞 쉼에), 이유가 없는 곳은 비운다.
 * 결과 cues[{ beat, shot, kind: sfx|transition|motion, what, at, why, priority }] (shot은 toStoryShots 1부터 번호),
 * skipped[{ beat, kind, why }](상한·대사 겹침으로 뺀 것), limits.
 */
export function suggestFinishing(plan) {
  const mode = ["shorts", "chrono", "review", "news"].includes(plan?.mode) ? plan.mode : "full";
  const beats = Array.isArray(plan?.beats) ? plan.beats : [];
  const events = new Map((Array.isArray(plan?.events) ? plan.events : []).map((e) => [e.id, e]));
  const dur = Number(plan?.durationSec) > 0 ? Number(plan.durationSec) : mode === "shorts" ? 40 : 120;
  const per = dur / 60;
  const limits = mode === "news"
    ? { sfx: plan?.newsType === "breaking" ? 1 : 0, transition: 1, motion: Math.max(3, beats.length) }
    : mode === "shorts"
    ? { sfx: Math.max(2, Math.round(3 * per)), transition: 1, motion: 2 }
    : { sfx: Math.max(3, Math.round(4 * per)), transition: Math.max(2, Math.round(3 * per)), motion: Math.max(2, Math.round(3 * per)) };
  // beat → 첫 shot 번호
  const shotOf = [];
  let n = 0;
  for (const b of beats) {
    const k = [].concat(b.src ?? []).filter((s) => Number.isFinite(Number(s?.from)) && Number.isFinite(Number(s?.to))).length;
    shotOf.push(k ? n + 1 : null);
    n += k;
  }
  const cand = [];
  const skipped = [];
  const add = (i, kind, what, at, why, priority) => cand.push({ beat: i + 1, shot: shotOf[i], kind, what, at, why, priority });
  const seenChars = new Set();
  const hasLine = (b) => Boolean(b.keyLine || b.dialogueText);
  const chronoOf = (b) => {
    const e = events.get(b.event);
    return Number.isFinite(Number(e?.chrono)) ? Number(e.chrono) : null;
  };
  beats.forEach((b, i) => {
    const prev = beats[i - 1];
    const at = hasLine(b) ? "대사 앞 쉼(대사 시작 0.2–0.4초 전)" : "beat 시작";
    // 시간 점프 — 원작 시간이 크게 뒤로 가거나 timeJump/timeLabel을 적은 곳
    const c = chronoOf(b), pc = prev ? chronoOf(prev) : null;
    const jump = Boolean(b.timeJump || b.timeLabel) || (c !== null && pc !== null && pc - c >= 2);
    if (jump && i > 0) {
      add(i, "sfx", "휘익(whoosh) 짧게, 원본 소리 아래", "beat 시작 직전", "시간 점프를 귀로 알림", 3);
      if (!prev.transitionOut) add(i - 1, "transition", "fadeIn 0.5초(짧은 딥) — 다음 장면으로", "앞 beat 끝", "시간이 뒤로 감", 3);
      add(i, "motion", `장 제목·시간 표시 "${b.timeLabel ?? "그날 밤 / 3년 전"}" 1–1.5초`, "beat 시작", "언제인지 화면으로 알림", 3);
    }
    // 인물 첫 등장 — 이름표 (행동 소개 beat, 본편만)
    if (mode === "news") {
      // 뉴스: 효과음·장면 전환은 거의 없이, 정보 그래픽(이름표·데이터 카드·출처 표시)만
      if (i === 0 && plan?.newsType === "breaking") add(i, "sfx", "짧은 알림음 하나, 아주 작게(현장음 아래)", "0초", "속보 시작", 2);
      if (b.stage === "quote" && b.quote?.speaker) add(i, "motion", `하단 이름표 "${b.quote.speaker}${b.quote.role ? ` · ${b.quote.role}` : ""}" (원본에 이미 있으면 생략)`, "발언 시작", "누가 말했는지", 4);
      if (b.data || b.infoCard) add(i, "motion", `데이터 카드 "${b.data ?? b.infoCard}" 2–3초 (숫자는 원문 그대로, 단위·기준일 표기)`, "숫자를 말할 때", "숫자를 화면으로", 3);
      if (b.footage?.label && b.footage.kind !== "own") add(i, "motion", `출처 표시 "${b.footage.label}" (왼쪽 위 작게, 그 장면 내내)`, "장면 내내", "재구성 영상 출처·성격 표시(필수)", 5);
      if (i === 0 && plan?.source?.date) add(i, "motion", `날짜·매체 칩 "${plan.source.date} · ${plan.source.outlet ?? "매체명"}" 2초`, "첫 2초", "언제 누구의 보도인지", 3);
      return;
    }
    if (mode !== "shorts") {
      const chars = [].concat(events.get(b.event)?.characters ?? b.characters ?? []);
      const fresh = chars.filter((ch) => !seenChars.has(ch));
      chars.forEach((ch) => seenChars.add(ch));
      if (fresh.length && ["setup", "inciting", "escalation", "intro", "incident", "sequence", "conflict"].includes(b.stage))
        add(i, "motion", `인물 이름표 ${fresh.slice(0, 2).join("·")} (이름 + 역할 한 줄, 얼굴 옆 하단)`, "인물이 화면에 처음 보일 때", "처음 나온 인물", 2);
    }
    if (b.infoCard) add(i, "motion", `정보 카드 "${b.infoCard}" 2–3초`, "beat 시작", "관계·장소를 화면으로", 2);
    // 반전·결정적 공개 — 저음 히트, 대사가 있으면 그 앞 쉼에
    if (b.stage === "twist" || b.reveal === "full" || b.reveal === "recontext") {
      add(i, "sfx", mode === "shorts" ? "짧은 스팅(sting) 하나" : "저음 히트(low boom) + 직전 0.5초 BGM 끊기", at, "반전·공개 순간", b.stage === "twist" ? 5 : 4);
    }
    if (mode !== "shorts" && b.stage === "hook" && i === 0) add(i, "sfx", "짧은 상승음(riser) 0.6–1초 → 첫 컷에서 끊김", "0초", "첫 1초에 소리로 시선 잡기", 2);
    if (b.stage === "review" && beats[i - 1]?.stage !== "review") {
      if (!beats[i - 1]?.transitionOut) add(i - 1, "transition", "fadeIn 0.5초 — 줄거리에서 리뷰 파트로", "앞 beat 끝", "이야기가 끝나고 평가로 넘어감", 3);
      add(i, "motion", "리뷰 파트 장 제목(예: \"이 작품이 남긴 것\") 1–1.5초", "beat 시작", "줄거리와 평가를 화면으로 나눔", 3);
    }
    if (b.stage === "case") add(i, "motion", `사례 번호 카드 "${[...beats.slice(0, i + 1)].filter((x) => x.stage === "case").length}" 0.8초`, "beat 시작", "사례가 바뀜을 알림", 1);
    if (b.narration?.role === "reaction" && plan?.tone !== "emotional") add(i, "sfx", "짧은 반응음(띵·뿅·레코드 긁힘) 하나, 아주 작게", "반응 문장 끝", "반응에 박자", 1);
    if (b.stage === "outro") add(i, "motion", `작품명 카드 "${b.label ?? plan?.title ?? "작품명"}" 1.5–2초`, "마지막 문장", "무엇을 봤는지 남김", 3);
    if (b.stage === "cliffhanger") add(i, "sfx", "긴장 드론이 끊기는 멈춤(stop) 또는 낮은 펄스", "마지막 문장 뒤", "다음 궁금증 여운", 3);
    if (mode === "shorts") {
      if (b.stage === "commentary") add(i, "sfx", "가벼운 팝(pop)·레코드 긁힘 중 하나, 아주 작게", "해석 문장 끝", "위트 줄에 박자", 2);
      if (b.stage === "payoff" && !b.narration?.text) add(i, "sfx", "짧은 스팅·드럼 롤 끝(rimshot) 중 장면에 맞는 하나", "터지는 대사 직후(겹치지 않게)", "재미를 마무리", 3);
      if (b.keyword) add(i, "motion", `핵심어 팝 "${b.keyword}" 0.6–1초(대사 자막과 다른 자리)`, "대사 끝", "황당한 핵심어 강조", 2);
    }
    if (b.stage === "dialogue" && cand.some((x) => x.beat === i + 1 && x.kind === "sfx"))
      skipped.push({ beat: i + 1, kind: "sfx", why: "dialogue 구간은 원작 소리만" });
  });
  // dialogue beat의 효과음은 빼고, 종류별 상한 안에서 priority 높은 것부터
  const pool = cand.filter((x) => !(x.kind === "sfx" && beats[x.beat - 1]?.stage === "dialogue"));
  const cues = [];
  for (const kind of ["sfx", "transition", "motion"]) {
    const list = pool.filter((x) => x.kind === kind).sort((a, b) => b.priority - a.priority || a.beat - b.beat);
    list.forEach((x, k) => (k < limits[kind] ? cues.push(x) : skipped.push({ beat: x.beat, kind, why: `${kind} 상한 ${limits[kind]}개를 넘음 — ${x.what}` })));
  }
  cues.sort((a, b) => a.beat - b.beat || a.kind.localeCompare(b.kind));
  return { mode, cues, skipped, limits, note: "후보입니다. 미리보기에서 대사·내레이션과 겹치거나 이유가 약한 것은 뺍니다. 넣을 게 없으면 넣지 않습니다." };
}

function main(argv) {
  const [cmd, file, ...rest] = argv;
  if (!cmd || !file || !["check", "shots", "finish"].includes(cmd)) {
    console.log("usage: node recap-plan.mjs check|shots|finish plan.json [--json]");
    process.exit(cmd ? 1 : 0);
  }
  const plan = JSON.parse(fs.readFileSync(file, "utf8"));
  if (cmd === "finish") {
    console.log(JSON.stringify(suggestFinishing(plan), null, 2));
    return;
  }
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
