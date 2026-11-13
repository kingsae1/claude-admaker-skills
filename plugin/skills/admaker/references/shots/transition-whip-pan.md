---
name: transition-whip-pan
한 줄: 카메라가 휙 돌아가듯 두 소재가 붙은 채 한 화면 미끄러지고, 가운데서 모션 블러가 가장 셈
슬롯: 전환
에너지: 중고
길이: 0.36초 (가운데 앞뒤 0.18초)
엔진: 바닥 소재 keyframes(x·y·motionBlur/blur). `templates/shots/transition-whip-pan.mjs`. 셰이더 대안 `am-push`(blur 0.2 이상)
검증: 엔진 3.0.19, 브라우저 Exporter mp4 (`samples/seams`)
---

## 의도
장소를 옮기거나 같은 종류의 컷을 빠르게 넘길 때 씁니다. 흐름 잇기보다 크고 빠른 동작이라 한 광고에 한두 번만 씁니다.

## 동작 핵심
- 두 소재가 lead초만큼 앞뒤로 겹치고, 같은 `easeInQuart` → `easeOutQuart`로 한 화면(W 또는 H)을 함께 이동. 둘이 맞붙어 있어 틈이 없습니다(바닥 불필요).
- 블러는 가운데(컷)에서 최대, 양 끝에서 0.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| lead | 0.18초 | 0.25초 넘으면 휩이 아니라 슬라이드 |
| blur | 60 (가로 motionBlur), 세로는 10 | 소재가 어두우면 40 |
| dir | left | 흐름(§0.2)과 같게 |

## 사운드
짧고 굵은 whoosh, 피크를 가운데에.

## 알려진 함정
- FOOTAGE: 앞 소재 `to = at + lead`, 다음 소재 `from = at − lead`. 안 맞으면 샷이 에러를 냅니다.
- 엔진 motionBlur는 가로로만 번집니다. 세로 휩은 일반 blur라 덜 빠르게 보입니다.
- 장부에는 `type: "transition"`으로 적습니다(두 소재가 같이 보이므로 겹침 검사 제외).

## 참조 구현
`templates/shots/transition-whip-pan.mjs`. `props`: `{ at, from, to, dir?, lead?, blur? }`.
