import fs from "node:fs";
import opentype from "opentype.js";
import { handwriting } from "./motion.mjs";
import { fontStyle } from "./fonts.mjs";
import { textToPath } from "./draw.mjs";
const us = (s) => Math.round(s * 1e6);
const W = 1080, H = 1920, DUR = 5;
const tm = (a, b) => ({ display: { from: us(a), to: us(b) }, duration: us(b - a), playbackRate: 1 });
const shadow = { color: "#000000", alpha: 0.45, blur: 10, offsetX: 0, offsetY: 3 };

// A) Text + handwrite_in + lineBoil
const hw = handwriting(DUR);
// 앱 export와 같이 text_segment 렌더러로 그림 (엔진 Exporter의 Text 클립은 characterAnimation을 그리지 않음)
const ko = { type: "Adapter", adapter: "script", src: "script", name: "hand_ko", timing: tm(0, DUR),
  transform: { x: 60, y: 620, width: 960, height: 240, angle: 0, opacity: 1, zIndex: 20 },
  params: { name: "text-segment", text: "오늘도 수고했어요", duration: DUR,
    transform: { fontName: "Nanum Pen Script", fontSize: 170, color: "#FFF6E8", align: "center", verticalAlign: "center", opacity: 1,
      characterAnimation: hw.characterAnimation } },
  animations: hw.animations };

// B) text_to_path → stroke + strokeDraw + lineBoil
const font = opentype.parse(fs.readFileSync("fonts/caveat.ttf").buffer.slice(0));
const t = textToPath(font, "thank you", { fontSize: 230, align: "center" });
const pw = t.width + 8, ph = t.height + 8;
const en = { type: "Shape", name: "hand_en", src: "shape", shapeType: "path", timing: tm(1.6, DUR),
  transform: { x: (W - pw) / 2, y: 980, width: pw, height: ph, angle: -4, opacity: 1, zIndex: 21 },
  style: { path: t.path, viewBox: t.viewBox, fill: "#FFC857", fillOpacity: 1, stroke: { color: "#FFC857", width: 5 } },
  animations: [
    { type: "strokeDraw", options: { duration: us(1.8), delay: 0, easing: "easeInOutSine" }, params: { fill: "after" } },
    { type: "lineBoil", options: { duration: us(DUR - 1.6), delay: 0, easing: "linear" }, params: { amount: 3, scale: 14, fps: 10, variants: 3 } }] };

const bg = { type: "Image", name: "footage", src: "data:image/jpeg;base64," + fs.readFileSync("bg.jpg").toString("base64"), timing: tm(0, DUR),
  transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 0 }, animations: [] };

const clips = { footage: bg, hand_ko: ko, hand_en: en };
const project = { settings: { width: W, height: H, fps: 30, duration: us(DUR), backgroundColor: "#000000" },
  tracks: [{ id: "t_bg", name: "footage", type: "Image", clipIds: ["footage"] }, { id: "t_ko", name: "ko", type: "Adapter", clipIds: ["hand_ko"] }, { id: "t_en", name: "en", type: "Shape", clipIds: ["hand_en"] }],
  transitions: [], clips };
fs.writeFileSync("project.json", JSON.stringify(project));
console.log("ok", t.viewBox, pw, ph);
