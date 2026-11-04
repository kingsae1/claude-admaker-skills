# 소재 5컷을 잇는 전환 4종

- **카테고리:** transition
- **길이·비율:** 9초, 9:16, 30fps
- **엔진:** @admaker/engine 3.0.7
- **샷 카드:** `transition-cover-flood`, `transition-zoom-through`, `transition-match-cut`, `transition-footage-card`
- **기법:** cover, zoom-through, match-cut, dimension, keyframes, mask-reveal
- **앱 불러오기:** unverified

![미리보기](https://github.com/kingsae1/claude-admaker-skills/blob/main/samples/transitions/transitions_sample.gif)

## Prompt

```text
A 9-second 9:16 reel that joins five footage clips with four different transitions, all built inside the graphic language and never as crossfades. 1) Cover: a small accent dot near the bottom grows into a circle that floods the frame, the footage swaps under it, and the circle shrinks into the round window of the next clip. 2) Zoom-through: the camera pushes into that window while the next clip opens inside it and fills the frame. 3) Match cut: the frame pushes left with motion blur at the cut, and a white ring around the yellow circle lands exactly on the orange circle of the next clip. 4) Dimension shift: the clip shrinks into a tilted card and slides away while the next card swings in and flattens to full frame. Keep the footage at full clarity, no dim or haze.
```

## 결과에서 볼 것

커버는 컷 앞뒤 2프레임만 꽉 찬 단색, 줌 스루는 구멍이 늘 창 테두리 안쪽, 매치 컷은 컷 순간 링과 주황 원이 같은 픽셀, 카드 뒤는 브랜드 배경색.

## 다시 만들기

`samples/transitions/README.md` (저장소 `samples/transitions/README.md`).
