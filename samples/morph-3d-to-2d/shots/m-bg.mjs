// 단계별 단색 배경. 다음 배경이 와이프로 들어오는 동안 앞 배경을 와이프 길이만큼 늘이고 단계마다 트랙을 나눈다.
import { T, shape, wipe } from "./_m.mjs";
export default ({ shot, W, H, us }) => {
  const t = T(us), clips = {}, trackOf = {}, S = shot.props.scenes;
  S.forEach((s, i) => {
    const next = S[i + 1], to = next?.wipe ? next.from + next.wipe.dur : s.to;
    clips[`bg${i}`] = shape({ x: 0, y: 0, w: W, h: H, fill: s.color, z: 5, timing: t(s.from, to), name: `bg-${i}`,
      animations: s.wipe ? [wipe(us, s.wipe.dur, s.wipe.dir, "easeInOutExpo")] : [] });
    trackOf[`bg${i}`] = `bg${i}`;
  });
  return { clips, trackOf };
};
