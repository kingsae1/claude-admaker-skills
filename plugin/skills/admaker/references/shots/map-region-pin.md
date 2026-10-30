---
name: map-region-pin
한 줄: 지도가 들어오고 한 지역이 색으로 칠해지며 그 자리에 핀이 박힌다
슬롯: 훅 | 주인공
에너지: 중
길이: 1.5–2.5초
엔진: Image(SVG 바탕 지도), Shape path `paint`, Shape circle keyframes, Text — `templates/map.mjs`
검증: engine 3.0.5 (samples/map)
---

## 의도
"어디서"를 한눈에 보여줍니다. 매장 위치, 서비스 지역, 출시 도시처럼 장소가 메시지인 광고의 훅이나 주인공 샷에 씁니다.

## 동작 핵심
- 바탕 지도와 강조 지역이 한 덩어리로 들어옴(0.7초, y 30 → 0, scale 0.97 → 1)
- 들어온 직후 지역 색이 바탕색 → 강조색으로 칠해짐(`paint` 0.35–0.4초)
- 같은 순간 핀이 팝(0.45초, scale 0.2 → 1, `easeOutBack`), 0.1초 뒤 지명이 옆에서 밀려 들어옴
- 강조 지역은 한 샷에 1–2곳. 더 많으면 데이터 샷(막대·순위)으로 바꿉니다

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 지도 상자 | 1080×1920 기준 `[90, 200, 900, 1150]` | 카피 자리를 아래 35%에 남김 |
| 바탕 지도 색 | 배경보다 한 단계 밝은 면 + 더 밝은 1.5–2px 경계선 | 경계선이 진하면 지도가 시끄러워짐 |
| 지역 paint | 0.35–0.4초 `easeOutCubic` | 강조색은 화면에 하나만(경로·핀과 같은 색) |
| 핀 | 지름 28–32px, 흰 면 + 강조색 테 | zoom 후 지름 기준 |
| 지명 | body 폰트 40px, 그림자 alpha 0.5 | 핀 오른쪽 30px |

## 사운드
핀이 박힐 때 짧은 click 또는 tick. 지도 입장에는 낮은 whoosh.

## 알려진 함정
- 강조 지역 Shape에도 바탕 지도와 같은 입장을 넣어야 함. 빠뜨리면 첫 프레임에 지역만 떠 있음(실제 렌더에서 확인)
- 입장은 `entrance()`/`holdFrom()`으로. `options.delay`로 늦추면 delay 전에 핀이 그대로 보임(engine-recipes §2.6)
- 작은 지역(서울·부산 등 광역시)은 지도 축척에서 수십 px라 paint만으로는 약함. 핀과 지명을 같이 씁니다

## 참조 구현
`samples/map/sample-map.mjs`의 `map_seoul`, `map_pin_seoul`, `map_label_seoul`.
```js
import { makeProjection, baseMapSrc, regionShape, pinShape } from "./map.mjs";
import { entrance, holdFrom } from "./motion.mjs";
const map = makeProjection(features, [90, 200, 900, 1150]);
regionShape(map, feature, { timing, z: 20, fill: C.surface, stroke: "#2A3550", strokeWidth: 2,
  animations: [entrance({ dur: 0.7, y: 30, scale: 0.97 }),
    { type: "paint", options: { duration: us(0.4), delay: us(0.8), easing: "easeOutCubic" }, params: { "0%": { fillColor: C.surface }, "100%": { fillColor: C.accent } } }] });
pinShape(map, [126.978, 37.566], { timing, z: 32, size: 30, fill: C.text, ring: C.accent,
  animations: [holdFrom({ type: "keyframes", options: { duration: us(0.45), delay: 0, easing: "linear" },
    params: { "0%": { opacity: 0, scale: 0.2, easing: "easeOutBack" }, "100%": { opacity: 1, scale: 1 } } }, 0.9)] });
```
`paint`의 delay는 괜찮습니다. delay 전에는 클립 원래 fill(= 0% 색)로 그려지기 때문입니다.
