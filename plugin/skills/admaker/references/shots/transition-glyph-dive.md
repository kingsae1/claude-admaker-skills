---
name: transition-glyph-dive
한 줄: 소재가 큰 글자 모양 안에서만 보이다가, 글자 획 속으로 수십 배 확대해 들어가 화면을 채우고 그대로 다음 장면이 됨
슬롯: 전환 (훅 → 주인공, 시그니처 샷 후보)
에너지: 중 → 최고
길이: 글자 등장 1–1.5초 + 확대 0.5–0.7초 (확대 끝 = 마디 첫 박)
엔진: Shape `path`(글자 패스) 매트 + 소재 `style.matte { mode: "alpha" }` + 매트 Shape keyframes `scale`·`x`·`y`, `templates/draw.mjs` `glyphDiveClips` (MCP `glyph_dive`)
검증: 엔진 3.0.28 렌더 하니스(Preview 스틸 + Exporter mp4), Black Han Sans 300px "SALE" → A 획 속으로 37배. 앱 불러오기는 style.matte → transform.matte, Shape path 그대로
---

## 의도
브랜드명·제품명·한 단어 훅을 **문이자 창**으로 씁니다. 처음에는 "글자 안에 소재가 비치는 타이틀"로 읽히고, 박에 맞춰 글자 획 속으로 빨려 들어가면 그 소재가 그대로 다음 장면이 됩니다. 컷 없이 제목에서 제품으로 넘어가서 광고에서 한 번만 쓰는 시그니처 전환으로 좋습니다.

## 동작 핵심
- **매트는 Text가 아니라 글자 패스 Shape**입니다(`textToPath`). 패스의 모양을 알아야 획 안의 점(P)을 계산할 수 있고, 박스가 패스 크기와 같아 위치가 정확합니다.
- P는 사람이 재지 않습니다. `glyphDivePoint`가 획 가장자리에서 가장 먼 점 중 글자 가운데에 가까운 점을 고릅니다(굵은 글꼴일수록 반지름 r이 커서 확대 배율이 낮아짐).
- scale은 박스 가운데 기준이라, 정지점마다 `x = −(P.x − 가운데.x) × (scale − 1)`, `y`도 같게 주면 P가 화면에서 제자리에 머뭅니다. 끝 배율은 `r × 배율 ≥ P에서 가장 먼 화면 모서리 × 1.15`.
- 순서: 글자 등장(말투: snap·crash·spring) → 정지 → 확대 직전 0.94로 살짝 움츠림(anticipation) → `easeInExpo`로 확대 → 확대가 끝나는 박에 **매트 없는 같은 소재 클립**으로 이어 붙임(매트 클립이 끝나면 alpha 대상은 사라지므로).
- 이어 붙인 소재는 1.08 → 1로 살짝 정착해 도착 충격을 줍니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 글자 | 2–6자, 굵기 800 이상 (Black Han Sans, Anton, Paperlogy 9 등 ttf·otf·woff) | 가는 글꼴은 r이 작아 배율이 100배를 넘고 확대가 늦게 느껴짐 |
| 글자 크기 | 화면 폭 70–85% (1080 폭이면 240–320px) | 작으면 소재가 안 읽힘 |
| `diveSec` | 확대 시작, 끝 박보다 0.5–0.7초 앞 | 0.4초 아래면 획 속으로 들어가는 게 안 보임 |
| `endSec` | 마디 첫 박·드롭 | 이 시각이 컷이자 다음 장면 시작 |
| `bg` | 글자 바깥 바탕 색(브랜드 바탕색) | 없으면 글자 바깥은 아래 트랙(앞 장면 소재)이 보임 |
| `prefer` | `center`(기본) · `left` · `right` · 0–1 | 들어갈 글자 쪽. 브랜드명 첫 글자로 들어가려면 `left` |

## 만들기
```js
import opentype from "opentype.js";
import { textToPath, glyphDiveClips } from "./draw.mjs";
const font = opentype.parse(fs.readFileSync("BlackHanSans-Regular.ttf").buffer);
const glyph = textToPath(font, "SALE", { fontSize: 300, align: "center" });
const { clips, point, endScale } = glyphDiveClips({
  glyph, centerX: 540, centerY: 900, canvas: { width: 1080, height: 1920 },
  startSec: 0, diveSec: 1.6, endSec: 2.2, untilSec: 4.0,
  footage: { type: "Video", src: "footage/hero.mp4" }, bg: "#F4F1EA", id: "dive", voice: "snap",
});
// clips: dive_bg(선택) · dive_in(매트 건 소재) · dive_glyph(글자 패스, 숨겨짐) · dive_out(매트 없는 같은 소재)
```
MCP: `glyph_dive({ text, font, fontSize, centerX, centerY, startSec, diveSec, endSec, untilSec, footage, bg })`가 같은 클립 묶음(JSON)을 돌려주니 ProjectJSON의 `clips`에 넣고 트랙을 하나씩 만들어 `import_to_admaker`로 넣습니다.

- 트랙 순서: `dive_glyph`가 `dive_in`보다 위, `dive_bg`는 맨 아래. 바닥 소재 자리를 비워 두는 MCP 순서(D)에서는 `footage.src`에 나중에 넣을 소재와 같은 클립을 두 번(`_in`·`_out`) 써야 하므로, 소재가 정해진 뒤 만들거나 `_in`·`_out` 두 클립의 src를 같이 바꿉니다.

## 사운드
움츠림에 짧은 riser·inhale, 확대 끝(컷)에 whoosh → 소재 장면 첫 박에 impact. whoosh는 컷보다 0.15초 먼저.

## 알려진 함정
- woff2 글꼴은 opentype.js가 못 읽습니다(ttf·otf·woff만). `fonts.json`에서 ttf 주소가 있는 글꼴을 고릅니다.
- `dive_in`과 `dive_glyph`의 표시 구간이 같아야 합니다. 매트가 먼저 끝나면 그 사이 소재가 사라집니다(`validate.mjs`가 경고).
- 확대 중간(배율 3–10)에 글자 가장자리가 화면에 크게 지나갑니다. 소재가 어두우면 글자 바깥 `bg`를 밝게 둬야 가장자리가 읽힙니다.
- 한 광고에 한 번만(시그니처). 트랙 매트 "글자 속으로"·`letterDive`와 같은 원리라 같이 쓰지 않습니다.
- 앱 Studio에는 매트를 거는 UI가 없어 가져오기(import_to_admaker)로만 넣습니다.

## 참조 구현
`templates/draw.mjs`의 `glyphDivePoint`·`glyphDiveClips`. 렌더 확인 영상은 프로젝트 파일 `samples/glyph-dive/`.
