# GSAP 타임라인 가이드 (`gsapTimeline` 모션)

기준: `@admaker/engine` 3.0.7 (gsap 3.15, `gsap/gsap-core`만 사용). 원칙은 GreenSock의 gsap-skills(MIT)를 참고해 admaker 엔진에 맞게 다시 썼습니다(ATTRIBUTION.md).

엔진은 GSAP를 두 곳에서만 씁니다.

1. **모든 모션의 `easing` 문자열** — `gsap.parseEase()`로 해석합니다.
2. **`gsapTimeline` 모션** — 클립 하나에 GSAP 타임라인 하나. 엔진이 멈춘(paused) 타임라인을 글로벌 타임라인에서 떼어 두고, 매 프레임 클립 시간으로 `tl.time(t)` 맞춤합니다. 그래서 미리보기·스크럽·Exporter가 같은 프레임에 같은 값을 냅니다(결정적).

웹 페이지용 GSAP 지식(셀렉터, CSS 속성, ScrollTrigger, React `useGSAP`, `gsap.ticker`, `matchMedia`, Flip/Draggable)은 여기서 쓸 데가 없습니다. 웹 예제를 보고 쓰지 말고 이 문서의 형식만 씁니다.

## 1. 형식

```jsonc
{ "type": "gsapTimeline",
  "options": { "delay": 0 },             // 길이는 tween들로 정해짐 (options.duration은 안 씀)
  "params": { "tweens": [
    { "from": { "y": 80, "opacity": 0 }, "to": { "y": 0, "opacity": 1 }, "duration": 0.5, "ease": "power3.out", "position": 0.4 },
    { "to": { "scale": 1.08 }, "duration": 0.25, "ease": "back.out(2)", "position": "-=0.1" },
    { "to": { "scale": 1 },    "duration": 0.35, "ease": "power2.inOut" }
  ] } }
```

- 시간은 **초**입니다(엔진 다른 곳의 μs와 다름).
- 속성 12개: `x y z scale scaleX scaleY angle opacity blur brightness rotateX rotateY`. 클립 원래 값 위에 **x·y·z·angle·rotateX·rotateY는 더하고, scale·opacity·brightness는 곱하고, blur는 큰 쪽**을 씁니다. 그래서 `to: {x: 0}`은 "원래 자리", `opacity: 1`은 "원래 불투명도"입니다.
- tween 필드: `to`(필수), `from`(있으면 fromTo), `duration`(기본 0.5), `ease`(기본 linear), `position`, `repeat`, `yoyo`, `repeatDelay`. 최대 200개.

## 2. 되는 것과 조용히 무시되는 것

| GSAP 기능 | 엔진 | 대신 |
|---|---|---|
| `position` 숫자, `"<"`, `">"`, `"<0.2"`, `"+=0.3"`, `"-=0.2"` | 됨 | |
| 라벨 (`"intro"`, `"intro+=0.3"`) | **무시** → 앞 tween 뒤에 붙음 | 숫자(초)로 |
| `defaults` | 없음 | tween마다 `duration`·`ease` |
| `stagger` | 없음 | 클립마다 `gsapTimeline`을 따로 두고 `position`을 3–6프레임씩 밀기, 또는 `stagger` 모션·`motion.mjs` |
| 중첩 타임라인, `add()`, 콜백 | 없음 | |
| `gsap.from()`만 | 없음 | `from` + `to` 둘 다 |
| 상대값 `"+=100"`, 단위 `"50%"`, `"random(…)"` | **값이 빠짐** (숫자만 받음) | 절대 숫자 |
| `repeat: -1` (무한) | **0으로 잘림**, 최대 100 | 클립 길이 ÷ 한 주기만큼 유한 횟수 |
| `keyframes` 배열 | 없음 | tween을 이어 붙이기 |

## 3. 이징

`ease`와 다른 모션의 `options.easing` 모두 gsap-core 문자열을 받습니다.

| 의도 | 문자열 |
|---|---|
| 입장 기본 감속 | `power3.out` (부드럽게 `power2.out`) |
| 퇴장 | `power2.in` |
| 정밀 스냅(Swiss) | `power4.inOut`, `expo.inOut` |
| 살짝 튀는 펀치 | `back.out(1.4)` (값이 클수록 많이 넘침, 브랜드가 허용할 때만) |
| 탄성 | `elastic.out(1, 0.4)` (거의 쓰지 않음, aesthetic-rules Q3) |
| 끊어지는 스톱모션·손맛 | `steps(6)` |
| 일정 속도 | `none` |

- 방향을 생략하면 `.out`입니다(`power2` = `power2.out`).
- **CustomEase, EasePack(`rough`, `slow(…)`, `expoScale(…)`), CustomWiggle, CustomBounce는 등록되어 있지 않아 선형으로 조용히 바뀝니다.** cubic-bezier가 꼭 필요하면 engine-recipes §2.2대로 근사합니다.

## 4. 타이밍 규칙

