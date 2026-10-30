---
name: price-countup
한 줄: 가격·통계 숫자가 굴러가다 멈추고, 멈춘 순간 강조된다
슬롯: 상승부 끝 (엔드카드 바로 앞)
에너지: 중고
길이: 1.8–2.5초
엔진: Text `countUp`, keyframes(scale 펄스), Shape 밑줄 `strokeDraw`(선택)
---

## 의도
정보 밀도가 가장 높은 순간을 엔드카드 직전에 둡니다(director §4).

## 동작 핵심
- `countUp` 1.0–1.4초, 감속 이징으로 끝에서 천천히
- 멈춘 순간 scale 1 → 1.06 → 1 (0.25초), 이 광고의 화면 전체 충격과는 별개인 요소 레이어 펄스
- 단위·조건("월", "부터")은 작게 고정, 숫자만 움직임

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| countUp | 1.0–1.4초, `easeOutExpo` | 선형이면 끝이 갑자기 멈춰 어색함 |
| 시작값 | 최종값의 0–30% | 0부터 세면 길어짐, 큰 숫자는 70%부터 |
| 정지 | ≥ 1초 | 가격은 반드시 읽혀야 함(R1) |
| 자릿수 구분 | 천 단위 구분자 | 한국어 가격은 "원" 붙이기 |

## 사운드
굴러가는 동안 틱 소리는 자제(기계적 반복). 멈출 때 작은 착지음 하나.

## 알려진 함정
- 자릿수가 바뀌면서 글자 폭이 흔들림 → 고정폭 숫자 폰트(tabular figures) 또는 오른쪽 정렬
- `strokeDraw`는 Shape 전용이고 서버 인코딩에서는 빠짐(브라우저 기준이면 사용 가능)

## 참조 구현
```jsonc
{ "type": "countUp", "options": { "duration": 1200000, "delay": 0, "easing": "easeOutExpo" }, "params": { "from": 9000, "to": 29900, "decimals": 0, "separator": "," } },
{ "type": "keyframes", "options": { "duration": 250000, "delay": 1200000, "easing": "linear" },
  "params": { "0%": { "scale": 1, "easing": "easeOutQuad" }, "40%": { "scale": 1.06, "easing": "easeInOutQuad" }, "100%": { "scale": 1 } } }
```
