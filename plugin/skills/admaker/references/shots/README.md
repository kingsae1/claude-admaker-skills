# 샷 카드

샷 카드는 광고에서 반복해 쓰는 모션 한 가지를 정리한 레시피입니다. 형식은 video-shotcraft의 샷 카드를 따르되, **참조 구현은 admaker ProjectJSON 조각**입니다.

## 고르는 법

1. `director.md` §4 에너지 골격에 슬롯(훅, 주인공, 상승부, 엔드카드)을 나눕니다.
2. 슬롯마다 아래 표에서 `슬롯`과 `에너지`가 맞는 카드를 고릅니다.
3. 고른 카드는 전문을 읽고, "알려진 함정"의 값은 낮추지 않습니다.
4. 같은 카드를 한 광고에서 두 번 주인공으로 쓰지 않습니다(R5).

| 카드 | 슬롯 | 에너지 | 길이 | 한 줄 |
|---|---|---|---|---|
| [hook-number-slam](hook-number-slam.md) | 훅 | 중상 | 1.2–1.8초 | 큰 숫자 하나가 꽂히고 작은 설명이 뒤따름 |
| [hero-tilt-push](hero-tilt-push.md) | 주인공 | 중 | 3–4초 | 제품 화면 카드가 기울어진 채 다가와 정면으로 자리잡음 |
| [feature-mask-reveal](feature-mask-reveal.md) | 상승부 | 중고 | 1.5–2.5초 | 와이프로 열리는 사진 + 줄 단위로 올라오는 문구 |
| [price-countup](price-countup.md) | 상승부 끝 | 중고 | 1.8–2.5초 | 가격·통계가 굴러가다 멈추고 강조 |
| [endcard-logo-cta](endcard-logo-cta.md) | 엔드카드 | 최고→정지 | 2.5–4초 | 로고가 자리잡고 메시지·CTA가 차례로, 1초 이상 정지 |
| [map-region-pin](map-region-pin.md) | 훅·주인공 | 중 | 1.5–2.5초 | 지도가 들어오고 한 지역이 칠해지며 핀이 박힘 (`map.mjs`) |
| [map-route-draw](map-route-draw.md) | 주인공·상승부 | 중고 | 2–3초 | 두 지점 사이 경로가 그려지며 지도가 다가감 (`map.mjs`) |
| [handwritten-title](handwritten-title.md) | 훅·엔드카드 | 저–중 | 1.5–3초 | 손글씨 폰트 문구가 한 글자씩 써지고 내내 손으로 그린 듯 떨림 (`motion.mjs` `handwriting`) |
| [hand-drawn-emphasis](hand-drawn-emphasis.md) | 상승부·엔드카드 | 중 | 0.5–0.8초 (얹는 샷) | 핵심 단어·가격 둘레에 손그림 동그라미·밑줄이 그려짐 (`draw.mjs`) |
| [beat-flicker-sting](beat-flicker-sting.md) | 훅 | 최고 | 1마디 + 카피 | 막대가 솟고 컬러 바가 2프레임씩 깜빡이다 워드마크가 박에 슬램 (`presets/fast-montage.mjs`) |
| [beat-montage-wipe](beat-montage-wipe.md) | 상승부 | 중고 | 블록당 k박 (0.8–1.4초) | 소재 컷마다 라벨·제목, 컷 사이를 투톤 사선 띠가 덮음 (`presets/fast-montage.mjs`) |
| [transition-cover-flood](transition-cover-flood.md) | 전환 | 중고 | 0.6–0.7초 | 앞 장면의 점이 원으로 부풀어 화면을 덮고, 다음 장면의 점으로 줄어들며 열림 |
| [transition-zoom-through](transition-zoom-through.md) | 전환 | 중고 | 0.6–0.8초 | 소재 속 둥근 물체로 다가가면 그 안이 다음 소재로 열림 (시그니처 샷 후보) |
| [transition-match-cut](transition-match-cut.md) | 전환 | 중 | 컷 ±0.2초 | 컷 양쪽 움직임 방향을 맞추고, 링이 다음 물체 자리에 정확히 착지 |
| [transition-flash-streak](transition-flash-streak.md) | 전환 | 최고 | 0.3–0.4초 | 빠른 사선 몇 가닥이 지나가고 화면이 브랜드 색으로 번쩍이며 컷 (훅·드롭) |
| [transition-footage-card](transition-footage-card.md) | 전환 | 중 | 0.9–1.1초 | 소재가 카드로 줄며 기울어 빠지고, 다음 소재 카드가 정면으로 펴짐 (2D ↔ 2.5D) |

