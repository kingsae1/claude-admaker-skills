// 영상 이펙트 39종 샘플 — 카테고리마다 프로젝트 하나 (templates/effects.mjs)
// node build.mjs                → out/<카테고리>.json 6개 (렌더 하니스용: 영상은 /move.mp4 …, render/ 안의 파일)
// node build.mjs --only overlay → 하나만
// 인물·배경은 SVG 자리표시(투명 배경 누끼 PNG 자리)입니다. 실제 광고에서는 removeBackground·separateLayers 결과 PNG를 씁니다.
import fs from "node:fs";
import * as fx from "../../plugin/skills/admaker/templates/effects.mjs";

const W = 1080, H = 1920, FPS = 30;
const PREFIX = process.env.FOOTAGE_PREFIX ?? "/";
const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
const svg = (w, h, body, defs = "") => fx.svgUrl(w, h, body, defs);

// ── 자리표시 소재
// 인물 누끼(투명 배경). 머리 원 가운데 = 캔버스 (540, 1200), 반지름 150
const SUBJECT_BOX = { x: 190, y: 860, width: 700, height: 1060 };
const HEAD = { cx: 540, cy: 1200, r: 150 };
const subjectSrc = svg(700, 1060, `
<path d="M40 1060 C 40 800 150 690 350 690 C 550 690 660 800 660 1060 Z" fill="url(#shirt)"/>
<path d="M296 470 L404 470 L420 720 Q350 760 280 720 Z" fill="#E8B48F"/>
<path d="M350 690 L300 760 L350 1060 L400 760 Z" fill="#F4F1EA" opacity="0.9"/>
<g transform="translate(0 140)"><ellipse cx="350" cy="200" rx="150" ry="170" fill="#F2C4A0"/>
<path d="M195 210 C 180 60 290 20 360 24 C 470 28 530 110 505 230 C 490 160 440 120 350 118 C 260 118 215 160 195 210 Z" fill="#2A1C14"/>
<ellipse cx="295" cy="215" rx="13" ry="17" fill="#2A1C14"/><ellipse cx="405" cy="215" rx="13" ry="17" fill="#2A1C14"/>
<path d="M300 290 Q350 330 400 290" stroke="#B5583B" stroke-width="12" fill="none" stroke-linecap="round"/>
<ellipse cx="262" cy="262" rx="22" ry="12" fill="#F49B8C" opacity="0.6"/><ellipse cx="438" cy="262" rx="22" ry="12" fill="#F49B8C" opacity="0.6"/></g>`,
`<linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B6B"/><stop offset="1" stop-color="#C0392B"/></linearGradient>`);
const subject = { src: subjectSrc, box: SUBJECT_BOX };
// 배경(인물 없는 장면)
const roomBody = `<rect width="${W}" height="${H}" fill="url(#bg)"/>
${Array.from({ length: 18 }, (_, i) => `<circle cx="${(i * 233) % W}" cy="${200 + ((i * 397) % 1100)}" r="${40 + (i % 4) * 26}" fill="#FFE8B0" opacity="${0.08 + (i % 3) * 0.05}"/>`).join("")}
<rect x="0" y="1500" width="${W}" height="420" fill="#3B2A22" opacity="0.55"/>`;
const roomDefs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#46516B"/><stop offset="0.6" stop-color="#8A6E5C"/><stop offset="1" stop-color="#5A4136"/></linearGradient>`;
const room = { type: "Image", src: svg(W, H, roomBody, roomDefs) };
const darkRoom = { type: "Image", src: svg(W, H, `<rect width="${W}" height="${H}" fill="url(#bg)"/>`, `<radialGradient id="bg" cx="0.5" cy="0.4" r="0.8"><stop offset="0" stop-color="#2B2D5A"/><stop offset="1" stop-color="#0B0B1A"/></radialGradient>`) };
// 사진 한 장(배경 + 인물) — 얼굴 추적·프레임 탈출·분할에 원본 사진 자리로 씀
const photo = { type: "Image", src: svg(W, H, roomBody + `<image href="${subjectSrc}" x="${SUBJECT_BOX.x}" y="${SUBJECT_BOX.y}" width="${SUBJECT_BOX.width}" height="${SUBJECT_BOX.height}"/>`, roomDefs) };
const product = (c1, c2, label) => ({ type: "Image", src: svg(W, H, `<rect width="${W}" height="${H}" fill="url(#g)"/><circle cx="540" cy="900" r="300" fill="#FFFFFF" opacity="0.92"/><rect x="390" y="700" width="300" height="420" rx="60" fill="${c2}"/><text x="540" y="960" font-family="sans-serif" font-weight="900" font-size="90" text-anchor="middle" fill="#FFFFFF">${label}</text>`, `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`) });
const P1 = product("#FFB347", "#FF6A1A", "A"), P2 = product("#7FD1FF", "#2F6BFF", "B"), P3 = product("#9EE493", "#1E9E5A", "C"), P4 = product("#E0B3FF", "#7C3AED", "D");
const move = { type: "Video", src: `${PREFIX}move.mp4`, trimFrom: 0 }, move2 = { type: "Video", src: `${PREFIX}move2.mp4`, trimFrom: 0 };

