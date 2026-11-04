# 손글씨 샘플: 한 글자씩 써지는 한글 + 획이 그려지는 영문

1080×1920, 5초, 30fps. `@admaker/engine` 3.0.7 렌더 하니스로 렌더했습니다.

![미리보기](handwriting.gif)

| 요소 | 쓰는 것 |
|---|---|
| 바닥 소재 | Image(사진), 원본 그대로 |
| "오늘도 수고했어요" | Adapter `script` `text-segment`(앱의 글자 렌더러와 같은 경로) + `handwrite_in` + `lineBoil` |
| "thank you" | `text_to_path` → Shape path + `strokeDraw` + `lineBoil` (`draw.mjs`) |

- 엔진 Exporter의 Text 클립은 `characterAnimation`을 그리지 않아서, 렌더 하니스에서는 `text-segment.js`를 script 어댑터로 등록해 앱과 같은 모습으로 그립니다.
- 다시 만들기: `build.mjs`(필요: `opentype.js`, `fonts/caveat.ttf`, `bg.jpg`, 템플릿의 `motion.mjs`·`fonts.mjs`·`draw.mjs`, `scripts/text-segment.js`).
