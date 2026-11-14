# 샷 카드

샷 카드는 광고에서 반복해 쓰는 모션 한 가지를 정리한 레시피입니다. 형식은 video-shotcraft의 샷 카드를 따르되, **참조 구현은 admaker ProjectJSON 조각**입니다.

## 고르는 법

1. 광고 한 편이면 `../motion-directions.md`에서 고른 방향의 골격을 먼저 봅니다. 그다음 `director.md` §4 에너지 골격에 슬롯(훅, 주인공, 상승부, 엔드카드)을 나눕니다.
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
| [variable-type-breath](variable-type-breath.md) | 훅·상승부 | 중고 | 2–2.5초 | 굵은 단어가 박마다 가변 폰트 폭·굵기로 숨쉬고 윤곽선 메아리 → 이탤릭 돌출 글자 (엔진 3.0.25+) |
| [bauhaus-grid-flip](bauhaus-grid-flip.md) | 상승부·주인공 | 중고 | 2.5 + 2.5초 | 기본 도형 격자가 튀어나와 박마다 뒤집히고, 같은 배치가 3D 블록으로 솟음 (`pie`, `depth-blocks`) |
| [particle-morph](particle-morph.md) | 주인공 | 고 | 2.5–3초 | 꼬리 끄는 입자가 소용돌이 → 글자 → 동심원 호로 모핑 (`particle-morph`) |
| [transition-cover-flood](transition-cover-flood.md) | 전환 | 중고 | 0.6–0.7초 | 앞 장면의 점이 원으로 부풀어 화면을 덮고, 다음 장면의 점으로 줄어들며 열림 |
| [transition-zoom-through](transition-zoom-through.md) | 전환 | 중고 | 0.6–0.8초 | 소재 속 둥근 물체로 다가가면 그 안이 다음 소재로 열림 (시그니처 샷 후보) |
| [transition-match-cut](transition-match-cut.md) | 전환 | 중 | 컷 ±0.2초 | 컷 양쪽 움직임 방향을 맞추고, 링이 다음 물체 자리에 정확히 착지 |
| [transition-flash-streak](transition-flash-streak.md) | 전환 | 최고 | 0.3–0.4초 | 빠른 사선 몇 가닥이 지나가고 화면이 브랜드 색으로 번쩍이며 컷 (훅·드롭) |
| [transition-footage-card](transition-footage-card.md) | 전환 | 중 | 0.9–1.1초 | 소재가 카드로 줄며 기울어 빠지고, 다음 소재 카드가 정면으로 펴짐 (2D ↔ 2.5D) |
| [transition-cut-the-curve](transition-cut-the-curve.md) | 전환 | 중 | 컷 앞 0.3 + 뒤 0.32초 | 앞 소재가 한쪽으로 12%만 빨라지며 빠지고 다음 소재가 같은 쪽으로 이어 들어옴 (기본 경계, `transitions.md` §0) |
| [transition-whip-pan](transition-whip-pan.md) | 전환 | 중고 | 0.36초 | 두 소재가 붙은 채 한 화면 미끄러지며 가운데서 모션 블러 최대 |
| [transition-beat-freeze](transition-beat-freeze.md) | 전환 | 최고 | 1–2박 | 박에 정지 프레임 + 번쩍 + 테두리, 다음 박에 하드 컷 (음악 몽타주) |
| [transition-scribble-cover](transition-scribble-cover.md) | 전환 | 중 | 0.7초 | 마커 지그재그가 화면을 칠하고 같은 획 자국으로 다음 장면이 드러남 (손그림 톤) |
| [kinetic-typo-beat](kinetic-typo-beat.md) | 훅·상승부·엔드카드 | 중고 | 박 × (줄 수 + 2–3) | 짧은 단어 줄이 박마다 꽂히고 강조 줄 뒤로 색 띠, 다 나오면 전체가 눌렸다 펴짐 |
| [squash-bounce](squash-bounce.md) | 훅·로딩·엔드카드 장식 | 중 | 2.5–3.5초 | 공이 위상을 달리해 통통 튀며 납작해졌다 늘어나고, 출렁이며 멈춤 |
| [iso-build-up](iso-build-up.md) | 주인공·상승부 | 중 | 2.5–3.5초 | 아이소메트릭 블록이 뒤에서 앞으로 솟음. 평면(SVG, 앱까지 감) / 입체(three, 카메라가 돎) |
| [liquid-blobs](liquid-blobs.md) | 훅·주인공 배경·엔드카드 | 저–중 | 3–6초 | 광택 액체 방울이 일렁이며 붙었다 떨어짐 (three 커스텀 씬, 브라우저 전용) |
| [particle-logo](particle-logo.md) | 훅·엔드카드 | 중고 | 2.5–3.5초 | 흩어진 입자가 소용돌이치며 모여 워드마크가 됨 (script, 브라우저 전용) |
| [pixel-sprite-hop](pixel-sprite-hop.md) | 훅·엔드카드 | 중고 | 2–3초 | 도트 캐릭터가 계단식으로 걸어와 점프하고, 친 블록에서 로고가 튀어나옴 (`pixelated`·`spriteSheet`·`steps`) |
| [glitch-hit](glitch-hit.md) | 훅·상승부·전환 (얹는 샷) | 최고 | 2–4프레임 | 박 위에서 화면이 가로 조각으로 찢어지고 RGB가 갈라졌다 바로 붙음 (`glitchFilter`·`rgbSplitFilter`) |
| [z-fly-through](z-fly-through.md) | 훅·주인공·전환 | 중고 | 2–3초 | 깊이별 문구·사진 층 사이를 Z축으로 뚫고 들어가 마지막 층이 다음 장면 (`transform3d`·`z`) |
| [morph-reveal](morph-reveal.md) | 주인공·엔드카드 | 중고 | 2.5–4초 | 광택 3D 도형이 납작해지며 브랜드 아이콘이 되고 문구가 붙음 (MCP `Morph3D`, three `morph-shapes`) |
| [model-orbit-text](model-orbit-text.md) | 훅·주인공 | 중고 | 3–5초 | 제품 3D 모델(사진→3D GLB)이 돌며 가로지르고 뒤로 큰 문구 띠가 반대로 흐름 (three `model`, 앱까지 감) |
| [group-build](group-build.md) | 상승부·엔드카드 | 중 | 1–1.8초 | 칩·가격표·버튼 묶음이 한 덩어리로 날아와 자리잡고 조각이 하나씩 반응 (`groupId`·`origin: "group"`) |
| [lottie-accent](lottie-accent.md) | 상승부·엔드카드 (얹는 샷) | 중 | 0.6–1.2초 | 혜택 문구 옆에 체크·하트·반짝이 Lottie가 박에 맞춰 짧게 (`search_lottie`, Adapter lottie) |

