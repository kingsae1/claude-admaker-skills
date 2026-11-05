# 드로잉: 기본 도형·폰트 밖의 모양 그리기

기본 Shape 19종과 폰트 스타일로 안 되는 모양은 직접 그립니다. 결과는 모두 `Shape` 클립 하나(`shapeType: "path"` 또는 `"brush"`)라서 Studio에서 그대로 열리고, `strokeDraw`로 "그려지는" 모션을 줄 수 있습니다.

- 스킬: `templates/draw.mjs` (`annotationPath`, `annotationBox`, `smoothPoints`, `simplifyPoints`, `roughenPath`, `pathToSvg`, `textToPath`)
- MCP: `draw_path`, `draw_annotation`, `text_to_path` (같은 계산)
- 도형 **PNG 파일**이 여러 장 필요하면: 스킬 `templates/shape-pngs.mjs`, MCP `make_shape_pngs` — 한 장의 시트에 모두 그려 잘라 씁니다(아래 "도형 PNG 여러 장")
- 엔진: `@admaker/engine` 3.1 이상(브러시·regionFilters·blendMode·fillRule). `path` + stroke + `strokeDraw`만 쓰는 손그림 강조와 글자 패스는 3.0.5에서도 그려집니다.

## 언제 쓰나

| 쓰임 | 방법 | 판단 |
|---|---|---|
| 핵심 단어·가격 강조 | 손그림 강조(underline, circle, arrow, check …) + `strokeDraw` 0.5–0.7초 | 장면당 1개, 많아도 2개. 대상이 자리잡은 뒤 0.2–0.4초에 그린다 |
| 형광펜 | 노란 `brush` + `blendMode: "multiply"`, 글자 아래 트랙 | 밝은 배경 위 글자에서만. 어두운 배경이면 `screen` |
| 손글씨·붓 터치 | `brush` (`simulate: true`, `taperEnd`) | 브랜드 톤이 손맛·친근함일 때. 정보 전달 문구에는 쓰지 않는다 |
| 특수 레터링 | `text_to_path` → stroke만 + `strokeDraw`(윤곽선 타이틀), 굵은 stroke 아래 + 얇은 stroke 위(이중 외곽선), 같은 패스 2–4장을 4–8px씩 어긋나게(입체), `gradient` 면 | 훅·엔드카드의 큰 글자 한 줄. 본문·자막은 Text 클립 그대로 |
| 자유 도형 | `draw_path` points + `smooth`/`closed` (배지, 리본, 물결 구분선, 말풍선 꼬리) | 같은 모양이 반복되면 한 번 만든 d를 재사용 |
| 영역 효과 | 닫힌 path/brush에 `regionFilters`(흑백, 채도, 모자이크, 글로우) 또는 `backdropBlur` | 도형 아래 트랙의 클립만 걸러진다. 효과는 주인공 하나에 한 번(aesthetic-rules Q4) |

## 손그림 강조

```js
import { annotationPath, annotationBox } from "./draw.mjs";
const target = { x: 200, y: 900, width: 680, height: 140 };   // 강조할 글자 상자
const box = annotationBox("circle", target);                  // 대상 둘레 상자
const sw = 8;
const mark = annotationPath("circle", box.width, box.height, { seed: 3 });
const clip = {
  type: "Shape", src: "shape", shapeType: "path",
  timing: { display: { from: 1.3e6, to: 4e6 } },
  transform: { x: box.x - sw / 2, y: box.y - sw / 2, width: box.width + sw, height: box.height + sw, zIndex: 30 },
  style: { path: mark.path, viewBox: [0, 0, box.width, box.height], fill: "transparent", fillOpacity: 0, stroke: { color: "#FF3B5C", width: sw, cap: "round", join: "round" } },
  animations: [{ type: "strokeDraw", options: { duration: 600000, easing: "easeInOutCubic" }, params: { fill: "none" } }],
};
```

| 항목 | 값 | 조절 감각 |
|---|---|---|
| 종류 | underline · doubleUnderline · strike · circle · box · arrow · check · cross · bracket | 가격 할인은 strike(이전 가격) + circle(새 가격) |
| 선 굵기 | 대상 높이의 5–7% | 너무 얇으면 영상에서 안 보임 |
| 그리기 시간 | 0.5–0.7초, `easeInOutCubic` | 1초 넘으면 늘어짐 |
| seed | 아무 정수 | 같은 seed = 같은 흔들림. 여러 개면 seed를 다르게 |
| roughness | 기본(상자 짧은 변의 1.5%) | 0이면 깨끗한 선 |
| 색 | 브랜드 강조색 1개 | 대상 글자색과 다른 색 |

