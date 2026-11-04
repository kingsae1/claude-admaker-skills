// 샷 카드 references/shots/transition-footage-card.md 의 참조 구현 (2D → 2.5D → 2D).
// 프레임 가득 소재가 카드로 줄며 기울어 옆으로 빠지고, 반대편에서 다음 소재 카드가 기울어진 채 들어와 정면으로 펴지며 다시 화면을 채운다.
// props: { at: 전환 시작 초, dur: 길이(초, 기본 1.0), from, to: FOOTAGE 번호, card: 카드 배율(기본 0.62), tilt: rotateY 도(기본 20),
//          dir: 1 = 왼쪽으로 넘김 / −1 = 오른쪽 }
// 다음 소재 FOOTAGE.from = at, 앞 소재 FOOTAGE.to = at + dur.
// 카드 뒤에는 project.settings.backgroundColor(brand.colors.background)가 보인다. 배경 Shape를 따로 넣지 않는다:
// 렌더 하니스(Preview·Exporter)는 뒤 트랙을 위에 그려서, footage 트랙 뒤에 만든 Shape는 zIndex가 낮아도 소재를 덮는다(엔진 3.0.7 확인).
export default ({ shot, W, us, FOOTAGE }) => {
  const P = shot.props, dur = P.dur ?? 1.0, c = P.card ?? 0.62, tilt = P.tilt ?? 20, dir = P.dir ?? 1;
  // 카드가 rotateY로 기울면 x 이동이 덜 보여서(엔진 3.0.7 렌더 확인) 빠지는 쪽은 1.5W, 들어오는 쪽은 1.1W를 민다
  const A = FOOTAGE[P.from], out = Math.round(W * 1.5) * dir, off = Math.round(W * 1.1) * dir;
  const kf = (stops, delay = 0) => ({ type: "keyframes", options: { duration: us(dur), delay: us(delay), easing: "linear" }, params: stops });
  const footage = {
    // 앞 소재: 0–35% 카드로 줄며 기울기 → 35–75% 옆으로 빠짐
    [P.from]: [kf({
      "0%": { scale: 1, rotateY: 0, x: 0, easing: "easeInOutCubic" },
      "35%": { scale: c, rotateY: -tilt * dir, x: Math.round(-0.04 * W * dir), easing: "easeInCubic" },
      "75%": { scale: c, rotateY: -tilt * dir, x: -out } }, P.at - A.from)],
    // 다음 소재: 0–25% 화면 밖 대기 → 25–65% 반대편에서 들어옴 → 65–100% 정면으로 펴지며 화면을 채움
    [P.to]: [kf({
      "0%": { scale: c, rotateY: tilt * dir, x: off },
      "25%": { scale: c, rotateY: tilt * dir, x: off, easing: "easeOutCubic" },
      "65%": { scale: c, rotateY: tilt * dir, x: Math.round(0.04 * W * dir), easing: "easeInOutCubic" },
      "100%": { scale: 1, rotateY: 0, x: 0 } })],
  };
  return { clips: {}, trackOf: {}, footage };
};
