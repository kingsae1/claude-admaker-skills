---
name: wiggle-float
한 줄: 제품·카드·글자가 노이즈로 부드럽게 둥둥 떠 있거나 살아 있는 듯 흔들린다 (shake와 달리 이어지는 흔들림)
슬롯: 주인공 | 상승부 | 엔드카드 (얹는 모션, 입장 뒤)
에너지: 저–중
길이: 장면 내내
검증: 엔진 3.0.29 렌더 하니스, `samples/backdrops`, 수용 기준 `tests/backdrops.test.mjs`
엔진: keyframes(fps 간격으로 구움) — `templates/noise.mjs` `wiggleKeys`. 앱 호환
---

## 의도
멈춰 있는 카드·누끼 제품·큰 글자에 생기를 줍니다. 1D 그래디언트 노이즈라 방향이 갑자기 꺾이지 않고, 같은 `seed`면 늘 같은 움직임(결정적 렌더)입니다. 입장 keyframes와 같은 클립에 같이 붙이면 오프셋이 더해집니다(엔진 keyframes는 x·y·angle을 더하고 scale을 곱함).

## 쓰는 법
```js
import { wiggleKeys } from "./noise.mjs";
// 둥둥 떠 있는 카드: 카드와 그 위 글자에 같은 seed → 한 덩어리로 움직임
const float = wiggleKeys({ seed: 11, freq: 0.5, amp: { x: 8, y: 16, angle: 1.5 }, duration: b - a });
card.animations.push(entrance, float); title.animations.push(entrance2, float);
// 살아 있는 글자: 입장이 끝난 뒤부터
word.animations.push(wiggleKeys({ seed: 3, freq: 2, amp: { angle: 2.5, scale: 0.025 }, duration: b - a, delay: 0.5 }));
```

| 쓰임 | `freq` | `amp` | `octaves` |
|---|---|---|---|
| 떠 있는 제품·카드 | 0.3–0.6 | y 10–20, x 5–10, angle 1–2 | 1 |
| 살아 있는 글자 | 1.5–3 | angle 2–3, scale 0.02–0.03 | 1 |
| 손으로 든 카메라(모션 씬 전체 그룹) | 0.8–1.5 | x·y 6–12, angle 0.5–1 | 2 |

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| `seed` | 클립·장면마다 다르게 | 같이 움직일 묶음만 같은 seed |
| `ease` | true | 처음·끝 `ramp`(0.2초, 느린 흔들림은 0.5/freq초)에 진폭을 0↔1로 → 앞뒤 장면과 이음매 없음 |
| `delay` | 입장 끝 | 흔들림은 항등값에서 시작하므로 delay로 붙여도 됨 |
| `fps` | 30 | 프로젝트 fps. 사이는 직선 보간 |

## 알려진 함정
- **제품 광고 소재 위 핸드헬드 흔들림 금지**(aesthetic-rules Q3). 핸드헬드는 다큐 톤 모션 씬에만. 떠 있는 제품은 진폭을 작게.
- 정지 중인 가격·CTA·워드마크(R1)에는 붙이지 않습니다. 엔드카드는 로고 옆 장식에만.
- 진폭이 크면(y 30px 이상, angle 4° 이상) 멀미가 납니다. 글자는 angle·scale만, 위치는 흔들지 않는 편이 읽기 좋습니다.
- keyframes stop이 초당 fps개라 15초 클립이면 450개입니다. JSON이 커지면 `fps: 15`로 줄여도 눈으로는 같습니다.
- 2단계(엔진 모션 `wiggle`)가 생겨도 앱이 모르면 빠지므로 이 굽기본을 유지합니다. 엔진 구현은 `wiggleAt`과 같은 식을 씁니다.
