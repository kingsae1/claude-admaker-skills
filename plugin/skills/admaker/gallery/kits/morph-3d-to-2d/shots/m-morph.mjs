// 3D 변신 구간: 전면 three 씬(morph-shapes, 투명 배경) + 단계마다 바뀌는 큰 단어 · 번호 · 이름 · 진행 막대 · 머리 라벨.
// 큰 단어는 3D 뒤(z 15), 나머지 글자는 앞(z 40). 단계 글자는 변신 중간(배경 와이프와 같은 때)에 끊어 바꾼다.
import { T, text, shape, gsap, wipe } from "./_m.mjs";

export default ({ shot, brand, W, H, us }) => {
  const P = shot.props, t = T(us), F = brand.fonts, clips = {}, trackOf = {};
  const S = P.stages, end = P.end;
  clips.m_scene = { type: "Adapter", name: "morph-3d", adapter: "three", src: "three",
    params: { scene: "morph-shapes", morphs: P.morphs, colors: S.slice(0, 4).map((s) => s.obj), flat: S[4].obj, intro: 0.6 },
    timing: t(0, end), transform: { x: 0, y: 0, width: W, height: H, angle: 0, opacity: 1, zIndex: 25 }, animations: [] };
  trackOf.m_scene = "morph3d";

  const rise = (d = 90, pos = 0, dur = 0.5) => gsap([{ from: { y: d }, to: { y: 0 }, duration: dur, ease: "expo.out", position: pos }]);
  S.forEach((s, i) => {
    const a = i ? s.from + 0.2 : 0.15, b = i < S.length - 1 ? S[i + 1].from + 0.2 : P.handoff;
    const wb = i < S.length - 1 ? b : P.wordEnd ?? b;
    // 큰 단어: 아래에서 마스크 와이프 + 상승
    clips[`m_word${i}`] = text(s.word, { font: F.display, size: 196, color: s.wordColor, y: 236, h: 250, z: 15, timing: t(a, wb), name: `word-${s.word}`, letterSpacing: -6,
      animations: [wipe(us, 0.35, "up"), rise(140, 0, 0.55)] });
    trackOf[`m_word${i}`] = "bigWord";
    // 아래 번호 + 이름
    const by = 1500;
    clips[`m_no${i}`] = text(s.no, { font: F.display, size: 132, color: s.ink, x: 70, w: 300, y: by, h: 170, align: "left", z: 40, timing: t(a, b), name: `no-${s.no}`, letterSpacing: -4,
      animations: [wipe(us, 0.3, "up"), rise(60, 0.05, 0.45)] });
    clips[`m_kr${i}`] = text(s.kr, { font: F.kr, size: 72, color: s.ink, x: 400, w: 610, y: by + 8, h: 90, align: "right", z: 40, timing: t(a, b), name: `kr-${s.no}`,
      animations: [wipe(us, 0.3, "up"), rise(50, 0.1, 0.45)] });
    clips[`m_en${i}`] = text(s.en, { font: F.label, size: 34, color: s.ink, x: 400, w: 610, y: by + 100, h: 50, align: "right", z: 40, timing: t(a, b), name: `en-${s.no}`, letterSpacing: 4,
      animations: [gsap([{ from: { opacity: 0, x: 40 }, to: { opacity: 1, x: 0 }, duration: 0.4, ease: "expo.out", position: 0.15 }])] });
    trackOf[`m_no${i}`] = "stageNo"; trackOf[`m_kr${i}`] = "stageKr"; trackOf[`m_en${i}`] = "stageEn";
    // 머리 라벨 (색만 단계마다)
    clips[`m_hl${i}`] = text("MORPH / STUDY", { font: F.label, size: 32, color: s.ink, x: 70, w: 500, y: 96, h: 60, align: "left", z: 40, timing: t(i ? a : 0.2, b), name: "head-left", letterSpacing: 6,
      animations: i ? [] : [gsap([{ from: { opacity: 0, x: -30 }, to: { opacity: 1, x: 0 }, duration: 0.45, ease: "expo.out", position: 0 }])] });
    clips[`m_hr${i}`] = text("3D → 2D", { font: F.label, size: 32, color: s.ink, x: 510, w: 500, y: 96, h: 60, align: "right", z: 40, timing: t(i ? a : 0.25, b), name: "head-right", letterSpacing: 6,
      animations: i ? [] : [gsap([{ from: { opacity: 0, x: 30 }, to: { opacity: 1, x: 0 }, duration: 0.45, ease: "expo.out", position: 0 }])] });
    clips[`m_rule${i}`] = shape({ x: 70, y: 172, w: 940, h: 4, fill: s.ink, z: 40, timing: t(i ? a : 0.3, b), name: "head-rule", animations: i ? [] : [wipe(us, 0.6, "right", "easeInOutExpo")] });
    trackOf[`m_hl${i}`] = "headL"; trackOf[`m_hr${i}`] = "headR"; trackOf[`m_rule${i}`] = "headRule";
    // 진행 막대: 5칸, 지금 단계까지 채움 (지금 칸은 왼→오 와이프)
    const segW = 172, gap = 20, y = 1760;
    for (let k = 0; k < S.length; k++) {
      const x = 70 + k * (segW + gap), on = k <= i;
      clips[`m_bar${i}_${k}`] = shape({ x, y, w: segW, h: 10, fill: s.ink, z: 40, timing: t(i ? a : 0.3, b), name: `bar-${k}`,
        style: { borderRadius: 5 }, animations: k === i ? [wipe(us, 0.5, "right", "easeInOutExpo")] : [] });
      if (!on) { clips[`m_bar${i}_${k}`].transform.opacity = 0.22; clips[`m_bar${i}_${k}`].animations = []; }
      trackOf[`m_bar${i}_${k}`] = `bar${k}`;
    }
  });
  return { clips, trackOf };
};
