# 모션 전용 씬(인터루드)과 템포별 분배

소재(영상·이미지) 씬 사이에 **소재 없이 모션 그래픽만으로 1–2초 끌고 가는 씬**을 끼우면, 같은 소재·같은 방향으로 만든 광고도 서로 달라 보이고 빠른 음악에서 훨씬 화려해집니다. 다만 광고의 주인공은 여전히 소재이므로, **템포가 빠를수록 많이·세게, 느리거나 제품을 크게 보여 주는 광고일수록 적게·살짝** 넣습니다. 양과 자리는 `templates/interludes.mjs`가 정하고, `validate.mjs`가 검사합니다.

## 1. 템포 등급

`tempoClass({ bpm, direction, request })`가 셋 중 하나를 고릅니다.

| 등급 | 기준 | 느낌 |
|---|---|---|
| fast | 118 BPM 이상, 또는 빠른 방향(beat-montage·glitch-tech·offer-punch·editorial-kinetic)·빠른 낱말(세일, 할인, 페스티벌, 몽타주, 비트, 스포츠 …) | 박마다 반응, 모션 씬 여러 개, 경계마다 그래픽 전환 |
| mid | 95–117 BPM | 모션 씬 0–2개, 경계 두 곳 중 한 곳만 그래픽 전환 |
| slow | 95 BPM 미만, 또는 제품 중심 방향(product-hero·glossy-signature·handwritten-warm)·낱말(프리미엄, 고급, 차분, 제품 극대화, 디테일, 시네마틱 …) | 소재가 주인공. 모션 씬은 30초 이상에서 하나, 나머지는 소재 위 액센트 |

BPM은 `audio.analyzeBeats` 결과(`timeline.mjs`의 `ANALYSIS.bpm`)를 씁니다. 요청 낱말이 BPM과 다른 쪽을 가리키면 낱말이 이깁니다(예: 124 BPM이어도 "고급스럽게 제품 극대화" → slow 쪽).

## 2. 양 (`dosage`)

| 등급 | 모션 씬 (엔드카드 제외) | 소재 없는 시간 | 길이 | 그래픽 전환 | 소재 위 액센트 |
|---|---|---|---|---|---|
| fast | 6초 1 · 15초 2 · 30초 3 · 60초 4 | ≤ 30% | 2–4박 | 경계마다(같은 것 연속 금지) | 1 |
| mid | 15초 1 · 30초 2 | ≤ 18% | 4박 | 경계 두 곳 중 한 곳 | 1 |
| slow | 30초 미만 0 · 30초 이상 1 | ≤ 8% | 2–4박 | 시그니처 한 곳(0.9–1.2초로 느리게) | 1–2 |

같은 카드라도 세기가 다릅니다(`INTENSITY`). 샷 카드·전환 헬퍼의 `props.intensity`로 넘깁니다.

| 등급 | stagger | scatter 배율 | 길이 배율 | 들어옴 / 나감 이징 | 모션 블러 | 마디당 히트 |
|---|---|---|---|---|---|---|
| fast | 0.035초 | 1 | 0.8 | easeOutExpo / easeInExpo, 착지 easeOutBack | 예 | 4 |
| mid | 0.05초 | 0.7 | 1 | easeOutQuart / easeInQuart | 예 | 2 |
| slow | 0.08초 | 0.35 | 1.6 | easeOutCubic / easeInOutCubic, 튀는 착지 없음 | 아니요 | 1 |

## 3. 메뉴

모션 씬은 **메시지 단어나 숫자 하나를 싣습니다.** 장식만 도는 씬은 넣지 않습니다(제품명, 혜택 숫자, 핵심 동사).

| 종류 | 샷 카드 | 템포 | 싣는 것 | 앱 |
|---|---|---|---|---|
| particle-morph | [particle-morph](shots/particle-morph.md) | fast | 짧은 단어 | 영상으로 구워 넣음(script) |
| bauhaus-grid-flip | [bauhaus-grid-flip](shots/bauhaus-grid-flip.md) | fast·mid | 배치 자체가 브랜드 패턴, 끝에 단어 | 2D는 그대로, 3D는 구워 넣음 |
| kinetic-typo-beat | [kinetic-typo-beat](shots/kinetic-typo-beat.md) | fast·mid | 단어 줄 2–4개 | 그대로 |
| variable-type-breath | [variable-type-breath](shots/variable-type-breath.md) | 모두(slow는 박 2배 느리게) | 단어 하나 + 돌출 글자 | 구워 넣음(가변 폰트·돌출) |
| countup-hud | [price-countup](shots/price-countup.md) + §3.0 타임코드·진행 링 | fast·mid·slow | 숫자 하나 | 그대로 |

