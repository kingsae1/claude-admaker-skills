---
name: starburst-spin
한 줄: 가격·할인·오픈 소식 뒤에서 만화풍 방사선이 박마다 딱딱 돌거나 천천히 소용돌이친다
슬롯: 훅 | 상승부 끝(가격) | 엔드카드 (배경 층)
에너지: 중–고
길이: 1.5–3초 (장면 내내)
검증: 엔진 3.0.29 렌더 하니스, `samples/backdrops` (9:16·16:9 모서리·주기 검사 `check-render.mjs`)
엔진: Image(SVG) + 회전 keyframes(`iterCount`) — `templates/rays.mjs` `raysSvg`·`raysBox`·`raysSpin`. 앱 호환
---

## 의도
"50% 할인", "오늘 오픈", "1+1" 같은 한 방짜리 소식 뒤에 두는 방사선. 시선을 가운데로 모으고, 박마다 끊어 도는 회전이 리듬을 줍니다. 모션 전용 씬(인터루드)·엔드카드·누끼 제품 뒤에 씁니다. 소재(영상·사진) 위에 덮지 않습니다.

## 쓰는 법
```js
import { raysSvg, raysBox, raysSpin } from "./rays.mjs";
import { svgUrl } from "./paper.mjs";
const r = { width: W, height: H, rays: 16, colors: ["#FFD23F", "#FF9A1F"], center: [0.5, 0.42] };
add(image("rays", svgUrl(raysSvg(r)), a, b, raysBox(r),
  { animations: [raysSpin({ rays: 16, mode: "beat", beat: 60 / BPM, duration: b - a })] }));
// 소용돌이 + 가운데 흐림, 천천히 반시계
const s = { width: W, height: H, rays: 24, colors: ["#FF4F79", "#FFC2D1"], center: [0.5, 0.4], twist: 45, softness: 0.45 };
add(image("swirl", svgUrl(raysSvg(s)), a, b, raysBox(s), { animations: [raysSpin({ rays: 24, period: 10, dir: -1, duration: b - a })] }));
```
- `raysBox`는 방사 중심이 가운데인 정사각 상자입니다. 엔진은 상자 가운데를 축으로 돌리므로 반드시 이 상자에 놓습니다(다른 상자에 늘려 넣으면 중심이 어긋나고 모서리가 빕니다).
- `center`는 가격·로고가 놓일 자리(화면 비율)에 맞춥니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| `rays` | 12–48, 짝수로 맞춤 | 12–16 굵고 만화풍, 24–32 경쾌, 40 넘으면 어지러움 |
| `colors` | 같은 계열 두 톤 | 노랑·주황, 분홍 두 톤. 보색 조합은 글자가 묻힘 |
| `twist` | 0 / ±30–60도 | 0이면 곧은 방사선, 값이 크면 소용돌이 |
| `softness` | 0 / 0.3–0.6 | 가운데를 두 색 중간색으로 흐려 글자 받침이 됨 |
| `mode: "beat"` | `beat` = 60/BPM | 박마다 `snap`(0.3박) 동안 `easeOutBack`으로 돌고 멈춤 |
| `step` | `pair`(기본) / `swap` | pair = 720/rays도(박마다 같은 그림), swap = 360/rays도(박마다 두 색이 뒤바뀜, 주기 2박) |
| `mode: "smooth"` | `period` 8–12초/바퀴 | 6초보다 빠르면 정신없음 |

## 사운드
비트 회전은 음악 박에 맞추고 따로 효과음을 넣지 않습니다. 가격이 꽂히는 순간에만 "쾅" 한 번.

## 알려진 함정
- 주기 끝 각도는 그림이 처음과 같은 각도라(`smooth` 360°, `pair` 720/rays°, `swap` 2박에 720/rays°) `iterCount` 반복 이음매가 없습니다. `raysSpin` 없이 직접 짤 때 360/rays°마다 되돌리면 두 색이 뒤바뀌며 번쩍입니다.
- 한 광고에 방사선은 한 장면만(R5). 가격 장면에 썼으면 엔드카드는 다른 배경으로.
- 방사선 위 글자는 흰 원판·두꺼운 외곽선·`softness`로 받칩니다. 맨 글자는 줄무늬에 묻힙니다.
- SVG 크기: 16줄 3–6KB, twist가 있으면 10–20KB.
