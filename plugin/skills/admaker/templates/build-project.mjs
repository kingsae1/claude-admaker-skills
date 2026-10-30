// timeline.mjs + brand.json → project.json (@admaker/engine ProjectJSON)
// 사용: node build-project.mjs [--size 1080x1920] [--out project.json] [--look off|light]
// 샷 함수는 shots/<card>.mjs 에 둔다: export default (ctx) => ({ clips: {...}, trackOf: {clipId: trackName} })
// 모션 기본형(entrance/exit/kenBurns/breathe/captionPages)은 motion.mjs 에서 import 한다.
import fs from "node:fs";
import path from "node:path";
import { FPS, DURATION, SHOTS, CAMERA, us } from "./timeline.mjs";
import { lookStack } from "./motion.mjs";

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, arr) => (v.startsWith("--") ? [...a, [v.slice(2), arr[i + 1]]] : a), []));
const [W, H] = (args.size ?? "1080x1920").split("x").map(Number);
const brand = JSON.parse(fs.readFileSync("brand.json", "utf8"));

const project = {
  settings: { width: W, height: H, fps: FPS, duration: us(DURATION), backgroundColor: brand.colors?.background ?? "#000000" },
  tracks: [],
  clips: {},
  transitions: [],
};

const tracks = new Map();
const addClip = (id, clip, trackName, type) => {
  if (project.clips[id]) throw new Error(`clip id 중복: ${id}`);
  project.clips[id] = clip;
  if (!tracks.has(trackName)) tracks.set(trackName, { id: `t_${trackName}`, name: trackName, type, clipIds: [] });
  tracks.get(trackName).clipIds.push(id);
};

/** 장면 카메라를 keyframes 오프셋으로 변환. 월드→스크린 함수는 이것 하나만 쓴다. */
export function cameraKeyframes(section, clip, clipFromSec) {
  const keys = CAMERA[section];
  if (!keys?.length) return null;
  const cx0 = clip.transform.x + clip.transform.width / 2;
  const cy0 = clip.transform.y + clip.transform.height / 2;
  const dur = keys.at(-1).t - keys[0].t;
  const params = {};
  for (const k of keys) {
    // screen = (world − camera) × zoom + center → 클립 중심의 이동량을 오프셋으로
    // 주의: 엔진 scale의 기준점(클립 중심인지 좌상단인지)을 엔진 버전에서 확인하고, 좌상단이면 오프셋을 보정한다
    const sx = (cx0 - k.cx) * k.zoom + W / 2;
    const sy = (cy0 - k.cy) * k.zoom + H / 2;
    const pct = dur > 0 ? `${(((k.t - keys[0].t) / dur) * 100).toFixed(2)}%` : "0%";
    params[pct] = { x: sx - cx0, y: sy - cy0, scale: k.zoom, ...(k.easing ? { easing: k.easing } : {}) };
  }
  return { type: "keyframes", options: { duration: us(dur), delay: us(Math.max(0, keys[0].t - clipFromSec)), easing: "linear" }, params };
}

// 룩 스택 (aesthetic-rules Q11): 배경(z 0), 그레이드(z 90–91), 그레인(z 95), 비네트(z 99). 샷 클립은 z 10–49에 둔다.
if (args.look !== "off") {
  const look = lookStack({ W, H, duration: DURATION, brand, dark: args.look !== "light" });
  for (const [id, clip] of Object.entries(look.clips)) addClip(id, clip, look.trackOf[id], clip.type);
}

for (const [shotIndex, shot] of SHOTS.entries()) {
  const mod = await import(path.resolve("shots", `${shot.card}.mjs`));
  const out = mod.default({ shot, shotIndex, brand, W, H, FPS, us });
  for (const [id, clip] of Object.entries(out.clips)) {
    const cam = cameraKeyframes(shot.section, clip, shot.from);
    if (cam && clip.transform) clip.animations = [...(clip.animations ?? []), cam];
    addClip(id, clip, out.trackOf?.[id] ?? shot.section, clip.type);
  }
}

project.tracks = [...tracks.values()];
fs.writeFileSync(args.out ?? "project.json", JSON.stringify(project, null, 2));
console.log(`project.json: ${Object.keys(project.clips).length} clips, ${W}x${H}, ${DURATION}s`);
