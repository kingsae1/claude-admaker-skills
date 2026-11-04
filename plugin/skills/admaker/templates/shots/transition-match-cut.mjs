// 샷 카드 references/shots/transition-match-cut.md 의 참조 구현.
// 컷 양쪽을 같은 움직임으로 잇는다. (1) 방향 매치: 앞 소재가 나가는 방향·속도 그대로 다음 소재가 들어옴(+ 모션 블러).
// (2) 그래픽 매치: 앞 소재 물체를 감싼 링이 컷 순간 다음 소재 물체의 자리·크기에 정확히 착지하고 잠깐 머문 뒤 사라짐.
// props: { at: 컷 초, from, to: FOOTAGE 번호, push: { dx, dy } 컷 앞뒤 각 lead초 동안 움직일 px(1080×1920 기준, 기본 { dx: -90 }),
//          lead: 컷 앞뒤 길이(초, 기본 0.2), carry: { a: { x, y, d }, b: { x, y, d }, color, width } (없으면 링 생략) }
// 다음 소재 FOOTAGE.from 은 at. 두 소재 모두 프레임 가득 Video 기준.
import { blurFor } from "../motion.mjs";

export default ({ shot, W, H, FPS, us, FOOTAGE }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920, f = 1 / FPS;
  const lead = P.lead ?? 0.2, dx = (P.push?.dx ?? -90) * sx, dy = (P.push?.dy ?? 0) * sy;
  const A = FOOTAGE[P.from];
  // 밀어도 가장자리가 안 비게 확대: 1 + 2·이동/변 (Q11: 소재 원본은 그대로, 짧은 확대만)
  const s = 1 + (2 * Math.max(Math.abs(dx) / W, Math.abs(dy) / H)) * 1.1;
  const blur = blurFor(Math.hypot(dx, dy) / (lead * FPS) * 2); // 컷 근처 속도는 평균의 약 2배 (easeIn/easeOut)
  const kf = (stops, delay = 0, d = lead) => ({ type: "keyframes", options: { duration: us(d), delay: us(delay), easing: "linear" }, params: stops });
  const footage = {
    [P.from]: [kf({ "0%": { x: 0, y: 0, scale: 1, motionBlur: 0, easing: "easeInCubic" }, "100%": { x: dx, y: dy, scale: s, motionBlur: blur } }, P.at - lead - A.from)],
    [P.to]: [kf({ "0%": { x: -dx, y: -dy, scale: s, motionBlur: blur, easing: "easeOutCubic" }, "100%": { x: 0, y: 0, scale: 1, motionBlur: 0 } })],
  };
  const clips = {}, trackOf = {};
  if (P.carry) {
    const { a, b } = P.carry, w = Math.round((P.carry.width ?? 8) * sx), id = `match${P.index ?? 0}_ring`;
    // 링 상자는 B 물체 크기로 두고 A 쪽은 scale·x·y로 맞춘다. 컷 순간에는 B 소재의 밀림(−dx, scale s, 프레임 중심 기준)까지
    // 똑같이 얹어 B 물체와 같은 픽셀에 있고, 뒤 lead초 동안 B와 같은 이징으로 제자리(오프셋 0, scale 1)에 함께 내려앉는다.
    const bx = b.x * sx, by = b.y * sy, br = (b.d * sx) / 2, C = [W / 2, H / 2];
    const at = (o) => ({ x: Math.round(o.x * sx - bx), y: Math.round(o.y * sy - by), scale: o.d / b.d });
    const land = { x: Math.round((bx - C[0]) * (s - 1) - dx), y: Math.round((by - C[1]) * (s - 1) - dy), scale: s };
    const t0 = P.at - lead * 2, tail = P.carry.hold ?? 0.35, total = lead * 3;
    const pc = (sec) => `${((sec / total) * 100).toFixed(2)}%`;
    clips[id] = { type: "Shape", name: "match-ring", src: "shape", shapeType: "circle",
      style: { fill: "transparent", fillOpacity: 0, stroke: { color: P.carry.color ?? "#FFFFFF", width: w } },
      timing: { display: { from: us(t0), to: us(P.at + tail + 0.2) }, duration: us(lead * 2 + tail + 0.2), playbackRate: 1 },
      transform: { x: Math.round(bx - br), y: Math.round(by - br), width: Math.round(2 * br), height: Math.round(2 * br), angle: 0, opacity: 1, zIndex: 30 },
      animations: [
        // A 물체 위에서 나타나(0.1초) → 컷 순간 (밀린) B 물체 자리 → B와 함께 제자리
        { type: "keyframes", options: { duration: us(total), delay: 0, easing: "linear" }, params: {
          "0%": { ...at(a), opacity: 0 }, [pc(lead * 0.4)]: { ...at(a), opacity: 1, easing: "easeInCubic" },
          [pc(lead * 2)]: { ...land, opacity: 1, easing: "easeOutCubic" }, "100%": { x: 0, y: 0, scale: 1, opacity: 1 } } },
        // 착지 후 tail초 머문 뒤 0.2초 퇴장
        { type: "keyframes", options: { duration: us(0.2), delay: us(lead * 2 + tail), easing: "linear" },
          params: { "0%": { opacity: 1, scale: 1, easing: "easeInCubic" }, "100%": { opacity: 0, scale: 1.15 } } },
      ] };
    trackOf[id] = "trans3";
  }
  return { clips, trackOf, footage };
};
