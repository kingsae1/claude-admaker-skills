# admaker 엔진 레시피

연출 문서의 기법을 `@admaker/engine` ProjectJSON으로 옮기는 방법입니다. 렌더 기준은 **브라우저 `Exporter`**입니다.
기준 버전: `@admaker/engine` 3.0.5 (admaker-plugin `14ef6ee`, three 어댑터 + 씬 훅 `attach`/`render` 포함), `@admaker/animation` 2.0.7. 엔진이 바뀌면 이 문서의 이름·파라미터를 엔진 타입 정의와 다시 대조합니다.

> 엔진은 사내 전용 비공개 패키지입니다. 엔진 소스를 이 스킬이나 프로젝트 폴더로 복사하지 않고, 설치된 패키지(`node_modules/@admaker/*`)를 import해서 씁니다.

## 0. 확인 절차 (매 프로젝트 첫 단계)

1. 엔진 설치 위치를 찾습니다: admaker 앱의 `node_modules/@admaker/engine`, 또는 admaker-plugin 모노레포 빌드 결과.
2. 버전을 확인합니다(`package.json`). 이 문서의 기준 버전과 다르면 `dist/index.d.ts`에서 `ProjectJSON`, `ClipJSON`, `AnimationJSON`, `ANIMATABLE_PROPERTIES`, 애니메이션 레지스트리 이름을 다시 확인합니다.
3. Text·Caption·Shape의 `style` 필드는 버전마다 늘어나므로, 모르는 필드는 **앱에서 만든 프로젝트를 `preview.exportToJSON()`으로 내보낸 참조 JSON**에서 그대로 가져옵니다. 추측해서 필드를 만들지 않습니다.

## 1. ProjectJSON 뼈대

```jsonc
{
  "settings": { "width": 1080, "height": 1920, "fps": 30, "backgroundColor": "#000000" },
  "tracks": [ { "id": "t_text", "name": "text", "type": "Text", "clipIds": ["c_title"] } ],
  "clips": {
    "c_title": {
      "type": "Text",
      "timing": { "display": { "from": 0, "to": 2000000 }, "duration": 2000000, "playbackRate": 1 },
      "transform": { "x": 120, "y": 800, "width": 840, "height": 200, "angle": 0, "opacity": 1, "zIndex": 10 },
      "style": { /* 참조 JSON에서 */ },
      "animations": []
    }
  },
  "transitions": []
}
```

- **시간 단위는 μs**입니다(1초 = 1,000,000). 타임라인은 초/비트로 쓰고 컴파일 단계에서 변환합니다. 비주얼 온셋은 프레임 경계에 맞춥니다: `us = Math.round(frame * 1e6 / fps)`.
- 클립 타입: `Video`, `Audio`, `Image`, `Text`, `Caption`, `Shape`, `Backdrop`, `Effect`, `Transition`, `Placeholder`, `Adapter`.
- 겹침 순서는 `transform.zIndex`와 트랙 순서로 정합니다.
- 오디오 클립은 `volume`, `fadeIn`/`fadeOut`(`{duration, curve}`)만 가집니다.

## 2. 움직임 (`clip.animations[]`)

항목 모양: `{ "type": "<이름>", "options": { "duration": μs, "delay": μs, "easing": "<이름>", "iterCount"?: n, "direction"?: "normal|reverse|alternate" }, "params": { … } }`
`delay`는 **클립 시작 기준**입니다.

### 2.1 keyframes (기본 도구)

```jsonc
{ "type": "keyframes",
  "options": { "duration": 600000, "delay": 0, "easing": "linear" },
  "params": {
    "0%":   { "y": 60, "opacity": 0, "blur": 8, "easing": "easeOutQuart" },
    "100%": { "y": 0,  "opacity": 1, "blur": 0 } } }
```

