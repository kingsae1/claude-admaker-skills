// 샷 카드 references/shots/transition-cut-the-curve.md 의 참조 구현.
// 흐름 잇기(cut-the-curve): 앞 소재가 dir 쪽으로 빨라지며(화면 폭의 12%만) 빠지고, 컷 순간 다음 소재가 같은 쪽으로 이어 들어와 멈춘다.
// 나갈 때 easeIn·들어올 때 easeOut을 같은 거리로 이어 붙여 컷 순간 속도가 같다. 투명도는 이동보다 먼저 빠져 컷 직전에 사라지고,
// 다음 소재는 0.35에서 이미 움직이며 켜진다. 기법·수치: HyperFrames cut-the-curve (Apache-2.0).
// props: { at: 컷 초, from, to: FOOTAGE 번호, dir: "left"|"right"|"up"|"down" (기본 left), travel: px(1080 기준, 기본 130),
//          exit: 나가는 길이(초, 기본 0.3), entry: 들어오는 길이(초, 기본 0.32), titles?: { out: [클립 id…], in: [클립 id…] } }
// 다음 소재 FOOTAGE.from = at (겹치지 않음, 한 프레임에 한쪽만). 밀린 자리에 바닥이 보이므로 needsGround로 생성 배경을 깐다.
import { cutCurveOut, cutCurveIn } from "../motion.mjs";

export const needsGround = true;

export default ({ shot, W, FOOTAGE }) => {
  const P = shot.props, dir = P.dir ?? "left", travel = Math.round((P.travel ?? 130) * (W / 1080));
  const A = FOOTAGE[P.from], B = FOOTAGE[P.to];
  if (Math.abs(B.from - P.at) > 1e-6 || Math.abs(A.to - P.at) > 1e-6) {
    throw new Error(`transition-cut-the-curve: FOOTAGE[${P.from}].to와 FOOTAGE[${P.to}].from이 at(${P.at})과 같아야 함 (겹치지 않는 컷)`);
  }
  const opt = { dir, W, travel };
  return {
    clips: {},
    trackOf: {},
    footage: {
      [P.from]: [cutCurveOut(A.to - A.from, { ...opt, dur: P.exit ?? 0.3 })],
      [P.to]: [cutCurveIn({ ...opt, dur: P.entry ?? 0.32 })],
    },
  };
};
