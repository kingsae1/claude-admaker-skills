// 빠른 몽타주 프리셋: 박자 단위 슬롯 규칙 + analyzeBeats 결과 + 내용 → timeline.mjs의 SECTIONS·SHOTS·FOOTAGE·BIG_HITS
// 시간을 초로 박지 않고 박으로 적어 두므로, BGM이 바뀌면 analyzeBeats 결과만 넣어 다시 만들면 컷이 다시 맞는다.
// 규칙의 근거: director.md §4(골격) §7(리듬·읽기 시간) §7.2(드롭) · aesthetic-rules R4(화면 충격 3회)
// 사용 (timeline.mjs):
//   import { fastMontage } from "./presets/fast-montage.mjs";
//   const M = fastMontage({ analysis, durationSec: 15, content });
//   export const { SECTIONS, SHOTS, FOOTAGE, BIG_HITS, DURATION } = M;   // M.warnings도 읽는다
import { gridFromAnalysis } from "../beats.mjs";

const KO_CHARS = (s) => String(s ?? "").replace(/\s/g, "").length;
/** director.md §7: 텍스트 애니메이션이 끝난 뒤 홀드 (한국어 글자 수 ÷ 5 + 1.2초) */
const readHold = (lines) => KO_CHARS(lines.join("")) / 5 + 1.2;

const ENTER = 0.4;          // 텍스트 입장 길이(초): 카드의 입장 모션과 맞춘다
const END_HOLD = 1.5;       // 엔드카드 정지 홀드 하한(초)
const CUT_MIN = 0.8, CUT_MAX = 1.4, CUT_TARGET = 1.2; // 몽타주 한 컷 길이(초)
const WIPE_LEAD = 5;        // 와이프는 컷 몇 프레임 전에 시작 (화면을 가장 많이 덮는 순간이 컷)

/**
 * @param {object} o
 * @param {object} o.analysis analyzeBeats 결과 (bpm, beatSec, firstBeatSec, bars, peaks, sections)
 * @param {number} o.durationSec 광고 길이 (6 / 15 / 30 …)
 * @param {object} o.content {
 *   wordmark, copy: [줄…], blocks: [{ footage: {src,type,size}, label, title }],
 *   number, caption, logo, message, cta, footage: {src,type,size} (블록 밖 구간의 바닥 소재) }
 * @param {object} [o.music] { musicFrom, trimFrom } (timeline.mjs musicPlacement 결과)
 * @param {number} [o.fps=30]
 * @param {number} [o.maxBlocks] 몽타주 블록 상한 (기본: 8초 이하 0, 20초 이하 4, 그 위 8)
 */
