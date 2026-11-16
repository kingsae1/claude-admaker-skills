// 샷 카드 references/shots/bauhaus-beat.md 의 참조 구현 — 플래너 "도형" 그룹(빠른 템포 2D 바우하우스).
// 원·반원·사분원·삼각·사각 칸이 박마다 뒤집히며 화면 가장자리에 L자 격자를 짜고, 글자는 도형 받침 위에 착지한다.
// 코드 씬·3D 없이 Shape(path)·Text·Image와 gsapTimeline만 쓴다 → 앱 플래너 템플릿으로 그대로 내보낼 수 있다.
// props: { scene: "opening"|"main"|"point"|"showcase"|"detail"|"closing", beat: 박 길이(초),
//          out: 이 씬을 떠나는 전환 길이(초, 그래픽 퇴장이 그 전에 끝남), text: { store_name, tagline, menu_name_1.., badge, location, cta, phone }, logo }
// 화면 비율은 16:9(1920×1080) 기준. 다른 크기는 sx·sy로 늘린다.
import { fontStyle } from "../fonts.mjs";

export const PALETTE = { red: "#E63B2E", blue: "#1F4FD8", yellow: "#F5C518", ink: "#1A1A1A", cream: "#F2EDE2" };
const C = PALETTE;

// 칸 하나(180) 기준 기본 도형 path. viewBox = [0,0,s,s]
export const PRIM = {
  square: (s) => `M0 0H${s}V${s}H0Z`,
  quarter: (s) => `M0 0H${s}A${s} ${s} 0 0 1 0 ${s}Z`,
  half: (s) => `M0 ${s}A${s / 2} ${s / 2} 0 0 1 ${s} ${s}Z`,
  circle: (s) => `M${s / 2} 0A${s / 2} ${s / 2} 0 1 1 ${s / 2 - 0.1} 0Z`,
  dot: (s) => `M${s / 2} ${s * 0.2}A${s * 0.3} ${s * 0.3} 0 1 1 ${s / 2 - 0.1} ${s * 0.2}Z`,
  triangle: (s) => `M0 ${s}L${s / 2} 0L${s} ${s}Z`,
};

