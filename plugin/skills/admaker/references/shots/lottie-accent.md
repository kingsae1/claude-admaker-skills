---
name: lottie-accent
한 줄: 혜택 문구·버튼 옆에 체크·하트·반짝이·폭죽 Lottie가 박에 맞춰 짧게 터진다
슬롯: 상승부 | 엔드카드 (얹는 샷)
에너지: 중
길이: 0.6–1.2초
검증: 엔진 3.0.19 렌더 하니스 (lottie 어댑터, 0.9초 원 팝)
엔진: Adapter `lottie` (`params.animationData`), 앱 MCP `search_lottie` → `add_clip`, 또는 `.json/.lottie` `upload_media`
---

## 의도
손으로 그리면 오래 걸리는 작은 장식 움직임을 Lottie로 채웁니다. **정보 옆 포인트**라서 화면 주인공이 되지 않게, 작고 짧게.

## 동작 핵심
- 고르기: `search_lottie "check"`, `"sparkle"`, `"confetti"`, `"heart"`처럼 영어 낱말. 선 굵기·색이 브랜드와 맞는 것만.
- 문구가 자리잡은 박(+0.1초)에 시작, 1초 안에 끝나는 구간만 씁니다(긴 Lottie는 timing으로 자름).
- 크기는 문구 높이의 1–1.5배, 문구 끝이나 버튼 모서리에.
- 혜택 나열이면 줄마다 같은 체크를 박마다 하나씩(같은 Lottie 반복은 여기서만 됨).

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 길이 | 0.6–1.2초 | 길면 산만 |
| 크기 | 문구 높이 × 1–1.5 | 크면 주인공이 됨 |
| 개수 | 장면당 1종 | 여러 종이 섞이면 싸 보임 |

## 사운드
체크 "띵", 반짝 "샤랑", 폭죽 "팡" — Lottie 시작 프레임에.

## 알려진 함정
- 색을 바꿀 수 없는 Lottie가 많습니다. 브랜드 색과 안 맞으면 다른 것을 찾습니다.
- 스킬 렌더 하니스에서는 `@admaker/engine/adapters/lottie`를 등록해야 보입니다.
- 브랜드가 준 Lottie가 있으면 그것을 먼저 씁니다.

## 참조 구현
```jsonc
{ "type": "Adapter", "adapter": "lottie", "params": { "animationData": { /* search_lottie 결과 JSON */ } },
  "timing": { "display": { "from": 8100000, "to": 9000000 }, "duration": 900000 },
  "transform": { "x": 820, "y": 1120, "width": 120, "height": 120 } }
```
