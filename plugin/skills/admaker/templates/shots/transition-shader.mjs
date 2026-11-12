// 셰이더 전환 클립(am-*, gl-transitions)을 두 바닥 소재 사이에 놓는 샷. 그래픽 클립은 만들지 않고 Transition 클립 하나만 돌려준다.
// 엔진 렌더와 앱(가져오기 후 다시 배치)이 같은 박에 보이게, 전환 구간 = 두 소재가 겹치는 구간 = [at − dur/2, at + dur/2]로 맞춘다
// (engine-recipes §5, seams.mjs appTransitionWindow). 키·values·easing은 references/transitions.md §2 B.
// props: { at: 전환 가운데(박) 초, from, to: FOOTAGE 번호, key: "am-cut-curve" 등, dur?: 초(기본 엔진 권장 길이 또는 0.6), values?, easing? }
// FOOTAGE: 앞 소재 to = at + dur/2, 다음 소재 from = at − dur/2.
const SUGGESTED = { "am-flash-streak": 0.5, "am-cover-flood": 0.65, "am-zoom-through": 0.7, "am-card-swap": 1.0, "am-push": 0.45, "am-ink-bleed": 1.4,
  "am-cut-curve": 0.6, "am-zoom-blur": 0.7, "am-rack-focus": 0.5, "am-light-leak": 0.9, "am-pixelate": 0.6, "am-rgb-split": 0.5 };

export default ({ shot, shotIndex, FPS, us, FOOTAGE }) => {
  const P = shot.props, dur = P.dur ?? SUGGESTED[P.key] ?? 0.6, half = dur / 2, f = 1 / FPS;
  const A = FOOTAGE[P.from], B = FOOTAGE[P.to];
  if (!A || !B) throw new Error(`transition-shader: FOOTAGE[${P.from}] / [${P.to}] 없음`);
  if (Math.abs(A.to - (P.at + half)) > f / 2 || Math.abs(B.from - (P.at - half)) > f / 2) {
    throw new Error(`transition-shader ${P.key}: FOOTAGE[${P.from}].to = ${+(P.at + half).toFixed(3)}, FOOTAGE[${P.to}].from = ${+(P.at - half).toFixed(3)} 이어야 함 (전환 길이만큼 겹침, engine-recipes §5)`);
  }
  const id = `tr${P.index ?? shotIndex ?? 0}_${P.key}`;
  const clip = { id, type: "Transition", name: P.key, transitionKey: P.key,
    fromClipId: `footage_${P.from}`, toClipId: `footage_${P.to}`,
    ...(P.values ? { values: P.values } : {}), ...(P.easing ? { easing: P.easing } : {}),
    timing: { display: { from: us(P.at - half), to: us(P.at + half) }, duration: us(dur), playbackRate: 1, trim: { from: 0, to: us(dur) } } };
  return { clips: { [id]: clip }, trackOf: { [id]: "transitions" } };
};
