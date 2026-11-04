---
name: transition-footage-card
한 줄: 프레임 가득 소재가 카드로 줄며 기울어 빠지고, 반대편에서 다음 소재 카드가 들어와 정면으로 펴지며 화면을 채움
슬롯: 전환
에너지: 중
길이: 0.9–1.1초
엔진: 바닥 소재 keyframes(scale·rotateY·x), 엔진 원근(PerspectiveMesh). `templates/shots/transition-footage-card.mjs`
검증: 엔진 3.0.7 렌더 하니스(Preview 스틸 + Exporter mp4), `samples/transitions` 7.0–8.0초
---

## 의도
차원 이동(2D → 2.5D → 2D)입니다. 평면이던 화면이 잠깐 공간 속 카드가 되었다가 다시 평면으로 돌아옵니다. 여러 소재(기능, 장르, 상품)를 넘겨 보여 주는 상승부에 맞고, "넘긴다"는 동작 자체가 다음 내용으로 간다는 뜻을 줍니다.

## 동작 핵심
- 앞 소재: 0–35% scale 1 → 0.62 + rotateY 0 → −20°(`easeInOutCubic`), 35–75% 옆으로 1.5W 빠짐(`easeInCubic`).
- 다음 소재: 0–25% 화면 밖 대기, 25–65% 반대편 1.1W에서 들어옴(`easeOutCubic`), 65–100% 정면으로 펴지며 1배(`easeInOutCubic`).
- 카드 뒤에는 `project.settings.backgroundColor`가 보입니다(브랜드 배경색).
- 다음 소재 `FOOTAGE.from` = `at`, 앞 소재 `FOOTAGE.to` = `at + dur`.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| dur | 1.0초 | 0.8초 아래면 기울기가 안 읽힘 |
| card | 0.62 | 0.5 아래면 소재가 너무 작아짐(Q11). 0.75 위면 카드 느낌이 약함 |
| tilt | 20° | 소재에 글자가 있으면 15° 이하(director §8) |
| 이동 | 빠짐 1.5W, 들어옴 1.1W | 기울어진 카드는 x 이동이 덜 보여서 화면 폭보다 크게 밀어야 완전히 빠짐 |

## 사운드
카드가 빠질 때 종이·카드 넘기는 swish, 정면으로 펴질 때 작은 thump.

## 알려진 함정
- **카드 뒤 배경을 Shape로 깔지 않습니다.** 렌더 하니스는 뒤에 만든 트랙을 위에 그려서, footage 트랙 다음에 만든 배경 Shape는 zIndex 1이어도 소재를 덮습니다(첫 렌더에서 화면이 배경색만 나옴). 배경은 `settings.backgroundColor`로 정합니다.
- 소재가 카드인 동안(약 0.6초)은 화면 대부분이 배경색입니다. 한 광고에 한 번.
- 앱 불러오기(`to-admaker-import.mjs`)는 rotateY keyframes를 그대로 넘기지만, 앱 미리보기와 서버 렌더에서 같은 원근으로 나오는지는 아직 확인하지 않았습니다.

## 참조 구현
`templates/shots/transition-footage-card.mjs`. `props`: `{ at, dur?, from, to, card?, tilt?, dir?, index? }`.
