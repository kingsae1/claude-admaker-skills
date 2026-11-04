# GSAP + three.js 무선 이어폰 런칭 티저

- **카테고리:** 3d
- **길이·비율:** 6초, 9:16, 30fps
- **엔진:** @admaker/engine 3.0.7
- **샷 카드:** 없음 (직접 구성)
- **기법:** three, gsapTimeline, keyframes, mask-reveal
- **앱 불러오기:** partial

![미리보기](https://github.com/kingsae1/claude-admaker-skills/blob/main/samples/gsap-three/gsap_three_sample.gif)

## Prompt

```text
A 6-second 9:16 launch teaser for wireless earbuds called AURA Buds, over the user's footage. A 3D ring object rises from below while the camera inside the scene pushes in and the ring settles with a back-out ease. A hook line rises, then a two-line headline lands with a small punch, the second line four frames late. Three spec chips pop one per beat and the 3D core pulses on the same beats. Copy exits at half its entrance length, the 3D lifts away, and the wordmark with CTA and an underline wipe holds for over a second. The 3D background is transparent so the footage stays visible.
```

## 결과에서 볼 것

3D 씬 안의 GSAP 타임라인과 클립 gsapTimeline이 같은 비트를 씀. 앱 불러오기에서는 커스텀 3D 씬이 빠짐(three.md §6).

## 다시 만들기

`samples/gsap-three/README.md` (저장소 `samples/gsap-three/sample-gsap-three.mjs`).