- `x`, `y`, `angle`, `width`, `height`는 **기본값에 더하는 오프셋**, `scale`, `opacity` 등은 **곱하는 값**입니다.
- 쓸 수 있는 키: `x y width height scale scaleX scaleY opacity angle blur brightness mirror motionBlur rotateX rotateY perspective`.
- stop의 `easing`은 그 stop에서 다음 stop까지의 구간에 적용됩니다. 구간 이징을 쓸 때는 `options.easing`을 `"linear"`로 둡니다.
- 입장 3종 세트(위치/scale + opacity + blur→0)는 이것 하나로 만듭니다.

### 2.2 이징 매핑

엔진은 cubic-bezier를 받지 않습니다. 이름형 이징(`easeOutCubic` 등, `easeOutBack` 같은 별칭, gsap 문자열 `"power2.out"`)만 받고, 모르는 이름은 **선형으로 조용히 처리**하므로 오타에 주의합니다.

| 원래 의도 | 쓸 이름 |
|---|---|
| 정밀 스냅 `cubic-bezier(.7,0,.2,1)` (Swiss 스타일) | `easeInOutQuart` (더 날카롭게: `easeInOutExpo`) |
| 입장 기본 감속 | `easeOutCubic` / `easeOutQuart` |
| 퇴장(입장보다 빠르게) | `easeInCubic` |
| 라인 그리기, 플레이헤드, "예외" 요소 | `linear` |
| 오버슈트(브랜드가 허용할 때만) | `easeOutBack` |

정확한 커브가 꼭 필요하면 keyframes에 중간 stop을 3–5개 넣어 근사합니다.

### 2.3 복합 동작 — gsapTimeline

한 클립의 연속 동작(올라오며 커지다가 살짝 기울어짐 등)은 `gsapTimeline` 하나로 씁니다.
`params.tweens = [{ to: {…}, from?: {…}, duration: 초, ease: "power3.out", position: "<" | "+=0.1" | 초, repeat?, yoyo? }]`
속성: `x y scale scaleX scaleY angle opacity blur brightness rotateX rotateY`.

### 2.4 마스크 등장

| type | params | 용도 |
|---|---|---|
| `wipe` | `direction` | 라인·패널·사진 리빌 |
| `circleReveal` | `originX`, `originY` | 제품 포커스, 아이리스 |
| `rectExpand` | `rect` | 프레임 속 프레임이 열림 |
| `angleWipe` | `angle` | 사선 와이프(다이내믹) |
| `centerExpand` | `axis` | 가운데서 벌어지는 바·라벨 |
| `starReveal` | `points`, `innerRatio` | 이벤트성(자제) |
| `blockReveal` | `cols`, `rows`, `seed` | 그리드 스타일 빌드 |

공통: `reverse` 또는 `mode: "out"`으로 퇴장. 트랙 단위 마스크가 필요하면 다른 클립을 알파 마스크로 씁니다.

### 2.5 기타 모션

- `countUp` (Text 전용): 가격·통계 숫자 롤. `from`, `to`, `decimals`, `separator`.
- `strokeDraw`, `paint` (Shape 전용): 선이 그려지기, 색 채우기.
- `unfold` / `fold`: 접혀 있던 것이 펼쳐짐.
- `shake`: `frequency`, `decay`. 제품 광고에서는 거의 쓰지 않습니다(aesthetic-rules Q3).
- 반복·경로 모션은 `@admaker/animation`의 `compileAnimation()`으로 만들면 keyframes로 변환되어 나옵니다(loop 8종, path 6종 + custom).

### 2.6 입장·퇴장 기본형 (aesthetic-rules R6–R8)

입장은 속성 3개를 함께, 퇴장은 그 절반 길이로 반대 방향에 씁니다. 같은 클립에 둘 다 넣고, 퇴장은 `delay`로 클립 끝에 붙입니다.

```jsonc
// 입장 0.6초: opacity + y + scale (+ 필요하면 blur)
{ "type": "keyframes", "options": { "duration": 600000, "delay": 0, "easing": "linear" },
  "params": { "0%": { "opacity": 0, "y": 40, "scale": 0.96, "easing": "easeOutExpo" },
              "100%": { "opacity": 1, "y": 0, "scale": 1 } } }
// 퇴장 0.3초: 클립 길이 − 0.3초에 시작
{ "type": "keyframes", "options": { "duration": 300000, "delay": 2700000, "easing": "linear" },
  "params": { "0%": { "opacity": 1, "y": 0, "easing": "easeInCubic" },
              "100%": { "opacity": 0, "y": -40 } } }
```