// ── 프로젝트 조립
function project(name, dur) {
  fx.resetIds();
  const clips = {}, tracks = [];
  let z = 1;
  const add = (list) => { for (const c of [].concat(list)) { clips[c.id] = { ...c, transform: { ...c.transform, zIndex: z++ } }; tracks.unshift({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] }); } };
  const caption = (from, to, label) => add(fx.text("caption", label, from, to, { x: 0, y: 60, width: W, height: 80 }, { ...fx.FONT.bold(), fontWeight: "400", fontSize: 40, color: "#FFFFFF", shadow: { color: "#000000", alpha: 0.6, blur: 10 } }));
  const save = () => {
    const p = { settings: { width: W, height: H, fps: FPS, duration: fx.us(dur), backgroundColor: "#000000" }, tracks, clips, transitions: [] };
    fs.mkdirSync(new URL("./out/", import.meta.url), { recursive: true });
    fs.writeFileSync(new URL(`./out/${name}.json`, import.meta.url), JSON.stringify(p));
    console.log(name, Object.keys(clips).length, "clips", dur + "s");
  };
  return { add, caption, save, clips };
}
const S = (from, to) => fx.scene("bg", room, from, to, { x: 0, y: 0, width: W, height: H });

const builds = {
  // 1. 인물 뒤 공간 (7)
  behind() {
    const d = 2.6, P = project("behind", d * 7);
    const steps = [
      ["시계 다이얼", (a, b) => fx.clockDial({ from: a, to: b, subject })],
      ["거대 글자", (a, b) => fx.giantType({ from: a, to: b, subject, text: "SALE", y: 640 })],
      ["게시물 벽", (a, b) => fx.postWall({ from: a, to: b, subject })],
      ["궤도 링", (a, b) => fx.orbitRing({ from: a, to: b, subject, center: { x: 540, y: 1560 } })],
      ["숫자 카운트", (a, b) => fx.countUpBehind({ from: a, to: b, subject, value: 12000, y: 820 })],
      ["차트 상승", (a, b) => fx.chartRise({ from: a, to: b, subject })],
      ["무한 터널", (a, b) => fx.infiniteTunnel({ from: a, to: b, subject })],
    ];
    steps.forEach(([label, make], i) => { const a = i * d, b = a + d; P.add(fx.scene("bg", i === 2 || i === 6 ? darkRoom : room, a, b, { x: 0, y: 0, width: W, height: H })); P.add(make(a, b)); P.caption(a, b, `${i + 1}. ${label}`); });
    P.save();
  },
  // 2. 인물 변형 (11)
  transform() {
    const d = 2.4, P = project("transform", d * 11);
    let i = 0;
    const step = (label, fn, bg = room) => { const a = i * d, b = a + d; if (bg) P.add(fx.scene("bg", bg, a, b, { x: 0, y: 0, width: W, height: H })); P.add(fn(a, b)); P.caption(a, b, `${i + 1}. ${label}`); i++; };
    step("분신 줄세우기", (a, b) => fx.cloneLineup({ from: a, to: b, subject }));
    step("머리 쌓기", (a, b) => fx.headStack({ from: a, to: b, subject, head: HEAD, count: 3 }));
    step("코드 인간", (a, b) => fx.codeHuman({ from: a, to: b, subject }), darkRoom);
    step("아스키 인간", (a, b) => fx.asciiHuman({ from: a, to: b, subject }), darkRoom);
    step("네온 윤곽선", (a, b) => fx.neonOutline({ from: a, to: b, subject }), darkRoom);
    step("스티커 팝", (a, b) => fx.stickerPop({ from: a, to: b, subject }), P3);
    step("망점 인쇄", (a, b) => { const c = fx.scene("halftone_src", photo, a, b, { x: 0, y: 0, width: W, height: H }); return [c, ...fx.halftonePrint({ target: c, from: a, to: b })]; }, null);
    step("지폐 초상", (a, b) => fx.banknotePortrait({ from: a, to: b, subject }), darkRoom);
    step("컬러 분리", (a, b) => { const c = fx.scene("split_src", move, a, b, { x: 0, y: 0, width: W, height: H }); fx.colorSplit({ target: c, at: a + 0.3, dur: 1.6 }); return [c]; }, null);
    step("잔상 트레일", (a, b) => fx.echoTrail({ from: a, to: b, spec: { ...move, trimFrom: 1 }, box: { x: 0, y: 0, width: W, height: H }, count: 4, lag: 0.12 }), null);
    step("프레임 탈출", (a, b) => fx.frameEscape({ from: a, to: b, spec: photo, subject, frame: { x: 160, y: 1120, width: 760, height: 760 } }), null);
    P.save();
  },
  // 3. 얼굴 추적 (3) — 고정 위치 + 손으로 준 경로
  face() {
    const d = 3, P = project("face", d * 3);
    const head = { x: HEAD.cx, y: HEAD.cy };
    for (let i = 0; i < 3; i++) {
      const a = i * d, b = a + d;
      // 인물이 살짝 움직이는 사진(추적 경로와 같은 오프셋)
      const sway = [[a, 0, 0], [a + 1, -30, 10], [a + 2, 20, -6], [b, 0, 0]];
      const base = fx.scene("photo", photo, a, b, { x: 0, y: 0, width: W, height: H }, { animations: [fx.keys(a, b, sway.map(([t, x, y]) => [t, { x, y }, "easeInOutSine"]))] });
      P.add(base);
      const track = sway.map(([t, x, y]) => [t, head.x + x, head.y + y]);
      if (i === 0) P.add(fx.headLabel({ from: a, to: b, track, head }));
      if (i === 1) P.add(fx.faceScan({ from: a, to: b, track, face: { x: head.x, y: head.y, w: 360, h: 420 } }));
      if (i === 2) P.add(fx.emojiReact({ from: a, to: b, anchor: { x: head.x + 230, y: head.y + 40 } }));
      P.caption(a, b, `${i + 1}. ${["머리 위 라벨", "얼굴 스캔", "이모지 반응"][i]}`);
    }
    P.save();
  },
  // 4. 화면 오버레이 (8)
  overlay() {
    const d = 3, P = project("overlay", d * 8);
    let i = 0;
    const step = (label, fn, bg = photo) => { const a = i * d, b = a + d; P.add(fx.scene("bg", bg, a, b, { x: 0, y: 0, width: W, height: H })); P.add(fn(a, b)); P.caption(a, b, `${i + 1}. ${label}`); i++; };
    step("창 팝업", (a, b) => fx.windowPopup({ from: a, to: b, windows: [
      { title: "알림", body: "오늘만 50% 할인", box: { x: 90, y: 360, width: 720, height: 360 } },
      { title: "쿠폰", body: "첫 구매 쿠폰 도착", box: { x: 210, y: 640, width: 720, height: 360 } },
      { title: "주문", body: "주문이 접수되었습니다", box: { x: 150, y: 920, width: 780, height: 360 } }] }));
    step("댓글 폭포", (a, b) => fx.commentWaterfall({ from: a, to: b, comments: [{ name: "민지", text: "이거 어디서 사요?" }, { name: "준호", text: "벌써 세 번째 주문" }, { name: "하늘", text: "색감 미쳤다" }, { name: "도윤", text: "링크 주세요!!" }, { name: "서아", text: "선물용으로 딱" }] }));
    step("손글씨 낙서", (a, b) => fx.handDoodle({ from: a, to: b, marks: [
      { kind: "circle", target: { x: 360, y: 900, width: 360, height: 400 }, at: a + 0.2 },
      { kind: "arrow", target: { x: 640, y: 560, width: 300, height: 260 }, at: a + 0.8 },
      { kind: "star", target: { x: 120, y: 520, width: 200, height: 200 }, at: a + 1.3, color: "#FFE14D" },
      { kind: "underline", target: { x: 200, y: 1560, width: 680, height: 60 }, at: a + 1.7 }] }));
    step("라이브 커서", (a, b) => fx.liveCursor({ from: a, to: b, path: [[a + 0.2, 160, 500], [a + 0.9, 600, 760], [a + 1.6, 520, 1180], [a + 2.4, 820, 1500]], clicks: [a + 1.0, a + 1.7] }));
    step("예측 키보드", (a, b) => fx.predictiveKeyboard({ from: a, to: b }));
    step("터미널 타이핑", (a, b) => fx.terminalTyping({ from: a, to: b, lines: [{ cmd: "npm run ad", out: "> rendering 15s..." }, { cmd: "deploy --now", out: ["✓ done in 2.1s"] }] }), darkRoom);
    step("알림 폭탄", (a, b) => fx.notificationBomb({ from: a, to: b, items: [
      { app: "쇼핑", title: "주문 폭주 중!", body: "재고 12개 남음", color: "#FF3B5C" }, { app: "메시지", title: "엄마", body: "이거 나도 사줘", color: "#28C840" },
      { app: "배송", title: "오늘 도착", body: "문 앞에 두었어요", color: "#2F6BFF" }, { app: "쿠폰", title: "3,000원 쿠폰", body: "오늘 자정까지", color: "#FF9F1C" }] }));
    step("뉴스 속보", (a, b) => fx.breakingNews({ from: a, to: b, headline: "동네 카페 신메뉴 출시", ticker: "오늘 오전 10시 오픈 · 선착순 100명 1+1 · 매장 앞 줄 서기 시작 · " }));
    P.save();
  },
  // 5. 전환·임팩트 (6)
  impact() {
    const P = project("impact", 18.6);
    const full = { x: 0, y: 0, width: W, height: H };
    // 1 만화 임팩트 (0–3)
    const c1 = fx.scene("impact_src", P1, 0, 3, full); const imp = fx.comicImpact({ at: 1.0, target: c1, word: "쾅!" }); P.add(c1); P.add(imp); // 효과를 붙인 뒤 add (add는 복사) P.caption(0, 3, "1. 만화 임팩트");
    // 2 칼날 베기 (3–6): A(3–4.2) → 베기 → B
    P.add(fx.scene("a", P2, 3, 4.2, full)); P.add(fx.bladeSlash({ at: 4.2, fromSpec: P2, toSpec: P3, endTo: 6 })); P.caption(3, 6, "2. 칼날 베기");
    // 3 종이 찢기 (6–9)
    P.add(fx.scene("a", P3, 6, 7.2, full)); P.add(fx.paperTear({ at: 7.2, fromSpec: P3, toSpec: P4, endTo: 9 })); P.caption(6, 9, "3. 종이 찢기");
    // 4 글자 다이브 (9–12)
    P.add(fx.scene("a", P4, 9, 11.2, full)); P.add(fx.letterDive({ from: 9, to: 11.2, word: "IN", point: { x: 395, y: 1150 }, toSpec: P1, endTo: 12 })); P.caption(9, 12, "4. 글자 다이브");
    // 5 글리치 (12–15)
    const c5 = fx.scene("glitch_src", move, 12, 15, full); const gl = fx.glitch({ at: 13, dur: 0.6, target: c5, spec: { ...move, trimFrom: 0 } }); P.add(c5); P.add(gl); P.caption(12, 15, "5. 글리치");
    // 6 화면 분할 (15–18.6)
    P.add(fx.splitScreen({ from: 15, to: 18.6, specs: [P1, move2, P3, P2] })); P.caption(15, 18.6, "6. 화면 분할");
    P.save();
  },
  // 6. 카메라 (4)
  camera() {
    const P = project("camera", 13.2);
    const full = { x: 0, y: 0, width: W, height: H };
    P.add(fx.dollyZoom({ from: 0, to: 3, bgSpec: room, subject, direction: "in" })); P.caption(0, 3, "1. 돌리 줌");
    const bg = fx.scene("focus_bg", room, 3, 6, full), fg = fx.scene("focus_fg", { type: "Image", src: subject.src }, 3, 6, subject.box);
    fx.rackFocus({ at: 4.2, fg, bg, toBack: true }); P.add([bg, fg]); P.caption(3, 6, "2. 초점 이동");
    P.add(fx.freezeZoom({ from: 6, at: 7, hold: 1.6, to: 9.6, spec: { ...move, trimFrom: 1 }, frameSrc: `${PREFIX}move_freeze.png`, point: { x: 260, y: 1060 }, label: "바로 이 순간" })); P.caption(6, 9.6, "3. 프리즈 줌");
    const ramp = fx.speedRamp({ from: 9.6, spec: { ...move2, trimFrom: 0 }, box: full, ramp: [[0.6, 1], ...fx.rampSegments(1, 0.3, 0.45, 3), ...fx.rampSegments(0.3, 2.5, 1.5, 4)] });
    P.add(ramp); P.caption(9.6, ramp.end, "4. 스피드 램프");
    console.log("speed ramp end", ramp.end.toFixed(2));
    P.save();
  },
};
for (const [k, fn] of Object.entries(builds)) if (!only || only === k) fn();
