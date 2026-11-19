# 텍스트 애니메이션 20종

글자 자체가 주인공인 한 줄 문구(훅·가격·혜택·엔드카드 카피)를 움직이는 방법 20가지입니다. 페이드·슬라이드만 반복하지 않고 문구의 뜻에 맞는 것을 고릅니다(사용자는 굵고 요즘 느낌의 모션을 선호).

- 코드: `templates/text-fx.mjs` `textFx(id, opts)` → `{ clips, tracks, notes }`. 클립을 ProjectJSON에 넣고 `tracks`를 순서대로(앞 = 위) 트랙으로 만듭니다.
- MCP: `text_fx` 도구가 같은 함수를 부릅니다(앱 타임라인은 바꾸지 않고 클립 묶음만 돌려줌 → `import_to_admaker`로 넣음).
- 렌더 확인 샘플: 프로젝트 파일 `samples/text-animations-20/`(9:16, 5종씩 4화면).
- 엔진 3.0.33+(`scramble`·`typewrite`·`charWave` 모션, `focus_in`·`blur_drop` 프리셋)이 필요한 효과는 표에 표시했습니다. 낮은 엔진에서는 그 모션이 무시되어 글자가 그냥 보입니다.

## 1. 입력

```js
import { textFx } from "./text-fx.mjs";
import { fontStyle } from "./fonts.mjs";
const r = textFx("decode-marker", {
  text: "CODE",
  box: { x: 90, y: 820, width: 900, height: 220 },        // Text 클립 상자(캔버스 px)
  style: { ...fontStyle(brand.fonts.display), fontSize: 200, color: "#111111" },
  accent: brand.accent,                                     // 강조색(밑줄·마커·라벨·반전 글자)
  startSec: 1.0, endSec: 4.0,                               // 묶음 전체 표시 구간
  id: "hook",                                               // 클립 id 앞머리
  // ink: { x, y, width, height }  실제 글자 범위. 없으면 글자 수로 어림(가운데 정렬 기준)
});
```

- 밑줄·마커·박스·링은 글자 범위(`ink`)에 붙습니다. 어림이 어긋나면(특수 폰트·넓은 자간) 앱에서는 `measure_text_range`로 잰 값을, 로컬에서는 `draw.mjs` `textToPath`의 범위를 `ink`로 넘깁니다.
- 한국어 문구도 됩니다. `scramble`은 한글을 한글 음절로 돌립니다. 단어 단위 효과(fade-up·word-stagger)는 어절 기준입니다.

## 2. 20종 표

| id | 영상 이름 | 모습 | 만드는 법 | 엔진 | 앱 |
|---|---|---|---|---|---|
| `typewriter` | Typewriter | 한 글자씩 쳐지고 커서가 깜빡임 | Text + `typewrite` | 3.0.33 | ○ |
| `fade-up` | Fade Up | 단어가 떠오르고 강조색 밑줄이 그어짐 | `rise`(word) + 사각형 scaleX | | ○ |
| `blur-in` | Blur In | 벌어진 흐린 글자가 모이며 또렷 | `focus_in` | 3.0.33 | ○ |
| `tracking-expand` | Tracking Expand | 자간이 벌어지고 밑줄이 가운데서 퍼짐 | paint `letterSpacing` + 사각형 scaleX | | ○ |
| `marker-highlight` | Marker Highlight | 기울어진 형광펜 띠가 왼쪽부터 칠해짐 | 사각형 `wipe` + skewX, 글자는 위 | | ○ |
| `word-stagger` | Word Stagger | 단어가 차례로 오르고 마지막 단어 뒤 박스 팝 | `rise`(word) + 박스 scale | | ○ |
| `count-up` | Number Count-up | 숫자가 오르고 끝에 `+`가 강조색으로 튐 | `countUp` + 접미사 Text 팝 + 라벨 | | ○ |
| `scramble` | Scramble Decode | 무작위 글자가 원래 글자로 해독, 끝에 강조색 | `scramble` + paint color | 3.0.33 | ○ |
| `rgb-glitch` | RGB Glitch | 빨강·청록 잔상이 어긋나 떨리다 맞춰짐 | Text 3벌(screen) + steps keyframes | | ○ |
| `letter-flip` | Letter Flip | 글자가 가로축으로 뒤집혀 섬 | `flip_in_x` | | ○ |
| `sine-wave` | Sine Wave | 글자가 물결을 따라 계속 오르내림 | `charWave` | 3.0.33 | ○ |
| `split-reveal` | Split Reveal | 글자가 위아래로 갈라지고 사이에 라벨 | 같은 Text 2벌 + 반쪽 사각형 매트(같이 움직임) + 라벨 | | ○ |
| `depth-extrude` | 3D Extrude | 입체 두께가 자라며 글자가 떠오름 | `style.extrude` + paint `extrude` 0→1 | | ✕ 구움 |
| `liquid-fill` | Liquid Fill | 윤곽 글자 안에 물결 친 액체가 차오름 | 윤곽 Text + 채운 Text(물결 path 매트) | | ○ |
| `decode-marker` | Decode Marker | 해독 → 커서 → 박스가 칠해지며 글자 색 반전 | `scramble` + 박스 `wipe` + 강조색 글자(박스 매트) | 3.0.33 | ○ |
| `blur-bounce` | Blur Bounce | 흐리고 기운 글자가 떨어져 튀며 자리잡음 | `blur_drop` | 3.0.33 | ○ |
| `zoom-shake` | Zoom Shake | 거대한 흐린 글자가 쾅 박히고 충격 링·흔들림 | keyframes scale 3.4→1 + `shake` + 원 테두리 확산 | | ○ |
| `strike-swap` | Strike Rotate | 취소선 → 단어가 굴러 올라가고 새 단어가 굴러 들어옴 | 사각형 scaleX + rotateX 키프레임 2벌(`next`) | | ○ |
| `rise-squiggle` | Rise Squiggle | 글자가 솟고 물결 밑줄이 그려짐 | `rise`(char) + path `strokeDraw` | | ○ |
| `outline-extrude` | Outline Extrude | 윤곽선 글자가 채워지며 두께가 생김 | 윤곽 + paint `color`·`extrude` | | ✕ 구움 |