### 모션 스타일 카드 고르는 법

`samples/motion-styles`에 다섯 가지를 한 영상으로 렌더해 두었습니다. 앱 불러오기까지 가야 하는지가 먼저입니다.

| 스타일 | 카드 | 앱 불러오기 | 어울리는 톤 |
|---|---|---|---|
| 키네틱 타이포 | `kinetic-typo-beat` | 그대로 | 음악이 있는 광고 전반, 슬로건 |
| 스쿼시 앤 스트레치 | `squash-bounce` | 그대로 | 귀여움·친근함(키즈, 푸드, 앱), 로딩·곧 공개 |
| 아이소메트릭 | `iso-build-up` 평면형 / 입체형 | 평면 그대로, 입체는 영상으로 구워 넣음 | 지도·구성도·진열, 정보형 |
| 리퀴드 | `liquid-blobs` | 영상으로 구워 넣음 | 뷰티, 음료, 테크 무드 |
| 파티클 로고 | `particle-logo` | 영상으로 구워 넣음 | 로고 스팅, 런칭 훅 |

- 브라우저 전용 카드(three 커스텀 씬, script)는 씬·스크립트 파일을 프로젝트 `scenes/`·`scripts/`로 복사해야 렌더 하니스가 등록합니다(`templates/scenes/`, `templates/scripts/`).
- 한 광고에 이 중 주인공 스타일은 하나. 키네틱 타이포는 다른 스타일 위 문구로 같이 써도 됩니다.

### 전환 카드 고르는 법