- **늦게 시작하는 입장은 `options.delay` 대신 첫 tween의 `position`에 대기 시간을 넣습니다.** 엔진은 delay 전에는 모션을 적용하지 않아 클립이 그대로 보이지만, 타임라인 안의 대기는 `from` 값을 잡아 둡니다(0.6초 뒤 시작하는 `from: {y:100}`은 0초부터 y+100에 있음).
- 타임라인이 끝나면 마지막 값이 클립 끝까지 유지됩니다.
- delay로 잇지 말고 **겹치게** 씁니다. 다음 동작을 `"-=0.1"`–`"-=0.2"`나 `"<0.1"`로 앞 동작 끝에 살짝 겹치면 리듬이 붙습니다(aesthetic-rules R7과 같은 원리).
- 퇴장은 입장의 절반 길이, `power2.in`. 퇴장 tween은 `position`을 숫자(클립 길이 − 퇴장 길이)로 둡니다.

## 5. 자주 쓰는 패턴

```jsonc
// 올라오며 펀치 (헤드라인, 가격)
[{ "from": {"y": 60, "opacity": 0, "blur": 8}, "to": {"y": 0, "opacity": 1, "blur": 0}, "duration": 0.45, "ease": "power3.out", "position": 0 },
 { "to": {"scale": 1.06}, "duration": 0.18, "ease": "power2.out", "position": "-=0.05" },
 { "to": {"scale": 1}, "duration": 0.3, "ease": "power2.inOut" }]

// 숨쉬기 루프 (오래 머무는 조연, 4초 클립)
[{ "from": {"scale": 1}, "to": {"scale": 1.03}, "duration": 1, "ease": "sine.inOut", "repeat": 3, "yoyo": true, "position": 0 }]

// 카드 뒤집기 등장 (rotateY는 클립에 perspective가 있을 때)
[{ "from": {"rotateY": -70, "opacity": 0}, "to": {"rotateY": 0, "opacity": 1}, "duration": 0.6, "ease": "power3.out", "position": 0.2 }]

// 비트에 맞춘 3번 펀치 (beatsSec = [0.5, 1.0, 1.5])
[{ "to": {"scale": 1.1}, "duration": 0.08, "ease": "power2.out", "position": 0.5 }, { "to": {"scale": 1}, "duration": 0.25, "ease": "power2.inOut" },
 { "to": {"scale": 1.1}, "duration": 0.08, "ease": "power2.out", "position": 1.0 }, { "to": {"scale": 1}, "duration": 0.25, "ease": "power2.inOut" },
 { "to": {"scale": 1.1}, "duration": 0.08, "ease": "power2.out", "position": 1.5 }, { "to": {"scale": 1}, "duration": 0.25, "ease": "power2.inOut" }]
```

비트 위치는 빌드 스크립트에서 계산해 숫자로 넣습니다. 클립 `display.from`이 0이 아니면 `position`은 클립 시작 기준 시간입니다.

## 6. GSAP 플러그인 → 엔진 대응

| GSAP | admaker에서 |
|---|---|
| SplitText (글자·단어별) | Text `characterAnimation`, Caption `wordAnimation` |
| ScrambleText | 없음 (Text 여러 클립을 `steps`로 교체하거나 script 어댑터) |
| DrawSVG | Shape `strokeDraw` |
| MorphSVG | 없음 (두 Shape를 교차 페이드) |
| MotionPath | `@admaker/animation` path 모션(`compileAnimation`) |
| CustomEase / CustomWiggle | 없음 → keyframes 중간 stop으로 근사, 흔들림은 `shake`·`lineBoil` |
| Physics2D | 빌드 스크립트에서 궤적을 계산해 keyframes로 굽기 |

## 7. 코드 안에서 GSAP 쓰기 (three 커스텀 씬, script 어댑터)

`gsap`은 엔진 의존성이라 렌더 하니스에서 import할 수 있습니다. 씬 안의 카메라·오브젝트 안무를 타임라인 문법으로 쓰고 싶을 때만, 아래처럼 **멈춘 타임라인을 시간으로 맞춥니다**.

```js
import { gsap } from "gsap/gsap-core";
const cam = { z: 6, y: 0.4, focus: 6 };
const tl = gsap.timeline({ paused: true });
gsap.globalTimeline.remove(tl);                  // 저절로 재생되지 않게
tl.to(cam, { z: 3.2, duration: 1.6, ease: "power2.inOut" }, 0)
  .to(cam, { y: 1.1, duration: 1.0, ease: "power1.inOut" }, "<0.4")
  .to(cam, { focus: 3.2, duration: 1.2, ease: "power2.out" }, "<");
tl.time(tl.duration(), true); tl.time(0, true); // 시작값 고정: 어떤 순서로 시켜도 같은 값
// update({ time }) 안에서:
tl.time(Math.min(time, tl.duration()), true);
camera.position.set(0, cam.y, cam.z);
```

- `tl.play()`, `gsap.to()`를 그냥 실행(글로벌 ticker), `onUpdate`로 상태 바꾸기, `gsap.utils.random()`(시드 없음)은 금지. 난수는 시드 RNG로.
- `gsap.utils`의 `mapRange`, `clamp`, `interpolate`, `wrap`, `distribute`는 순수 함수라 렌더 코드와 빌드 스크립트 모두에서 써도 됩니다.
- 이런 코드는 JSON에 실리지 않으므로 앱 불러오기에서 빠집니다(engine-recipes §9). 앱까지 가야 하는 동작은 JSON의 `gsapTimeline`으로 씁니다.
