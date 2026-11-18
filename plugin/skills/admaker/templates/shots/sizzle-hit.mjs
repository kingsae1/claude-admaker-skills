// 샷 카드 references/shots/sizzle-hit.md 의 참조 구현.
// 시즐 히트: 고기가 불판에 닿거나 소스가 부어지는 박(at)에 바닥 소재가 확 당겨지고(punch-in), 음식 둘레에서 김이 피어오르며
// 의성어 스티커("치익")가 기울어 꽂히고, 메뉴명 알약이 한 박 뒤 따라 붙는다. 음식 시즐 방향(food-sizzle)의 훅·시그니처.
// props: { at: 시즐 순간 초(박, 소리 피크와 같은 프레임), to: 효과 끝 초(보통 다음 컷), footage: 당길 바닥 소재 FOOTAGE 번호,
//          word?: 의성어 (기본 "치익"), label?: 메뉴명 (2–10자), steam?: { x, y, w } 김이 오를 음식 자리(1080×1920 기준, 기본 화면 아래 가운데),
//          color?: 스티커 색, font?: { family, url }, beat?: 한 박 초 (기본 0.5), index? }
// 소재를 덮지 않음(aesthetic-rules Q11): 김은 음식 둘레에만 작게, 불투명도 0.55 이하. 화면 전체 면·틴트 없음.
import { fontStyle } from "../fonts.mjs";