앱 칸 ✕ = 앱 text_segment 렌더러가 `extrude`를 아직 그리지 않아 평범한 글자로 보임. 앱에서 고칠 광고면 그 클립만 영상으로 구워 넣습니다.

## 3. 고르는 법

| 문구의 뜻 | 1순위 | 대안 |
|---|---|---|
| 정보·숫자·스펙("10,000+ 판매") | `count-up` | `scramble`(코드·보안·테크) |
| 비포→애프터, 고정관념 깨기("싸구려? 아니 프리미엄") | `strike-swap` | `split-reveal`(숨은 답을 라벨로) |
| 혜택 한 단어 강조("오늘만 50%") | `marker-highlight` | `word-stagger`(마지막 단어가 혜택일 때), `decode-marker` |
| 훅·드롭·충격("BOOM", "드디어") | `zoom-shake` | `rgb-glitch`(테크·음악), `depth-extrude` |
| 차오름·완성·충전("가득", "100% 충전") | `liquid-fill` | `outline-extrude`(레벨업·게임) |
| 대화·검색·질문("뭐 먹지?") | `typewriter` | `scramble` |
| 귀엽고 경쾌함(키즈·간식·펫) | `blur-bounce` | `sine-wave`, `rise-squiggle` |
| 차분·고급(뷰티·호텔) | `blur-in` | `tracking-expand`, `fade-up` |

- 한 광고에 텍스트 효과는 2–3종까지, 같은 효과를 연속 장면에 쓰지 않습니다(variety.md).
- 효과의 쾅·완성 시각(zoom-shake 박힘, count-up 끝, strike-swap 교체, decode-marker 반전)을 마디 첫 박·효과음 피크에 맞춥니다. 각 효과의 시각 옵션: `slamSec`, `countSec`, `swapSec`, `scrambleSec`, `fillSec`, `holdSec`, `typeSec`.
- 영상 위에 얹을 때는 글자 뒤 바탕(단색 띠·박스) 없이도 읽히는지 확인합니다. 밝은 장면에서 흰 글자 효과(rgb-glitch screen 잔상 등)는 대비가 떨어집니다.

## 4. 효과별 옵션

공통: `text`, `box`, `style`, `accent`, `color`(글자색, 기본 `style.color`), `startSec`, `endSec`, `id`, `ink`.

- `typewriter`: `caret`("|"), `typeSec`. 가운데 정렬이면 줄이 자라며 가운데를 유지, 커서 위치를 고정하려면 `style.align: "left"`.
- `tracking-expand`: `tracking`(벌어진 자간 px, 기본 0.32em). `box.width`는 벌어진 폭보다 넓게.
- `word-stagger`: `lastWordInk`(마지막 단어 범위, 없으면 어림).
- `count-up`: `from`(기본 0), `suffix`("+", "%", "원"), `label`(아래 작은 글씨), `countSec`.
- `scramble`: `chars`, `reveal`, `scrambleSec`. `accent`가 있으면 다 풀린 뒤 강조색으로.
- `rgb-glitch`: `glitchSec`. 어두운 바탕용(screen). 밝은 바탕이면 잔상 `style.blendMode`를 `multiply`로.
- `sine-wave`: `amplitude`(em 비율, 0.16), `period`, `wavelength`, `rotate`.
- `split-reveal`: `label`("REVEAL"), `labelColor`, `gap`(px, 기본 0.42em), `holdSec`.
- `depth-extrude`·`outline-extrude`: `depth`, `angle`, `depthColor`(기본 글자색을 어둡게).
- `liquid-fill`: `fillSec`. 글자색이 액체 색. 밝은 단색 바탕이 잘 보입니다.
- `decode-marker`: `scrambleSec`. `accent` = 반전 글자색, `color` = 글자·박스 색.
- `zoom-shake`: `slamSec`, `ringColor`.
- `strike-swap`: `next`(바뀔 단어), `oldColor`, `swapSec`. 새 단어는 강조색.

## 5. 함정

- 엔진은 `delay` 전에는 keyframes·paint·마스크를 적용하지 않습니다. `text-fx.mjs`는 늦게 시작하는 동작도 클립 시작부터 0%를 붙잡는 keyframes로 만들고, 마스크(wipe) 클립은 그 시각에 클립을 시작합니다. 손으로 고칠 때도 이 규칙을 지킵니다.
- `scramble`·`typewrite`·`charWave`·`countUp`과 `characterAnimation`을 한 클립에 같이 쓰지 않습니다(글자 단위 렌더러가 글자 내용 변경을 그리지 않음). `validate.mjs`가 경고합니다.
- 매트(split-reveal·liquid-fill·decode-marker)는 매트 클립이 대상보다 먼저 끝나면 대상이 사라집니다. 묶음의 시간을 바꿀 때 같이 바꿉니다.
- 로컬 렌더에서 `characterAnimation`은 렌더 하니스(`render/char-anim.js`)가 text_segment 렌더러로 그립니다(엔진 Text 클립은 그리지 않음).
