// 샷 카드 references/shots/transition-whip-pan.md 의 참조 구현.
// 휩팬: 카메라가 휙 돌아가듯 앞 소재와 다음 소재가 나란히 붙은 채 dir 쪽으로 한 화면만큼 미끄러지고, 가운데서 모션 블러가 가장 세다.
// 두 소재가 붙어서 움직이므로 틈이 없다(바닥 필요 없음). 셰이더로 하려면 am-push(direction, blur 0.2 이상).
// props: { at: 가운데(컷) 초, from, to: FOOTAGE 번호, dir: "left"|"right"|"up"|"down" (기본 left), lead: 가운데 앞뒤 길이(초, 기본 0.18), blur: 가운데 모션 블러(px, 기본 60) }
// FOOTAGE: 앞 소재 to = at + lead, 다음 소재 from = at − lead (lead만큼 앞뒤로 겹침).
const DIR = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export default ({ shot, W, H, us, FOOTAGE }) => {
  const P = shot.props, lead = P.lead ?? 0.18, [vx, vy] = DIR[P.dir ?? "left"];
  const A = FOOTAGE[P.from], B = FOOTAGE[P.to];
  if (Math.abs(A.to - (P.at + lead)) > 1e-6 || Math.abs(B.from - (P.at - lead)) > 1e-6) {
    throw new Error(`transition-whip-pan: FOOTAGE[${P.from}].to = ${P.at + lead}, FOOTAGE[${P.to}].from = ${P.at - lead} 이어야 함`);
  }
  const dx = vx * W, dy = vy * H, peak = P.blur ?? 60;
  // 가로는 엔진 motionBlur(가로로만 번짐), 세로는 일반 blur
  const smear = (k) => (vx !== 0 ? { motionBlur: Math.round(peak * k) } : { blur: Math.round((peak / 6) * k) });
  // 같은 easeInOutQuart 한 번: 가운데가 가장 빠르다. 블러는 가운데에 정점
  const move = (x0, y0) => ({ type: "keyframes", options: { duration: us(lead * 2), delay: 0, easing: "linear" }, params: {
    "0%": { x: x0, y: y0, ...smear(0), easing: "easeInQuart" },
    "50%": { x: x0 + dx / 2, y: y0 + dy / 2, ...smear(1), easing: "easeOutQuart" },
    "100%": { x: x0 + dx, y: y0 + dy, ...smear(0) } } });
  const outAnim = move(0, 0);
  outAnim.options.delay = us(A.to - A.from - lead * 2);
  return { clips: {}, trackOf: {}, footage: { [P.from]: [outAnim], [P.to]: [move(-dx, -dy)] } };
};