소재 위 액센트(소재를 덮지 않고 제품 옆에 붙음, `ACCENTS`):

| 액센트 | 만드는 법 | 어울리는 템포 |
|---|---|---|
| ring-progress | `pie` + `paint endAngle 0→360`, 얇은 링 호(`innerRadius` 0.85) | 모두 |
| orbit-text | `textPath` 원형 글자 배지가 천천히 돎(engine-recipes §3.0) | 모두 |
| type-breath-label | 제품명 라벨의 `wght`·`wdth`가 마디에 한 번 숨쉼 | mid·slow |
| timecode-hud | 모서리 타임코드 `countUp format: "timecode"` + 얇은 모서리 선 | slow |

## 4. 자리 (`planInterludes`)

씬표(`[{ id, from, to, role }]`, role = hook·hero·feature·proof·offer·endcard)와 피크·드롭을 받아 경계에 점수를 매깁니다.

- 드롭·피크 위 +3, 주인공·혜택 공개 직전 +2(숨을 모았다 터뜨림), 섹션이 바뀜 +1.
- 훅 첫 1초 안에는 넣지 않습니다. 느린 템포는 훅 직후와 엔드카드 직전에도 넣지 않습니다.
- 연달아 붙은 두 경계에 넣지 않고, 서로 2마디 이상(빠른 템포 3마디, 그 밖은 길이의 40%) 띄웁니다.
- 시작은 마디 첫 박에 맞춥니다. 길이는 4박(빠른 템포 소품은 2박), 6박을 넘기지 않습니다.
- 경계마다 전환도 정합니다. 모션 씬으로 **들어갈 때**는 화면을 덮는 전환(transition-shape-grid, 휩팬, 빛줄기), **나올 때**는 열리는 전환(transition-ring-iris, 줌 스루, 색 번짐)을 씁니다. 소재끼리는 템포별 메뉴를 돌려 씁니다.

```sh
node templates/interludes.mjs plan --bpm 128 --duration 15 --peaks 7.5
node templates/interludes.mjs plan --bpm 84 --duration 30 --request "프리미엄 제품 극대화" --scenes scenes.json
```

결과를 씬표에 옮기고, `timeline.mjs`에 `INTERLUDES = [{ from, to, kind }]`를 export합니다. 모션 씬 구간은 `FOOTAGE`에서 비워 두고 앞뒤 소재 길이를 그만큼 당기거나 밉니다.

## 5. 모션 씬 만들 때

1. **바닥**: 화면 가득 불투명한 브랜드 색 Shape를 맨 아래에 깝니다(transitions.md §0.4). 없으면 `validate.mjs`가 ✗로 잡습니다.
2. **색**: 앞뒤 소재와 다른 브랜드 색을 씁니다. 장면마다 바탕색 교체(변주 칸 `scene-swap`)와 잘 맞습니다.
3. **소리**: 모션 씬 첫 박에 히트 SFX, 마지막 박에 전환 스윕. 음악 드롭 위라면 드롭 히트를 모션 씬 첫 박에 둡니다.
4. **이어 받기**: 모션 씬의 단어가 다음 소재 씬의 첫 문구와 같은 자리·같은 크기면 매치 컷이 됩니다(transition-match-cut).
5. **앱**: Studio 플래너 씬은 아직 소재가 있어야 만들어집니다. 앱으로 넘길 광고는 모션 씬을 영상으로 미리 렌더해 그 씬의 소재로 넣습니다.

## 6. 검사

`validate.mjs`가 `timeline.mjs`의 `INTERLUDES`(없으면 화면 가득한 소재가 없는 구간)를 읽어 봅니다.

- ✗ 모션 씬에 화면 가득한 불투명 바닥이 없음.
- △ 개수·비율이 템포 상한을 넘음, 연달아 붙음(2마디 미만 간격), 6박 초과, 느린·중간 템포인데 첫 1초가 소재 없이 시작.
- 모션 씬 구간 안의 넓은 면은 Q11(소재를 덮는 층) 경고에서 뺍니다.