- 한 클립의 animations는 **합성됩니다**. x·y·angle은 더하고, scale·opacity는 곱하고, blur·motionBlur는 큰 값을 씁니다. 그래서 입장·퇴장·카메라·숨쉬기를 각각 따로 넣어도 됩니다.
- 시작 전(`delay` 이전)에는 0% 값이 적용되고 끝난 뒤에는 100% 값이 유지됩니다. 입장 0%는 숨긴 상태, 퇴장 0%는 항등값(opacity 1, 오프셋 0)으로 써야 겹쳐도 깨지지 않습니다.
- 여러 클립의 시차(R7): i번째 클립 입장 `delay = i × (3–6프레임)`. `build-project.mjs`의 `entrance(…, { index })`가 계산합니다.

### 2.7 Ken Burns (aesthetic-rules Q12)

```jsonc
{ "type": "keyframes", "options": { "duration": <클립 길이 μs>, "delay": 0, "easing": "linear" },
  "params": { "0%": { "scale": 1, "x": 0, "easing": "easeInOutSine" },
              "100%": { "scale": 1.08, "x": -25 } } }
```

- 짝수 번째 샷은 반대로(1.08→1, x −25→0) 써서 줌인·줌아웃을 번갈아 씁니다.
- 풀블리드 사진은 확대돼도 프레임 밖이 잘려 문제가 없습니다. 카드 안 사진은 클립이 카드 밖으로 커지므로, 사진을 카드보다 8–10% 크게 놓고 카드 모양 마스크(§2.4 `rectExpand` 최종 상태 유지) 안에 두거나, scale 상한을 1.03으로 낮춥니다.
- 원본은 최종 표시 크기 × 최대 scale × 2 이상(Q2).

### 2.8 숨쉬기 (aesthetic-rules Q13)

입장이 끝난 뒤부터 반복하는 keyframes를 하나 더 넣습니다.

```jsonc
{ "type": "keyframes",
  "options": { "duration": 3000000, "delay": <입장 끝 μs>, "easing": "linear", "iterCount": <남은 길이 ÷ 3초, 올림>, "direction": "alternate" },
  "params": { "0%": { "scale": 1, "y": 0, "easing": "easeInOutSine" },
              "100%": { "scale": 1.015, "y": -3 } } }
```

- `direction: "alternate"`라 0%↔100%를 왕복하고, 이음새가 없습니다.
- `@admaker/animation`의 `float` 루프(±12px)는 숨쉬기로는 큽니다. 진폭을 위 값으로 직접 씁니다.
- R1 정지 중인 워드마크·CTA·가격에는 넣지 않습니다.

### 2.9 모션 블러 (aesthetic-rules Q14)

- **가로 이동**: 이동하는 keyframes에 `motionBlur` 키를 같이 씁니다. 엔진은 이 값을 가로 방향 `MotionBlurFilter` 속도로 씁니다(0–500, 0.01 이하면 꺼짐). 빠른 구간 8–40, 정지 stop은 0.
  ```jsonc
  "0%": { "x": -1200, "motionBlur": 30, "easing": "easeOutExpo" }, "70%": { "x": 0, "motionBlur": 0 }, "100%": { "x": 0, "motionBlur": 0 }
  ```
- **세로·대각선 이동**: `motionBlur` 키는 가로뿐이므로 클립 효과를 씁니다. `clip.effects = [{ "id": "fx1", "key": "motionBlurFilter", "startTime": 0, "duration": <빠른 구간 μs>, "values": { "velocity": { "x": 0, "y": 30 }, "kernelSize": 9 } }]` (`startTime`은 클립 시작 기준 μs, 한 번에 효과 하나만 적용됨).
- 엔진 프리셋 `motionBlurIn`/`motionBlurOut`(`@admaker/animation`)도 같은 키를 씁니다.

