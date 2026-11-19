// 리캡 기획 검사 — references/recap-highlight.md §2, references/recap-shorts.md
// node --test tests/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { checkRecapPlan, toStoryShots } from "../plugin/skills/admaker/templates/recap-plan.mjs";

const events = [
  { id: "E1", summary: "평범한 출근길", characters: ["A"], plot: "main", chrono: 1, emotion: "calm" },
  { id: "E2", summary: "사고처럼 보이는 사건", characters: ["B"], plot: "main", chrono: 2, emotion: "shock" },
  { id: "E3", summary: "맞지 않는 단서", plot: "main", chrono: 3, emotion: "suspicion" },
  { id: "E4", summary: "C의 과거", characters: ["C"], plot: "sub", chrono: 4, emotion: "sad" },
  { id: "E5", summary: "일부러 남긴 흔적", plot: "main", chrono: 5, emotion: "suspicion" },
  { id: "E6", summary: "피해자가 모든 걸 설계함", plot: "main", chrono: 6, emotion: "surprise" },
  { id: "E7", summary: "새 사건의 단서", plot: "sub", chrono: 7, emotion: "tension" },
];
const good = {
  mode: "full",
  durationSec: 150,
  events,
  beats: [
    { stage: "hook", event: "E2", opens: ["Q1"], question: "사고일까?", narration: { role: "withhold", text: "그런데 이건 사고가 아니었다." }, src: { from: 300, to: 303 } },
    { stage: "setup", event: "E1", narration: { role: "character", text: "A는 현장을 누구보다 잘 읽는 수사관이다." }, src: [{ from: 10, to: 13 }] },
    { stage: "inciting", event: "E3", opens: ["Q2"], question: "누가 손댔나?", narration: { role: "causal", text: "그리고 첫 번째 이상한 점이 나온다." } },
    { stage: "escalation", event: "E5", answers: ["Q1"], reveal: "partial", narration: { role: "situation", text: "누군가 일부러 남긴 흔적이 발견된다." } },
    { stage: "twist", event: "E5", reveal: "recontext", narration: { role: "twist", text: "단순한 사고가 아니라 계획된 살인이었다." } },
    { stage: "escalation", event: "E4", narration: { role: "emotion", text: "C에게는 아직 잊지 못한 밤이 있었다." } },
    { stage: "twist", event: "E6", answers: ["Q2"], reveal: "full", narration: { role: "twist", text: "모든 걸 설계한 건 피해자였다." } },
    { stage: "payoff", event: "E6", narration: { role: "situation", text: "결국 진실이 드러난다." } },
    { stage: "cliffhanger", event: "E7", opens: ["Q3"], question: "그날 밤의 일은?", narration: { role: "tease", text: "하지만 이야기는 여기서 끝나지 않았다." } },
  ],
};

test("좋은 본편 기획은 통과하고 순서를 바꾼 곳을 센다", () => {
  const r = checkRecapPlan(good);
  assert.equal(r.ok, true, r.errors.join("\n"));
  assert.deepEqual(r.warnings, []);
  assert.ok(r.stats.reordered >= 2);
  assert.equal(r.questions.find((q) => q.id === "Q1").answeredAt, 4);
});

test("훅으로 시작하지 않거나 반전이 없으면 오류, 열지 않은 질문에 답하면 오류", () => {
  const r = checkRecapPlan({
    mode: "full",
    events,
    beats: [
      { stage: "setup", event: "E1" },
      { stage: "escalation", event: "E3", answers: ["Q9"] },
      { stage: "payoff", event: "E6" },
    ],
  });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes("hook")));
  assert.ok(r.errors.some((e) => e.includes("twist")));
  assert.ok(r.errors.some((e) => e.includes("Q9")));
  assert.ok(r.warnings.some((w) => w.includes("cliffhanger")));
});

test("긴 영상은 작은 반전·서브 플롯·감정 교차를 요구", () => {
  const flat = {
    mode: "full",
    durationSec: 180,
    events: events.map((e) => ({ ...e, plot: "main", emotion: "tension" })),
    beats: [
      { stage: "hook", event: "E2" },
      { stage: "setup", event: "E1", introBy: "narration" },
      { stage: "inciting", event: "E3" },
      { stage: "escalation", event: "E4" },
      { stage: "escalation", event: "E5" },
      { stage: "twist", event: "E6" },
      { stage: "payoff", event: "E6" },
      { stage: "cliffhanger", event: "E7" },
    ],
  };
  const r = checkRecapPlan(flat);
  assert.equal(r.ok, true);
  const w = r.warnings.join("\n");
  assert.match(w, /반전이 1개/);
  assert.match(w, /서브 플롯/);
  assert.match(w, /4번 연속/);
  assert.match(w, /행동 장면/);
});