### 전환 카드 고르는 법

슬롯 사이(컷)마다 "나가는 방식"을 하나 고릅니다(`TREATMENT.md` 샷 리스트). 6가지 기법과 이 스킬에서 쓰는 방법입니다.

| 기법 | 쓰는 것 | 언제 |
|---|---|---|
| 스와이프(닦아내기) | `beat-montage-wipe`의 사선 띠, 마스크 `wipe`·`angleWipe`, 큰 글자·물체가 화면 앞을 지나가게 | 빠른 나열, 인트로·엔딩 타이틀 |
| 플래시(스와이프 + 커버) | `transition-flash-streak` | 드롭, 훅 직후. 화면 전체 충격(R4)에 셈 |
| 커버(덮기) | `transition-cover-flood` | 장면 성격이 바뀔 때, 화면 속 점이 있을 때 |
| 매치 컷 | `transition-match-cut`, 생성 소재면 첫·끝 프레임을 맞춰 생성(`footage-gen.md`) | 비슷한 모양·움직임이 양쪽에 있을 때 |
| 차원 이동(2D↔3D) | `transition-footage-card`, `hero-tilt-push`, three 어댑터(`three.md`) | 여러 소재를 넘겨 보여 줄 때 |
| 몰핑 | 그래픽 도형끼리만. 같은 자리·크기의 두 Shape를 교차(`gsap.md`), 경로 보간은 Adapter `script` | 아이콘·도형이 다음 요소가 될 때. 제품 소재는 모양을 바꾸지 않음 |
| 공간 전환(줌) | `transition-zoom-through`, 장면 카메라(engine-recipes §4) | 창·화면·렌즈처럼 "안"이 있는 물체가 소재에 있을 때 |

- 한 광고에 전환 기법은 2–3종, 같은 전환을 연속 세 번 쓰지 않습니다.
- 셰이더 전환(`Transition` 클립, gl-transitions·`hf-*`)은 브라우저 렌더에서는 나오지만 앱 불러오기에서는 fade·slide·wipe·cover 계열만 이름이 맞춰집니다(`to-admaker-import.mjs`). 앱으로 넘길 광고는 위 카드처럼 마스크·keyframes로 만든 전환을 씁니다.
- 전환을 넣었으면 `render/sheet.mjs`로 전환 구간 밀집 시트를 뽑아 검수합니다(aesthetic-rules Q18).

## 카드 형식

> `map-*` 2장은 엔진 3.0.5로, `transition-*` 5장은 엔진 3.0.7로 렌더해 확인한 값입니다. 나머지 5장의 값은 shotcraft·opuscar 판례에서 옮긴 **초기값이고, admaker 엔진으로 렌더해 검증하기 전**입니다. 첫 광고를 만들면서 실제 렌더로 확인한 값으로 고치고, 고친 카드에는 `검증: <엔진 버전>`을 frontmatter에 붙입니다.

새 카드는 아래 형식으로 씁니다. 실제로 렌더해 확인한 값만 파라미터 표에 적습니다.

```markdown
---
name: <kebab-case>
한 줄: <무엇이 어떻게 움직이는지>
슬롯: 훅 | 주인공 | 상승부 | 엔드카드 | 전환
에너지: 저 | 중 | 중고 | 최고
길이: <초>
엔진: <쓰는 모션 type / 프리셋> (브라우저 전용 기능이면 명시)
---

## 의도
## 동작 핵심
## 파라미터 표 (값 · 조절 감각)
## 사운드
## 알려진 함정
## 참조 구현 (ProjectJSON 조각)
```