## 3. 텍스트

- 글자/단어/줄 단위 애니메이션은 텍스트의 `characterAnimation` 프리셋으로 씁니다. 목록은 엔진에서 직접 받습니다: `listTextAnimationPresets()` (`@admaker/engine/text-segment`).
  - 입장(3.0.2 기준): `rise`, `line_rise`, `slam`, `zoom_settle`, `drop`, `wave`, `center_reveal`, `cascade`, `blur_in`, `spin_in`, `swing`, `skew_slide`, `elastic_pop`, `bouncy_in`, `pop`, `typewriter`, `fade_in`, `slide_up`, `slide_down`, `grow`, `panorama`, `fly_in`, `bounce`
  - 퇴장: `fade_out`, `shrink_out`, `sink_out`, `fly_out`, `blur_out`, `bouncy_out`
- 각 항목은 `duration`, `stagger`, `staggerMode`(`char|word|line`), `staggerOrder`, `easing`을 덮어쓸 수 있습니다.
- **클립 리빌**(베이스라인 아래에서 올라와 박스 밖은 잘림) = `line_rise` 또는 `rise` + 줄 단위.
- **강조 단어 하나**는 글자별 스타일(색·크기)로 처리합니다. 강조 색은 브랜드 토큰의 accent 하나만 씁니다.
- 한국어는 `staggerMode: "word"`가 기본입니다. 글자 단위는 짧은 헤드라인(10자 이하)에만.
- 자막은 `Caption` 클립 + 단어 타이밍(TTS/ASR 결과)으로 만들고, `.srt`는 스킬이 따로 씁니다.

### 3.1 단어 단위 자막 (aesthetic-rules Q15)

엔진 `Caption` 클립은 단어 타이밍을 받아 지금 말하는 단어(active), 지난 단어(spoken), 아직 안 온 단어(future)를 따로 칠합니다.

```jsonc
{ "type": "Caption", "text": "",
  "timing": { "display": { "from": <페이지 시작 μs>, "to": <페이지 끝 μs> } },
  "transform": { "x": 90, "y": 1180, "width": 900, "height": 160, "angle": 0, "opacity": 1, "zIndex": 40 },
  "wordsPerLine": "multiple",
  "caption": {
    "words": [ { "text": "3초면", "from": 0, "to": 420 }, { "text": "끝나요", "from": 420, "to": 900, "isKeyWord": true } ],
    "colors": { "active": { "color": "<brand accent>" }, "future": { "color": "<brand text, 낮은 불투명도>" } },
    "wordAnimation": { "type": "scale", "application": "active", "value": 1.08 } },
  "style": { /* 참조 JSON의 Caption style */ } }
```

- `words[].from/to`는 **클립 시작 기준 밀리초**입니다(다른 곳은 μs). 페이지마다 Caption 클립 하나를 만들고 단어 시간을 그 페이지 시작 기준으로 다시 뺍니다.
- 페이지 나누기: 2–4단어(한국어 1–2어절), 단어 간격이 0.35초 넘게 벌어지면 새 페이지, 한 페이지 ≤ 1.2초 권장. `build-project.mjs`의 `captionPages()`가 TTS/ASR 단어 타이밍에서 페이지를 만듭니다.
- `isKeyWord` + `colors.keyword`는 강조 단어를 따로 칠할 때. active 색과 keyword 색을 둘 다 accent로 쓰면 한 프레임에 강조가 둘이 될 수 있으니(B2) 하나만 씁니다.
- 위치: 9:16에서 세로 약 65%(하단 20% 세이프존 위), 16:9에서 하단 타이틀 세이프 안쪽.
- 프로젝트에 `captionConfig`가 있으면 그 색·위치가 기본값으로 합쳐집니다.

## 4. 카메라 (엔진에 카메라가 없음)

카메라 무브는 **스킬 컴파일러가 계산**해서 장면의 모든 클립에 같은 변환을 넣습니다.