test("쇼츠: 대사 중심, 내레이션 비율·되풀이·dialogue 구간 내레이션 경고", () => {
  const ok = checkRecapPlan({
    mode: "shorts",
    beats: [
      { stage: "hook", dialogueText: "오늘은 아무도 안 아파요." },
      { stage: "context", narration: { role: "situation", text: "그는 이 섬에 하나뿐인 의사다." } },
      { stage: "dialogue", dialogueText: "진료는 내일 하죠." },
      { stage: "dialogue", dialogueText: "다들 왜 줄을 서 계세요?" },
      { stage: "payoff", dialogueText: "오늘 휴진이라니까요." },
    ],
  });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.warnings, []);

  const bad = checkRecapPlan({
    mode: "shorts",
    beats: [
      { stage: "hook", narration: { role: "wit", text: "의사는 쉬기로 한다. 정말이다." } },
      { stage: "dialogue", dialogueText: "오늘 진료 안 해요", narration: { role: "situation", text: "오늘 진료 안 한다고 말한다" } },
      { stage: "commentary", narration: { role: "wit", text: "계획은 완벽했다." } },
      { stage: "payoff", narration: { role: "tease", text: "과연." } },
    ],
  });
  const w = bad.warnings.join("\n");
  assert.match(w, /40% 이하/);
  assert.match(w, /되풀이/);
  assert.match(w, /dialogue 구간에 내레이션/);
  assert.match(w, /한 문장/);
});

test("toStoryShots — beat 순서대로 src가 있는 것만, 단계 이름 그대로", () => {
  const shots = toStoryShots(good);
  assert.deepEqual(shots, [
    { from: 300, to: 303, stage: "hook", label: "사고일까?" },
    { from: 10, to: 13, stage: "setup" },
  ]);
});

test("suggestFinishing — 필요한 beat에만, 대사 구간엔 효과음 없음, 상한", async () => {
  const { suggestFinishing } = await import("../plugin/skills/admaker/templates/recap-plan.mjs");
  const r = suggestFinishing(good);
  const twistSfx = r.cues.filter((c) => c.kind === "sfx" && c.why.includes("반전"));
  assert.ok(twistSfx.length >= 1);
  assert.ok(r.cues.some((c) => c.kind === "motion" && c.what.includes("이름표")));
  assert.ok(r.cues.some((c) => c.kind === "sfx" && c.why.includes("여운")));
  assert.equal(r.cues.find((c) => c.beat === 1 && c.kind === "sfx").shot, 1);
  // E4(원작 4번째)→E6? 시간 점프: escalation E4 다음 twist E6는 앞으로 감이라 점프 아님
  assert.ok(r.cues.filter((c) => c.kind === "sfx").length <= r.limits.sfx);

  const shorts = suggestFinishing({
    mode: "shorts",
    durationSec: 30,
    beats: [
      { stage: "hook", dialogueText: "오늘은 아무도 안 아파요." },
      { stage: "dialogue", dialogueText: "진료는 내일 하죠.", reveal: "full" },
      { stage: "commentary", narration: { role: "wit", text: "계획은 완벽했다." } },
      { stage: "payoff", dialogueText: "오늘 휴진이라니까요.", keyword: "휴진" },
    ],
  });
  assert.ok(!shorts.cues.some((c) => c.beat === 2 && c.kind === "sfx"));
  assert.ok(shorts.skipped.some((s) => s.beat === 2));
  assert.ok(shorts.cues.some((c) => c.beat === 4 && c.kind === "motion"));
  assert.ok(shorts.cues.every((c) => !c.what.includes("이름표")));
});

test("suggestFinishing — 시간 점프에 휘익·딥 전환·시간 표시", async () => {
  const { suggestFinishing } = await import("../plugin/skills/admaker/templates/recap-plan.mjs");
  const r = suggestFinishing({
    mode: "full",
    durationSec: 60,
    events: [{ id: "A", chrono: 9 }, { id: "B", chrono: 2 }],
    beats: [
      { stage: "hook", event: "A", src: { from: 1, to: 2 } },
      { stage: "setup", event: "B", timeLabel: "3년 전", src: { from: 3, to: 4 } },
    ],
  });
  assert.ok(r.cues.some((c) => c.kind === "transition" && c.beat === 1));
  assert.ok(r.cues.some((c) => c.kind === "motion" && c.what.includes("3년 전") && c.shot === 2));
  assert.ok(r.cues.some((c) => c.kind === "sfx" && c.what.includes("휘익")));
});

