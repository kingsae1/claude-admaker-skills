// 샷 카드 references/shots/iso-build-up.md (평면형) 의 참조 구현.
// 아이소메트릭(2:1) 격자 위에 상자(건물·블록)가 뒤에서 앞으로 차례로 아래부터 솟아오른다. 면은 윗면·왼쪽·오른쪽 3색 음영.
// 상자 하나 = SVG Image 클립 하나(윗면·두 옆면·창문), 등장은 wipe "up" + 착지 펀치. 셰이더·코드 없이 JSON만 → 앱까지 감(SVG는 앱에서 PNG로 바뀜).
// props: { at, dur, cx, cy: 바닥 격자 중심(px), tile: 칸 반폭 px(기본 90), boxes: [{ x, y, h, c, w?, d? }] (격자 칸, 높이 칸 수, 색 번호),
//          ground?: 바닥 판 색(없으면 판 없음), stagger: 상자 사이 초(기본 0.07), rise: 솟는 시간(기본 0.32), palette?: [[윗면, 왼쪽, 오른쪽], …], windows: true }
const PALETTE = [
  ["#FBD36B", "#F2B53A", "#D9962A"], // 노랑
  ["#F7A6C4", "#EE7FA8", "#D2618C"], // 분홍
  ["#C4B2FA", "#A68BF2", "#8466D6"], // 보라
  ["#A9E3C6", "#7FCFA8", "#5CB389"], // 민트
];
const svgUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** 격자 좌표(gx, gy, 높이 gz) → 화면 (2:1 아이소메트릭, 칸 반폭 a) */
export const isoPoint = (gx, gy, gz, a) => [(gx - gy) * a, (gx + gy) * (a / 2) - gz * a];

/** 상자 하나의 SVG와 화면 상자(바닥 중심 기준 좌표) */
export function isoBoxSvg({ x, y, w = 1, d = 1, h, top, left, right, windows = true, win = "#FFFFFF" }, a) {
  const P = (gx, gy, gz) => isoPoint(gx, gy, gz, a);
  const pts = {
    t0: P(x, y, h), t1: P(x + w, y, h), t2: P(x + w, y + d, h), t3: P(x, y + d, h),
    b1: P(x + w, y, 0), b2: P(x + w, y + d, 0), b3: P(x, y + d, 0),
  };
  const all = Object.values(pts);
  const minX = Math.min(...all.map((p) => p[0])) - 2, maxX = Math.max(...all.map((p) => p[0])) + 2;
  const minY = Math.min(...all.map((p) => p[1])) - 2, maxY = Math.max(...all.map((p) => p[1])) + 2;
  const q = (p) => `${(p[0] - minX).toFixed(1)},${(p[1] - minY).toFixed(1)}`;
  const poly = (ps, fill) => `<polygon points="${ps.map(q).join(" ")}" fill="${fill}"/>`;
  let s = poly([pts.t0, pts.t1, pts.t2, pts.t3], top)          // 윗면
    + poly([pts.t3, pts.t2, pts.b2, pts.b3], left)                // 앞 왼쪽 면 (y+d 쪽)
    + poly([pts.t2, pts.t1, pts.b1, pts.b2], right);              // 앞 오른쪽 면 (x+w 쪽)
  if (windows && h >= 0.8) {
    // 창문: 층(0.5칸)마다 면 위에 작은 평행사변형
    const rows = Math.floor(h / 0.5) - 1;
    for (let k = 0; k < rows; k++) {
      const z0 = 0.3 + k * 0.5, z1 = z0 + 0.22;
      for (const [u0, u1] of [[0.2, 0.42], [0.58, 0.8]]) {
        s += poly([P(x + u0 * w, y + d, z1), P(x + u1 * w, y + d, z1), P(x + u1 * w, y + d, z0), P(x + u0 * w, y + d, z0)], win).replace("/>", ' opacity="0.75"/>');
        s += poly([P(x + w, y + d - u0 * d, z1), P(x + w, y + d - u1 * d, z1), P(x + w, y + d - u1 * d, z0), P(x + w, y + d - u0 * d, z0)], win).replace("/>", ' opacity="0.55"/>');
      }
    }
  }
  const bw = maxX - minX, bh = maxY - minY;
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(bw)}" height="${Math.ceil(bh)}" viewBox="0 0 ${bw.toFixed(1)} ${bh.toFixed(1)}">${s}</svg>`, box: { x: minX, y: minY, w: bw, h: bh } };
}

