// 샷 카드 references/shots/pixel-arcade.md 의 참조 구현 — 플래너 "아케이드" 그룹(빠른 템포 8비트 게임 화면).
// 모든 움직임이 칸 단위(steps)로 뚝뚝 끊기고, 점수판·코인·캐릭터가 혜택을 알린다. 부드러운 이징·블러는 쓰지 않는다.
// 도트 그림은 글자 격자를 색마다 path 하나로 바꿔 Shape로 그린다(이미지 호스팅 없이 앱 템플릿에 그대로 실림).
// 걷기 같은 프레임 교체는 프레임마다 Shape를 겹쳐 두고 opacity를 steps(1)로 바꾼다.
// props: { scene: "opening"|"main"|"point"|"showcase"|"detail"|"closing", beat, out, text: { store_name, promo_title, promo_price, menu_name_1.., menu_price_1.., promo_period, phone, cta }, logo }
import { fontStyle } from "../fonts.mjs";

export const PALETTE = { night: "#0D0D1A", sky: "#4CC9F0", coin: "#FFD23F", red: "#F25F5C", white: "#FFFFFF", ink: "#26264A", pale: "#FFF8C4" };
const C = PALETTE;
const DOT = 8; // 화면 도트 한 칸(px). 그림은 DOT의 정수배로 키운다

// 원작 캐릭터: 쇼핑백 마스코트(손잡이 두 개, 큰 눈, 웃는 입). 마지막 두 줄이 다리 — 걷기 프레임 2장
const BAG = [
  "...KK....KK...",
  "..K..K..K..K..",
  "..K..K..K..K..",
  "KKKKKKKKKKKKKK",
  "KBBBBBBBBBBBBK",
  "KBBBBBBBBBBBBK",
  "KBBWWBBBBWWBBK",
  "KBBWKBBBBWKBBK",
  "KBBBBBBBBBBBBK",
  "KBBBBRRRRBBBBK",
  "KBBBBBRRBBBBBK",
  "KBBBBBBBBBBBBK",
  "KKKKKKKKKKKKKK",
];
const LEGS = [["...KK....KK...", "..KKK....KKK.."], ["....KK..KK....", "...KKK..KKK..."]];
const BAG_PAL = { K: C.ink, B: C.sky, W: C.white, R: C.red };
const COIN = ["..YYYY..", ".YYWWYY.", "YYWYYYYY", "YYWYYYYY", "YYWYYYYY", "YYWYYYYY", ".YYYYYY.", "..YYYY.."];
const COIN_PAL = { Y: C.coin, W: C.pale };
const STAR = ["....Y....", "....Y....", "...YYY...", "YYYYYYYYY", ".YYYYYYY.", "..YYYYY..", "..YY.YY..", ".YY...YY.", "YY.....YY"];
const HEART = [".RR...RR.", "RRRR.RRRR", "RRRRRRRRR", "RRRRRRRRR", ".RRRRRRR.", "..RRRRR..", "...RRR...", "....R...."];
const BLOCK = ["KKKKKKKKKKKK", "KYYYYYYYYYYK", "KYYYYKKYYYYK", "KYYYYKKYYYYK", "KYKKKKKKKKYK", "KYYKKKKKKYYK", "KYYYKKKKYYYK", "KYYKKYYKKYYK", "KYKKYYYYKKYK", "KYYYYYYYYYYK", "KYYYYYYYYYYK", "KKKKKKKKKKKK"]; // 별 무늬 블록
const BLOCK_PAL = { K: C.night, Y: C.coin };
const ICONS = [[COIN, COIN_PAL], [STAR, { Y: C.coin }], [HEART, { R: C.red }]];

/** 글자 격자 → 색마다 path 하나 { fill: d }. 가로로 이어진 칸은 사각 하나로 합친다 */
export function pixelPaths(rows, pal, s) {
  const out = {};
  rows.forEach((line, r) => {
    let c = 0;
    while (c < line.length) {
      const ch = line[c];
      if (!pal[ch]) { c++; continue; }
      let e = c; while (e + 1 < line.length && line[e + 1] === ch) e++;
      (out[pal[ch]] ??= []).push(`M${c * s} ${r * s}H${(e + 1) * s}V${(r + 1) * s}H${c * s}Z`);
      c = e + 1;
    }
  });
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("")]));
}

