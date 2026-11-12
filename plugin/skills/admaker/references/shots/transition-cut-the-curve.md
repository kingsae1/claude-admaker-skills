---
name: transition-cut-the-curve
한 줄: 앞 소재가 한쪽으로 빨라지며 화면 폭의 12%만 빠지고, 컷 순간 다음 소재가 같은 쪽으로 이어 들어와 멈춤 (기본 경계)
슬롯: 전환
에너지: 중
길이: 컷 앞 0.3초 + 뒤 0.32초
엔진: 바닥 소재 keyframes(x·y·opacity·motionBlur/blur), 생성 배경(needsGround). `templates/shots/transition-cut-the-curve.mjs`, 그래픽은 `motion.mjs` `cutCurveOut`/`cutCurveIn`
검증: 엔진 3.0.19 + 이 PR의 엔진 브랜치, 브라우저 Exporter mp4 (`samples/seams`)
---

## 의도
씬 경계의 기본값입니다(`transitions.md` §0). 장면 하나하나가 따로 들어왔다 나가는 대신, 카메라 한 번이 옆으로 이어지는 것처럼 보이게 합니다. 화면 밖까지 밀지 않고 일부만 움직이는 대신 속도를 맞추는 것이 핵심입니다.

## 동작 핵심
- 나가기: x 0 → −130px(`easeInCubic` → `easeInQuart` 두 구간, 끝에서 가장 빠름), 투명도 1 → 0.25(60% 지점) → 0. 모션 블러가 끝으로 갈수록 세짐.
- 들어오기: x +130px → 0 (`easeOutQuint`), 투명도 0.35 → 1. 컷 순간 이미 움직이는 중.
- 두 쪽은 겹치지 않습니다. 한 프레임에는 한 소재만 보이고, 그 사이 비치는 바닥은 생성 배경(`look_bg`)입니다.
- 방향은 광고의 기본 방향(보통 왼쪽). 연속 경계에서 반대 방향으로 쓰지 않습니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| travel | 130px (1080 폭의 12%) | 200px 넘으면 미는 동작이 따로 보이고 바닥이 많이 비침 |
| exit / entry | 0.3 / 0.32초 | 들어오기를 나가기보다 짧게 하지 않음 |
| blur | 8 (가로는 motionBlur 48) | 글자가 큰 소재는 6 |
| dir | left | 위로는 결론·공개에만 (§0.2) |

## 사운드
컷 순간 짧은 swish 하나(나가는 방향으로 팬). 박 위에 컷을 둡니다.

## 알려진 함정
- 소재가 밀린 자리에 바닥이 보입니다. `needsGround`로 생성 배경을 깔므로 브랜드 배경색이 너무 밝으면 컷 순간이 번쩍입니다. 어두운 배경색을 씁니다.
- 셰이더로 같은 효과를 내려면 `am-cut-curve`(`transition-shader` 샷). 이 경우 두 소재를 전환 길이만큼 겹쳐야 합니다.
- 다음 장면 글자·그래픽이 컷 직후 작은 데서 커지며 나오면 방향이 섞입니다. 같은 쪽으로 `cutCurveIn`을 걸거나 0.3초 뒤에 입장시킵니다.
- 장부(`SEAMS`)에 `{ at, exit: { clip: "footage_N", axis: "x", dir: -1 }, entry: { clip: "footage_M", axis: "x", dir: -1 } }`를 적으면 `validate.mjs`가 속도·방향을 숫자로 봅니다.

## 참조 구현
`templates/shots/transition-cut-the-curve.mjs`. `props`: `{ at, from, to, dir?, travel?, exit?, entry? }`. 앞 소재 `to`와 다음 소재 `from`이 `at`과 같아야 합니다.