export default ({ shot, shotIndex = 0, W, H, us }) => {
  const P = shot.props, sx = W / 1080, sy = H / 1920;
  const a = (P.tile ?? 90) * sx, cx = (P.cx ?? 540) * sx, cy = (P.cy ?? 1050) * sy;
  const dur = P.dur ?? 3.5, stagger = P.stagger ?? 0.07, rise = P.rise ?? 0.32, pal = P.palette ?? PALETTE;
  const timing = (s, e) => ({ display: { from: us(s), to: us(e) }, duration: us(e - s), playbackRate: 1 });
  const id = (s) => `iso${shotIndex}_${s}`;
  const clips = {}, trackOf = {};
  const boxes = [...P.boxes].sort((p, q) => (p.x + p.y) - (q.x + q.y) || p.x - q.x); // 뒤 → 앞 (그리는 순서)
  const span = Math.max(...boxes.map((b) => b.x + (b.w ?? 1))), spanY = Math.max(...boxes.map((b) => b.y + (b.d ?? 1)));
  const off = isoPoint(span / 2, spanY / 2, 0, a); // 격자 중심을 (cx, cy)로

  if (P.ground) {
    const g = 0.35, q = (gx, gy) => isoPoint(gx, gy, 0, a).map((v, k) => v - off[k]);
    const ps = [q(-g, -g), q(span + g, -g), q(span + g, spanY + g), q(-g, spanY + g)];
    const minX = Math.min(...ps.map((p) => p[0])), minY = Math.min(...ps.map((p) => p[1]));
    const maxX = Math.max(...ps.map((p) => p[0])), maxY = Math.max(...ps.map((p) => p[1]));
    const thick = a * 0.18;
    const pt = (p, dy = 0) => `${(p[0] - minX).toFixed(1)},${(p[1] - minY + dy).toFixed(1)}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(maxX - minX)}" height="${Math.ceil(maxY - minY + thick)}">`
      + `<polygon points="${pt(ps[3])} ${pt(ps[2])} ${pt(ps[2], thick)} ${pt(ps[3], thick)}" fill="${P.groundSide ?? "#5F9E7F"}"/>`
      + `<polygon points="${pt(ps[2])} ${pt(ps[1])} ${pt(ps[1], thick)} ${pt(ps[2], thick)}" fill="${P.groundSide2 ?? "#4C8569"}"/>`
      + `<polygon points="${ps.map((p) => pt(p)).join(" ")}" fill="${P.ground}"/></svg>`;
    clips[id("ground")] = { type: "Image", name: "iso-ground", src: svgUrl(svg), timing: timing(P.at, P.at + dur),
      transform: { x: Math.round(cx + minX), y: Math.round(cy + minY), width: Math.ceil(maxX - minX), height: Math.ceil(maxY - minY + thick), angle: 0, opacity: 1, zIndex: 20 },
      animations: [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [
        { from: { scale: 0.6, opacity: 0, y: 40 }, to: { scale: 1, opacity: 1, y: 0 }, duration: 0.4, ease: "back.out(1.6)", position: 0 },
      ] } }] };
    trackOf[id("ground")] = "iso";
  }
  boxes.forEach((b, i) => {
    const [top, left, right] = pal[(b.c ?? i) % pal.length];
    const { svg, box } = isoBoxSvg({ ...b, top, left, right, windows: P.windows !== false }, a);
    const t0 = P.at + 0.25 + i * stagger;
    clips[id(`b${i}`)] = { type: "Image", name: `iso-box-${i}`, src: svgUrl(svg), timing: timing(t0, P.at + dur),
      transform: { x: Math.round(cx + box.x - off[0]), y: Math.round(cy + box.y - off[1]), width: Math.ceil(box.w), height: Math.ceil(box.h), angle: 0, opacity: 1, zIndex: Math.min(48, 21 + i) },
      animations: [
        // 아래부터 솟음 (마스크라 클립 시작 = 솟는 시각)
        { type: "wipe", options: { duration: us(rise), delay: 0, easing: "easeOutCubic" }, params: { direction: "up" } },
        // 다 솟은 뒤 살짝 눌렸다 펴짐 (착지감). 중심 기준이라 y 보정 없이 작게만
        { type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [
          { from: { y: 18 * sy }, to: { y: 0 }, duration: rise, ease: "power3.out", position: 0 },
          { to: { scaleY: 0.96 }, duration: 0.06, ease: "power2.out" },
          { to: { scaleY: 1 }, duration: 0.25, ease: "back.out(3)" },
        ] } },
      ] };
    trackOf[id(`b${i}`)] = "iso";
  });
  return { clips, trackOf };
};
