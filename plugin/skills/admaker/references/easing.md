# 이징 프리셋과 모션 토큰

모션마다 이징을 그때그때 고르지 않습니다. 먼저 **용도(토큰)** 를 고르고, 그 토큰에 묶인 이징 이름과 길이를 씁니다. JSON에는 토큰이 아니라 이징 이름이 들어가므로 엔진·앱 어느 버전에서도 그대로 재생됩니다.

- 기준은 엔진의 `EASING_PRESETS`·`MOTION_TOKENS`(`@admaker/engine`, admaker-plugin PR #24 이후)입니다. 그보다 오래된 엔진에서도 이름은 모두 해석되므로, 이 문서의 표와 `templates/motion.mjs`의 `EASE`만으로 충분합니다.
- 이름을 쓰는 곳은 세 군데입니다:
  - 애니메이션 `options.easing`
  - 키프레임 stop의 `easing`
  - 전환 클립의 `easing` (같은 엔진 이후)
- 이름을 틀리면 엔진이 **선형으로 조용히 처리**합니다. 이 문서에 있는 이름이나 gsap 문자열만 씁니다(`gsap.md` §3).

## 1. 모션 토큰 (먼저 이것을 고른다)

| 토큰 | 이징 | 길이(초) | 쓰는 곳 |
|---|---|---|---|
| `enter` | `easeOutCubic` | 0.3–0.6 | 텍스트·카드가 들어와 멈출 때 |
| `exit` | `easeInCubic` | 0.2–0.4 | 화면 밖으로 나갈 때. 입장의 절반 길이(R8) |
| `move` | `easeInOutCubic` | 0.4–0.9 | 화면 안에서 A→B로 옮길 때 |
| `snap` | `easeOutExpo` | 0.2–0.45 | 숫자 슬램, 줌 스루 도착. 빠르게 꽂히고 길게 멈춤 |
| `whip` | `easeInOutExpo` | 0.25–0.5 | 휩팬, 밀어내기, 컷을 넘기는 전환 |
| `glide` | `easeOutQuart` | 0.8–2.0 | 느린 카메라 푸시, 배경 패닝 |
| `drift` | `easeInOutSine` | 1.5–4.0 | 루프, 숨쉬기, 켄번즈(Q12) |
| `pop` | `easeOutBack` | 0.25–0.5 | 배지·아이콘·버튼처럼 작은 요소 |
| `anticipate` | `easeInBack` | 0.25–0.45 | 나가기 전에 살짝 물러나는 동작 |
| `wobble` | `easeOutElastic` | 0.6–1.2 | 스티커·가격표 같은 장난스러운 강조 |
| `drop` | `easeOutBounce` | 0.6–1.0 | 위에서 떨어지는 오브젝트 |
| `count` | `easeOutQuint` | 0.8–1.5 | 카운트업. 빠르게 오르다 목표값 근처에서 느려짐 |

```js
import { EASE, ease } from "./motion.mjs";
entrance({ easing: ease("enter") });          // "easeOutCubic"
exit(clipDur, { dur: EASE.exit.dur[0], easing: ease("exit") });
```

## 2. 전체 곡선 31종 + 계단식 3종

계열(세기) × 방향으로 이름을 만듭니다: `ease` + `In`/`Out`/`InOut` + 계열. 그리고 `linear`가 있습니다.

| 계열 | 세기 | in (점점 빨라짐) | out (점점 느려짐) | inOut (천천히 시작·끝) | CSS 근사 |
|---|---|---|---|---|---|
| Sine | 아주 약하게 | `easeInSine` | `easeOutSine` | `easeInOutSine` | 있음 |
| Quad | 약하게 | `easeInQuad` | `easeOutQuad` | `easeInOutQuad` | 있음 |
| Cubic | 자연스럽게 | `easeInCubic` | `easeOutCubic` | `easeInOutCubic` | 있음 |
| Quart | 또렷하게 | `easeInQuart` | `easeOutQuart` | `easeInOutQuart` | 있음 |
| Quint | 강하게 | `easeInQuint` | `easeOutQuint` | `easeInOutQuint` | 있음 |
| Expo | 아주 강하게 | `easeInExpo` | `easeOutExpo` | `easeInOutExpo` | 있음 |
| Circ | 끝에서 급하게 | `easeInCirc` | `easeOutCirc` | `easeInOutCirc` | 있음 |
| Back | 살짝 넘침 | `easeInBack` | `easeOutBack` | `easeInOutBack` | 있음(넘침 포함) |
| Elastic | 탄성 | `easeInElastic` | `easeOutElastic` | `easeInOutElastic` | 없음 |
| Bounce | 튕김 | `easeInBounce` | `easeOutBounce` | `easeInOutBounce` | 없음 |

계단식(엔진 3.0.19+): `steps(4)`·`steps(8)`·`steps(12)`(아무 `steps(n)`도 됨). 값이 n번 끊어 움직이고(CSS `steps(n, end)`), 끝에서만 1이 됩니다. 픽셀 아트·스톱모션 느낌에만 쓰고 일반 광고 모션에는 섞지 않습니다(모션 토큰 `pixel` = `steps(8)`, `references/pixel-art.md`).

- 세기 순서: Sine < Quad < Cubic < Quart < Quint < Expo. 같은 길이라면 오른쪽일수록 출발(또는 도착)이 급하고 정지 구간이 길게 느껴집니다.
- Back·Elastic은 0..1 밖으로 나갑니다. 투명도에 걸면 1을 넘거나 0 아래로 내려가니 **opacity에는 쓰지 않고** 위치·scale에만 씁니다. 전환 클립에 걸면 엔진이 0..1로 잘라서 끝부분이 평평해집니다.
- Elastic·Bounce는 CSS로 그릴 수 없어서 앱 미리보기(애니메이션 패널 썸네일)에서는 `ease-out`으로 보입니다. 실제 렌더는 엔진 곡선 그대로입니다.

## 3. 고르는 규칙

1. **들어오는 것은 Out, 나가는 것은 In, 화면 안에서 옮기는 것은 InOut.** 반대로 쓰면 도착할 때 멈칫하거나 출발이 늘어집니다.
2. **세기는 크기와 거리에 맞춘다.** 화면 절반 이상을 가로지르는 이동(밀어내기·카드)은 Quart–Expo, 짧은 이동(40px 입장)은 Cubic이면 충분합니다.
3. **넘치는 곡선(Back·Elastic·Bounce)은 작은 요소에만, 광고 전체에서 한 계열만.** 소재(바닥 영상)·전체 화면 전환·본문 텍스트에는 쓰지 않습니다(Q3, R4). `pop`과 `wobble`을 같은 광고에 섞지 않습니다.
4. **같은 장면 안의 요소는 같은 계열로 맞춘다.** 시차(R7)는 delay로 주고 곡선은 바꾸지 않습니다.
5. **`linear`는 진행 막대·스크롤 텍스트·루프 회전·키프레임 구간 이징을 쓸 때의 바깥 `options.easing`에만.**
6. **Quart·Quint는 gsap `power3`·`power4`와 같습니다.** gsap 문자열로 써도 같은 곡선입니다(`gsap.md` §3).

## 4. 전환에서 쓰기

- **마스크·키프레임 전환(`shots/transition-*.mjs`)**: 나가는 쪽은 `easeInExpo`·`easeInQuart`, 들어오는 쪽은 `easeOutExpo`·`easeOutQuart`. 컷 지점에서 속도가 가장 빠르게 해야 이음새가 안 보입니다(director §8).
- **셰이더 전환 클립**(엔진 PR #24 이후, `am-*`·`hf-*`·gl-transitions): 전환 클립에 `easing`을 주면 셰이더의 진행값에 걸립니다.
  - `am-flash-streak`·`am-cover-flood`: 진행 곡선이 셰이더 안에 이미 들어 있으니 비워 두거나 `easeInOutSine`.
  - `am-zoom-through`: `easeInExpo`. 링에 빨려 들어가는 느낌을 줍니다.
  - `am-card-swap`: `easeInOutQuart`.
  - `am-push`: 셰이더 안에 이미 InOut 곡선이 있으니 비워 둡니다. 더 휙 지나가게 하려면 `easeInOutSine` 정도만.
  - gl-transitions 기본형(fade, wipe 등): `easeInOutCubic`.

```json
{ "id": "tr1", "type": "Transition", "transitionKey": "am-zoom-through",
  "fromClipId": "footage_1", "toClipId": "footage_2",
  "values": { "origin": [0.62, 0.38], "radius": 0.14 }, "easing": "easeInExpo",
  "timing": { "display": { "from": 3650000, "to": 4350000 }, "duration": 700000, "playbackRate": 1, "trim": { "from": 0, "to": 700000 } } }
```

## 5. 검수

- 전환 구간 밀집 시트(`render/sheet.mjs`)에서 컷 직전·직후 프레임의 이동량이 가장 커야 합니다. 컷 근처에서 멈춰 보이면 In/Out 방향이 뒤집힌 것입니다.
- 넘치는 곡선이 두 계열 이상 섞였는지, opacity에 Back·Elastic이 걸렸는지 확인합니다.
