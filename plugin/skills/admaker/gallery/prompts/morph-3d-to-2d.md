# 3D 모프 → 2D: 구 · 큐브 · 별 · 도넛이 평면 아이콘이 되기까지

하나의 3D 메시가 박마다 다른 물체로 변신하고, 납작해져 2D 원이 된 뒤 엔진 2D 도형으로 이어지는 모션그래픽 샘플.

- **카테고리:** 3d
- **길이·비율:** 13.5초, 9:16, 30fps
- **엔진:** @admaker/engine 3.0.10
- **샷 카드:** 없음 (직접 구성: m-morph, m-flat2d, m-end)
- **기법:** three, morph, dimension, gsapTimeline, mask-reveal, kinetic-typography
- **앱 불러오기:** partial (3D 구간은 bake.mjs로 영상으로 구움)

![미리보기](https://github.com/kingsae1/claude-admaker-skills/blob/main/samples/morph-3d-to-2d/morph_sample.gif)

## Prompt

```text
A 13.5-second 9:16 motion-graphics piece at 120 BPM with no footage. One glossy 3D object morphs on the beat: a cobalt candy sphere becomes a matte lime rounded cube, then a puffy coral star, then a pink chrome torus, each morph a fast power4 in-out with a squash pulse and a half-turn whip, while a flat colour background wipes in a new colour (paper, cobalt, lime, black). A giant bold word for each shape (ROUND, BLOCK, BLOOM, LOOP) rises behind the object, with an editorial header, a big stage number, a Korean name and a five-step progress bar in front. Then the torus turns to face the camera and is pressed flat into a 2D ring with flat colour and no shading, and the ring closes into a solid disc. A 2D vector circle takes over at the exact same size, pops, and four flat icons of the earlier shapes (circle, rounded square, star, ring) burst out into a 2x2 grid, swap places clockwise twice, and fly out. End card: the word MORPH rises letter by letter on black, four mini icons pop in a row, then "FROM 3D TO 2D" and a Korean line. Bold and modern, no fades, vignette or grain.
```

## 결과에서 볼 것

- 모든 모양을 같은 (u, v) 격자로 만들어 꼭짓점 대응이 유지됨(구의 극점 → 도넛 구멍). 법선은 모양마다 미리 구워 보간.
- 3D → 2D: z를 0으로 누르고 재질을 단색(emissive)으로 바꾸는 순간, 그림자 판도 사라짐. 이어 받는 엔진 원은 픽셀 단위로 같은 크기.
- 2D 구간과 엔드카드는 엔진 Shape라 앱에서 편집 가능한 레이어로 감.

## 다시 만들기

`samples/morph-3d-to-2d/README.md` (`node templates/gallery.mjs use morph-3d-to-2d <폴더>`).