슬롯 사이(컷)마다 "나가는 방식"을 하나 고릅니다(`TREATMENT.md` 샷 리스트). 어떤 기법이든 컷 양쪽은 같은 축·같은 방향·같은 속도로 잇습니다(`../transitions.md` §0). 기법과 이 스킬에서 쓰는 방법입니다.

| 기법 | 쓰는 것 | 언제 |
|---|---|---|
| 흐름 잇기(기본) | `transition-cut-the-curve`, 셰이더 `am-cut-curve`, 그래픽은 `motion.mjs` `cutCurveOut`/`cutCurveIn` | 특별한 이유가 없는 모든 경계 |
| 휩팬 | `transition-whip-pan`, 셰이더 `am-push` | 장소 이동, 빠른 나열 |
| 정지 컷 | `transition-beat-freeze` | 음악 몽타주에서 한 컷 강조 |
| 스와이프(닦아내기) | `beat-montage-wipe`의 사선 띠, 마스크 `wipe`·`angleWipe`, 큰 글자·물체가 화면 앞을 지나가게 | 빠른 나열, 인트로·엔딩 타이틀 |
| 플래시(스와이프 + 커버) | `transition-flash-streak` | 드롭, 훅 직후. 화면 전체 충격(R4)에 셈 |
| 커버(덮기) | `transition-cover-flood`, 손그림 톤이면 `transition-scribble-cover` | 장면 성격이 바뀔 때, 화면 속 점이 있을 때 |
| 매치 컷 | `transition-match-cut`, 생성 소재면 첫·끝 프레임을 맞춰 생성(`footage-gen.md`) | 비슷한 모양·움직임이 양쪽에 있을 때 |
| 차원 이동(2D↔3D) | `transition-footage-card`, `hero-tilt-push`, three 어댑터(`three.md`) | 여러 소재를 넘겨 보여 줄 때 |
| 몰핑 | 그래픽 도형끼리만. 같은 자리·크기의 두 Shape를 교차(`gsap.md`), 경로 보간은 Adapter `script` | 아이콘·도형이 다음 요소가 될 때. 제품 소재는 모양을 바꾸지 않음 |
| 공간 전환(줌) | `transition-zoom-through`, 셰이더 `am-zoom-blur`(앞으로·뒤로), 장면 카메라(engine-recipes §4) | 창·화면·렌즈처럼 "안"이 있는 물체가 소재에 있을 때 |

- 한 광고에 전환 기법은 2–3종, 같은 전환을 연속 세 번 쓰지 않습니다.
- 트랙 매트 전환(글자 속으로, 질감으로 번짐)과 admaker 전환 클립(`am-*`)도 같이 고릅니다. 고르는 순서·규칙·values는 `../transitions.md`.
- `am-*` 전환 클립은 앱으로 가져와도 키·values·easing이 그대로 들어갑니다(`to-admaker-import.mjs`가 `engine`으로 넘김). `hf-*` 셰이더 팩은 앱에 없어 fade로 바뀌니 앱으로 넘길 광고에는 쓰지 않습니다.
- 전환을 넣었으면 `render/sheet.mjs`로 전환 구간 밀집 시트를 뽑아 검수합니다(aesthetic-rules Q18).

## 카드 형식

> `map-*` 2장은 엔진 3.0.5로, `transition-*` 5장은 엔진 3.0.7로, 모션 스타일 5장(`kinetic-typo-beat`, `squash-bounce`, `iso-build-up`, `liquid-blobs`, `particle-logo`)은 엔진 3.0.8로 렌더해 확인한 값입니다. 처음 5장(`hook-number-slam` 등)과 엔진 3.0.19 기능 카드 6장(`pixel-sprite-hop`, `glitch-hit`, `z-fly-through`, `morph-reveal`, `group-build`, `lottie-accent`)의 값은 shotcraft·opuscar 판례·엔진 기본값에서 옮긴 **초기값이고, admaker 엔진으로 렌더해 검증하기 전**입니다. 첫 광고를 만들면서 실제 렌더로 확인한 값으로 고치고, 고친 카드에는 `검증: <엔진 버전>`을 frontmatter에 붙입니다.

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