1. 장면마다 카메라 키프레임 `{t, cx, cy, zoom, angle}`을 타임라인에 씁니다.
2. 월드→스크린 함수 하나로 각 클립의 오프셋을 구합니다: `screen = (world − c) × zoom + center`. 같은 함수만 씁니다(DIRECTOR 실패 사례: 효과가 카메라를 못 따라감).
3. 각 클립의 keyframes에 `x`, `y` 오프셋과 `scale`(= zoom)을 같은 stop 시간으로 넣습니다. 클립 중심이 아닌 화면 중심 기준 줌이므로 위치 보정이 필수입니다.
4. 패럴랙스: 층마다 `depth` 계수를 두고 이동량에 곱합니다(배경 0.3, 중경 0.6, 전경 1.0).
5. 2.5D 기울임: `rotateX`/`rotateY` + `perspective`. 텍스트가 있으면 15° 이하.
6. 장면이 복잡하면 대안으로, 그 장면을 Adapter `script` 하나로 그리고 카메라를 그 안에서 처리합니다(§7).

## 5. 도형, 배경, 필터, 전환

- `Shape` 종류: rectangle, rounded, pill, circle, ellipse, line, triangle, rightTriangle, diamond, pentagon, hexagon, polygon, star, trapezoid, speech, heart, cloud, arrow, path(SVG path). 채우기는 단색 또는 `linear-gradient(...)`.
- 이어지는 바는 한 Shape로 그립니다(이음새 방지).
- `Backdrop`: 단색/그라디언트 배경.
- 필터(Effect 클립의 `effectKey`, 클립 효과의 `key`는 이름 뒤에 `Filter`를 붙임. 예: `oldFilmFilter`): adjustment, advancedBloom, backdropBlur, bloom, colorMap, colorOverlay, convolution, dot, dropShadow, glitch, glow, godray, grayscale, hslAdjustment, kawaseBlur, motionBlur, oldFilm, pixelate, radialBlur, reflection, rgbSplit, tiltShift. 광효과(glow, bloom, godray)는 **주인공 하나에 한 번**(aesthetic-rules Q4).
- 전환: `fade`, `radialSwipe`, gl-transitions 팩(`getAllTransitions()`로 목록 확인). 기본은 매체 안의 전환(마스크·키프레임 조합)이고, 셰이더 전환은 장면 성격이 바뀌는 곳에서만.

### 5.1 룩 스택: 배경 → 그레이드 → 그레인·비네트 (aesthetic-rules Q11)

`Effect` 클립은 **자기보다 zIndex가 낮은 모든 것**에 필터를 겁니다. 그래서 층 순서가 곧 zIndex입니다.

| 층 | 클립 | zIndex 예 |
|---|---|---|
| ① 배경 | `Backdrop` (`backdropType`: `meshGradient` / `floatingBlobs` / `gradient`) | 0 |
| ② 소재 | Image / Video / Adapter(three) | 10–19 |
| ③ 그래픽·글자 | Shape / Text / Caption | 20–49 |
| ④ 그레이드 | `Effect` `adjustmentFilter` (+ 필요하면 `colorOverlayFilter`) | 90 |
| ⑤ 그레인·비네트 | `Backdrop` `noise` 오버레이(그레인) + `Effect` `oldFilmFilter`(비네트) | 95, 99 |