test("시간순 해설형(chrono) — 소개부터 원작 순서대로, 잇는 말·구어체 한마디·질문 뒤 반전", async () => {
  const { checkRecapPlan, toStoryShots, suggestFinishing } = await import("../plugin/skills/admaker/templates/recap-plan.mjs");
  const ev = [
    { id: "C1", chrono: 1, characters: ["민호"] },
    { id: "C2", chrono: 2 },
    { id: "C3", chrono: 3, characters: ["지아"] },
    { id: "C4", chrono: 4 },
    { id: "C5", chrono: 5 },
    { id: "C6", chrono: 6 },
    { id: "C7", chrono: 7 },
  ];
  const good = {
    mode: "chrono",
    durationSec: 120,
    title: "작품명",
    events: ev,
    beats: [
      { stage: "intro", event: "C1", narration: { role: "situation", text: "새벽마다 같은 버스를 타는 남자 민호." }, src: { from: 5, to: 9 } },
      { stage: "incident", event: "C2", narration: { role: "situation", text: "그런데 그날 버스가 종점을 지나쳐 버리는데" } },
      { stage: "sequence", event: "C3", narration: { role: "character", text: "그때 맨 뒷자리에서 일어난 여자 지아." } },
      { stage: "sequence", event: "C4", narration: { role: "wit", text: "길 잃은 건 버스인데 사과는 민호가 하네요." } },
      { stage: "conflict", event: "C5", narration: { role: "suspense", text: "지아는 정말 처음 보는 사람일까요?" } },
      { stage: "twist", event: "C6", reveal: "recontext", narration: { role: "twist", text: "알고 보니 지아는 민호가 잊은 옛 동창이었죠." } },
      { stage: "ending", event: "C7", narration: { role: "emotion", text: "결국 민호는 처음으로 종점까지 함께 걸어갑니다." } },
      { stage: "outro", narration: { role: "outro", text: "지금까지 작품명이었습니다." } },
    ],
  };
  const r = checkRecapPlan(good);
  assert.equal(r.ok, true, r.errors.join("\n"));
  assert.deepEqual(r.warnings, []);
  assert.equal(toStoryShots(good)[0].stage, "setup");
  const f = suggestFinishing(good);
  assert.ok(f.cues.some((c) => c.kind === "motion" && c.what.includes("작품명 카드")));
  assert.ok(f.cues.some((c) => c.kind === "motion" && c.what.includes("이름표")));

  const bad = checkRecapPlan({
    mode: "chrono",
    durationSec: 120,
    events: ev,
    beats: [
      { stage: "sequence", event: "C3", narration: { role: "situation", text: "그렇게 하루가 간다." } },
      { stage: "twist", event: "C6", narration: { role: "twist", text: "그렇게 진실이 나온다." } },
      { stage: "sequence", event: "C2", dialogueText: "가자" },
      { stage: "sequence", event: "C1", narration: { role: "situation", text: "그렇게 버스가 떠난다." } },
      { stage: "sequence", event: "C4", narration: { role: "situation", text: "그렇게 밤이 온다." } },
      { stage: "sequence", event: "C5", narration: { role: "situation", text: "그렇게 또 하루." } },
    ],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some((e) => e.includes("intro")));
  assert.ok(bad.errors.some((e) => e.includes("incident")));
  const w = bad.warnings.join("\n");
  assert.match(w, /거슬러/);
  assert.match(w, /"그렇게"/);
  assert.match(w, /wit/);
  assert.match(w, /twist 앞에/);
  assert.match(w, /이름이 없습니다/);
});

test("해설형 리뷰(review) — 줄거리 뒤 리뷰 파트, 톤마다 반응 양", async () => {
  const { checkRecapPlan, suggestFinishing, toStoryShots } = await import("../plugin/skills/admaker/templates/recap-plan.mjs");
  const ev = [1, 2, 3, 4, 5, 6].map((c) => ({ id: `R${c}`, chrono: c, ...(c === 1 ? { characters: ["수아"] } : {}) }));
  const story = [
    { stage: "intro", event: "R1", narration: { role: "situation", text: "새벽 세 시, 문 닫은 놀이공원에서 생방송을 켜는 수아." } },
    { stage: "incident", event: "R2", narration: { role: "suspense", text: "그런데 꺼진 회전목마가 혼자 돌기 시작하는데, 대체 누가 켠 걸까요?" } },
    { stage: "sequence", event: "R3", narration: { role: "reaction", text: "아니 이걸 혼자 간다고요?" } },
    { stage: "conflict", event: "R4", narration: { role: "causal", text: "그렇게 모든 의심이 수아에게 쏠리게 됩니다." } },
    { stage: "twist", event: "R5", reveal: "recontext", narration: { role: "twist", text: "알고 보니 방송을 켠 건 수아가 아니었죠." } },
    { stage: "ending", event: "R6", narration: { role: "emotion", text: "결국 수아는 카메라를 끕니다." } },
  ];
  const social = {
    mode: "review",
    tone: "social",
    durationSec: 300,
    events: ev,
    beats: [
      ...story,
      { stage: "review", narration: { role: "review", text: "제목이 놀이와 공포를 동시에 가리킨다는 점이 끝까지 힘을 줍니다." } },
      { stage: "review", narration: { role: "review", text: "무서운 장면보다 숫자만 세는 시청자 수가 더 오래 남습니다." } },
    ],
  };
  const r = checkRecapPlan(social);
  assert.equal(r.ok, true, r.errors.join("\n"));
  assert.deepEqual(r.warnings, []);
  assert.equal(toStoryShots({ beats: [{ stage: "review", src: { from: 1, to: 2 } }] })[0].stage, "payoff");
  const f = suggestFinishing(social);
  assert.ok(f.cues.some((c) => c.kind === "transition" && c.why.includes("평가")));
  assert.ok(f.cues.some((c) => c.kind === "motion" && c.what.includes("리뷰 파트")));

  // 리뷰 파트 없음, 톤 없음
  const noTone = checkRecapPlan({ mode: "review", events: ev, beats: story });
  assert.equal(noTone.ok, false);
  assert.ok(noTone.errors.some((e) => e.includes("tone")));
  assert.ok(noTone.warnings.some((w) => w.includes("review 파트")));

  // 감정 톤인데 농담이 많음
  const emo = checkRecapPlan({
    mode: "review",
    tone: "emotional",
    events: ev,
    beats: story.map((b, i) => (i > 0 && i < 5 ? { ...b, narration: { role: "wit", text: "그런데 이건 좀 웃기네요." } } : b)).concat({ stage: "review", narration: { role: "review", text: "오래된 편지처럼 조용히 마음을 두드립니다." } }),
  });
  assert.match(emo.warnings.join("\n"), /10% 아래로/);

  // 개그 톤인데 반응이 없음 + callback 없음
  const flat = checkRecapPlan({ mode: "review", tone: "comedy", events: ev, beats: story.map((b) => (b.narration.role === "reaction" ? { ...b, narration: { role: "situation", text: "수아는 방송을 이어 간다." } } : b)) });
  const fw = flat.warnings.join("\n");
  assert.match(fw, /20% 이상/);
  assert.match(fw, /callback/);
});

test("해설형 리뷰 주제형(tone: topic) — 개념 정의, 사례 사이 설명", async () => {
  const { checkRecapPlan } = await import("../plugin/skills/admaker/templates/recap-plan.mjs");
  const ok = checkRecapPlan({
    mode: "review",
    tone: "topic",
    beats: [
      { stage: "hook", dialogueText: "…" },
      { stage: "concept", narration: { role: "knowledge", text: "말소리가 엉뚱한 뜻으로 들리는 착청 현상부터 짚고 갑니다." } },
      { stage: "case", narration: { role: "situation", text: "첫 번째는 게임 속 대사." } },
      { stage: "case", narration: { role: "reaction", text: "한 번 들리면 다시는 못 돌아가요." } },
      { stage: "explain", narration: { role: "knowledge", text: "뇌가 익숙한 단어 쪽으로 소리를 맞추기 때문입니다." } },
      { stage: "case", narration: { role: "situation", text: "다음은 노래 가사." } },
      { stage: "outro", narration: { role: "knowledge", text: "결국 우리 귀는 듣고 싶은 대로 듣는 셈이죠." } },
    ],
  });
  assert.equal(ok.ok, true, ok.errors.join("\n"));
  assert.deepEqual(ok.warnings, []);
  const bad = checkRecapPlan({ mode: "review", tone: "topic", beats: [{ stage: "case" }, { stage: "case" }, { stage: "case" }, { stage: "case" }] });
  assert.equal(bad.ok, false);
  assert.match(bad.warnings.join("\n"), /4번 연속/);
});
