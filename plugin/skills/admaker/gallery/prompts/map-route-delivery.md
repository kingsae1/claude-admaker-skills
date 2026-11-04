# 지도 경로: 서울 → 부산 배송

- **카테고리:** map
- **길이·비율:** 6초, 9:16, 30fps
- **엔진:** @admaker/engine 3.0.5
- **샷 카드:** `map-region-pin`, `map-route-draw`
- **기법:** map, strokeDraw, keyframes, mask-reveal
- **앱 불러오기:** full

![미리보기](https://github.com/kingsae1/claude-admaker-skills/blob/main/samples/map/map_sample.gif)

## Prompt

```text
A 6-second 9:16 delivery ad over night-street footage. An outline map of Korea (white borders with a soft shadow, no fill) fades in, Seoul fills with the accent color and a pin pops, then a curved route draws from Seoul to Busan while the map zooms 1.55x toward the route. Busan lights up with its own pin and label. A bottom text band (30% height, max 0.6 opacity) carries a sub line and a headline with an underline wipe. Footage stays clearly visible.
```

## 결과에서 볼 것

면 없는 선 지도라 아래 영상이 그대로 보임, 지도 클립 전체에 같은 mapCamera 줌, 핀 팝은 holdFrom.

## 다시 만들기

`samples/map/README.md` (저장소 `samples/map/sample-map.mjs`).
