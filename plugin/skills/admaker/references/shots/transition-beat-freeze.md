---
name: transition-beat-freeze
한 줄: 박에 앞 소재가 정지 프레임으로 바뀌며 번쩍·살짝 당겨지고, 테두리·라벨이 박힌 채 멈췄다가 다음 박에 하드 컷
슬롯: 전환
에너지: 최고
길이: 1–2박 (정지 구간)
엔진: Image 정지 프레임(`kenBurns: false`) + keyframes(scale), Shape 번쩍·테두리, Text 라벨. `templates/shots/transition-beat-freeze.mjs`
검증: 엔진 3.0.19, 브라우저 Exporter mp4 (`samples/seams`)
---

## 의도
음악 중심 몽타주에서 한 컷을 "박제"해 강조합니다. 빠르게 넘기던 흐름이 박 하나에서 딱 멈추고, 다음 박에서 다시 달립니다. `presets/fast-montage.mjs`의 몽타주 블록 중 한 곳, 또는 드롭 직후에 씁니다.

## 동작 핵심
- 박 `at`: 앞 영상이 끝나고 같은 순간의 정지 프레임(Image)이 이어짐. 2프레임 흰 번쩍(화면 전체 충격, `BIG_HITS`에 넣음).
- 정지 프레임은 0.1초에 1 → 1.06으로 당겨지고 멈춤(`easeOutExpo`).
- 다음 프레임에 테두리(브랜드 강조색, 10px, 36px 안쪽)가 1.04 → 1로 박히고, 라벨이 있으면 기울어진 채 튀어 들어옴.
- 다음 박 `cut`: 하드 컷.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| hold (`cut − at`) | 1–2박 | 2박 넘으면 흐름이 끊김 |
| punch | 1.06 | 1.1 넘으면 화질이 무너짐 |
| label | 2–6자 | 길면 정지 화면이 아니라 자막이 됨 |

## 정지 프레임 만들기
엔진은 영상을 한 프레임에 멈추는 기능이 없어서, 그 순간을 이미지로 뽑아 이어 붙입니다.

```sh
# 앞 소재의 at 순간 = trimFrom + (at − 소재 from)
ffmpeg -ss <초> -i assets/clip.mp4 -frames:v 1 assets/clip_freeze.png
```

FOOTAGE: `{ src: "assets/clip_freeze.png", type: "Image", from: at, to: cut, size: [w, h], kenBurns: false }`. 앞 소재 `to = at`, 다음 소재 `from = cut`.

## 사운드
박에 짧은 임팩트 + 카메라 셔터 같은 tick. 정지 구간에 음악이 비는 곳이면 더 좋습니다.

## 알려진 함정
- 영상 속도 램프(멈추기 직전 빨라짐)는 엔진에 시간 곡선이 없어서 못 합니다. 앞 소재를 2배속 구간으로 따로 자르는 것은 앱 소재 편집에서 합니다.
- `kenBurns: false`를 빼면 정지 프레임이 천천히 움직여 "멈춤"이 안 됩니다. 샷이 에러를 냅니다.
- 번쩍은 화면 전체 충격이라 R4(광고당 3번 이하)에 셉니다.

## 참조 구현
`templates/shots/transition-beat-freeze.mjs`. `props`: `{ at, cut, still, color?, label?, font? }`.
