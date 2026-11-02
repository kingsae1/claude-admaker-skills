---
name: beat-flicker-sting
한 줄: 막대 하나가 첫 박에 솟고, 가는 컬러 바가 2프레임씩 깜빡이다가 워드마크가 박에 슬램, 이어서 카피가 1박 간격으로 쌓임
슬롯: 훅
에너지: 최고
길이: 1마디(4박) + 카피 스택(읽기 시간을 2박 단위로 올림)
엔진: Shape keyframes(scaleY), 짧은 Shape 클립(2프레임), Text keyframes(scale + blur)
검증: 앱 v0.12.1 미리보기 (지니TV 모든G 15초 9x16). Exporter 렌더 전
---

## 의도
첫 1초 안에 리듬과 브랜드를 같이 세웁니다. 깜빡임이 박을 들려주고, 워드마크 착지가 광고의 첫 화면 충격(R4 3회 중 1회)입니다.

## 동작 핵심
- `presets/fast-montage.mjs`가 박 단위로 `barAt`(0박), `wordmarkAt`(2박, 느린 곡에서 1.5초를 넘으면 1박), `linesAt`(1박 간격)을 채웁니다. 이 카드는 초를 직접 정하지 않습니다.
- 막대(24×600)가 0박에 scaleY 0 → 1로 솟습니다.
- 0박과 워드마크 사이 후반부에 가는 바 2개씩 5번, 각 2프레임 깜빡입니다. 폭 6–48px, 불투명도 0.64–0.89, 3색 + 흰색 1번.
- 워드마크는 박에 scale 1.35 → 1 + blur 10 → 0으로 착지합니다. 카피가 있으면 0.77초 뒤 0.1초 동안 빠지고 카피에 자리를 내 줍니다.
- 카피 줄은 1박 간격으로 왼쪽 정렬, 마지막 줄만 강조색입니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 첫 막대 | 24×600 (1080 기준), scaleY 0→1, 8프레임 `easeOutExpo` | 느린 곡은 더 길게 |
| 플리커 | 쌍 5개, 각 2프레임, 0박→워드마크 구간의 후반 절반에 균등 | 3프레임 넘으면 깜빡임이 아니라 컷으로 보임 |
| 색 | `brand.colors.accent`, `flicker2`, `flicker3` + 흰색 | 브랜드 색 2개 + 보색 1개 |
| 워드마크 | 210px, scale 1.35→1, blur 10→0, 0.3초 `easeOutExpo` | 화면 충격은 이것 하나 |
| 카피 | 104px, y 40→0 + blur 6, 0.367초, 1박 간격 | 줄 수 × 글자 수가 읽기 시간을 정함 |

## 사운드
플리커마다 짧은 디지털 틱(같은 샘플 2개 교대, 점점 작게), 워드마크 착지에 impact. 첫 막대는 소리 없이 또는 아주 짧은 스윕.

## 알려진 함정
- 실제 광고는 0–3.4초에 바닥 소재가 없었습니다. 기본은 소재 위에 얹고(`content.footage`), 검은 오프닝은 의도할 때만 씁니다(Q11).
- 카피 세 줄이 0.43초 간격으로 들어와 마지막 줄이 0.87초만 보였습니다. 프리셋은 읽기 시간을 지키고, 안 들어가면 카피를 빼고 경고합니다.
- 굵은 디스플레이 폰트는 굵은 파일 하나로(`fontStyle({ name, weight: 800 })`). 가는 파일에 `isBold`를 걸면 가짜 볼드(B5).
- 플리커 바는 화면 전체가 아니라 가운데 띠(y 660, 높이 600)만. 소재를 넓게 덮지 않습니다.

## 참조 구현
`templates/shots/beat-flicker-sting.mjs`. `props`: `{ wordmark, barAt, wordmarkAt, stingEnd, lines, linesAt }`.
```jsonc
// 첫 막대
{ "type": "keyframes", "options": { "duration": 266667, "delay": 0, "easing": "linear" },
  "params": { "0%": { "scaleY": 0, "opacity": 0, "easing": "easeOutExpo" }, "100%": { "scaleY": 1, "opacity": 1 } } }
// 워드마크
{ "type": "keyframes", "options": { "duration": 300000, "delay": 0, "easing": "linear" },
  "params": { "0%": { "scale": 1.35, "blur": 10, "opacity": 0, "easing": "easeOutExpo" }, "100%": { "scale": 1, "blur": 0, "opacity": 1 } } }
```
