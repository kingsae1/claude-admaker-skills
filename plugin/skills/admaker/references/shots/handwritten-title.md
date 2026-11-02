---
name: handwritten-title
한 줄: 손글씨 폰트 문구가 펜으로 쓰듯 한 글자씩 써지고, 보이는 내내 테두리가 손으로 그린 듯 떨림
슬롯: 훅 | 엔드카드
에너지: 저 | 중
길이: 1.5–3초
엔진: Text characterAnimation `handwrite_in` + `lineBoil` (엔진 3.0.7 · @admaker/animation 2.0.8 이상), 선택: `text_to_path` + `strokeDraw`
---

## 의도

감성·라이프스타일·푸드·키즈처럼 손맛과 친근함이 톤인 광고에서, 메시지 한 줄을 사람이 직접 쓴 것처럼 보여 줍니다. 소재(영상·이미지) 위에 얹는 글자 하나로 끝나는 가벼운 샷입니다.

## 동작 핵심

1. 손글씨 폰트(`fonts.json` `category: hand | handwriting`) Text 한 줄을 소재 위에 둡니다.
2. 글자별 `handwrite_in`으로 왼쪽부터 번지며 써집니다(글자 0.45초, 시차 0.08초).
3. 클립 전체에 `lineBoil`(초당 10번, 모양 3개 순환)을 붙여 다 써진 뒤에도 손으로 그린 듯 살아 있게 합니다.
4. 필요하면 다 써진 뒤 0.2–0.4초에 손그림 밑줄(`hand-drawn-emphasis`)을 하나 더합니다.

## 파라미터 표

| 값 | 기본 | 조절 감각 |
|---|---|---|
| `handwrite_in` stagger | 0.08초, `char` | 10자 넘으면 `word` 또는 0.05초. 너무 길면 쓰는 동안 지루함 |
| `handwrite_in` duration | 0.45초 | 붓글씨(Nanum Brush Script)는 0.55초로 조금 느리게 |
| `lineBoil` amount | 2.5px | 큰 글자(150px+) 3–4, 정보 문구 1.5 |
| `lineBoil` fps / variants | 10 / 3 | 8–12. 0이면 매번 새 모양이라 더 거칠어짐 |

## 사운드

연필·마커 긁는 소리(짧은 루프)를 쓰는 구간에만 낮게 깝니다. 없으면 BGM만으로 충분합니다.

## 알려진 함정

- `handwrite_in`은 획을 따라 그리지 않습니다. "획이 그려지는" 연출이 꼭 필요하면 `text_to_path` → stroke만 + `strokeDraw` + `lineBoil`로 바꿉니다(`drawing.md` 글자 패스). 외곽선을 따라 그려지고 앱에서 텍스트로 고칠 수 없습니다.
- 한글 폰트는 한 프로젝트에 한 굵기만(B5). 손글씨 폰트는 디스플레이 1개로 두고 본문은 고딕 계열로.
- 정보 문구(가격, 조건, 자막)에는 쓰지 않습니다. 읽히는 속도가 느려집니다.
- 값은 앱 텍스트 추천 '손글씨'의 기본값이며, 이 카드로 아직 렌더 검증하지 않았습니다.

## 참조 구현 (ProjectJSON 조각)

```js
import { handwriting } from "../../templates/motion.mjs";
const clipDur = 3, hw = handwriting(clipDur);
{ type: "Text", name: "hand_title", text: "오늘도 수고했어요",
  timing: { display: { from: 0, to: us(clipDur) }, duration: us(clipDur), playbackRate: 1 },
  transform: { x: 80, y: 760, width: 920, height: 220, angle: 0, opacity: 1, zIndex: 20 },
  style: { ...fontStyle({ name: "Nanum Pen Script" }), fontSize: 140, color: "#FFFFFF", characterAnimation: hw.characterAnimation },
  animations: hw.animations }
// hw.characterAnimation = [{ type: "handwrite_in", duration: 0.45, stagger: 0.08, staggerMode: "char", easing: "power2.out" }]
// hw.animations = [{ type: "lineBoil", options: { duration: 3000000, delay: 0, easing: "linear" }, params: { amount: 2.5, scale: 14, fps: 10, variants: 3 } }]
```
