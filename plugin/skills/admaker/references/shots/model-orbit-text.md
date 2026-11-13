---
name: model-orbit-text
한 줄: 제품 3D 모델이 돌며 화면을 가로지르고, 그 뒤로 큰 문구 띠가 반대 방향으로 흘러 깊이가 생긴다
슬롯: 훅 | 주인공
에너지: 중고
길이: 3–5초
검증: 엔진 3.0.20 렌더 하니스 (내장 three `model` 장면 + 클립 keyframes x·z·angle, 뒤 Text 2줄 마키, 앞 Text 1줄)
엔진: Adapter three `model`(params spin·angle·tilt·zoom) + keyframes(x, z, angle) / Text keyframes(x) — 앱까지 그대로 감
---

## 의도
제품 하나가 "살아 움직이는" 순간을 3D로 만듭니다. 모델은 돌고(턴테이블), 클립 자체는 화면을 가로지르며 다가왔다 빠집니다. 뒤의 큰 문구는 반대 방향으로 흘러 시차(패럴랙스)가 생기고, 앞의 작은 문구가 정보를 줍니다. 층은 **뒤 문구 → 3D 모델 → 앞 문구** 세 겹입니다.

## 모델 구하기
- 사용자 제품 사진이 있으면 Agent(앱 MCP) `run_studio_tool` `ai.model3d.imageToModel { clipRef: 사진 클립, addToTimeline: false }`로 GLB를 만듭니다(유료, 먼저 크레딧을 알리고 확인). 결과 `data.glbUrl`을 광고 폴더 `assets/`에 내려받아 씁니다.
- 사진이 없고 소품·아이콘·콘셉트 오브젝트면 `run_studio_tool` `ai.model3d.textToModel { prompt: "물체 하나 설명(영문)", addToTimeline: false }`로 만듭니다(유료, 옵션별 비용은 `three.md` §5). 실제 브랜드 제품은 모양이 달라지니 사진으로 만듭니다.
- 앱 안에서 바로 쓸 때는 `addToTimeline`을 비우면 원본 시각 맨 위 행에 모델 클립이 들어가고, 움직임은 `update_clip { patch: { model: { spin, angle, tilt, zoom } } }`와 `animations`(keyframes)로 줍니다.
- 사진은 물체 하나가 온전히 보이고 배경이 단순해야 모델이 깨끗합니다. 배경이 복잡하면 먼저 `ai.image.removeBackground`.
- 앱으로 보낼 ProjectJSON은 모델을 data URL(`params.src`)로 담습니다(10MB 이하, `three.md` §5).

## 동작 핵심
- 모델: `spin` 90–150°/초로 빠르게 돌다가, 가운데 정지 구간(35–75%)에서 이징으로 정면을 보여 줍니다. 클립 keyframes는 `x`(화면 밖 → 0 → 반대편 밖), `z`(−600 → 0 → +120 다가옴 → −300 빠짐), `angle`(±15° 기울며 들어옴).
- 뒤 문구: 화면 폭보다 긴 같은 단어 반복(예 "FRESH FRESH"), 2줄을 서로 반대 방향으로 클립 길이 내내 `x` 선형 이동(700–900px). 색은 브랜드 2색, 모델보다 채도 높게.
- 앞 문구: 모델이 가운데 온 직후(30–40%)에 마스크 상승/블러 입장, 끝까지 정지.
- 박이 있으면 모델이 가운데 서는 순간과 앞 문구 입장을 박에 맞춥니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 모델 박스 | 화면 짧은 변의 65–75% (정사각) | 작으면 질감이 안 보임 |
| spin | 90–150°/초 | 200 넘으면 형태가 안 읽힘 |
| tilt | 8–15° | 크면 위에서 내려다보는 정적인 느낌 |
| 뒤 문구 크기 | 글자 높이 = 모델 박스의 30–40% | 모델보다 크면 주인공이 바뀜 |
| 뒤 문구 이동 | 클립 길이 동안 700–900px | 빠르면 읽히지 않고 어지러움 |
| 정지 | 가운데 ≥ 1.2초 | 앞 문구는 이 안에서 |

## 사운드
들어올 때 whoosh, 가운데 설 때 묵직한 착지음, 빠질 때 짧은 swish.

## 알려진 함정
- 층 순서는 트랙 순서 + `zIndex`로 정합니다: 뒤 문구 zIndex < 모델 < 앞 문구. `background`는 비워 투명으로 둡니다.
- 진한 브랜드 색 제품은 ACES 톤매핑에서 바랩니다(초록 → 민트). 색이 중요하면 `exposure` 0.85–0.95로 낮추고 스틸로 확인합니다.
- 뒤 문구가 모델 뒤에서 잘려 보이는 것이 의도입니다. 핵심 정보(가격·제품명)는 뒤 문구에 넣지 않고 앞 문구에.
- 한 광고에서 3D 모델 주인공은 한 번(three.md §1).

## 참조 구현
```jsonc
// 3D 모델 (트랙: 앞 문구 > 모델 > 뒤 문구 > 배경)
{ "type": "Adapter", "adapter": "three", "src": "assets/product.glb",
  "transform": { "x": 160, "y": 580, "width": 760, "height": 760, "zIndex": 20 },
  "params": { "scene": "model", "spin": 120, "angle": -40, "tilt": 10, "zoom": 1.05 },
  "animations": [{ "type": "keyframes", "options": { "duration": 4000000, "easing": "linear" }, "params": {
    "0%":   { "x": -700, "z": -600, "angle": -18, "easing": "easeOutCubic" },
    "35%":  { "x": 0, "z": 0, "angle": 0, "easing": "easeInOutSine" },
    "75%":  { "x": 0, "z": 120, "angle": 4, "easing": "easeInCubic" },
    "100%": { "x": 760, "z": -300, "angle": 16 } } }] }
// 뒤 문구 한 줄 (두 번째 줄은 x를 반대로: -500 → 300)
{ "type": "Text", "text": "FRESH FRESH", "transform": { "x": -400, "y": 560, "width": 2400, "height": 300, "zIndex": 5 },
  "style": { "fontWeight": 900, "fontSize": 280, "color": "#1E6B47", "align": "left", "verticalAlign": "middle" },
  "animations": [{ "type": "keyframes", "options": { "duration": 4000000, "easing": "linear" },
    "params": { "0%": { "x": 300, "opacity": 0 }, "8%": { "opacity": 1 }, "100%": { "x": -500 } } }] }
```
