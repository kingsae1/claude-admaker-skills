---
name: endcard-logo-cta
한 줄: 로고가 자리잡고, 메시지와 CTA가 차례로 들어온 뒤 1초 이상 정지한다
슬롯: 엔드카드
에너지: 최고 → 정지
길이: 2.5–4초 (6초 범퍼는 2초)
엔진: Image(로고 SVG) keyframes, Text `rise`/`blur_in`, Shape(CTA 버튼) `rectExpand`, 앞 장면 요소 keyframes
---

## 의도
광고에서 가장 공들인 순간(Q8)이자 가장 오래 기억되는 화면입니다. 브랜드 + 메시지 + 행동.

## 동작 핵심
- 앞 장면에서 나온 대표 요소들이 사방에서 들어와 로고 주위에 자리잡음(선택, 30초 이상 광고)
- 로고: scale 0.92 → 1, opacity 0 → 1, blur 6 → 0, 0.5초. 로고 자체에는 다른 효과 없음(B3)
- 메시지 한 줄: 로고 착지 + 0.2초, `rise` 단어 단위
- CTA 버튼: `rectExpand` 0.35초 → 버튼 글자 `blur_in`
- 전체 정지 ≥ 1초. 마지막 프레임까지 움직이지 않음

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 로고 입장 | 0.5초, `easeOutQuart` | 바운스·오버슈트는 브랜드가 원할 때만 |
| 순서 간격 | 0.2–0.3초 | 동시에 나오면 무엇을 봐야 할지 모름 |
| 정지 | ≥ 1초 (범퍼 0.7초) | 가장 자주 받는 수정 요청 |
| CTA 크기 | 보조 텍스트보다 크게, ≥ 4% | URL/CTA가 가장 작은 글자가 되면 안 됨(Q9) |

## 사운드
정지 직전 준-무음 → 로고 착지에 광고에서 가장 중요한 소리 하나(impact 또는 브랜드 사운드 로고). 음악은 로고 착지에 맞춰 마무리.

## 알려진 함정
- 엔드카드 문구가 중간 문구를 반복(C2)
- 9:16에서 CTA가 하단 세이프존 안(Q10)
- 로고 SVG가 어두운 배경에서 안 보임 → 브랜드 가이드의 반전 로고 사용

## 참조 구현
```jsonc
// 로고 Image
{ "type": "keyframes", "options": { "duration": 500000, "delay": 0, "easing": "linear" },
  "params": { "0%": { "scale": 0.92, "opacity": 0, "blur": 6, "easing": "easeOutQuart" }, "100%": { "scale": 1, "opacity": 1, "blur": 0 } } }
// CTA 버튼 Shape (pill): 클립 timing.display.from을 로고 +0.9초로 두고 delay 0 (마스크는 delay 전에 적용되지 않아 미리 보임, engine-recipes §2.4)
{ "type": "rectExpand", "options": { "duration": 350000, "delay": 0, "easing": "easeOutCubic" }, "params": {} }
```