export default ({ shot, shotIndex = 0, brand, W, H, FPS, us }) => {
  const P = shot.props ?? {};
  const b = P.beat ?? 60 / 128;
  const dur = shot.to - shot.from;
  const outSec = P.out ?? 0.4;
  const exitAt = dur - outSec - 0.25;
  const sx = W / 1920, sy = H / 1080;
  const T = (a, z) => ({ display: { from: us(shot.from + a), to: us(shot.from + z) }, duration: us(z - a), playbackRate: 1 });
  const font = fontStyle(brand.fonts?.display ?? { name: "Mulmaru", weight: 400 });
  const txt = P.text ?? {};
  const clips = {}, trackOf = {};
  const key = (s) => `px${shotIndex}_${s}`;
  let z = 10;
  const st = (sec) => `steps(${Math.max(1, Math.round(sec * 12))})`; // 이동 시간 × 12 칸

  const gsap = (tweens) => (tweens.length ? [{ type: "gsapTimeline", options: { delay: 0 }, params: { tweens } }] : []);
  const shape = (name, { x, y, w, h = w, path, fill, tweens = [], angle = 0 }) => {
    const id = key(name);
    clips[id] = {
      type: "Shape", name: id, src: "shape", shapeType: "path", style: { fill, path, viewBox: [0, 0, w, h] },
      timing: T(0, dur),
      transform: { x: Math.round(x * sx), y: Math.round(y * sy), width: Math.round(w * sx), height: Math.round(h * sy), angle, opacity: 1, zIndex: Math.min(69, z++) },
      animations: gsap(tweens),
    };
    trackOf[id] = `px_${name}`;
    return id;
  };
  const rect = (name, x, y, w, h, fill, tweens) => shape(name, { x, y, w, h, path: `M0 0H${w}V${h}H0Z`, fill, tweens });
  /** 앱 글자 박스 맞춤(template clip stretch·maxWidth) — 입력 문구가 길 때 앱이 쓴다. 로컬 렌더에는 영향 없음 */
  const fitText = (id, stretch, maxWidth) => { clips[id].layout = { ...(clips[id].layout ?? {}), ...(stretch ? { stretch } : {}), ...(maxWidth ? { maxWidth: Math.round(maxWidth * sx) } : {}) }; return id; };
  // 도트 테두리 상자(모서리 한 칸 깎음) — 말풍선·점수판·인벤토리 칸.
  // 모서리 깎인 모양을 가로 막대 + 세로 막대 두 사각형으로 만든다: 앱이 폭을 늘려도 path가 찌그러지지 않고 모서리가 그대로 16px.
  // follow: { to: 글자 clip id, pad } — 앱에서 글자가 길어지면 상자가 글자 폭 + pad만큼 넓어진다(템플릿 폭보다 작아지지는 않음)
  const box = (name, x, y, w, h, fill, border, tweens = [], follow) => {
    const d = DOT * 2, i = DOT;
    const lay = (to, pad) => ({ link: { to, width: { pad: pad * sx }, grow: true, align: "center", ...(follow && to === follow.to ? {} : { measure: "box" }) } });
    const fh = rect(`${name}_fh`, x + i, y + i + d, w - 2 * i, h - 2 * i - 2 * d, fill, tweens);
    const fv = rect(`${name}_fv`, x + i + d, y + i, w - 2 * i - 2 * d, h - 2 * i, fill, tweens);
    const bh = rect(`${name}_bh`, x, y + d, w, h - 2 * d, border, tweens);
    const bv = rect(`${name}_bv`, x + d, y, w - 2 * d, h, border, tweens);
    if (follow) {
      clips[fh].layout = lay(follow.to, follow.pad);
      clips[fv].layout = lay(fh, -d);
      clips[bh].layout = lay(fh, i);
      clips[bv].layout = lay(bh, -d);
    }
    // 테두리가 아래, 속이 위(z 순서)
    for (const id of [bh, bv, fh, fv]) clips[id].transform.zIndex = Math.min(69, z++);
  };
  const sprite = (name, rows, pal, x, y, s, tweens = []) => {
    const w = rows[0].length * s, h = rows.length * s;
    Object.entries(pixelPaths(rows, pal, s)).forEach(([fill, path], i) => shape(`${name}_${i}`, { x, y, w, h, path, fill, tweens }));
    return { w, h };
  };
  const text = (name, { x, y, w, h, value, field, size, color, tweens = [], shadow = true, align = "center" }) => {
    const id = key(name);
    clips[id] = {
      type: "Text", name: id, text: value, ...(field ? { field } : {}),
      timing: T(0, dur),
      transform: { x: Math.round(x * sx), y: Math.round(y * sy), width: Math.round(w * sx), height: Math.round(h * sy), angle: 0, opacity: 1, zIndex: Math.min(69, z++) },
      style: { ...font, fontSize: Math.round(size * sx), color, align, verticalAlign: "center", letterSpacing: 0,
        ...(shadow ? { shadow: { color: C.night, alpha: 1, blur: 0, offsetX: Math.round(6 * sx), offsetY: Math.round(6 * sy) } } : {}) },
      animations: gsap(tweens),
    };
    trackOf[id] = `px_${name}`;
    // 고정 문구(필드 없음)는 앱이 박스를 건드리지 않게 strict
    if (!field) clips[id].layout = { stretch: "strict" };
    return id;
  };
  // 공통 모션: 칸 단위 등장(steps 4), 깜빡임(2프레임 단위), 칸 단위 퇴장
  const popIn = (t, d = 0.33) => ({ from: { scale: 0 }, to: { scale: 1 }, duration: d, ease: "steps(4)", position: t });
  const blinkOn = (t) => ({ from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.07, ease: "steps(1)", position: t });
  const blinkOff = (t, i = 0) => ({ to: { opacity: 0 }, duration: 0.07, ease: "steps(1)", position: t + i / 30 });
  const blinkOut = (t, i = 0) => [ // 두 번 깜빡이고 사라짐
    { to: { opacity: 0 }, duration: 0.067, ease: "steps(1)", position: t + i / 30 },
    { to: { opacity: 1 }, duration: 0.067, ease: "steps(1)" },
    { to: { opacity: 0 }, duration: 0.067, ease: "steps(1)" },
  ];
  const bump = (t, px = 24) => [{ to: { y: -px * sy }, duration: 0.083, ease: "steps(2)", position: t }, { to: { y: 0 }, duration: 0.083, ease: "steps(2)" }];
  const leftOut = (t, i = 0) => ({ to: { x: -0.12 * W, opacity: 0 }, duration: 0.25, ease: "steps(3)", position: t + i / 30 });
  const zoomOut = (t, i = 0) => ({ to: { scale: 1.2, opacity: 0 }, duration: 0.25, ease: "steps(3)", position: t + i / 30 });

  // 상단 HUD(점수판) — 모든 씬 공통, 글자는 고정 문구
  const hud = (score, right, out = (t) => blinkOut(t)) => {
    rect("hud", 0, 0, 1920, 96, C.night, [blinkOn(0), ...out(exitAt)]);
    text("hud_l", { x: 48, y: 16, w: 600, h: 64, value: `SCORE ${score}`, size: 40, color: C.white, align: "left", shadow: false, tweens: [blinkOn(0), ...out(exitAt)] });
    text("hud_c", { x: 760, y: 16, w: 400, h: 64, value: "1P", size: 40, color: C.sky, shadow: false, tweens: [blinkOn(0), ...out(exitAt)] });
    text("hud_r", { x: 1272, y: 16, w: 600, h: 64, value: right, size: 40, color: C.white, align: "right", shadow: false, tweens: [blinkOn(0), ...out(exitAt)] });
  };
  // 바닥 줄: 체크 무늬 두 줄(빨강·하늘), 박마다 한 칸씩 흘러감
  const ground = (y, tweensExtra = []) => {
    // 박마다 48px씩 왼쪽으로 최대 8칸 흐르므로, 다 흐른 뒤에도 오른쪽 끝을 덮게 그만큼 더 길게(앱이 씬을 늘려도 박 수는 같음)
    const n = Math.ceil((1920 + 8 * 48) / 96) * 2 + 2;
    let a = "", c = "";
    for (let i = 0; i < n; i++) ((i % 2) ? (a += `M${i * 48} 0h48v24h-48Z`) : (c += `M${i * 48} 0h48v24h-48Z`));
    for (let i = 0; i < n; i++) ((i % 2) ? (c += `M${i * 48} 24h48v24h-48Z`) : (a += `M${i * 48} 24h48v24h-48Z`));
    const flow = [0, 1, 2, 3, 4, 5, 6, 7].filter((k) => k * b < exitAt).map((k) => ({ to: { x: -48 * (k + 1) * sx }, duration: 0.01, ease: "steps(1)", position: k * b }));
    shape("gnd_a", { x: 0, y, w: n * 48, h: 48, path: a, fill: C.red, tweens: [...flow, ...tweensExtra] });
    shape("gnd_b", { x: 0, y, w: n * 48, h: 48, path: c, fill: C.sky, tweens: [...flow, ...tweensExtra] });
  };

  switch (P.scene) {
    case "opening": {
      // PRESS START가 2박 깜빡이고, 캐릭터가 걸어 들어와 4박에 블록을 머리로 쳐서 상호가 튀어나옴 (큰 충격 1/3)
      hud("000000", "TIME 99");
      ground(888);
      const ps = text("press", { x: 560, y: 940, w: 800, h: 80, value: "PRESS START", size: 48, color: C.white,
        tweens: [0, 1, 2, 3].flatMap((k) => [{ to: { opacity: 0 }, duration: 0.01, ease: "steps(1)", position: k * b / 2 + b / 4 }, { to: { opacity: 1 }, duration: 0.01, ease: "steps(1)", position: (k + 1) * b / 2 }]).concat([blinkOff(2 * b)]) });
      void ps;
      const S = 12, hit = 4 * b;
      const bx = 888, by = 520; // 블록(12칸 × 13px)
      sprite("block", BLOCK, BLOCK_PAL, bx, by, 13, [blinkOn(0.2), ...bump(hit), ...blinkOut(exitAt, 2)]);
      // 걷기: 1–3박 동안 왼쪽 밖에서 블록 아래로 칸 단위로 이동, 다리는 0.133초마다 교체
      const hx = bx + 6 - 12, walkFrom = -(bx + 300), walkDur = 2 * b, jumpAt = hit - 0.17;
      const move = [{ from: { x: walkFrom * sx }, to: { x: 0 }, duration: walkDur, ease: st(walkDur), position: b },
        { to: { y: -130 * sy }, duration: 0.17, ease: "steps(3)", position: jumpAt }, { to: { y: 0 }, duration: 0.25, ease: "steps(4)" }];
      const top = 888 - (BAG.length + 2) * S;
      sprite("bag", BAG, BAG_PAL, hx, top, S, [...move, ...blinkOut(exitAt, 1)]);
      LEGS.forEach((legs, f) => {
        const flips = [];
        for (let t = b, k = 0; t < b + walkDur; t += 0.133, k++) flips.push({ to: { opacity: (k + f) % 2 ? 1 : 0 }, duration: 0.01, ease: "steps(1)", position: t });
        if (f === 1) flips.push({ to: { opacity: 0 }, duration: 0.01, ease: "steps(1)", position: b + walkDur });
        else flips.push({ to: { opacity: 1 }, duration: 0.01, ease: "steps(1)", position: b + walkDur });
        sprite(`legs${f}`, legs, BAG_PAL, hx, top + BAG.length * S, S, [...(f ? [{ from: { opacity: 0 }, to: { opacity: 0 }, duration: 0.01, position: 0 }] : []), ...move, ...flips, ...blinkOut(exitAt, 1)]);
      });
      // 블록에서 코인이 튀어 오르고 상호명 상자가 열림
      sprite("coin", COIN, COIN_PAL, bx + 38, by - 100, 10, [{ from: { y: 100 * sy, opacity: 0 }, to: { y: -60 * sy, opacity: 1 }, duration: 0.25, ease: "steps(4)", position: hit }, { to: { y: 0 }, duration: 0.17, ease: "steps(3)" }, blinkOff(hit + 0.6)]);
      const name = fitText(text("name", { x: 580, y: 190, w: 760, h: 140, value: txt.store_name ?? "픽셀마트", field: "store_name", size: 104, color: C.coin, tweens: [popIn(hit + 0.15), ...bump(5 * b, 16), ...bump(6 * b, 16), ...blinkOut(exitAt)] }), "horizontal", 1480);
      box("namebox", 560, 170, 800, 180, C.night, C.sky, [popIn(hit + 0.08), ...blinkOut(exitAt)], { to: name, pad: 40 });
      clips[name].transform.zIndex = Math.min(69, z++);
      break;
    }
    case "main": {
      // 도트 말풍선이 steps(4)로 커지고 한 단어가 타자로 찍힘. 말풍선 꼬리 쪽에 캐릭터
      hud("000100", "TIME 98", (t) => [leftOut(t)]);
      const bubbleTw = [popIn(0.05), ...bump(2 * b, 16), ...bump(3 * b, 16), leftOut(exitAt, 1)];
      shape("tail", { x: 640, y: 552, w: 64, h: 64, path: "M0 0H64V16H48V32H32V48H16V64H0Z", fill: C.night, tweens: [popIn(0.05), ...bump(2 * b, 16), ...bump(3 * b, 16), leftOut(exitAt, 1)] });
      const word = txt.menu_name_1 ?? "삼각김밥";
      const id = text("word", { x: 600, y: 300, w: 780, h: 220, value: word, field: "menu_name_1", size: 128, color: C.night, shadow: false,
        tweens: [{ from: { opacity: 0 }, to: { opacity: 1 }, duration: 0.01, ease: "steps(1)", position: b * 0.5 }, ...bump(2 * b, 16), ...bump(3 * b, 16), leftOut(exitAt, 2)] });
      clips[id].animations.unshift({ type: "wipe", options: { duration: us(0.4), delay: us(b * 0.5), easing: "steps(6)" }, params: { direction: "right" } });
      // 말풍선은 글자 폭을 따라 넓어진다(가운데 기준). 너무 길면 글자가 줄어든다
      fitText(id, "horizontal", 1520);
      box("bubble", 560, 260, 860, 300, C.white, C.night, bubbleTw, { to: id, pad: 60 });
      clips[id].transform.zIndex = Math.min(69, z++);
      clips[key("tail")].transform.zIndex = Math.min(69, z++);
      const S = 10;
      sprite("bag", [...BAG, ...LEGS[0]], BAG_PAL, 470, 600, S, [popIn(0.1), ...bump(b, 24), ...bump(2 * b, 24), ...bump(3 * b, 24), leftOut(exitAt, 0)]);
      break;
    }
    case "point": {
      // 점수판이 countUp으로 굴러가다 3박에 멈추고 "COMBO!"가 찍힘 (큰 충격 2/3)
      hud("002900", "x2 BONUS", (t) => [zoomOut(t)]);
      box("panel", 360, 210, 1200, 460, C.night, C.coin, [popIn(0), zoomOut(exitAt)]);
      fitText(text("title", { x: 400, y: 250, w: 1120, h: 110, value: txt.promo_title ?? "1+1 위크", field: "promo_title", size: 72, color: C.sky, tweens: [blinkOn(0.12), zoomOut(exitAt, 1)] }), "fit");
      const id = text("price", { x: 400, y: 380, w: 1120, h: 240, value: txt.promo_price ?? "2,900원", field: "promo_price", size: 190, color: C.white, tweens: [blinkOn(0.2), ...bump(2 * b, 24), zoomOut(exitAt, 2)] });
      fitText(id, "fit");
      clips[id].animations.unshift({ type: "countUp", options: { duration: us(2 * b - 0.2), delay: us(0.2), easing: "steps(12)" }, params: { from: 0 } });
      shape("combo_bg", { x: 1310, y: 150, w: 400, h: 130, path: "M0 0H400V130H0Z", fill: C.red, angle: -8, tweens: [popIn(2 * b, 0.17), zoomOut(exitAt, 3)] });
      text("combo", { x: 1310, y: 150, w: 400, h: 130, value: "COMBO!", size: 64, color: C.white, tweens: [popIn(2 * b + 0.03, 0.17), zoomOut(exitAt, 3)] });
      clips[key("combo")].transform.angle = -8;
      [[280, 720], [420, 770], [1540, 740]].forEach(([x, y], i) =>
        sprite(`c${i}`, COIN, COIN_PAL, x, y, 10, [{ from: { y: 60 * sy, opacity: 0 }, to: { y: 0, opacity: 1 }, duration: 0.17, ease: "steps(3)", position: 2 * b + i / 30 }, ...bump(3 * b, 24), zoomOut(exitAt, i)]));
      break;
    }
    case "showcase": {
      // 인벤토리 칸 3개가 2·4·6박(1·3·5박 뒤)에 열리고 칸마다 이름·가격, 이후 박마다 아이콘이 통통
      hud("004200", "ITEM 3/3", (t) => [zoomOut(t)]);
      [0, 1, 2].forEach((i) => {
        const x = 200 + i * 540, t0 = (1 + 2 * i) * b;
        const hops = []; for (let k = 2 * i + 2; k < 8; k++) if (k * b < exitAt) hops.push(...bump(k * b, 16));
        box(`slot${i}`, x, 230, 460, 600, C.night, i === 1 ? C.coin : C.sky, [popIn(t0), zoomOut(exitAt, i)]);
        const [rows, pal] = ICONS[i];
        const s = 20, w = rows[0].length * s;
        sprite(`icon${i}`, rows, pal, x + 230 - w / 2, 300, s, [popIn(t0 + 0.1), ...hops, zoomOut(exitAt, i)]);
        // 카드 폭 안에서 줄을 바꾸고(최대 2줄 높이), 그래도 넘치면 글자를 줄인다
        text(`name${i}`, { x: x + 20, y: 505, w: 420, h: 150, value: txt[`menu_name_${i + 1}`] ?? ["바나나우유", "새우깡", "삼각김밥"][i], field: `menu_name_${i + 1}`, size: 58, color: C.white, tweens: [blinkOn(t0 + 0.17), zoomOut(exitAt, i)] });
        fitText(key(`name${i}`), "fit");
        text(`price${i}`, { x: x + 20, y: 670, w: 420, h: 90, value: txt[`menu_price_${i + 1}`] ?? ["1,700원", "1,500원", "1,200원"][i], field: `menu_price_${i + 1}`, size: 50, color: C.coin, tweens: [blinkOn(t0 + 0.23), zoomOut(exitAt, i)] });
        fitText(key(`price${i}`), "fit");
      });
      break;
    }
    case "detail": {
      // 시간 제한 바(HP 바) 10칸이 반 박마다 한 칸씩 줄고, 기간 한 줄
      hud("004200", "TIME 03");
      box("frame", 410, 380, 1100, 120, C.night, C.white, [popIn(0), ...blinkOut(exitAt)]);
      text("label", { x: 410, y: 290, w: 1100, h: 80, value: "TIME LIMIT", size: 48, color: C.red, tweens: [blinkOn(0.1), ...blinkOut(exitAt)] });
      for (let i = 0; i < 10; i++) {
        const goneAt = b + (9 - i) * (b / 2) * 0.6; // 1박부터 끝 칸부터 하나씩 꺼짐, 마지막 2칸은 남김
        const keep = i < 2;
        rect(`hp${i}`, 434 + i * 106, 404, 94, 72, i < 3 ? C.red : C.coin, [blinkOn(0.12 + i / 60), ...(keep || goneAt >= exitAt ? [] : [blinkOff(goneAt)]), ...blinkOut(exitAt)]);
      }
      fitText(text("period", { x: 410, y: 540, w: 1100, h: 100, value: txt.promo_period ?? "11.20 - 11.30", field: "promo_period", size: 72, color: C.white, tweens: [blinkOn(b * 0.5), ...bump(2 * b, 16), ...bump(3 * b, 16), ...blinkOut(exitAt)] }), "fit");
      break;
    }
    case "closing": {
      // STAGE CLEAR → 로고(1박) → 상호(2박) → 전화(3박) → CTA(3.5박), 드롭(4박)에 코인이 튀어 오름. 마지막 1.5초 이상 정지
      rect("sky", 0, 0, 1920, 1080, C.night, [blinkOn(0)]);
      // 별 40개는 색마다 path 하나로 (클립 수를 줄임)
      const stars = [[], []];
      for (let i = 0; i < 40; i++) stars[i % 5 ? 0 : 1].push(`M${(i * 337) % 1920} ${120 + ((i * 191) % 640)}h8v8h-8Z`);
      stars.forEach((d, i) => shape(`stars${i}`, { x: 0, y: 0, w: 1920, h: 1080, path: d.join(""), fill: i ? C.coin : C.white, tweens: [blinkOn(0.05 + i / 15)] }));
      ground(900);
      text("clear", { x: 360, y: 110, w: 1200, h: 130, value: "STAGE CLEAR", size: 96, color: C.coin, tweens: [blinkOn(0), ...blinkOut(0.3), blinkOn(0.5)] });
      const logo = key("logo");
      clips[logo] = {
        type: "Image", name: logo, src: P.logo ?? "assets/logo.png", field: "logo", timing: T(0, dur),
        transform: { x: Math.round(810 * sx), y: Math.round(280 * sy), width: Math.round(300 * sx), height: Math.round(120 * sy), angle: 0, opacity: 1, zIndex: Math.min(69, z++) },
        animations: gsap([popIn(b)]),
      };
      trackOf[logo] = "px_logo";
      fitText(text("name", { x: 360, y: 430, w: 1200, h: 150, value: txt.store_name ?? "픽셀마트", field: "store_name", size: 120, color: C.white, tweens: [popIn(2 * b), ...bump(4 * b, 16)] }), "horizontal", 1600);
      fitText(text("phone", { x: 560, y: 600, w: 800, h: 80, value: txt.phone ?? "02-123-4567", field: "phone", size: 52, color: C.sky, tweens: [blinkOn(3 * b)] }), "horizontal", 1400);
      const cta = fitText(text("cta", { x: 660, y: 720, w: 600, h: 90, value: txt.cta ?? "지금 방문하기", field: "cta", size: 54, color: C.white, tweens: [popIn(3.5 * b + 0.05)] }), "horizontal", 1200);
      box("ctabox", 660, 710, 600, 110, C.red, C.white, [popIn(3.5 * b)], { to: cta, pad: 56 });
      clips[cta].transform.zIndex = Math.min(69, z++);
      [[420, 790], [560, 820], [1300, 800], [1440, 780]].forEach(([x, y], i) =>
        sprite(`c${i}`, COIN, COIN_PAL, x, y, 10, [{ from: { y: 80 * sy, opacity: 0 }, to: { y: -40 * sy, opacity: 1 }, duration: 0.17, ease: "steps(3)", position: 4 * b + i / 30 }, { to: { y: 0 }, duration: 0.17, ease: "steps(3)" }]));
      break;
    }
    default: throw new Error(`pixel-arcade: scene "${P.scene}"를 모름`);
  }
  return { clips, trackOf };
};
