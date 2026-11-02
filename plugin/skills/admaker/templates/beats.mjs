// 비트 그리드: audio.analyzeBeats 결과(또는 BPM)를 광고 시각(초)으로 바꾼다. director.md §7
// analyzeBeats는 고정 그리드(firstBeatSec + n × beatSec)다. beats[] 배열은 개수 상한이 있으니 직접 쓰지 않는다.
// 박자가 없는 음악(bpm: null)은 2초 마디를 4등분한 0.5초를 한 박으로 쓴다.

/**
 * @param {object} a analyzeBeats 결과 { bpm, beatSec, firstBeatSec, bars, peaks, sections } (음원 기준 초)
 * @param {object} o { musicFrom: 광고에서 음악이 시작하는 초 (timeline.mjs musicPlacement().from), trimFrom: 음원 앞을 잘라 쓴 초, fps }
 */
export function gridFromAnalysis(a = {}, { musicFrom = 0, trimFrom = 0, fps = 30 } = {}) {
  const beatSec = a.beatSec ?? (a.bpm ? 60 / a.bpm : 0.5);
  const toAd = (srcSec) => musicFrom + srcSec - trimFrom; // 음원 시각 → 광고 시각
  // 광고 0초 이후의 첫 비트를 0박으로
  let origin = toAd(a.firstBeatSec ?? 0);
  while (origin - beatSec >= -1e-6) origin -= beatSec;
  while (origin < -1e-6) origin += beatSec;
  const snap = (sec) => Math.round(sec * fps) / fps;
  const at = (n) => snap(origin + n * beatSec);
  const indexOf = (sec) => Math.round((sec - origin) / beatSec);
  return {
    beatSec, origin, fps, at, indexOf,
    /** 초 → 가장 가까운 박의 시각 */
    snapToBeat: (sec) => at(indexOf(sec)),
    bars: (a.bars ?? []).map((b) => ({ ...b, startSec: toAd(b.startSec), endSec: toAd(b.endSec) })),
    peaks: (a.peaks ?? []).map((p) => ({ ...p, sec: toAd(p.sec) })),
    sections: (a.sections ?? []).map((s) => ({ ...s, startSec: toAd(s.startSec), endSec: toAd(s.endSec) })),
    hasBeat: !!(a.beatSec ?? a.bpm),
  };
}

/** 분석 없이 BPM만 알 때 (timeline.mjs 기본값) */
export const gridFromBpm = (bpm, { fps = 30, firstBeatSec = 0 } = {}) => gridFromAnalysis({ beatSec: 60 / bpm, firstBeatSec }, { fps });