export function fastMontage({ analysis, durationSec, content = {}, music = {}, fps = 30, maxBlocks } = {}) {
  const g = gridFromAnalysis(analysis, { ...music, fps });
  const B = g.beatSec;
  const warnings = [];
  const at = g.at;
  const bumper = durationSec <= 8;
  maxBlocks ??= bumper ? 0 : durationSec <= 20 ? 4 : 8;
  if (!g.hasBeat) warnings.push("음악에 박자가 없어(bpm: null) 0.5초를 한 박으로 씀. 컷은 마디(2초) 경계 위주로 보세요");

  // 몽타주 한 블록 길이 k박: 1.2초에 가깝게, 0.8–1.4초 안
  let k = Math.max(1, Math.round(CUT_TARGET / B));
  while (k > 1 && k * B > CUT_MAX) k--;
  while (k * B < CUT_MIN) k++;

  // 드롭(change: 'rise') 또는 가장 센 peak → 숫자 슬램 착지 후보 (§7.2)
  const stingEndSec = at(4);
  const drop = g.sections.find((s) => s.change === "rise" && s.startSec > stingEndSec);
  const peak = [...g.peaks].filter((p) => p.sec > stingEndSec).sort((a, b) => b.energy - a.energy)[0];
  const targetSec = drop?.startSec ?? peak?.sec;
  const targetBeat = targetSec != null ? g.indexOf(targetSec) : null;
  const lowAt = (sec) => g.bars.find((b) => sec >= b.startSec && sec < b.endSec)?.level === "low";

  // 엔드카드: 로고 → 메시지(+1박) → CTA(+2박), 마지막 입장 뒤 홀드 ≥ 1.5초
  const endMin = 2 * B + ENTER + END_HOLD;
  // 워드마크 착지: 2박, 느린 곡에서 1.5초를 넘으면 1박 (첫 1초 훅)
  const wordBeat = at(2) <= 1.5 ? 2 : 1;

  function layout({ withCopy, withNumber, n }) {
    let cursor = 4; // 스팅 = 첫 마디
    const lines = withCopy ? content.copy ?? [] : [];
    let copy = null;
    if (lines.length) {
      const lastIn = cursor + lines.length - 1;
      const needSec = at(lastIn) + ENTER + readHold(lines);
      const len = Math.ceil(Math.ceil((needSec - at(cursor)) / B - 1e-6) / 2) * 2; // 2박 단위로 올림
      copy = { start: cursor, len: Math.max(lines.length + 1, len), lineBeats: lines.map((_, i) => cursor + i) };
      cursor += copy.len;
    }
    const blocks = [];
    for (let i = 0; i < n; i++) {
      let len = lowAt(at(cursor)) ? 2 * k : k; // 조용한 마디는 느리게 (§7.1)
      blocks.push({ start: cursor, len });
      cursor += len;
    }
    // 드롭 직전 가속 (§7.2): 착지 후보가 몽타주 끝 근처(한 마디 안)일 때만, 마지막 두 블록을 반 길이로 하고
    // 줄어든 만큼은 그 앞 블록에 더해 숫자 슬램이 착지 박에 오게 한다. 가속이 없으면 마지막 블록을 늘린다
    const gap = targetBeat != null ? targetBeat - cursor : null;
    if (withNumber && blocks.length && gap != null && gap >= -k && gap <= 4) {
      if (drop && blocks.length >= 3) for (const b of blocks.slice(-2)) b.len = Math.max(1, Math.ceil(b.len / 2));
      const sum = blocks.reduce((x, b) => x + b.len, 0);
      const extra = targetBeat - (blocks[0].start + sum);
      const grow = blocks.length >= 3 && drop ? blocks.at(-3) : blocks.at(-1);
      if (grow.len + extra >= 1) grow.len += extra;
      let c = blocks[0].start;
      for (const b of blocks) { b.start = c; c += b.len; }
      cursor = c;
    }
    const number = withNumber ? { start: cursor, len: 5 } : null;
    if (number) cursor += 5;
    const end = { start: cursor };
    const ok = durationSec - at(end.start) >= endMin;
    return { copy, blocks, number, end, ok };
  }

  const wantNumber = !bumper && content.number != null;
  const nBlocks = Math.min(maxBlocks, content.blocks?.length ?? 0);
  // 들어갈 수 있는 조합 중 점수가 가장 높은 것: 블록 1점, 카피 1.5점, 숫자 슬램 2점. 같으면 엔드카드 여유가 적은 쪽(시간을 덜 버림)
  let L = null, best = -1;
  for (let n = nBlocks; n >= 0; n--)
    for (const withNumber of wantNumber ? [true, false] : [false])
      for (const withCopy of bumper || !content.copy?.length ? [false] : [true, false]) {
        const t = layout({ withCopy, withNumber, n });
        if (!t.ok) continue;
        const score = n + (withCopy ? 1.5 : 0) + (withNumber ? 2 : 0) - (durationSec - at(t.end.start)) / 1000;
        if (score > best) { best = score; L = { ...t, n, withCopy, withNumber }; }
      }
  if (L) {
    if (L.n < nBlocks) warnings.push(`엔드카드 홀드 ${END_HOLD}초를 지키려고 몽타주를 ${nBlocks}→${L.n}블록으로 줄임`);
    if (wantNumber && !L.withNumber) warnings.push("엔드카드 홀드가 모자라 숫자 슬램을 뺌");
    if (!bumper && content.copy?.length && !L.withCopy) warnings.push(`카피 스택(읽기 시간 ${readHold(content.copy).toFixed(1)}초)이 들어가지 않아 뺌. 줄·글자를 줄이거나 더 긴 광고로`);
  }
  if (!L) throw new Error(`${durationSec}초 안에 스팅 + 엔드카드(홀드 ${END_HOLD}초)가 들어가지 않음`);

  // ── 출력 ──
  const sec = (n) => at(n);
  const beatOf = (start, len) => ({ start, len });
  const hookEnd = L.copy ? L.copy.start + L.copy.len : 4;
  const SECTIONS = [{ id: "hook", from: 0, to: sec(hookEnd) }];
  const riseFrom = hookEnd, riseTo = L.end.start;
  if (riseTo > riseFrom) SECTIONS.push({ id: "rise", from: sec(riseFrom), to: sec(riseTo) });
  SECTIONS.push({ id: "endcard", from: sec(L.end.start), to: durationSec });

  const SHOTS = [];
  SHOTS.push({
    card: "beat-flicker-sting", section: "hook", from: 0, to: sec(hookEnd),
    props: {
      wordmark: content.wordmark, barAt: sec(0), wordmarkAt: sec(wordBeat), stingEnd: sec(4),
      lines: L.copy ? content.copy : [], linesAt: L.copy ? L.copy.lineBeats.map(sec) : [],
      halfBeat: B / 2,
    },
    beat: beatOf(0, hookEnd),
  });
  const blocks = content.blocks ?? [];
  L.blocks.forEach((b, i) => {
    const src = blocks[i % Math.max(1, blocks.length)] ?? {};
    if (blocks.length && i >= blocks.length) warnings.push(`블록 ${i + 1}: 소재가 모자라 블록 ${(i % blocks.length) + 1}을 다시 씀 (구도·Ken Burns 방향을 바꾸세요)`);
    const from = sec(b.start), to = sec(b.start + b.len);
    const titleNeed = KO_CHARS(src.title) / 6 + 0.3; // 몽타주 제목은 훑어보는 글자 (자막 읽기 규칙보다 느슨하게)
    if (src.title && to - from < titleNeed) warnings.push(`블록 ${i + 1} 제목 "${src.title}"이 ${(to - from).toFixed(2)}초 컷에 비해 김 (${Math.max(1, Math.floor((to - from - 0.3) * 6))}자 이하 권장)`);
    SHOTS.push({
      card: "beat-montage-wipe", section: "rise", from, to,
      props: { index: i, label: src.label, title: src.title, wipeAt: i > 0 ? Math.max(0, from - WIPE_LEAD / fps) : null },
      beat: beatOf(b.start, b.len),
    });
  });
  if (L.number) SHOTS.push({
    card: "hook-number-slam", section: "rise", from: sec(L.number.start), to: sec(L.number.start + L.number.len),
    props: { number: content.number, caption: content.caption ?? "" }, beat: beatOf(L.number.start, L.number.len),
  });
  SHOTS.push({
    card: "endcard-logo-cta", section: "endcard", from: sec(L.end.start), to: durationSec,
    props: { logo: content.logo, message: content.message, cta: content.cta, messageAt: sec(L.end.start + 1), ctaAt: sec(L.end.start + 2) },
    beat: beatOf(L.end.start, null),
  });

  // 바닥 소재: 몽타주 블록마다 교체, 나머지 구간은 content.footage (Q11: 소재가 항상 맨 아래)
  const FOOTAGE = [];
  const base = content.footage;
  const pushBase = (from, to) => { if (to > from) base ? FOOTAGE.push({ ...base, from, to }) : warnings.push(`${from.toFixed(2)}–${to.toFixed(2)}초에 바닥 소재 없음 (content.footage)`); };
  const mFrom = L.blocks.length ? sec(L.blocks[0].start) : null;
  pushBase(0, mFrom ?? durationSec);
  L.blocks.forEach((b, i) => {
    const f = blocks[i % Math.max(1, blocks.length)]?.footage;
    const from = sec(b.start), to = sec(b.start + b.len);
    if (f) FOOTAGE.push({ ...f, from, to, shotIndex: i }); else pushBase(from, to);
  });
  if (L.blocks.length) pushBase(sec(L.blocks.at(-1).start + L.blocks.at(-1).len), durationSec);

  // 화면 전체 충격 ≤ 3 (R4): 워드마크 착지, 숫자 슬램, 엔드카드 로고
  const BIG_HITS = [sec(wordBeat), ...(L.number ? [sec(L.number.start)] : []), sec(L.end.start)].slice(0, 3);

  // 착지 후보가 숫자 슬램과 어긋나면: 음악을 정수 박만큼 당겨(trimFrom) 드롭을 슬램에 맞추는 값을 알려 준다 (§7.2 역산)
  let musicShiftSec = 0;
  if (L.number && targetBeat != null && targetBeat !== L.number.start) {
    musicShiftSec = +((targetBeat - L.number.start) * B).toFixed(3);
    warnings.push(`${drop ? "드롭" : "가장 센 peak"}(${targetSec.toFixed(2)}초)이 숫자 슬램(${sec(L.number.start).toFixed(2)}초)과 ${musicShiftSec}초 어긋남: 음원을 그만큼 앞에서 잘라 쓰면(trimFrom += ${musicShiftSec}) 박을 유지한 채 맞음. 바꾼 뒤 다시 실행`);
  }
  const holdSec = durationSec - (sec(L.end.start + 2) + ENTER);
  if (holdSec > 4) warnings.push(`엔드카드 정지가 ${holdSec.toFixed(1)}초로 김: 블록을 늘리거나 주인공 샷(director §4 ②)을 넣으세요`);
  return {
    GRID: { beatSec: B, origin: g.origin, k }, SECTIONS, SHOTS, FOOTAGE, BIG_HITS, DURATION: durationSec, warnings,
    summary: { bpm: +(60 / B).toFixed(1), k, cutSec: +(k * B).toFixed(3), blocks: L.blocks.length, copy: !!L.copy, number: !!L.number, endHoldSec: +holdSec.toFixed(2), target: drop ? "drop" : peak ? "peak" : null, musicShiftSec },
  };
}