선 굵기만큼 상자를 넓혀야(위 `sw` 처리) 선이 잘리지 않습니다. MCP `draw_annotation`은 이것까지 해 줍니다.

## 브러시 획

```js
{ type: "Shape", src: "shape", shapeType: "brush",
  transform: { x: 120, y: 860, width: 840, height: 120, zIndex: 18 },
  style: { fill: "#FFE066", blendMode: "multiply", points: [0, 60, 420, 52, 840, 58], viewBox: [0, 0, 840, 120],
           brush: { size: 80, thinning: 0.2, simulate: true, taperEnd: 60 } },
  animations: [{ type: "strokeDraw", options: { duration: 500000, easing: "easeOutCubic" }, params: { fill: "none" } }] }
```

- `points`는 중심선, `size`는 최대 굵기(px), `thinning` 0이면 일정한 굵기, `simulate`는 가운데가 굵고 끝이 가는 붓펜, `taperStart/End`(px)는 끝을 뾰족하게.
- 색은 `fill`. `strokeDraw`를 주면 획이 앞에서부터 자랍니다(윤곽선이 아니라 획 자체).

## 글자 패스

```js
import opentype from "opentype.js";
import { textToPath } from "./draw.mjs";
const font = opentype.parse(fs.readFileSync("Anton-Regular.ttf").buffer);
const t = textToPath(font, "SALE", { fontSize: 220, align: "center" });
// 윤곽선만 그려지는 타이틀
{ type: "Shape", src: "shape", shapeType: "path",
  transform: { x: 540 - t.width / 2, y: 300, width: t.width + 6, height: t.height + 6, zIndex: 40 },
  style: { path: t.path, viewBox: t.viewBox, fill: "#FFFFFF", fillOpacity: 1, stroke: { color: "#FFFFFF", width: 6 } },
  animations: [{ type: "strokeDraw", options: { duration: 1200000, easing: "easeInOutCubic" }, params: { fill: "after" } }] }
```

- 폰트는 `fonts.json`에 있는 것만, ttf·otf·woff 파일만(woff2는 opentype.js가 못 읽음).
- 패스가 된 글자는 앱에서 텍스트로 고칠 수 없습니다. 원문·폰트를 클립 `metadata.drawing`에 남기고, 문구가 자주 바뀌는 광고에는 쓰지 않습니다.
- 한글은 글자 수가 많으면 패스가 커집니다(한 줄 8자 이내 권장).

## 도형 PNG 여러 장 (시트 한 장에 그려 자르기)

스티커·배지·아이콘·구분선처럼 **이미지 파일(PNG)** 이 필요한 간단한 도형이 2장 이상이면, 하나씩 스크립트·브라우저를 돌리지 않고 한 번에 만듭니다. 모든 도형을 시트 SVG 한 장에 칸으로 배치해 **한 번만 래스터화**한 뒤 칸마다 잘라 저장합니다. 60장 기준 하나씩 만들면 약 30초, 시트로는 약 0.6초입니다.

- MCP가 있으면(설치 없음, 앱이 그림): `make_shape_pngs { items, scale?, outDir?, upload?, addToTimeline? }`.
  - **앱에 올리거나 타임라인에 놓을 때는 시트 모드(기본)**: 잘라 낸 N장을 올리지 않고 시트 PNG 한 장만 올립니다(업로드 1번, 업로드 라이브러리도 1개). `addToTimeline: true`면 도형마다 같은 시트 미디어를 클립으로 놓고 `crop_clip`으로 칸 위치만 다르게 줍니다. 클립 크기는 `width`·`height`, 위치는 `x`·`y`(왼쪽 위 캔버스 px). 결과 `cells[].crop`을 기억해 두면 같은 도형을 나중에 `add_media_to_timeline { mediaId: media[0].id }` + `crop_clip { crop }`으로 더 놓을 수 있습니다.
  - 파일 자체가 필요하면(다른 도구 입력, 사용자에게 줄 PNG) `mode: "files"`(올리지 않을 때 기본) → 칸마다 잘린 `files[].path`.
