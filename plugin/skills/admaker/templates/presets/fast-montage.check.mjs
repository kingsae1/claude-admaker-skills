// fast-montage.mjs 자체 검사: 여러 BPM·길이에서 슬롯이 박에 떨어지고, 엔드카드 홀드 ≥ 1.5초, 화면 충격 ≤ 3, 소재가 빈틈없이 깔리는지
// 사용: node templates/presets/fast-montage.check.mjs
import { fastMontage } from "./fast-montage.mjs";

const blocks = ["LIVE:실시간", "VOD:다시보기", "MOVIE:영화", "MORE:시리즈", "KIDS:키즈", "SPORT:스포츠", "DOCU:다큐", "MUSIC:공연"]
  .map((s, i) => { const [label, title] = s.split(":"); return { label, title, footage: { src: `f${i}.jpg`, type: "Image", size: [1080, 1920] } }; });
const content = { wordmark: "브랜드", copy: ["추가 결제 없이", "광고 없이"], blocks, number: "25만 편", logo: "logo.svg", message: "메시지", cta: "지금 확인", footage: { src: "base.jpg", type: "Image", size: [1080, 1920] } };
const A = (bpm, extra = {}) => ({ bpm, beatSec: bpm ? 60 / bpm : null, firstBeatSec: bpm ? 0.13 : null, bars: [], peaks: [], sections: [], ...extra });
const cases = [
  [A(100), 15], [A(120), 15], [A(140), 15], [A(174), 15], [A(128), 30], [A(120), 6], [A(null), 15],
  [A(120, { sections: [{ startSec: 0, change: "start" }, { startSec: 9.5, change: "rise" }] }), 15],
  [A(120, { bars: [{ startSec: 4, endSec: 8, level: "low" }] }), 30],
];
let fail = 0;
const check = (ok, msg) => { if (!ok) { fail++; console.log("  ✗", msg); } };
for (const [a, d] of cases) {
  const m = fastMontage({ analysis: a, durationSec: d, content });
  const { beatSec: B, origin } = m.GRID;
  console.log(`${a.bpm ?? "null"}BPM ${d}s`, JSON.stringify(m.summary));
  for (const s of m.SHOTS) if (s.from > 0) check(Math.abs((s.from - origin) / B - Math.round((s.from - origin) / B)) * B < 1 / 30 + 1e-6, `${s.card} ${s.from}s가 박에 안 맞음`);
  check(m.summary.endHoldSec >= 1.5, `엔드카드 홀드 ${m.summary.endHoldSec}초`);
  check(m.BIG_HITS.length <= 3, "화면 충격 3회 초과");
  for (let i = 1; i < m.SHOTS.length; i++) check(m.SHOTS[i].from >= m.SHOTS[i - 1].to - 1e-6, `${m.SHOTS[i].card}가 앞 샷과 겹침`);
  const f = [...m.FOOTAGE].sort((x, y) => x.from - y.from);
  check(f[0]?.from === 0 && Math.abs(f.at(-1).to - d) < 1e-6 && f.every((x, i) => !i || Math.abs(x.from - f[i - 1].to) < 1e-6), "바닥 소재에 빈틈");
  for (const s of m.SHOTS.filter((s) => s.card === "beat-montage-wipe")) check(s.to - s.from >= 0.45 && s.to - s.from <= 2.9, `몽타주 컷 ${(s.to - s.from).toFixed(2)}초`);
  if (d <= 8) check(m.SHOTS.length === 2, "6초 범퍼는 스팅 + 엔드카드만");
}
console.log(fail ? `✗ ${fail}개 실패` : "✓ 통과");
process.exit(fail ? 1 : 0);