export default ({ shot, shotIndex = 0, brand, W, H, FPS, us }) => {
  const P = shot.props ?? {};
  const b = P.beat ?? 60 / 128;
  const dur = shot.to - shot.from;
  const outSec = P.out ?? 0.35;
  const exitAt = dur - outSec - 0.3;     // 퇴장 시작(클립 기준). 전환 전에 끝난다
  const sx = W / 1920, sy = H / 1080;
  const T = (a, z) => ({ display: { from: us(shot.from + a), to: us(shot.from + z) }, duration: us(z - a), playbackRate: 1 });
  const display = fontStyle(brand.fonts?.display ?? { name: "Paperozi", weight: 700 });
  const body = fontStyle(brand.fonts?.body ?? { name: "Paperozi", weight: 700 });
  const txt = P.text ?? {};
  const clips = {}, trackOf = {};
  const key = (s) => `bh${shotIndex}_${s}`;
  let z = 10;

  const shape = (name, { x, y, w, h = w, path, fill, angle = 0, tweens = [], from = 0, to = dur, shapeType = "path" }) => {
    const id = key(name);
    clips[id] = {
      type: "Shape", name: id, src: "shape", shapeType,
      style: shapeType === "path" ? { fill, path, viewBox: [0, 0, w, h] } : { fill },
      timing: T(from, to),
      transform: { x: Math.round(x * sx), y: Math.round(y * sy), width: Math.round(w * sx), height: Math.round(h * sy), angle, opacity: 1, zIndex: Math.min(69, z++) },
      animations: tweens.length ? [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens } }] : [],
    };
    trackOf[id] = `bh_${name}`;
    return id;
  };
  const text = (name, { x, y, w, h, value, field, size, color, font = display, align = "center", tweens = [], spacing = 0 }) => {
    const id = key(name);
    clips[id] = {
      type: "Text", name: id, text: value, ...(field ? { field } : {}),
      timing: T(0, dur),
      transform: { x: Math.round(x * sx), y: Math.round(y * sy), width: Math.round(w * sx), height: Math.round(h * sy), angle: 0, opacity: 1, zIndex: Math.min(69, z++) },
      style: { ...font, fontSize: Math.round(size * sx), color, align, verticalAlign: "center", letterSpacing: spacing },
      animations: tweens.length ? [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens } }] : [],
    };
    trackOf[id] = `bh_${name}`;
    // 고정 문구(필드 없음)는 앱이 박스를 건드리지 않게 strict
    if (!field) clips[id].layout = { stretch: "strict" };
    return id;
  };
  // 앱 레이아웃 힌트(템플릿 clip stretch·maxWidth·link) — 입력 문구 길이에 맞춰 앱이 글자 박스·받침을 맞춘다. 로컬 렌더에는 영향 없음
  const fitText = (id, stretch, maxWidth) => { clips[id].layout = { ...(clips[id].layout ?? {}), ...(stretch ? { stretch } : {}), ...(maxWidth ? { maxWidth: Math.round(maxWidth * sx) } : {}) }; return id; };
  // 받침(바·띠)이 글자 폭(+pad)을 따라 넓어짐. 템플릿 폭보다 작아지지는 않음. height를 주면 줄바꿈된 높이도 따라감
  const follow = (id, to, pad, height) => { clips[id].layout = { link: { to, width: { pad: pad * sx }, ...(height ? { height: { pad: height.pad * sy, min: height.min * sy } } : {}), grow: true, align: "center" } }; return id; };
  const above = (id) => { clips[id].transform.zIndex = Math.min(69, z++); return id; };
  // 공통 모션 조각 (fast 등급: 입장 0.32–0.4초, 착지 back.out, 퇴장 expo.in)
  const pop = (t, d = 0.32) => ({ from: { scale: 0 }, to: { scale: 1 }, duration: d, ease: "back.out(2.2)", position: t });
  const slam = (t) => [
    { from: { scale: 1.7, opacity: 0, blur: 10 }, to: { scale: 1, opacity: 1, blur: 0 }, duration: 0.16, ease: "power4.out", position: t },
    { to: { scaleX: 1.04, scaleY: 0.9 }, duration: 0.05, ease: "power2.out" },
    { to: { scaleX: 1, scaleY: 1 }, duration: 0.22, ease: "back.out(3)" },
  ];
  const punch = (t, k = 1.08) => [
    { to: { scale: k }, duration: 0.06, ease: "power2.out", position: t },
    { to: { scale: 1 }, duration: 0.2, ease: "power2.inOut" },
  ];
  const turn = (t, deg) => ({ to: { angle: deg }, duration: 0.32, ease: "back.inOut(1.6)", position: t });
  const shrinkOut = (t, i = 0) => ({ to: { scale: 0 }, duration: 0.22, ease: "back.in(2)", position: t + i * 0.035 });
  const leftOut = (t, i = 0) => ({ to: { x: -0.12 * W, opacity: 0 }, duration: 0.25, ease: "expo.in", position: t + i * 0.035 });
  const zoomOut = (t, i = 0) => ({ to: { scale: 1.2, opacity: 0 }, duration: 0.25, ease: "expo.in", position: t + i * 0.02 });

  // 도형 칸 = 바탕 사각 + 위 도형. 뒤집기는 위 도형만 90°씩 돈다
  const PRIMS = ["quarter", "half", "circle", "triangle", "quarter", "half", "dot", "quarter"];
  const COLS = [C.red, C.blue, C.yellow, C.ink];
  const cell = (name, { x, y, s = 180, i, enter, turns = [], exit, exitKind = shrinkOut }) => {
    const bg = COLS[i % 4], fg = COLS[(i + 1 + (i >> 2)) % 4] === bg ? C.cream : COLS[(i + 1 + (i >> 2)) % 4];
    const prim = PRIMS[i % PRIMS.length], a0 = (i * 90) % 360;
    shape(`${name}_bg`, { x, y, w: s, path: PRIM.square(s), fill: bg, tweens: [pop(enter), ...(exit != null ? [exitKind(exit, i % 6)] : [])] });
    let a = a0;
    shape(`${name}_fg`, { x, y, w: s, path: PRIM[prim](s), fill: fg === bg ? C.cream : fg, angle: a0,
      tweens: [pop(enter + 0.07), ...turns.map((t) => turn(t, (a += 90))), ...(exit != null ? [exitKind(exit, i % 6)] : [])] });
  };

  const S = 180;
  switch (P.scene) {
    case "opening": {
      // L자 격자: 왼쪽 세로 5칸 + 아래 가로 11칸 (가운데는 소재). 대각선 순서로 튀어나옴(0–2박)
      const cells = [];
      // d = 왼쪽 아래 모서리에서 떨어진 칸 수 → 입장 순서
      for (let r = 0; r < 5; r++) cells.push({ x: 0, y: r * S, d: 5 - r });
      for (let c = 0; c < 11; c++) cells.push({ x: c * S, y: 5 * S, d: c });
      const exitT = exitAt;
      cells.forEach((p, i) => {
        const turns = [];
        if (i % 4 === 1) turns.push(2 * b);
        if (i % 4 === 3) turns.push(4 * b);
        if (i % 3 === 0) turns.push(6 * b);
        cell(`c${i}`, { x: p.x, y: p.y, i, enter: p.d * 0.035, turns, exit: exitT });
      });
      // 반원 받침 위에 상호 착지(5박), 태그라인 바(5.5박). 받침은 아래 줄에 얹힘
      shape("dome", { x: 690, y: 520, w: 760, h: 380, path: `M0 380A380 380 0 0 1 760 380Z`, fill: C.blue,
        tweens: [{ from: { scaleY: 0 }, to: { scaleY: 1 }, duration: 0.3, ease: "back.out(1.8)", position: 4.5 * b }, ...punch(6 * b, 1.04), leftOut(exitT, 1)] });
      fitText(text("name", { x: 700, y: 700, w: 740, h: 170, value: txt.store_name ?? "도형 스튜디오", field: "store_name", size: 112, color: C.cream,
        tweens: [...slam(5 * b), ...punch(6 * b), leftOut(exitT, 2)] }), "horizontal", 740);
      shape("tagbar", { x: 760, y: 410, w: 620, h: 84, path: "M0 0H620V84H0Z", fill: C.yellow,
        tweens: [{ from: { scaleX: 0 }, to: { scaleX: 1 }, duration: 0.3, ease: "expo.out", position: 5.5 * b }, leftOut(exitT, 3)] });
      const tag = fitText(text("tagline", { x: 760, y: 410, w: 620, h: 84, value: txt.tagline ?? "모양으로 말하는 카페", field: "tagline", size: 46, color: C.ink, font: body,
        tweens: [{ from: { opacity: 0, x: -30 }, to: { opacity: 1, x: 0 }, duration: 0.25, ease: "expo.out", position: 5.5 * b + 0.1 }, leftOut(exitT, 3)] }), "horizontal", 1300);
      follow(key("tagbar"), tag, 36);
      break;
    }
    case "main": {
      // 원이 오른쪽에서 굴러 들어와 1박에 멈추고, 그 안에 한 단어가 찍힘. 2·3박 펀치
      const R = 560, cx = 1050 - R / 2, cy = 450 - R / 2;
      const roll = (extra = []) => [{ from: { x: 0.55 * W, angle: 300 }, to: { x: 0, angle: 0 }, duration: 0.45, ease: "expo.out", position: 0.55 * b - 0.2 }, ...punch(2 * b, 1.05), ...punch(3 * b, 1.05), ...extra];
      shape("disc", { x: cx, y: cy, w: R, path: PRIM.circle(R), fill: C.yellow, tweens: roll([leftOut(exitAt, 0)]) });
      shape("mark", { x: cx, y: cy, w: R, path: `M${R / 2} 0A${R / 2} ${R / 2} 0 0 1 ${R} ${R / 2}H${R / 2}Z`, fill: C.red, tweens: roll([leftOut(exitAt, 0)]) });
      // 원 위에 크림 띠를 깔고 글자를 얹는다 — 원 밖으로 길어진 글자도 영상 위에서 읽힘. 띠는 글자 폭을 따라 넓어짐
      const band = shape("band", { x: cx - 40, y: cy + R / 2 - 95, w: R + 80, h: 190, path: `M0 0H${R + 80}V190H0Z`, fill: C.cream,
        tweens: [{ from: { scaleX: 0 }, to: { scaleX: 1 }, duration: 0.22, ease: "expo.out", position: b - 0.12 }, ...punch(2 * b), ...punch(3 * b), leftOut(exitAt, 1)] });
      const word = fitText(text("word", { x: cx - 10, y: cy + R / 2 - 90, w: R + 20, h: 180, value: txt.menu_name_1 ?? "라떼", field: "menu_name_1", size: 150, color: C.ink,
        tweens: [...slam(b), ...punch(2 * b), ...punch(3 * b), leftOut(exitAt, 1)] }), "horizontal", 1560);
      follow(band, word, 40);
      // 왼쪽 아래 작은 칸 3개 — 박마다 뒤집힘(마디당 4번)
      for (let i = 0; i < 3; i++) cell(`k${i}`, { x: i * 120, y: 960, s: 120, i: i + 1, enter: i * 0.035, turns: [b, 2 * b, 3 * b].map((t) => t + i * 0.035), exit: exitAt, exitKind: leftOut });
      break;
    }
    case "point": {
      // 빨강 반원 판 두 장이 양쪽에서 닫혀 2박 덮고, 단어 슬램 후 다시 열림 (광고의 큰 충격 1/3)
      const L = `M0 0H960A540 540 0 0 1 960 1080H0Z`;            // 왼판: 사각 960 + 오른쪽으로 볼록한 반원(r 540) → 폭 1500
      const Rp = `M1500 0H540A540 540 0 0 0 540 1080H1500Z`;       // 오른판: 거울
      const openAt = 2.5 * b;
      shape("left", { x: 0, y: 0, w: 1500, h: 1080, path: L, fill: C.red,
        tweens: [{ from: { x: -1500 * sx }, to: { x: 0 }, duration: 0.28, ease: "expo.out", position: 0 }, { to: { x: -1500 * sx }, duration: 0.3, ease: "expo.in", position: openAt }] });
      shape("right", { x: 420, y: 0, w: 1500, h: 1080, path: Rp, fill: C.blue,
        tweens: [{ from: { x: 1500 * sx }, to: { x: 0 }, duration: 0.28, ease: "expo.out", position: 0.035 }, { to: { x: 1500 * sx }, duration: 0.3, ease: "expo.in", position: openAt }] });
      shape("ring", { x: 760, y: 340, w: 400, path: PRIM.circle(400), fill: C.yellow,
        tweens: [pop(0.3), ...punch(2 * b, 1.1), { to: { scale: 0 }, duration: 0.2, ease: "back.in(2)", position: openAt - 0.05 }] });
      const badge = text("badge", { x: 460, y: 440, w: 1000, h: 200, value: txt.badge ?? "NEW", field: "badge", size: 150, color: C.ink, spacing: 4,
        tweens: [...slam(b), ...punch(2 * b), { to: { scale: 0.6, opacity: 0 }, duration: 0.2, ease: "expo.in", position: openAt - 0.05 }] });
      fitText(badge, "horizontal", 1400);
      break;
    }
    case "showcase": {
      // 메뉴 이름은 칸 폭(420) 안에서 줄을 바꾸고, 크림 바가 글자 폭·높이를 따라 커진다
      // 메뉴 3개가 서로 다른 도형 발판(사각·삼각·원)과 함께 2·4·6박에 들어옴, 이후 박마다 발판이 90°씩 돎
      const prims = ["square", "triangle", "circle"], fills = [C.red, C.blue, C.yellow];
      const xs = [300, 810, 1320];
      prims.forEach((pr, i) => {
        const t0 = (1 + 2 * i) * b;
        const turns = [];
        let a = 0;
        for (let k = 2 * i + 2; k < 8; k++) if (exitAt > k * b) turns.push(turn(k * b, (a += 90)));
        shape(`plate${i}`, { x: xs[i] + 30, y: 300, w: 240, path: PRIM[pr](240), fill: fills[i],
          tweens: [{ from: { y: -300 * sy, scale: 0.4, opacity: 0 }, to: { y: 0, scale: 1, opacity: 1 }, duration: 0.36, ease: "back.out(2)", position: t0 }, ...turns, zoomOut(exitAt, i)] });
        const bar = shape(`bar${i}`, { x: xs[i], y: 600, w: 300, h: 96, path: "M0 0H300V96H0Z", fill: C.cream,
          tweens: [{ from: { scaleX: 0, opacity: 0 }, to: { scaleX: 1, opacity: 1 }, duration: 0.3, ease: "expo.out", position: t0 + 0.12 }, zoomOut(exitAt, i)] });
        const menu = text(`menu${i}`, { x: xs[i] - 60, y: 600, w: 420, h: 96, value: txt[`menu_name_${i + 1}`] ?? ["라떼", "스콘", "케이크"][i], field: `menu_name_${i + 1}`, size: 52, color: C.ink, font: body,
          tweens: [{ from: { opacity: 0, y: 24 }, to: { opacity: 1, y: 0 }, duration: 0.25, ease: "expo.out", position: t0 + 0.18 }, zoomOut(exitAt, i)] });
        fitText(menu, "vertical");
        follow(bar, menu, 24, { pad: 14, min: 96 });
      });
      break;
    }
    case "detail": {
      // 사분원 네 개가 화면 모서리에서 돌아 들어와 어긋난 프레임, 가운데 위치 한 줄
      const r = 220, box = { x0: 470, y0: 250, x1: 1450, y1: 800 };
      const corners = [
        { x: box.x0, y: box.y0, a: 0, fx: -600, fy: -500, fill: C.red },
        { x: box.x1 - r, y: box.y0 - 40, a: 90, fx: 600, fy: -500, fill: C.blue },
        { x: box.x1 - r + 40, y: box.y1 - r, a: 180, fx: 600, fy: 500, fill: C.yellow },
        { x: box.x0 - 40, y: box.y1 - r + 30, a: 270, fx: -600, fy: 500, fill: C.ink },
      ];
      corners.forEach((c, i) => shape(`q${i}`, { x: c.x, y: c.y, w: r, path: PRIM.quarter(r), fill: c.fill, angle: c.a,
        tweens: [{ from: { x: c.fx * sx, y: c.fy * sy, angle: c.a - 180 }, to: { x: 0, y: 0, angle: c.a }, duration: 0.4, ease: "expo.out", position: i * 0.035 },
          turn(2 * b, c.a + 90), shrinkOut(exitAt, i)] }));
      shape("plate", { x: 610, y: 470, w: 700, h: 110, path: "M0 0H700V110H0Z", fill: C.cream,
        tweens: [{ from: { scaleX: 0 }, to: { scaleX: 1 }, duration: 0.3, ease: "expo.out", position: b - 0.1 }, ...punch(3 * b, 1.04), shrinkOut(exitAt, 2)] });
      // 주소 길이만큼 판이 넓어짐(가운데 기준). 화면 폭을 넘으면 글자가 줄어든다
      const loc = fitText(text("loc", { x: 610, y: 470, w: 700, h: 110, value: txt.location ?? "서울 성수동 12-3", field: "location", size: 54, color: C.ink, font: body,
        tweens: [...slam(b), ...punch(3 * b), shrinkOut(exitAt, 3)] }), "horizontal", 1600);
      follow(key("plate"), loc, 44);
      break;
    }
    case "closing": {
      // 격자가 다시 모여 로고 뒤 받침이 되고, 로고 → 상호(+1박) → CTA(+2박). 드롭(4박)에 전체가 한 번 뒤집히고 마지막 1.5초는 정지
      const drop = 4 * b;
      shape("plate", { x: 480, y: 170, w: 960, h: 600, path: "M0 0H960V600H0Z", fill: C.cream,
        tweens: [{ from: { scaleY: 0 }, to: { scaleY: 1 }, duration: 0.3, ease: "expo.out", position: 0 }, { to: { scaleX: 0.94, scaleY: 1.04 }, duration: 0.08, ease: "power2.out", position: drop }, { to: { scaleX: 1, scaleY: 1 }, duration: 0.4, ease: "elastic.out(1,0.5)" }] });
      // 판 양옆에 200px 칸 3개씩, 판 높이(600)에 딱 맞춰 거울 대칭으로 붙인다. 줄마다 같은 도형·색이고 오른쪽은 좌우를 뒤집은 방향.
      // 드롭에 왼쪽은 시계, 오른쪽은 반시계로 한 바퀴 돌아 다시 대칭으로 멈춘다
      const G = 200;
      const rows = [
        { prim: "circle", bg: C.ink, fg: C.yellow, aL: 0, aR: 0 },
        { prim: "quarter", bg: C.blue, fg: C.cream, aL: 0, aR: 90 },     // 사분원 호가 판 쪽을 향함
        { prim: "half", bg: C.yellow, fg: C.red, aL: 90, aR: 270 },      // 반원 볼록한 쪽이 판 쪽
      ];
      rows.forEach((r, k) => [["L", 480 - G, r.aL, 1], ["R", 1440, r.aR, -1]].forEach(([side, x, a0, dir], j) => {
        const y = 170 + k * G, enter = 0.1 + (k * 2 + j) * 0.035;
        shape(`g${k}${side}_bg`, { x, y, w: G, path: PRIM.square(G), fill: r.bg, tweens: [pop(enter)] });
        shape(`g${k}${side}_fg`, { x, y, w: G, path: PRIM[r.prim](G), fill: r.fg, angle: a0,
          tweens: [pop(enter + 0.07), { to: { angle: a0 + 360 * dir }, duration: 0.45, ease: "back.inOut(1.4)", position: drop + k * 0.035 }] });
      }));
      const logo = key("logo");
      clips[logo] = {
        type: "Image", name: logo, src: P.logo ?? "assets/logo.png", field: "logo",
        timing: T(0, dur),
        transform: { x: Math.round(810 * sx), y: Math.round(220 * sy), width: Math.round(300 * sx), height: Math.round(120 * sy), angle: 0, opacity: 1, zIndex: Math.min(69, z++) },
        animations: [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens: [pop(0.5 * b, 0.36), ...punch(drop)] } }],
      };
      trackOf[logo] = "bh_logo";
      fitText(text("name", { x: 500, y: 360, w: 920, h: 170, value: txt.store_name ?? "도형 스튜디오", field: "store_name", size: 120, color: C.ink, tweens: [...slam(1.5 * b), ...punch(drop)] }), "horizontal", 900);
      // CTA 알약은 pill 도형(앱이 폭을 늘려도 양끝 반원이 찌그러지지 않음)이고 문구 폭을 따라 넓어진다
      const ctabar = shape("ctabar", { x: 690, y: 560, w: 540, h: 100, shapeType: "pill", fill: C.red,
        tweens: [{ from: { scaleX: 0 }, to: { scaleX: 1 }, duration: 0.32, ease: "back.out(1.6)", position: 2.5 * b }, ...punch(drop)] });
      const cta = text("cta", { x: 690, y: 560, w: 540, h: 100, value: txt.cta ?? "지금 방문하기", field: "cta", size: 50, color: C.cream, font: body,
        tweens: [{ from: { opacity: 0, scale: 0.6 }, to: { opacity: 1, scale: 1 }, duration: 0.25, ease: "back.out(2)", position: 2.5 * b + 0.1 }, ...punch(drop)] });
      fitText(cta, "horizontal", 780);
      follow(ctabar, cta, 56);
      text("phone", { x: 690, y: 680, w: 540, h: 70, value: txt.phone ?? "02-123-4567", field: "phone", size: 40, color: C.ink, font: body,
        tweens: [{ from: { opacity: 0, y: 20 }, to: { opacity: 1, y: 0 }, duration: 0.25, ease: "expo.out", position: 3 * b }] });
      break;
    }
    default: throw new Error(`bauhaus-beat: scene "${P.scene}"를 모름`);
  }
  return { clips, trackOf };
};