export default ({ shot, brand, W, H, FPS, us, FOOTAGE }) => {
  const P = shot.props, f = 1 / FPS, sx = W / 1080, sy = H / 1920;
  if (!(P.to > P.at)) throw new Error("sizzle-hit: to는 at보다 커야 함");
  const F = FOOTAGE[P.footage];
  if (!F) throw new Error(`sizzle-hit: FOOTAGE[${P.footage}]가 없음 (시즐 장면 소재 번호)`);
  if (P.at < F.from || P.at >= F.to) throw new Error(`sizzle-hit: at(${P.at})이 FOOTAGE[${P.footage}] 구간 [${F.from}, ${F.to}) 밖`);
  const beat = P.beat ?? 0.5, dur = P.to - P.at;
  const color = P.color ?? brand.colors?.accent ?? "#FF5A1F";
  const ink = brand.colors?.ink ?? "#111111";
  // 글꼴: props.font { family, url }가 있으면 그것, 없으면 brand.fonts.display { name, weight }를 fonts.json에서 찾음
  const { _weight, ...face } = P.font?.url ? { fontFamily: P.font.family, fontUrl: P.font.url, fontWeight: "400" } : fontStyle(brand.fonts?.display ?? { name: "Pretendard", weight: 900 });
  const timing = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
  const kf = (d, params) => ({ type: "keyframes", options: { duration: us(d), delay: 0, easing: "linear" }, params });
  const id = (s) => `sizzle${P.index ?? 0}_${s}`;
  const clips = {}, trackOf = {};

  // 김: 흐린 흰 원 3개가 음식 자리에서 시차를 두고 피어올라 흩어짐 (Image SVG 방사 그라데이션, 앱까지 그대로)
  const st = { x: 540, y: 1260, w: 520, ...(P.steam ?? {}) };
  const blob = (n) =>
    "data:image/svg+xml;base64," +
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><radialGradient id="g${n}"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.9"/><stop offset="0.55" stop-color="#FFFFFF" stop-opacity="0.35"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient></defs><circle cx="128" cy="128" r="128" fill="url(#g${n})"/></svg>`).toString("base64");
  const puffs = [
    { dx: -0.28, delay: 0, size: 0.62, rise: 360, drift: -40, peak: 0.55 },
    { dx: 0.06, delay: 2 * f, size: 0.78, rise: 440, drift: 30, peak: 0.5 },
    { dx: 0.3, delay: 5 * f, size: 0.56, rise: 320, drift: 50, peak: 0.45 },
  ];
  puffs.forEach((p, i) => {
    const size = Math.round(st.w * p.size * sx);
    const a = P.at + p.delay, life = Math.min(dur - p.delay, 1.6);
    if (life <= 0.2) return;
    const k = id(`steam${i}`);
    clips[k] = {
      type: "Image", name: `sizzle-steam-${i}`, src: blob(i),
      timing: timing(a, a + life),
      transform: { x: Math.round((st.x + st.w * p.dx) * sx - size / 2), y: Math.round(st.y * sy - size / 2), width: size, height: size, angle: 0, opacity: 1, zIndex: 20 },
      animations: [kf(life, {
        "0%": { opacity: 0, scale: 0.6, y: 0, x: 0, easing: "easeOutCubic" },
        "25%": { opacity: p.peak, scale: 0.95, y: -Math.round(p.rise * 0.35 * sy), x: Math.round(p.drift * 0.3 * sx), easing: "easeInOutSine" },
        "100%": { opacity: 0, scale: 1.45, y: -Math.round(p.rise * sy), x: Math.round(p.drift * sx) },
      })],
    };
    trackOf[k] = "sizzle_steam";
  });

  // 의성어 스티커: 박에 1.7배·−14°에서 0.14초 만에 꽂히고(소리와 같은 프레임), 남은 동안 박마다 살짝 떨림
  const word = P.word ?? "치익";
  const ww = Math.round(Math.max(360, 150 * word.length) * sx), wh = Math.round(200 * sy);
  const wordKey = id("word");
  const wobble = {};
  const n = Math.max(1, Math.floor((dur - 0.14) / beat));
  wobble["0%"] = { scale: 1.7, angle: -14, opacity: 0, easing: "easeOutExpo" };
  wobble[`${((0.14 / dur) * 100).toFixed(2)}%`] = { scale: 1, angle: -6, opacity: 1, easing: "easeOutQuart" };
  for (let b = 1; b <= n; b++) {
    const t = 0.14 + b * beat;
    if (t >= dur - 0.05) break;
    const pct = (t / dur) * 100;
    wobble[`${(pct - (0.06 / dur) * 100).toFixed(2)}%`] = { scale: 1, angle: -6, opacity: 1, easing: "easeOutExpo" };
    wobble[`${pct.toFixed(2)}%`] = { scale: 1.06, angle: b % 2 ? -8 : -4, opacity: 1, easing: "easeOutCubic" };
  }
  wobble["100%"] = { scale: 1, angle: -6, opacity: 1 };
  clips[wordKey] = {
    type: "Text", name: "sizzle-word", text: word,
    style: { ...face, fontSize: Math.round(150 * sx), color: "#FFFFFF",
      align: "center", verticalAlign: "center", background: { color, padding: [8, 30], borderRadius: 18 },
      shadow: { color: ink, alpha: 1, blur: 0, offsetX: Math.round(8 * sx), offsetY: Math.round(8 * sy) } },
    timing: timing(P.at, P.to),
    transform: { x: Math.round(W * 0.5 - ww / 2 - 120 * sx), y: Math.round(st.y * sy - 620 * sy), width: ww, height: wh, angle: -6, opacity: 1, zIndex: 60 },
    animations: [kf(dur, wobble)],
  };
  trackOf[wordKey] = "sizzle_word";

  // 메뉴명 알약: 한 박 뒤 아래에서 올라와 자리잡음 (출구는 다음 컷이 덮음)
  if (P.label && dur > beat + 0.3) {
    const lw = Math.round(Math.max(420, 70 * P.label.length + 120) * sx), lh = Math.round(120 * sy);
    const k = id("label");
    const a = P.at + beat;
    clips[k] = {
      type: "Text", name: "sizzle-label", text: P.label,
      style: { ...face, fontSize: Math.round(64 * sx), color: ink,
        align: "center", verticalAlign: "center", background: { color: "#FFFFFF", padding: [10, 28], borderRadius: 60 } },
      timing: timing(a, P.to),
      transform: { x: Math.round(W / 2 - lw / 2), y: Math.round(H - 420 * sy), width: lw, height: lh, angle: 0, opacity: 1, zIndex: 61 },
      animations: [kf(Math.min(0.35, P.to - a), { "0%": { y: Math.round(80 * sy), opacity: 0, easing: "easeOutExpo" }, "100%": { y: 0, opacity: 1 } })],
    };
    trackOf[k] = "sizzle_label";
  }

  // 바닥 소재 punch-in: 박 직전까지 1, 박에서 0.12초 만에 1.07, 끝까지 1.1로 천천히 (소재가 "당겨지는" 느낌)
  const off = P.at - F.from, fdur = Math.min(F.to, P.to) - F.from;
  const pp = (t) => `${((t / fdur) * 100).toFixed(2)}%`;
  const stops = off > 2 * f ? { "0%": { scale: 1, easing: "linear" }, [pp(off - f)]: { scale: 1, easing: "easeOutExpo" } } : { "0%": { scale: 1, easing: "easeOutExpo" } };
  const punch = kf(fdur, { ...stops, [pp(Math.min(fdur - f, off + 0.12))]: { scale: 1.07, easing: "easeOutSine" }, "100%": { scale: 1.1 } });
  return { clips, trackOf, footage: { [P.footage]: [punch] } };
};
