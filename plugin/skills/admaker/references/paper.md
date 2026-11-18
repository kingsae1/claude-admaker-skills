# 종이 질감 (paper.mjs)

종이 바탕, 찢은 종이 조각, 그래픽 위 종이 결을 SVG 이미지로 만듭니다. SVG 필터(`feTurbulence`·`feDiffuseLighting`·`feDisplacementMap`)만 쓰므로 엔진(Image 클립, SVG data URL)과 앱(불러올 때 PNG로 래스터화) 양쪽에서 같게 나옵니다. 엔진 필터·셰이더가 필요 없습니다. 예제 `samples/paper-texture`.

## 언제 쓰나

- 모션 방향 `print-collage`, 수제·공방·문구·카페·베이커리·전시·책처럼 손맛이 톤인 광고
- 소재 씬 사이의 모션 전용 씬(인터루드), 엔드카드, 가격·정보 카드
- 손글씨(`handwritten-title`), 하프톤(`halftonePrint`), 종이 찢기(`paperTear`), `am-ink-bleed`와 잘 맞습니다.

**영상·사진 소재 위에는 얹지 않습니다.** 소재 위 구김 결 multiply는 사용자 검토에서 빠졌습니다(2026-11-18). 소재가 있는 장면에서는 찢은 종이 라벨(`paperCutSvg`)만 글자 받침으로 씁니다.

## 함수

```js
import { paperSvg, paperCutSvg, svgUrl, PAPER_TONES } from "./paper.mjs";

// ① 그래픽 장면 바탕 (zIndex 맨 아래)
image("bg", svgUrl(paperSvg({ W, H, tone: "cream", fold: 2, seed: 21 })), a, b, full);

// ② 찢은 종이 조각: 글자 받침·콜라주·테이프. 같은 박스에 Text를 겹쳐 둠
image("tag", svgUrl(paperCutSvg({ w: 960, h: 380, color: "#E8452C", seed: 5 })), a, b, box,
  { animations: [slap, { type: "lineBoil", options: { duration: us(b - a), easing: "linear" }, params: { amount: 1.6, scale: 16, fps: 8, variants: 3 } }] });

// ③ 그래픽 장면 맨 위: 흰 바탕 결만 multiply → 글자·조각이 같은 종이에 찍힌 듯
image("paper_ov", svgUrl(paperSvg({ W, H, overlay: true, crumple: 0.35, grain: 0.7, fiber: 0.3, speck: 0.3 })), a, b, full,
  { style: { blendMode: "multiply" } });
```

| `paperSvg` 값 | 기본 | 감각 |
|---|---|---|
| `tone` | `white` | `white` 미색, `cream` 크림, `kraft` 크라프트, `newsprint` 신문지, `gray` 판지, 또는 `#hex` |
| `crumple` | 0.5 | 넓은 요철 음영. 0.3 매끈한 모조지, 0.6 도화지 |
| `crease` | 0 | 구겼다 편 종이(각진 면 + 접힌 능선). 0.6–0.9. 바탕 전용, 글자가 많으면 0.5 이하 |
| `grain` | 0.6 | 고운 펄프 결 |
| `fiber` | 0.5 | 짧은 섬유. 크라프트는 0.8–0.9 |
| `fold` | 0 | 접힌 자국 줄 수(0–4). 편지·포스터 느낌은 2 |
| `speck` | 0.4 | 티끌·옅은 물 얼룩. 신문지는 0.8 |
| `scale` | 1 | 결 크기 배율. 1:1·16:9에서도 1 그대로 |
| `seed` | 11 | 장면마다 바꿔야 같은 종이가 반복돼 보이지 않음 |
| `overlay` | false | true면 흰 바탕 결만(곱하기용) |

| `paperCutSvg` 값 | 기본 | 감각 |
|---|---|---|
| `w`, `h` | | 박스 크기. 가장자리 18px는 그림자·찢김 여백이라 Text 박스를 같게 두면 글자가 가운데 옴 |
| `color` | `#F6F3EC` | 종이 색. 찢긴 단면은 자동으로 흰 섬유색 |
| `rough` | 9 | 찢김 거칠기(px). 카드 6, 테이프 4, 거친 색종이 9–12 |
| `shadow` | true | 아래 그림자 |

## 모션

- 조각은 살짝 크게(1.18배)·더 기운 채 나타나 0.22초 `easeOutBack`으로 제자리에 탁 붙습니다. 조각 사이 0.3–0.4초, 박에 맞춥니다.
- 조각마다 `lineBoil`(amount 1.5–2, fps 8, variants 3)을 붙이면 손으로 오려 붙인 스톱모션처럼 삽니다. 글자에는 붙이지 않습니다(읽기 어려움).
- 바탕 종이는 움직이지 않습니다. 결을 프레임마다 흔들면 종이가 아니라 필름 그레인처럼 보입니다.

## 함정

- SVG 크기(base64): 화면 가득한 종이 한 장이 90–250KB(섬유·구긴 면이 많을수록 큼), 조각은 10–20KB. 바탕은 장면마다 1장, 오버레이는 1장이면 충분합니다.
- `blendMode`는 엔진에 normal·add·multiply·screen·darken·lighten뿐입니다(overlay·soft-light 없음). 오버레이는 흰 바탕 multiply로만 씁니다.
- 실사 종이 스캔이 꼭 필요하면 CC0(ambientCG 등) PNG를 같은 자리에 넣습니다. Remotion `paper()`는 Remotion 라이선스라 옮겨 쓰지 않고, 셰이더가 필요해지면 원본 Paper Shaders(Apache-2.0)에서 엔진 필터로 포팅합니다.
