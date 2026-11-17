// 샤인 스윕 3종 샘플 — templates/effects.mjs sheenSweep (트랙 매트로 대상 모양 안에서만 지나감)
// node build.mjs                → project.json (앱 가져오기·렌더 하니스 공용)
// node build.mjs --fonts /fonts/ → 폰트를 렌더 하니스 render/fonts/에서 읽음 (CDN이 막힌 환경)
// 1) 박스 대상 glint: 주황 박스 + "한돈". 빛띠가 박스 밖으로 넘치지 않음
// 2) 글자 대상 glint: "MOTION" 글자 획 안에서만 흰 빛띠
// 3) 글자 대상 gradient: 색 띠가 글자를 물들이며 지나감
// 4) 글자 대상 chrome: 금속 결이 글자 안에서 계속 흐름
import fs from "node:fs";
import * as fx from "../../plugin/skills/admaker/templates/effects.mjs";
import { fontStyle } from "../../plugin/skills/admaker/templates/fonts.mjs";

const W = 1080, H = 1920, DUR = 4.5, FPS = 30;
const fontsAt = process.argv.includes("--fonts") ? process.argv[process.argv.indexOf("--fonts") + 1] : null;
const font = (weight) => {
  const { _weight, ...s } = fontStyle({ name: "Pretendard", weight });
  if (fontsAt) s.fontUrl = fontsAt + s.fontUrl.split("/").pop();
  return s;
};
const BLACK = font(900);

fx.resetIds();
const clips = {}, tracks = [];
let z = 1;
/** 뒤에 넣을수록 위. 렌더 하니스는 tracks 앞쪽이 위라 앞에 끼움 */
const add = (list) => { for (const c of [].concat(list)) { clips[c.id] = { ...c, transform: { ...c.transform, zIndex: z++ } }; tracks.unshift({ id: `t_${c.id}`, name: c.name, type: c.type, clipIds: [c.id] }); } };
const label = (y, str) => add(fx.text("label", str, 0, DUR, { x: 60, y, width: W - 120, height: 50 }, { ...BLACK, fontSize: 34, color: "#8A93A6", align: "left" }));

add(fx.shape("bg", "rectangle", 0, DUR, { x: 0, y: 0, width: W, height: H }, { fill: "#12161C" }));

// 1) 박스 대상 — 박스를 매트로 쓰면 박스 안 글자까지 함께 훑음
label(130, "1  glint · 박스 대상");
const box = fx.shape("box", "rectangle", 0, DUR, { x: 120, y: 200, width: 840, height: 300 }, { fill: "#F5B14C", radius: 10 });
add(box);
add(fx.text("box_text", "한돈 1+1", 0, DUR, { x: 120, y: 200, width: 840, height: 300 }, { ...BLACK, fontSize: 150, color: "#15110E" }));
add(fx.sheenSweep({ target: box, kind: "glint", at: 0.4, passes: 2, every: 2 }));

// 2) 글자 대상 glint
label(590, "2  glint · 글자 대상");
const t2 = fx.text("t_glint", "MOTION", 0, DUR, { x: 0, y: 650, width: W, height: 260 }, { ...BLACK, fontSize: 210, color: "#B9C0CC" });
add(t2);
add(fx.sheenSweep({ target: t2, kind: "glint", at: 0.6, passes: 2, every: 2 }));

// 3) 글자 대상 gradient (글자는 흰색, 띠가 보라→주황→크림으로 물들이며 지나감)
label(1010, "3  gradient · 글자 대상");
const t3 = fx.text("t_grad", "MOTION", 0, DUR, { x: 0, y: 1070, width: W, height: 260 }, { ...BLACK, fontSize: 210, color: "#EEF1F6" });
add(t3);
add(fx.sheenSweep({ target: t3, kind: "gradient", at: 0.3, passes: 2, every: 2.1 }));

// 4) 글자 대상 chrome (결이 처음부터 끝까지 흐름)
label(1430, "4  chrome · 글자 대상");
const t4 = fx.text("t_chrome", "MOTION", 0, DUR, { x: 0, y: 1490, width: W, height: 260 }, { ...BLACK, fontSize: 210, color: "#9098A8" });
add(t4);
add(fx.sheenSweep({ target: t4, kind: "chrome", at: 0, to: DUR, speed: 80 }));

const p = { settings: { width: W, height: H, fps: FPS, duration: fx.us(DUR), backgroundColor: "#12161C" }, tracks, clips, transitions: [] };
fs.writeFileSync(new URL("./project.json", import.meta.url), JSON.stringify(p, null, 1));
console.log(Object.keys(clips).length, "clips");
