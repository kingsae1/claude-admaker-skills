// 3D 코드 씬(Adapter three)은 앱 import에서 빠지므로 단독 영상으로 굽는다. 배경이 투명이라 그 아래 레이어(z < 3D)도 같이 굽고,
// project-app.json에서는 Adapter 자리를 그 영상(Video)으로 바꾼다. 위 레이어(글자·2D 도형)는 편집 가능한 그대로 남는다.
import fs from "node:fs";
const p = JSON.parse(fs.readFileSync("project.json", "utf8"));
const id = "m_scene", c = p.clips[id], { from, to } = c.timing.display, dur = to - from, z = c.transform.zIndex;
const keep = Object.entries(p.clips).filter(([k, x]) => k === id || (x.transform?.zIndex < z && x.timing.display.from < to && x.timing.display.to > from));
const bake = { settings: { ...p.settings, duration: dur }, transitions: [], clips: {}, tracks: [] };
for (const t of p.tracks) { const ids = t.clipIds.filter((k) => keep.some(([kk]) => kk === k)); if (ids.length) bake.tracks.push({ ...t, clipIds: ids }); }
for (const [k, x] of keep) {
  const y = structuredClone(x), a = Math.max(from, x.timing.display.from), b = Math.min(to, x.timing.display.to);
  y.timing = { ...y.timing, display: { from: a - from, to: b - from } }; // 0초 시작이라 잘린 뒤쪽만 영향
  bake.clips[k] = y;
}
fs.mkdirSync("bake", { recursive: true });
fs.writeFileSync("bake/morph3d.json", JSON.stringify(bake));
const app = structuredClone(p);
app.clips[id] = { type: "Video", name: "morph-3d-baked", src: "baked/morph3d.mp4", volume: 0,
  timing: { display: { from, to }, duration: dur, playbackRate: 1, trim: { from: 0, to: dur } }, transform: { ...c.transform }, animations: [] };
for (const t of app.tracks) if (t.clipIds.includes(id)) t.type = "Video";
fs.writeFileSync("project-app.json", JSON.stringify(app, null, 2));
console.log("bake/morph3d.json", keep.length, "clips");