```jsonc
// ① 배경: 브랜드 색 2–3개로 천천히 움직이는 메시
"c_bg":    { "type": "Backdrop", "src": "backdrop", "backdropType": "meshGradient",
             "style": { "backdropType": "meshGradient", "colors": ["<bg>", "<primary 20%>", "<accent 13%>"], "speed": 0.3, "scale": 1 },
             "transform": { "x": 0, "y": 0, "width": W, "height": H, "angle": 0, "opacity": 1, "zIndex": 0 }, … }
// ④ 그레이드: 소재를 한 룩으로 (어두운 테마 기준)
"c_grade": { "type": "Effect", "effectKey": "adjustmentFilter", "values": { "saturation": 1.1, "contrast": 1.08, "gamma": 1, "brightness": 1 },
             "transform": { …, "zIndex": 90 }, … }
"c_tint":  { "type": "Effect", "effectKey": "colorOverlayFilter", "values": { "color": "<primary>", "alpha": 0.06 }, "transform": { …, "zIndex": 91 }, … }
// ⑤-a 그레인: 회색 noise 배경을 아주 옅게 덮음 (엔진이 1/30초마다 시드를 바꿔 움직임)
"c_grain": { "type": "Backdrop", "src": "backdrop", "backdropType": "noise",
             "style": { "backdropType": "noise", "colors": ["#808080"], "density": 0.6, "speed": 1 },
             "transform": { "x": 0, "y": 0, "width": W, "height": H, "angle": 0, "opacity": 0.05, "zIndex": 95 }, … }
// ⑤-b 비네트: oldFilm에서 세피아·스크래치·노이즈를 끄고 비네트만
"c_vig":   { "type": "Effect", "effectKey": "oldFilmFilter",
             "values": { "sepia": 0, "noise": 0, "scratch": 0, "vignetting": 0.3, "vignettingAlpha": 0.5, "vignettingBlur": 0.4 },
             "transform": { …, "zIndex": 99 }, … }
```

- 네 클립 모두 광고 전체 길이로 깔고, `build-project.mjs`의 `lookStack()`이 만듭니다. 장면마다 바꾸려면 구간별 클립으로 나눕니다.
- **`Backdrop`·`Shape`·`Image`·`Adapter` 클립은 `src`가 비어 있으면 Core(Studio 로딩)가 버립니다.** 절차적 클립에는 표식 값(`"backdrop"`, `"shape"`, `"script"`, `"three"`)을 넣습니다. 예외는 Text·Caption·Effect·Transition. `validate.mjs`가 검사합니다.
- 그레이드 강도: 어두운 테마 `colorOverlay` alpha 0.06–0.10, 밝은 테마 0.03–0.06. 엔진 `colorOverlay`는 소프트라이트가 아니라 일반 합성이라, 리모션식 soft-light 0.18보다 훨씬 낮게 씁니다.
- `oldFilmFilter`의 노이즈는 시드가 고정이라 그레인이 화면에 "붙어" 보입니다. 그래서 그레인은 매 프레임 바뀌는 `noise` 배경으로 따로 만들고, oldFilm은 비네트로만 씁니다.
- 회색 그레인 오버레이는 대비를 약간(불투명도만큼) 낮춥니다. 0.03–0.06을 넘기지 말고, 스타일 프레임(§8)에서 확인합니다.
- **아직 실제 렌더로 값 검증 전입니다.** 첫 프로젝트의 스타일 프레임에서 강도를 맞추고 이 표를 고칩니다.

## 6. 사운드

엔진 믹서는 클립별 고정 볼륨과 페이드만 있습니다. 그래서:

- **음악 + 내레이션 + 덕킹**은 스킬이 오프라인으로 믹스해(ffmpeg/python: 덕킹, 보이스 컴프, −14 LUFS 2-pass loudnorm, true peak −1 dBTP) `mix.wav` 하나를 Audio 클립으로 넣습니다.
- 편집 가능성을 남기고 싶으면 `music.wav`(덕킹 반영본), `voice.wav`, `sfx_*.wav`를 따로 넣되, 볼륨 자동화는 없다는 전제로 음악을 미리 덕킹해 둡니다.
- 사용자가 준 소재가 없으면 `templates/gen-audio-kit.mjs`로 SFX 키트와 패드 베드를 합성합니다(aesthetic-rules S7). `node gen-audio-kit.mjs [outDir]` → `whoosh_a/b.wav`, `impact.wav`, `riser.wav`, `tick.wav`, `click.wav`, `bed.wav`(timeline.mjs의 BPM·길이 기준).
- SFX는 프레임 표(`sfx.json`: `{frame, file, gain, note}`)에서 Audio 클립을 생성합니다. 시작 시간 = `frame/fps − 피크 지연`.
- 렌더 후 최종 mp4의 오디오를 다시 측정합니다(`ffmpeg -af ebur128`). 엔진 인코더 경로에서 오프셋이 생기면 그 값을 기록하고 SFX 시작 시간에서 일괄 보정합니다.

