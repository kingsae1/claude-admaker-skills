---
name: pattern-drift
한 줄: 체커·그리드·도트·사선 줄무늬·동심원·지그재그 배경이 브랜드 색으로 이음매 없이 천천히 흐른다
슬롯: 훅 | 주인공 배경 | 상승부 | 엔드카드 (배경 층, 띠)
에너지: 저–중
길이: 장면 내내
검증: 엔진 3.0.29 렌더 하니스, `samples/backdrops` (6종 한 주기 뒤 같은 프레임 `check-render.mjs`)
엔진: Image(SVG `<pattern>`) + 위치 keyframes(`iterCount`) — `templates/patterns.mjs` `patternSvg`·`patternBox`·`patternDrift`. 앱 호환
---

## 의도
모션 전용 씬·카드 뒤·엔드카드가 단색이면 비어 보이고, 사진을 깔면 문구와 싸웁니다. 브랜드 색 두 개로 만든 패턴이 아주 천천히 흐르면 화면이 살아 있으면서 글자를 방해하지 않습니다. 줄무늬 띠는 "공사중·오픈·한정" 느낌의 강조 띠로도 씁니다.

## 쓰는 법
```js
import { patternSvg, patternBox, patternDrift } from "./patterns.mjs";
import { svgUrl } from "./paper.mjs";
const p = { kind: "dots", size: 64, colors: ["#FFFFFF", "#2D5BFF"], weight: 16, angle: 20 };
const box = patternBox({ width: W, height: H, ...p });     // 화면보다 한 주기만큼 큰 상자
add(image("bg", svgUrl(patternSvg({ ...p, width: box.width, height: box.height })), a, b, box,
  { animations: [patternDrift({ ...p, dir: "xy", speed: 40, duration: b - a })] }));
// 강조 띠: 상자를 띠 크기로(가로로 한 주기 이상 넘치게)
const st = { kind: "stripes", size: 60, colors: ["#1E1A16", "#FFE14D"], angle: 45 };
const band = { x: -90, y: 1380, width: W + 180, height: 220 };
add(image("band", svgUrl(patternSvg({ ...st, ...band })), a, b, band, { animations: [patternDrift({ ...st, period: 60 / BPM, duration: b - a })] }));
```

| kind | 모습 | `size` | `weight` 기본 |
|---|---|---|---|
| `checker` | 칸 교대 (주기 = 두 칸) | 칸 크기 | — |
| `grid` | 모눈 선 | 칸 간격 | size × 6% |
| `dots` | 칸 중심 원 | 간격 | 지름 size × 36% |
| `stripes` | 사선 띠 (띠 폭 = size/2), 기본 45° | 주기 | — |
| `rings` | 중심에서 같은 간격 동심원 | 간격 | size × 22% |
| `zigzag` | 높이 size/2 꺾은선 줄 | 주기 | size × 12% |

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| `size` | 40–80px (9:16) | 4px 아래는 4로 올림(모아레). 30px 아래는 렌더·압축에서 지글거림 |
| `weight` | 표 기본 | size/2 넘으면 size/2로 자름 |
| `angle` | 0–45° | 패턴 전체 회전. drift도 같은 각도로 줘야 이음매가 없음 |
| `speed` | 20–60px/초 | 배경이면 천천히. 박에 맞추려면 `period` = 박·마디 길이 |
| `dir` | `x` / `y` / `xy` | 패턴 좌표 축. stripes는 늘 띠에 수직 |
| 색 | 명도 차 작은 두 톤 | 배경이면 대비를 낮추고(같은 색 계열), 띠만 강하게 |

## 알려진 함정
- 이음매가 없으려면 한 주기 = 격자 벡터만큼 움직여야 합니다. `patternDrift`가 `angle`·`kind`로 계산하니 직접 x·y를 넣지 않습니다. 상자는 `patternBox`(사방 한 주기 × √2 여유).
- `rings`는 옮기면 반복되지 않아 한 주기 동안 한 간격만큼 커졌다 돌아오는 숨쉬기(scale)로 대신합니다.
- 체커·고대비 도트를 화면 가득 빠르게 흘리면 멀미가 납니다. 배경은 대비를 낮추거나 30px/초 아래로.
- 글자 뒤에는 단색 카드·띠를 받칩니다. 패턴 위 맨 글자는 읽기 어렵습니다.
- SVG는 1–2KB입니다(타일 하나). 앱은 불러올 때 PNG로 래스터화합니다.
