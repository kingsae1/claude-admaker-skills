# 손글씨: 오늘도 수고했어요 / thank you

- **카테고리:** typography
- **길이·비율:** 5초, 9:16, 30fps
- **엔진:** @admaker/engine 3.0.7
- **샷 카드:** `handwritten-title`
- **기법:** handwriting, strokeDraw, keyframes
- **앱 불러오기:** full

![미리보기](https://github.com/kingsae1/claude-admaker-skills/blob/main/samples/handwriting/handwriting.gif)

## Prompt

```text
A 5-second 9:16 warm closing card over a still photo. The Korean line "오늘도 수고했어요" in a pen-script font writes on letter by letter and keeps a subtle hand-drawn boil the whole time. Below it, "thank you" in a casual script is drawn stroke by stroke in warm yellow, slightly tilted, then fills. No dimming over the photo; legibility comes from a soft text shadow only.
```

## 결과에서 볼 것

한글은 handwrite_in(번지며 나타남), 영문은 text_to_path + strokeDraw(실제 획). 둘 다 lineBoil.

## 다시 만들기

`samples/handwriting/README.md` (저장소 `samples/handwriting/build.mjs`).