## 7. Adapter: 코드로 그리는 샷 (브라우저 전용)

엔진 기본 기능으로 안 되는 샷(브러시·수채, 데이터 시각화의 복잡한 형태, 한 장면 전체 카메라)은 `script` 어댑터로 그립니다.

```js
import { registerScript } from "@admaker/engine";
registerScript("brand-grid-snap", (ctx, { width, height, time, params }) => {
  // time(초)만으로 그린다. Date.now(), 시드 없는 Math.random(), 이전 프레임 상태 금지
}, { fps: 30 });
```

클립: `{ "type": "Adapter", "adapter": "script", "params": { "name": "brand-grid-snap", … } }`

- Canvas2D만 씁니다(WebGL 컨텍스트가 아님). 3D는 아래 §7.1의 `three` 어댑터를 씁니다.
- **코드는 JSON에 실리지 않습니다.** 프로젝트 폴더의 `scripts/*.js`로 두고, 렌더 하니스(`templates/render/`)와 admaker 앱 양쪽에서 같은 이름으로 등록해야 합니다. 등록되지 않으면 회색 X 박스가 그려집니다.
- Lottie: `import "@admaker/engine/adapters/lottie"`로 어댑터를 등록한 뒤 `{ "type": "Adapter", "adapter": "lottie", "params": { "animationData": … } }`. 브랜드가 Lottie 자산을 줬을 때만.

### 7.1 three.js 3D (`three` 어댑터)

`import "@admaker/engine/adapters/three"`로 등록합니다(프로젝트에 `three` >= 0.160 설치 필요). 3D 씬은 Adapter 클립 하나로 그려지고, 그 결과는 일반 클립처럼 위치·keyframes·마스크·필터를 받습니다.

**내장 `model` 씬** — glTF/GLB 하나를 턴테이블로 보여줄 때. 코드 등록 없이 JSON만으로 됩니다.

```jsonc
{ "type": "Adapter", "adapter": "three", "src": "assets/product.glb",
  "params": { "scene": "model", "spin": 20, "angle": -30, "tilt": 12, "zoom": 1.1,
              "offsetX": 0, "offsetY": 0, "animation": 0, "loop": true, "speed": 1,
              "exposure": 1, "light": 1, "environment": true } }
```

- `spin`(도/초, 기본 30), `angle`(시작 각도), `tilt`(카메라 높이 각도, 기본 15), `zoom`(1 = 화면에 꼭 맞춤), `offsetX`/`offsetY`(모델 크기 단위로 화면 안 위치 이동), `animation`(glTF 애니메이션 이름/번호, `false`면 끔), `background`(없으면 투명), `exposure`, `light`, `environment`(스튜디오 환경광 PMREM, 기본 true. 금속·유리에 필요).
- 모델은 자동으로 가운데 정렬·크기 맞춤됩니다. 환경광이 켜지면 반구광·키·림은 형태만 잡도록 약해집니다.

**커스텀 씬** — 브릭, 유리 제품, 로우폴리 섬, 팝업북, 데이터 실물화처럼 장면을 직접 짜야 할 때.

