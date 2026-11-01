---
name: hand-drawn-emphasis
한 줄: 자리잡은 핵심 단어·가격 둘레에 손으로 그린 동그라미·밑줄·화살표가 그려진다
슬롯: 상승부, 엔드카드 (다른 샷 위에 얹는 샷)
에너지: 중
길이: 0.5–0.8초 그리기 + 대상이 끝날 때까지 유지
엔진: Shape `path` + stroke + `strokeDraw` (`templates/draw.mjs` `annotationPath`/`annotationBox`, MCP `draw_annotation`)
---

## 의도
화면에서 가장 중요한 한 단어를 사람이 펜으로 짚어 주는 느낌으로 시선을 모읍니다. 효과가 아니라 "표시"라서 소재를 가리지 않습니다(aesthetic-rules Q11).

## 동작 핵심
- 대상 글자가 입장을 끝내고 0.2–0.4초 뒤에 그리기 시작
- 0.5–0.7초 `easeInOutCubic`으로 그려지고 그대로 유지, 대상과 같이 퇴장
- 할인 가격: 이전 가격 `strike` → 0.2초 뒤 새 가격 `circle`
- CTA: 버튼 왼쪽에서 `arrow`, 또는 버튼 아래 `underline`

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 선 굵기 | 대상 높이의 5–7% | 3% 아래는 모바일에서 안 보임 |
| 그리기 | 0.5–0.7초 | 1초 넘으면 늘어지고, 0.3초 아래는 그냥 나타난 것처럼 보임 |
| 색 | 브랜드 강조색, 대상 글자와 다른 색 | 대상과 같은 색이면 묻힘 |
| 여백(pad) | 기본 `annotationBox` (대상 짧은 변의 18% + 8px) | circle이 글자에 닿으면 pad를 키움 |
| 개수 | 장면당 1개(최대 2개) | 3개부터는 아무것도 강조되지 않음 |

## 사운드
그리기 시작에 맞춰 짧은 마커·펜 긁는 소리 하나(선택). 착지음은 넣지 않음.

## 알려진 함정
- 선 굵기만큼 클립 상자를 넓히지 않으면 선 바깥쪽이 잘립니다(`draw_annotation`은 자동 처리).
- `strokeDraw`의 `fill`은 `"none"`으로 둡니다. 기본값 `"after"`는 열린 선에서 의미가 없고 그리기를 70% 지점에서 끝냅니다.
- 대상이 움직이는 동안(입장 중) 그리면 표시가 대상을 놓칩니다. 반드시 정지한 뒤 그립니다.
- 검증 전 값입니다. 첫 광고에서 렌더로 확인하고 `검증: <엔진 버전>`을 붙입니다.

## 참조 구현
```js
import { annotationPath, annotationBox } from "../../templates/draw.mjs";
const target = { x: 260, y: 1180, width: 560, height: 150 };   // 가격 Text 상자
const box = annotationBox("circle", target), sw = 9;
const { path } = annotationPath("circle", box.width, box.height, { seed: 11 });
({
  type: "Shape", src: "shape", shapeType: "path",
  timing: { display: { from: 6.3e6, to: 9e6 } },
  transform: { x: box.x - sw / 2, y: box.y - sw / 2, width: box.width + sw, height: box.height + sw, zIndex: 35 },
  style: { path, viewBox: [0, 0, box.width, box.height], fill: "transparent", fillOpacity: 0, stroke: { color: "#FF3B5C", width: sw, cap: "round", join: "round" } },
  animations: [{ type: "strokeDraw", options: { duration: 600000, easing: "easeInOutCubic" }, params: { fill: "none" } }],
});
```
