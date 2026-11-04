// 샷 카드 references/shots/transition-zoom-through.md 의 참조 구현.
// 앞 소재 속 둥근 물체(창·렌즈·접시·글자 O)를 향해 카메라가 다가가고, 그 안이 다음 소재로 열리며 화면을 채운다.
// props: { at: 컷 초(B가 화면을 다 채우는 시각), dur: 전환 길이(초), portal: { x, y, d } 앞 소재 속 물체(1080×1920 기준),
//          from: 앞 소재 FOOTAGE 번호, to: 다음 소재 FOOTAGE 번호, ring: 테두리 색(없으면 생략), easing }
// 다음 소재(to)의 FOOTAGE.from 은 at − dur 로 둔다(전환 동안 겹침). 두 소재 모두 프레임 가득 Video 기준
// (스틸 Ken Burns가 같이 걸리면 고정점이 조금 흔들림).
import { zoomAbout, farCorner } from "../motion.mjs";

export default ({ shot, W, H, us, FOOTAGE }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920;
  const dur = P.dur ?? 0.7, ease = P.easing ?? "easeInOutCubic", t0 = P.at - dur;
  const p = [P.portal.x * sx, P.portal.y * sy], r = (P.portal.d * sx) / 2, C = [W / 2, H / 2];
  const far = farCorner(p, W, H), k = far / r; // 끝에서 물체 테두리 = 프레임 모서리
  const A = FOOTAGE[P.from], B = FOOTAGE[P.to];
  if (Math.abs(B.from - t0) > 1e-3) console.warn(`△ zoom-through: FOOTAGE[${P.to}].from 을 ${t0.toFixed(3)}초(at − dur)로 두세요`);
  const kf = (stops, delay = 0) => ({ type: "keyframes", options: { duration: us(dur), delay: us(delay), easing: "linear" }, params: stops });
  const footage = {
    // 앞 소재: 물체 점을 고정한 채 k배까지 (등속이 아니라 가속 → 감속)
    [P.from]: [kf({ "0%": { ...zoomAbout(p, 1, C), easing: ease }, "100%": zoomAbout(p, k, C) }, t0 - A.from)],
    // 다음 소재: 물체 자리에서 원 마스크로 열림. 같은 이징이라 구멍 반지름(far × e)은 늘 물체 테두리 안에 있다가 끝에서 만남.
    // 살짝 큰 상태(1.25배)에서 1배로 내려앉아 깊이감
    [P.to]: [
      { type: "circleReveal", options: { duration: us(dur), delay: 0, easing: ease }, params: { originX: p[0] / W, originY: p[1] / H } },
      kf({ "0%": { ...zoomAbout(p, 1.25, C), easing: ease }, "100%": zoomAbout(p, 1, C) }),
    ],
  };
  const clips = {}, trackOf = {};
  if (P.ring) {
    const id = `zoom${P.index ?? 0}_ring`, w = Math.max(4, Math.round(6 * sx));
    clips[id] = { type: "Shape", name: "zoom-ring", src: "shape", shapeType: "circle",
      style: { fill: "transparent", fillOpacity: 0, stroke: { color: P.ring, width: w } },
      timing: { display: { from: us(t0), to: us(P.at) }, duration: us(dur), playbackRate: 1 },
      transform: { x: Math.round(p[0] - r), y: Math.round(p[1] - r), width: Math.round(2 * r), height: Math.round(2 * r), angle: 0, opacity: 1, zIndex: 30 },
      animations: [kf({ "0%": { scale: 1, easing: ease }, "100%": { scale: k } })] };
    trackOf[id] = "trans2";
  }
  return { clips, trackOf, footage };
};
