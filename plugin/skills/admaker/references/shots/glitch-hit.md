---
name: glitch-hit
한 줄: 박 위 2–4프레임 동안 화면이 가로 조각으로 찢어지고 RGB가 갈라졌다가 바로 붙는다
슬롯: 훅 | 상승부 | 전환
에너지: 최고
길이: 0.07–0.15초 (얹는 샷), 한 광고에 3–5번
검증: 엔진 3.0.19 렌더 하니스 (fillMode 0이면 가장자리 띠, 2로 고침)
엔진: Effect 클립 `glitchFilter`(slices, offset, seed), `rgbSplitFilter`(red/green/blue {x,y}), 텍스트는 keyframes x 흔들림
---

## 의도
글리치 테크 방향의 "히트". 박을 때리는 짧은 충격이라 길면 불량 화면처럼 보입니다. **짧고, 박에 정확히, 바로 원상복귀**.

## 동작 핵심
- Effect 클립은 자기 `transform.zIndex` 아래 모든 층에 걸립니다. 전체를 찢으려면 가장 위, 소재만 찢으려면 소재 바로 위 zIndex.
- 한 히트 = Effect 클립 2–3개를 1프레임씩 이어 붙이고 `seed`·`offset`을 매번 바꿉니다(조각이 바뀌어야 "찢김"으로 보임).
- 같은 구간에 `rgbSplitFilter`를 1–2프레임 더 길게 겹쳐, 찢김이 끝난 뒤 색 갈라짐이 살짝 남게 합니다.
- 워드마크·문구는 같은 프레임에 `x` ±20–40px 흔들림 keyframes(`steps(3)`)를 줍니다.
- 전환으로 쓸 때: 앞 장면 마지막 2프레임 + 다음 장면 첫 2프레임에 걸쳐 둡니다. 컷 자체는 하드 컷.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 길이 | 2–4프레임 (30fps) | 6프레임 넘으면 오류 화면 같음 |
| glitch slices | 6–12 | 적으면 블록, 많으면 노이즈 |
| glitch offset | 60–180 | 화면 폭의 5–15% |
| rgbSplit | red {x:-12}, blue {x:12} | 20 넘으면 글자 안 읽힘 |
| glitch fillMode | 2 (밀린 조각이 반대편에서 이어짐) | 기본 0은 밀린 자리가 투명해져 바탕색 띠가 생김 |
| 빈도 | 마디 첫 박·드롭에만, 광고당 3–5번 | 매 박이면 피로, 시그니처 효과가 사라짐 |

## 사운드
디지털 잡음 "치직"(짧게) + 저음 쿵. 히트 프레임과 같은 프레임.

## 알려진 함정
- Effect 클립이 너무 낮은 zIndex면 글자가 안 찢깁니다(위 층은 그대로).
- 정보 문구가 읽혀야 하는 구간에는 걸지 않습니다. 정착한 뒤에는 0.5초 이상 깨끗하게 둡니다.
- 광효과(glow)와 같은 프레임에 겹치면 뭉개집니다.

## 참조 구현
```jsonc
// 120 BPM 첫 박(2.0초)에 3프레임 히트
{ "type": "Effect", "effectKey": "glitchFilter", "values": { "slices": 8, "offset": 120, "seed": 0.21, "fillMode": 2 },
  "timing": { "display": { "from": 2000000, "to": 2033333 }, "duration": 33333 }, "transform": { "zIndex": 60 } },
{ "type": "Effect", "effectKey": "glitchFilter", "values": { "slices": 10, "offset": -90, "seed": 0.77, "fillMode": 2 },
  "timing": { "display": { "from": 2033333, "to": 2066666 }, "duration": 33333 }, "transform": { "zIndex": 60 } },
{ "type": "Effect", "effectKey": "rgbSplitFilter",
  "values": { "red": { "x": -12, "y": 0 }, "green": { "x": 0, "y": 0 }, "blue": { "x": 12, "y": 0 } },
  "timing": { "display": { "from": 2000000, "to": 2133333 }, "duration": 133333 }, "transform": { "zIndex": 61 } }
```
