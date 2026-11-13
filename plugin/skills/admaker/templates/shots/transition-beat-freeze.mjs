// 샷 카드 references/shots/transition-beat-freeze.md 의 참조 구현.
// 비트 정지 컷: 박(at)에 앞 소재가 멈춘 프레임(스틸)으로 바뀌며 화면이 한 번 번쩍이고 살짝 당겨지고(punch-in), 테두리·라벨이 박힌 채
// 정지했다가 다음 박(cut)에 하드 컷. 음악 중심 몽타주·fast-montage에 맞는다. 정지 프레임은 ffmpeg로 뽑아 FOOTAGE에 Image로 넣는다(카드 참고).
// props: { at: 정지 시작 초(박), cut: 다음 컷 초(박), still: 정지 프레임 FOOTAGE 번호, color?: 번쩍·테두리 색, label?: 짧은 글자(예: "BEST"), font?: { family, url } }
// FOOTAGE: 앞 소재 to = at, 스틸(kenBurns: false) from = at, to = cut, 다음 소재 from = cut.
export default ({ shot, brand, W, H, FPS, us, FOOTAGE }) => {
  const P = shot.props, f = 1 / FPS, sx = W / 1080, sy = H / 1920;
  const S = FOOTAGE[P.still];
  if (S.type !== "Image" || S.kenBurns !== false) throw new Error(`transition-beat-freeze: FOOTAGE[${P.still}]는 kenBurns: false인 Image(정지 프레임)여야 함`);
  const color = P.color ?? brand.colors?.accent ?? "#FFFFFF", hold = P.cut - P.at;
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const id = (s) => `freeze${P.index ?? 0}_${s}`;
  const inset = Math.round(36 * sx), bw = Math.round(10 * sx);
  const clips = {
    // 박에 2프레임 흰 번쩍 (화면 전체 충격, aesthetic-rules R4 — BIG_HITS에 at을 넣는다)
    [id("flash")]: { type: "Shape", name: "freeze-flash", src: "shape", shapeType: "rectangle", style: { fill: "#FFFFFF" },
      timing: timing(P.at, P.at + 2 * f), transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 0.85, zIndex: 80 },
      animations: [{ type: "keyframes", options: { duration: us(2 * f), delay: 0, easing: "linear" }, params: { "0%": { opacity: 1 }, "100%": { opacity: 0 } } }] },
    // 정지 테두리: 번쩍 다음 프레임에 박히고 컷까지 그대로
    [id("frame")]: { type: "Shape", name: "freeze-frame", src: "shape", shapeType: "rectangle",
      style: { fill: "transparent", fillOpacity: 0, stroke: { color, width: bw } },
      timing: timing(P.at + f, P.cut), transform: { x: inset, y: inset, width: W - 2 * inset, height: H - 2 * inset, angle: 0, opacity: 1, zIndex: 40 },
      animations: [{ type: "keyframes", options: { duration: us(0.12), delay: 0, easing: "linear" }, params: { "0%": { scale: 1.04, easing: "easeOutExpo" }, "100%": { scale: 1 } } }] },
  };
  if (P.label) {
    clips[id("label")] = { type: "Text", name: "freeze-label", text: P.label,
      style: { fontFamily: P.font?.family ?? brand.fonts?.display?.family ?? "Pretendard", ...(P.font?.url ? { fontUrl: P.font.url } : {}), fontSize: Math.round(84 * sx), fontWeight: 800, color: "#111111",
        align: "center", background: { color, padding: [10, 26], borderRadius: 8 } },
      timing: timing(P.at + f, P.cut), transform: { x: Math.round(W / 2 - 260 * sx), y: Math.round(H - inset - 230 * sy), width: Math.round(520 * sx), height: Math.round(120 * sy), angle: -4, opacity: 1, zIndex: 41 },
      animations: [{ type: "keyframes", options: { duration: us(0.14), delay: 0, easing: "linear" }, params: { "0%": { scale: 1.35, angle: -10, easing: "easeOutExpo" }, "100%": { scale: 1, angle: 0 } } }] };
  }
  const trackOf = Object.fromEntries(Object.keys(clips).map((k) => [k, "trans1"]));
  // 정지 프레임 punch-in: 0.1초에 1 → 1.06, 컷까지 유지 (밀리는 카메라가 멈춘 느낌)
  const punch = { type: "keyframes", options: { duration: us(Math.min(0.1, hold)), delay: 0, easing: "linear" }, params: { "0%": { scale: 1, easing: "easeOutExpo" }, "100%": { scale: 1.06 } } };
  return { clips, trackOf, footage: { [P.still]: [punch] } };
};
