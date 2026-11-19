---
name: lightning-strike
한 줄: 번개가 글자 뒤로 내리치며 두세 번 깜빡이고 화면도 같이 번쩍, 또는 화면 가장자리에서 짧은 전기가 튄다
슬롯: 훅 | 가격·특가 | 엔드카드 (글자 뒤 강조 층)
에너지: 고
길이: 번쩍 한 묶음 0.3–0.8초
검증: 엔진 3.0.30 브라우저 Exporter, `samples/lightning` (9:16) · 수용 기준 `tests/lightning.test.mjs`
엔진: Shape(path) 2겹(바깥 빛 + 안쪽 심) + opacity·blur keyframes — `templates/lightning.mjs` `boltPath`·`boltClips`·`flickerStops`. 앱 호환
---

## 의도
에너지 드링크·게임·"번개 특가"의 한 방. 번개는 **글자보다 아래, 배경·소재보다 위**에 둬서 글자를 뒤에서 때리는 느낌을 줍니다. 깜빡이는 순간에 화면 전체를 살짝(0.2–0.3) 같이 밝히면 "번쩍"이 삽니다. 소재(영상·사진) 위에 쓸 때는 바깥 빛이 소재를 뿌옇게 덮지 않게 짧게(0.5초 안팎) 씁니다.

## 쓰는 법
```js
import { boltClips, flickerStops } from "./lightning.mjs";
// 위에서 글자 뒤로 내리치는 번개. 배열 앞 = 아래(바깥 빛 → 가지 빛 → 가지 → 심)
add(...boltClips({ id: "hit", from: [780, -40], to: [470, 1180], seed: 7, at: 0.3, duration: 0.75, flashes: 3,
  width: 12, roughness: 0.55, branches: 3, branchChance: 0.4 }));
// 같은 seed·duration·flashes면 flickerStops가 같은 정지점 → 화면 번쩍을 번개에 맞춤 (samples/lightning/build.mjs screenFlash)
// 가장자리 전기: 번쩍마다 다른 경로(reshape) — 클립이 번쩍 수만큼 나뉨
add(...boltClips({ id: "edge", from: [0, 520], to: [480, 660], seed: 100, at: 3.2, duration: 0.5, flashes: 2, reshape: true,
  width: 8, color: "#F4ECFF", glow: "#B98CFF", roughness: 0.7, depth: 5, branches: 1 }));
// 그 뒤에 글자를 add (글자가 위)
```
- `boltPath`만 쓰면 SVG path `d`(화면 좌표)와 가지 `d` 목록을 얻습니다. 손으로 Shape를 만들거나 `strokeDraw`로 그려지게 할 때.
- 같은 인자 → 같은 경로(결정적). 마음에 드는 모양이 나올 때까지 `seed`만 바꿉니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| `roughness` | 0–1.5 (기본 0.5) | 0.3 매끈한 줄기, 0.5–0.7 번개다움, 1 넘으면 지글지글한 전기 |
| `depth` | 1–9 (기본 6) | 주 줄기 점 2^depth+1. 짧은 가장자리 전기는 4–5, 화면을 가로지르는 번개는 6–7 |
| `branches` / `branchChance` | 0–3 / 0.3–0.5 | 가지는 주 길이 0.3–0.6, 줄기에서 20–45° |
| `width` | 6–12px | 바깥 빛은 × 4(`glowScale`), 가지는 × 0.5 |
| `color` / `glow` | 심은 거의 흰색, 빛은 파랑(#7fb8ff)·보라(#B98CFF)·노랑 | 배경과 같은 계열 빛이면 묻힘 |
| `flashes` | 1–3 | 번쩍 하나 = 0 → 1 → 0.2 → 1 → 0, 켜진 구간 60–120ms |
| `duration` | 번쩍당 0.2–0.3초 | 짧을수록 날카로움 |
| `reshape` | false / true | true면 번쩍마다 seed+k로 다른 경로(전기가 튀는 느낌) |
| `blur` | 기본 width × 1.5 | 바깥 빛 번짐. 앱에서도 keyframes `blur`로 그대로 |

## 사운드
번쩍 첫 프레임에 "치직/쾅" 한 번(sfx.md §0 순서로 찾기). 번쩍마다 소리를 넣으면 시끄럽습니다.

## 알려진 함정
- 장면 하나에 번개 묶음은 1–2개. 계속 치면 경고등처럼 보입니다.
- 화면 번쩍 사각형은 0.2–0.3까지만. 1에 가깝게 올리면 글자가 날아갑니다.
- 깜빡임 keyframes는 0에서 시작해 0으로 끝나므로 `validate.mjs`가 입장(R6·R7)으로 세지 않습니다.
- 어두운 두 장면이 바로 이어질 때(배경색 차이가 작을 때) 브라우저 인코더가 평평한 곳을 앞 프레임으로 건너뛰어 앞 장면이 1초쯤 흐리게 남을 수 있습니다(번개와 무관, Preview 스틸에는 없음). 다음 장면 배경을 확실히 다른 밝기·색으로 고릅니다.