```js
import { registerThreeScene } from "@admaker/engine/adapters/three";
registerThreeScene("glass-hero", async ({ THREE, src, params, loadGLTF }) => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  // … 메시, 재질, 조명
  let composer = null, env = null;
  return {
    scene, camera,
    background: null,                       // 투명: 뒤의 브랜드 배경과 합성 (후처리를 쓰면 아래 주의 참고)
    toneMapping: THREE.ACESFilmicToneMapping, exposure: 1,
    // 렌더러가 필요한 자원: 첫 프레임 전, 그리고 렌더러가 바뀔 때(컨텍스트 손실) 다시 불림
    attach(renderer) {
      composer?.dispose(); env?.dispose();
      const pmrem = new THREE.PMREMGenerator(renderer);
      env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;   // HDRI 파일은 RGBELoader → fromEquirectangular
      pmrem.dispose();
      scene.environment = env;
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      composer.addPass(new GTAOPass(scene, camera, 1080, 1080));                               // 접촉 그림자
      composer.addPass(new BokehPass(scene, camera, { focus: 4.6, aperture: 0.01, maxblur: 0.012 })); // 피사계 심도
      composer.addPass(new OutputPass());                                                       // 톤매핑·색공간
    },
    update({ time }) { /* time(초)만으로 카메라·오브젝트·초점 상태를 정함 */ },
    // renderer.render 대신 호출됨. 동기, 마지막 패스가 기본 framebuffer에 그려야 함
    render({ width, height }) {
      composer.setPixelRatio(1);
      composer.setSize(width, height);
      composer.render();
    },
    destroy() { composer?.dispose(); env?.dispose(); /* + 지오메트리·재질 dispose */ },
  };
}, { fps: 30 });
```
(`EffectComposer`, `RenderPass`, `GTAOPass`, `BokehPass`, `OutputPass`, `RoomEnvironment`는 `three/addons/...`에서 import)

클립: `{ "type": "Adapter", "adapter": "three", "src": "three", "params": { "scene": "glass-hero", … } }` — **`src`가 비면 Core가 클립을 버리므로** 커스텀 씬에도 표식 값(`"three"`)을 넣습니다.

규칙과 한계:
- `update`는 `time`만 보고 상태를 정합니다. `requestAnimationFrame`, `THREE.Clock`, `Date.now()` 금지. 애니메이션 믹서는 `mixer.setTime(time)`.
- 3D 카메라 무브는 씬 안의 `update`에서 처리합니다(§4의 2D 카메라 계산과 별개). 장면 전체가 3D면 카메라를 씬 안에 두는 편이 단순합니다.
- **렌더러는 모든 three 클립이 하나를 공유**합니다. 씬에서 `new WebGLRenderer()`를 만들지 말고 `attach`로 받은 것을 씁니다(브라우저 WebGL 컨텍스트 수 제한). setup은 모델·텍스처 로딩까지만 하고, 렌더러가 필요한 PMREM·EffectComposer는 `attach`에서 만들며 이전 것을 먼저 dispose합니다.
- 후처리를 쓰면 `render`에서 매 프레임 `composer.setSize(width, height)`를 불러 클립 크기와 맞춥니다(크기가 같으면 재할당하지 않음).
- **투명 배경 + 후처리**는 패스 조합에 따라 알파가 사라질 수 있습니다(GTAO·Bokeh). 투명 합성이 필요한 샷은 먼저 스틸로 알파를 확인하고, 안 되면 `background`를 브랜드 배경색으로 채우거나 후처리를 빼고 엔진 필터(`bloom`, `tiltShift`)로 대신합니다.
- 블룸은 씬 안의 `UnrealBloomPass`와 엔진 `bloom` 필터 중 하나만 씁니다(Q4: 광효과는 주인공에게 한 번).
- 커스텀 씬 코드도 JSON에 실리지 않습니다. 프로젝트 `scenes/*.js`에 두고 렌더 하니스와 admaker 앱 양쪽에 같은 이름으로 등록합니다.
- 서버 인코딩(json_to_ffmpeg)에서는 Adapter 클립이 빠집니다. 브라우저 Exporter 기준에서만 씁니다.

## 8. 렌더와 검수

- 렌더는 `templates/render/`의 하니스로 합니다: 헤드리스 Chromium에서 페이지가 `Exporter.create({width, height, fps, bitrate})` → `load(project)` → `export()` 결과를 파일로 저장.
- 스틸 검수는 `Preview.capture(timeUs)`(PNG)로 1–2초마다 뽑아 컨택트 시트로 만듭니다.
- `Exporter.isSupported({videoCodec, width, height, bitrate})`로 코덱 지원을 먼저 확인합니다. WebCodecs·WebGL이 없는 환경이면 렌더가 실패하므로 GPU 있는 Chromium 또는 앱의 export를 씁니다.
