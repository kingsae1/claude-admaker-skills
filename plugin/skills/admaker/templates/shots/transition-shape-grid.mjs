// 샷 카드 references/shots/transition-shape-grid.md 의 참조 구현 (엔진 3.0.25+: 장식 조각에 pie 도형).
// 바우하우스 타일: 화면이 칸으로 나뉘어 칸마다 사각 타일이 돌며 튀어나와 앞 장면을 덮고(대각선 순서),
// 타일 위에 원·반원·사분원 조각이 한 박 늦게 찍힌다. 컷 순간은 꽉 찬 면, 다음 장면은 타일이 반대 순서로 줄며 드러난다.
// props: { at: 컷 초, cols: 8 (가로 칸 수), colors: [타일 색…], decor: [조각 색…], grow: 0.34, shrink: 0.34,
//          from: "left"|"right"|"center" (덮는 순서), seed, intensity?: interludes.mjs INTENSITY 값 }
// 클립 하나가 덮기·열기 전체를 맡는다(엔진은 delay 전에 keyframes를 안 걸어서, 숨긴 값으로 붙잡는 stop을 앞에 둠).

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const pct = (t, L) => `${Math.max(0, Math.min(100, (t / L) * 100)).toFixed(3)}%`;

export default ({ shot, brand, W, H, FPS, us }) => {
  const P = shot.props, f = 1 / FPS;
  const I = P.intensity ?? {};
  const cols = P.cols ?? (W > H ? 8 : 5);
  const c = Math.ceil(W / cols), rows = Math.ceil(H / c);
  const k = I.durScale ?? 1;
  const grow = (P.grow ?? 0.34) * k, shrink = (P.shrink ?? 0.34) * k;
  const bc = brand.colors ?? {};
  const colors = P.colors ?? [bc.accent ?? "#FF4A1C", bc.accentDeep ?? "#1E3F99", bc.text ?? "#F5F5F7"];
  const decor = P.decor ?? [bc.background ?? "#141414", bc.flicker2 ?? "#FFC93C"];
  const rand = rng(P.seed ?? 11);
  const from = P.from ?? "left";
  const easeIn = I.overshoot ?? "easeOutBack", easeOut = I.easeIn ?? "easeInCubic";
  const t0 = P.at - f - grow, L = grow + 2 * f + shrink;
  const timing = { display: { from: us(t0), to: us(t0 + L) }, duration: us(L), playbackRate: 1 };
  const id = (s) => `shapegrid${P.index ?? 0}_${s}`;
  const clips = {};
  const order = (cx, cy) => {
    if (from === "center") return Math.hypot(cx - (cols - 1) / 2, (cy - (rows - 1) / 2) * 1.2) / Math.hypot(cols / 2, rows * 0.6);
    const d = (cx + cy * 0.6) / (cols - 1 + (rows - 1) * 0.6);
    return from === "right" ? 1 - d : d;
  };
  const KINDS = ["circle", "half", "quarter", "none", "circle", "half"];
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const o = order(q, r);
    const inStart = o * grow * 0.55, inDur = Math.max(0.12, grow - inStart);       // 마지막 타일도 컷 1프레임 전에 다 섬
    const outStart = grow + 2 * f + o * shrink * 0.5, outDur = shrink * 0.5;
    const spin = (rand() < 0.5 ? -1 : 1) * 90;
    const box = { x: q * c - 1, y: r * c - 1, width: c + 2, height: c + 2, angle: 0, opacity: 1, zIndex: 72 };
    const tile = colors[(q + r * 3 + Math.floor(rand() * 2)) % colors.length];
    clips[id(`t${r}_${q}`)] = { type: "Shape", name: "shape-grid tile", src: "shape", shapeType: "rectangle", style: { fill: tile }, timing, transform: box,
      animations: [{ type: "keyframes", options: { duration: us(L), delay: 0, easing: "linear" }, params: {
        "0%": { scale: 0.001, angle: spin }, [pct(inStart, L)]: { scale: 0.001, angle: spin, easing: easeIn },
        [pct(inStart + inDur, L)]: { scale: 1, angle: 0 }, [pct(outStart, L)]: { scale: 1, angle: 0, easing: easeOut },
        [pct(outStart + outDur, L)]: { scale: 0.001, angle: -spin }, "100%": { scale: 0.001, angle: -spin } } }] };
    const kind = KINDS[Math.floor(rand() * KINDS.length)];
    if (kind === "none") continue;
    // 장식 조각: 타일보다 0.06초 늦게 찍히고 0.04초 먼저 빠짐. 반원·사분원은 pie
    const dIn = Math.min(inStart + 0.06, grow - 0.1), dOut = Math.max(grow + 2 * f, outStart - 0.04);
    const rot = [0, 90, 180, 270][Math.floor(rand() * 4)];
    const geo = kind === "circle" ? { shapeType: "circle", style: {} }
      : kind === "half" ? { shapeType: "pie", style: { startAngle: rot, endAngle: rot + 180 } }
      : { shapeType: "pie", style: { startAngle: rot, endAngle: rot + 90 } };
    const s = kind === "quarter" ? c * 2 : c * 0.86;
    const corner = [[0, 0], [c, 0], [c, c], [0, c]][rot / 90]; // 사분원은 칸 모서리가 중심(engine-recipes §5)
    const dbox = kind === "quarter"
      ? { x: q * c + corner[0] - c, y: r * c + corner[1] - c, width: s, height: s, angle: 0, opacity: 1, zIndex: 73 }
      : { x: q * c + (c - s) / 2, y: r * c + (c - s) / 2, width: s, height: s, angle: 0, opacity: 1, zIndex: 73 };
    const startAngleFor = { 0: 90, 90: 180, 180: 270, 270: 0 }; // 사분원: 칸 안쪽을 향하는 90°
    if (kind === "quarter") geo.style = { startAngle: startAngleFor[rot], endAngle: startAngleFor[rot] + 90 };
    clips[id(`d${r}_${q}`)] = { type: "Shape", name: "shape-grid decor", src: "shape", shapeType: geo.shapeType,
      style: { fill: decor[Math.floor(rand() * decor.length)], ...geo.style }, timing, transform: dbox,
      animations: [{ type: "keyframes", options: { duration: us(L), delay: 0, easing: "linear" }, params: {
        "0%": { scale: 0.001 }, [pct(dIn, L)]: { scale: 0.001, easing: easeIn }, [pct(Math.min(grow, dIn + 0.16), L)]: { scale: 1 },
        [pct(dOut, L)]: { scale: 1, easing: easeOut }, [pct(dOut + outDur * 0.7, L)]: { scale: 0.001 }, "100%": { scale: 0.001 } } }] };
  }
  // 컷 앞뒤 1프레임: 꽉 찬 면(타일 이음매 틈 방지)
  clips[id("hold")] = { type: "Shape", name: "shape-grid hold", src: "shape", shapeType: "rectangle", style: { fill: colors[0] },
    timing: { display: { from: us(P.at - f), to: us(P.at + f) }, duration: us(2 * f), playbackRate: 1 },
    transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 71 } };
  return { clips, trackOf: Object.fromEntries(Object.keys(clips).map((k2) => [k2, "trans1"])) };
};
