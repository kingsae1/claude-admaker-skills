---
name: audio-viz-bars
한 줄: 음악·목소리에 맞춰 이퀄라이저 막대가 튀고, 로고·앨범 주위로 원형 스펙트럼이 뻗고, 파형이 흔들린다
슬롯: 훅 | 주인공 | 엔드카드 (음악·팟캐스트·보이스 광고, 소재 위에 얹는 층)
에너지: 중–고 (소리 따라)
길이: 장면 내내(음악 구간)
검증: 엔진 3.0.30 브라우저 Exporter (프로젝트 파일 `samples/audio-viz`) · 수용 기준 `tests/audio-viz.test.mjs`
엔진: Shape(막대) + scaleY·x·y keyframes, 파형은 프레임마다 Shape(path) — `templates/audio-viz.mjs` `analyzeAudio`·`vizClips`. 앱 호환. ffmpeg 필요
---

## 의도
음원 광고·스트리밍 앱·팟캐스트·라디오 프로모션처럼 "소리"가 주인공일 때. 막대는 바닥에 붙어서 위로만 자라고(4% 최소 높이 → 100%), 원형은 안쪽 원에 붙어서 바깥으로만 뻗습니다. 소재(영상·사진) 위에 얹을 때는 화면 아래쪽 띠나 로고 둘레처럼 좁은 자리에 두고, 소재를 덮지 않게 합니다.

## 쓰는 법
```js
import { analyzeAudio, vizClips } from "./audio-viz.mjs";
const a = analyzeAudio("bgm.mp3", { fps: 30, bands: 24, smoothing: 0.5 }); // ffmpeg로 모노 44.1kHz 추출 후 분석
// 이퀄라이저 막대: 오디오 클립이 타임라인 2초에 있으면 at: 2
for (const c of vizClips(a, { style: "bars", box: { x: 140, y: 1500, width: 800, height: 220 }, color: ["#FFD23F", "#FF4F7B"], at: 2, keyFps: 15 })) add(c);
// 로고 둘레 원형 스펙트럼
for (const c of vizClips(a, { style: "radial", box: { x: 340, y: 560, width: 400, height: 400 }, color: "#7FE3FF", innerRadius: 0.5, at: 2, keyFps: 15 })) add(c);
// 파형 (프레임마다 path 클립 하나)
for (const c of vizClips(a, { style: "wave", box: { x: 90, y: 1760, width: 900, height: 120 }, color: "#ffffff", at: 2, keyFps: 15 })) add(c);
```
- `bands` 16–32가 광고에 알맞습니다(막대가 너무 가늘면 9:16에서 안 보임). 원형은 32–64.
- `smoothing` 0.5(기본)는 박자에 바로 반응, 0.7–0.8은 부드럽게 내려옴.
- `from`(초): 오디오의 어디서부터 보여줄지. 오디오를 잘라 쓴 경우 trim 시작과 같게.
- `keyFps`: 앱으로 보낼 때 막대 하나에 초당 키 수. 기본은 분석 fps(30). 앱이 무거우면 15 (구간 안 최대값으로 줄여서 짧은 타격이 사라지지 않음).
- 색 배열은 막대 순서(원형은 12시부터 시계방향)로 섞입니다.

## 주의
- 둥근 막대(`round`)는 scaleY로 늘었다 줄었다 해서 아주 낮을 때 끝이 납작해집니다. 거슬리면 `round: false` 또는 작은 숫자(px).
- 파형은 키프레임으로 path를 바꿀 수 없어서 1/keyFps초짜리 클립을 이어 붙입니다(15초 × 15 = 225개). 길면 막대·원형을 쓰세요.
- 엔진 2단계 클립 `AudioSpectrum`(엔진 다음 릴리스)이 나오면 로컬 렌더에서는 클립 하나로 같은 그림을 실시간으로 그립니다. 앱 가져오기는 이 1단계 방식이 계속 맞습니다.
