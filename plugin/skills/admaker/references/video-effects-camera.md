# 영상 이펙트: 카메라 (4종)

엔진에는 카메라가 없어서, 층마다 같은 계산으로 확대·흐림·속도를 줘 카메라처럼 보이게 합니다(`engine-recipes.md` §4). 카탈로그는 `video-effects.md`.

## 36. 돌리 줌 `dollyZoom`

긴장·발견·"이거다!" 순간(버티고 효과). 배경만 `focus`(기본 인물 가운데)를 기준으로 1 → `zoom`(1.6)배로 다가가고(가운데에서 블러 1.5) 인물 누끼는 거의 그대로(0.97배)라, 인물 크기는 같은데 공간이 빨려 드는 느낌이 납니다. `direction: "out"`이면 반대.

- `bgSpec`은 인물 없는 배경이 가장 좋습니다(`separateLayers` 뒤 레이어). 원본 사진을 쓰면 확대된 원본 인물이 누끼 뒤로 비쳐 테두리에 겹쳐 보이니, 누끼를 원본보다 3–5% 크게 두거나 배경을 지웁니다.
- 2–3초, `easeInOutSine`. 소리는 상승음(riser)과 함께.
- 일반 영상의 진짜 돌리 줌은 영상 매팅이 필요합니다. 영상이면 `ai.video.imageToVideo`에 "dolly zoom, subject stays the same size, background stretches"를 쓰는 쪽도 있습니다(`footage-gen.md`).

## 37. 초점 이동 `rackFocus`

시선 옮기기(인물 → 제품, 앞 → 뒤). 이미 있는 앞 클립(`fg`)·뒤 클립(`bg`)에 blur keyframes를 붙여 `at`에서 `dur`(0.6초) 동안 흐림을 맞바꿉니다(`toBack: true` = 앞이 흐려지고 뒤가 또렷해짐, `amount` 10).

```js
const bg = fx.scene("bg", room, 0, 3, full), fg = fx.scene("fg", { type: "Image", src: cutout }, 0, 3, box);
fx.rackFocus({ at: 1.2, fg, bg });
clips.push(bg, fg);
```

- 앞·뒤가 분리된 층이어야 합니다(누끼 + 배경, 또는 제품 사진 + 배경). 한 장짜리 영상이면 전환 `am-rack-focus`(화면 전체 블러 전환)로 대신합니다.
- 흐림 10 넘으면 앞 층 테두리에 후광이 생깁니다.

## 38. 프리즈 줌 `freezeZoom`

"바로 이 순간", 디테일 짚기, 리액션. 영상이 `at`에서 그 프레임 정지 컷으로 바뀌며 흰 번쩍(0.15초) → 0.5초에 `point`를 화면 가운데로 끌어오며 `k`(1.8)배 확대 → 채도 0.35로 낮춤 → 동그라미가 그려지고 위에 라벨 → `hold`(1.4초) 끝에 원래 크기로 돌아와 `at` 다음 원본부터 다시 재생.

- `frameSrc`는 **`at` 시각의 원본 프레임**입니다. 영상 클립이 원본 `trimFrom`에서 시작했다면 원본 시각 = trimFrom + (at − from). `ffmpeg -ss <원본 시각> -i in.mp4 -frames:v 1 frame.png`, 앱은 `timeline.seek` + `app_screenshot`(캔버스 크기 그대로)을 업로드.
- 반환 클립이 원래 영상 클립을 대신합니다(앞 영상 + 정지 컷 + 뒤 영상). 원래 클립은 지웁니다.
- `point`는 캔버스 좌표. 확대 후 그 점이 가운데에 오므로 동그라미·라벨은 화면 가운데에 그려집니다.
- 소리: 정지 순간 셔터·레코드 스크래치, 재생 재개에 whoosh.

## 39. 스피드 램프 `speedRamp`

액션·운동·제품 낙하. 영상 한 구간을 조각 `ramp = [[원본 길이(초), 속도], …]`로 나눠 Video 클립을 이어 붙이고 조각마다 `playbackRate`(0.25–4)를 줍니다. `fx.rampSegments(a, b, 원본길이, n)`은 속도 a→b를 n조각으로 지수 보간합니다.

```js
const ramp = fx.speedRamp({ from: 2, spec: { type: "Video", src, trimFrom: 3 }, box: full,
  ramp: [[0.6, 1], ...fx.rampSegments(1, 0.3, 0.45, 3), ...fx.rampSegments(0.3, 2.5, 1.5, 4)] });
clips.push(...ramp); // ramp.end = 끝 시각, 다음 클립은 여기서
```

- **계단식**입니다(엔진 재생 속도는 클립마다 하나). 조각을 0.15초 이상으로 두고 4–6조각이면 눈에 계단이 거의 안 보입니다.
- 느린 구간(0.25–0.4배)은 원본이 30fps면 끊겨 보입니다. 60fps 원본이거나 움직임이 큰 장면에 씁니다.
- 앱 클립 하나에만 속도를 주려면 `update_clip { playbackRate }`(뒤 클립을 밀어 줌). 램프는 `run_studio_tool` 분할로 조각을 낸 뒤 조각마다 `update_clip { playbackRate }`.
- 소리: 느려지는 구간에 BGM이 있으면 덕킹하거나 효과음으로 덮습니다(영상 소리는 음높이 유지로 늘어남).