- 스킬만 있으면(Playwright 필요, `install-engine.mjs --render`): `node shape-pngs.mjs shapes.json out/shapes [--scale 2] [--sheet]` → `out/shapes/<name>.png` + `shapes.json`(이름·크기·경로, 시트 안 칸 좌표 `crop`). `--sheet`는 자르기 전 시트(`_sheet-1.png`)를 남겨 한 번에 검수합니다.
- 모듈로 쓰려면 `templates/shape-sheet.mjs`의 `buildShapeSheets(items, opts)` → 시트 SVG·칸 좌표, `rasterizeSheets(sheets)`(브라우저 안에서 실행) → 칸별 PNG data URL.

```json
[
  { "name": "badge-sale", "shape": "burst", "width": 320, "height": 320, "fill": { "from": "#FF4D4F", "to": "#FFB547", "angle": 135 } },
  { "name": "star", "shape": "star", "width": 128, "height": 128, "fill": "#FFC83D", "stroke": { "color": "#7A4B00", "width": 6 } },
  { "name": "arrow-down", "shape": "arrow", "width": 120, "height": 200, "fill": "#2D6CDF", "rotate": 90 },
  { "name": "pill", "shape": "roundRect", "width": 400, "height": 120, "radius": 60, "fill": "#111111", "shadow": { "blur": 10, "y": 6 } },
  { "name": "logo-mark", "svg": "<svg viewBox='0 0 100 100'>…</svg>", "width": 256 }
]
```

| 키 | 뜻 |
|---|---|
| `shape` | `rect` `roundRect` `circle` `ellipse` `triangle` `diamond` `polygon`(`sides`) `star`(`points`, `innerRatio`) `burst`(별 16꼭지, 세일 배지) `heart` `arrow`(오른쪽, `headRatio`) `ring`(`thickness` 0–1) `line`(굵기 = 높이 또는 `stroke.width`) |
| `svg` | 직접 그린 `<svg viewBox=…>` 전체. 여러 장의 그라데이션 id가 같아도 칸마다 접두사를 붙여 섞이지 않음. viewBox가 있으면 `width`나 `height` 하나만 줘도 됨 |
| `width`·`height` | PNG 픽셀(× `scale`). `rotate`를 줘도 PNG 크기는 그대로이고 도형을 돌려 칸 안에 맞춤 |
| `fill` | 색, 또는 `{ from, to, angle }` 선형 그라데이션(CSS 각도: 90 = 왼→오, 180 = 위→아래). 선만이면 `"none"` + `stroke` |
| `stroke` · `opacity` · `padding` · `shadow` | 선 `{ color, width, dash? }`, 불투명도, 칸 안쪽 여백, 그림자 `{ color, blur, x, y, opacity }`(그림자는 잘리지 않게 여백이 자동으로 붙음) |

- 한 번에 200장, 한 장 4096px까지. 시트가 8192px을 넘으면 시트를 여러 장으로 나눠 그립니다(결과는 같음).
- 편집기 안에서 움직이거나 나중에 모양·색을 고칠 도형은 PNG가 아니라 `Shape` 클립(기본 도형, `draw_path`)으로 넣습니다. PNG는 파일이 꼭 필요할 때(업로드 라이브러리 스티커, 다른 도구의 입력, 템플릿 썸네일) 씁니다.
- 글자는 SVG `<text>`에 넣지 않습니다(PC 폰트에 따라 달라짐). 글자가 필요하면 `text_to_path`의 `d`를 `svg`에 넣습니다.

## 알려진 함정

- 앱은 엔진 버전 태그를 따릅니다. `brush`, `regionFilters`, `blendMode`, `fillRule`은 앱 엔진이 3.1 이상이어야 보입니다. 그 전에는 `path` + stroke만 씁니다.
- 영역 효과·블렌드는 브라우저 렌더 전용입니다(서버 인코딩은 쓰지 않음).
- `overlay`, `color` 블렌드는 아직 없습니다. 색 바꾸기는 `regionFilters`의 `hslAdjustmentFilter`(colorize)로 합니다.
- 이미지 속 객체 자동 마스킹(영역 찾기)은 아직 없습니다. 영역은 좌표를 직접 정합니다.
