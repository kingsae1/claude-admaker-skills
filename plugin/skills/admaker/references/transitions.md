# 씬 전환 고르기

씬이 바뀌는 곳마다 "어떻게 넘어갈지"를 씬표의 **전환 칸**에 적습니다. 컷이나 `fade`·`dissolve`만 이어지면 광고가 밋밋해 보입니다. 아래 메뉴에서 씬의 성격에 맞는 것을 고릅니다.

## 1. 규칙

- **씬 경계마다 전환 칸을 채웁니다.** 비워 두거나 "fade"만 적지 않습니다. 같은 장소·같은 소재 안의 짧은 이음(0.3초 이하 컷, 비트 컷)은 "컷"이라고 적어도 됩니다.
- **한 광고에 2–4종을 섞고, 같은 전환을 연속 두 번 쓰지 않습니다.** 30초 광고 기준 셰이더·번쩍 계열(아래 B의 flash-streak·zoom-through·cover-flood)은 두 번까지입니다.
- **가장 중요한 전환 한 곳(시그니처)**은 A(트랙 매트) 또는 C의 줌 스루로 만듭니다. 보통 훅 → 주인공, 또는 주인공 → 엔드카드입니다.
- **비트에 맞춥니다.** 전환의 가운데(다음 장면이 반쯤 보이는 순간)를 마디 첫 박이나 BGM 피크에 둡니다. 길이는 0.4–0.8초(잉크 번짐·매트 확대는 1.0–1.4초)입니다.
- 전환을 넣었으면 전환 구간 밀집 시트(`render/sheet.mjs`, aesthetic-rules Q18)로 빈 프레임·튀는 요소를 봅니다. MCP에서는 `app_screenshot { timeSec }`을 전환 가운데·끝에서 찍어 봅니다.

## 2. 메뉴

### A. 트랙 매트 (`style.matte`, engine-recipes §2.4.1) — 시그니처용

| 이름 | 만드는 법 | 어울리는 곳 |
|---|---|---|
| 글자 속으로 | 다음 장면(사진·영상)에 `style.matte { clipId: 제목, mode: "alpha" }`. 제목 Text를 1 → 40–60배로 키우며 글자 획 안의 점 P를 제자리에 두고(`x = −(P.x − 박스 가운데.x) × (scale − 1)`, y도 같게), 확대가 끝나는 시각에 매트 없는 같은 소재 클립으로 이어 붙임. 예제 `samples/track-matte-glyph-3d` | 브랜드명·제품명 훅 → 제품 장면 |
| 글자 창 | 위와 같되 확대 없이 `hideSource: false`로 글자도 보이게 두고, 글자 안 영상만 다음 장면으로 바꿈 | 타이틀 카드, 챕터 시작 |
| 질감으로 번짐 | 다음 장면에 `matte { clipId: 잉크·붓·종이 질감 이미지, mode: "luma", threshold: [[0, 1], [1.2, 0]], softness: 0.08 }`. 밝은 곳부터 드러남 | 수제·프린트·뷰티·식품, 무드 전환 |
| 도형 구멍 | 앞 장면에 `matte { clipId: 원·알약 Shape, mode: "alphaInverted" }`, 도형을 0 → 화면보다 크게 | 아이리스 열기·닫기, 로고 마크 모양으로 |

- 매트 클립은 대상보다 짧게 두지 않습니다(끝나면 alpha 대상은 숨음, `validate.mjs` 경고).
- 앱으로 가져오면 `transform.matte`로 옮겨지고 앱 미리보기·내보내기에서 그대로 보입니다. Studio에는 아직 매트를 거는 UI가 없어서 가져오기·MCP로만 넣습니다.

### B. 전환 클립 (`Transition`, 두 장면이 전환 길이만큼 겹침)

| 키 | 모양 | `values` | 어울리는 곳 |
|---|---|---|---|
| `am-ink-bleed` | 잉크가 번지며 다음 장면 | `origin` [x, y] 0–1, `edgeColor` [r, g, b] 0–1, `seed`, `grain` | 감성·수제·프린트 |
| `am-cover-flood` | 색이 번져 화면을 덮었다 열림 | `color`, `origin`(시작점), `target`(열리는 점) | 장면 성격이 바뀔 때, 섹션 구분 |
| `am-zoom-through` | 링 안으로 줌해 들어감 | `origin`, `radius`, `ring`(색) | 공간 이동, 디테일로 들어갈 때 |
| `am-flash-streak` | 사선 빛줄기 + 색 번쩍 | `color`, `angle` | 드롭·훅 직후 (자주 쓰지 않음) |
| `am-card-swap` | 카드가 넘어감 | `tilt`, `background`, `direction` | 여러 상품·기능 나열 |
| `am-push` | 다음 화면이 밀어냄 | `direction` [x, y], `blur` | 빠른 나열, 슬라이드형 |

- 색은 브랜드 토큰에서 고릅니다(`color: [1, 0.85, 0.1]`처럼 0–1 RGB). 위치는 다음 장면의 주인공 쪽에 둡니다.
- `easing`으로 진행 곡선을 줍니다(`easing.md` §4). 번지는 전환은 `easeInOutSine`, 밀어내기는 `easeOutExpo`가 무난합니다.
- 앱으로 가져오면 키·values·easing이 그대로 들어가 앱 미리보기·브라우저 내보내기에서 같게 보입니다(서버 인코딩만 가까운 xfade로 바뀜).
- `hf-*` 셰이더 팩은 로컬 렌더에서만 보입니다. 앱에는 등록되어 있지 않아 fade로 바뀌니 **앱으로 넘길 광고(MCP)에는 쓰지 않습니다.** gl-transitions도 앱 전환 탭에 있는 이름만 씁니다.

### C. 그래픽 전환 샷 (`shots/transition-*.md`, 도형 + 소재 모션)

| 카드 | 모양 | 어울리는 곳 |
|---|---|---|
| `transition-zoom-through` | 소재 속 둥근 물체 안으로 들어가면 다음 소재 | 창·화면·렌즈가 있는 소재 (시그니처 후보) |
| `transition-cover-flood` | 점이 원으로 부풀어 덮고 다음 장면 점으로 줄며 열림 | 장면 성격이 바뀔 때 |
| `transition-match-cut` | 컷 양쪽 움직임·자리를 맞춤 | 비슷한 모양이 양쪽에 있을 때 |
| `transition-flash-streak` | 사선 빛 몇 가닥 + 브랜드 색 번쩍 | 훅·드롭 |
| `transition-footage-card` | 소재가 카드로 줄며 빠지고 다음 카드가 펴짐 | 여러 소재를 넘겨 보여 줄 때 |
| `beat-montage-wipe` | 박마다 사선 띠가 닦아냄 | 빠른 몽타주 |

### D. 마스크 등장·퇴장 (클립 하나에 거는 모션, engine-recipes §2.4)

나가는 장면에 퇴장(`params.mode: "out"`, 앱은 `options.direction: "reverse"`를 보존하지 않음), 들어오는 장면에 등장을 걸어 이어 붙입니다. `wipe`·`angleWipe`(사선), `circleReveal`(아이리스, 주인공 쪽 origin), `rectExpand`(프레임 속 프레임), `centerExpand`(가운데서 벌어짐), `blockReveal`(격자). 앱으로 그대로 들어갑니다.

### E. 그 밖

- 3D 이동: 나가는 장면을 `z` −1200·`rotateY`로 멀리 보내고 다음 장면이 앞으로 옴(engine-recipes §2.1, `samples/clip-3d-depth`).
- 3D↔2D 모프: 제품·아이콘이 다음 장면의 평면 그래픽이 됨(`samples/morph-3d-to-2d`).
- 생성 영상 사이는 첫·끝 프레임을 맞춘 `ai.video.framesToVideo`로 컷 없이 이을 수 있습니다(`footage-gen.md` §7.2). 무관한 두 장소는 위 A–D로 잇습니다.

## 3. 고르는 순서

1. 시그니처 한 곳을 먼저 정합니다: 글자로 시작하면 A "글자 속으로", 소재에 둥근 창이 있으면 C 줌 스루, 수제·감성이면 A "질감으로 번짐" 또는 B `am-ink-bleed`.
2. 나머지 경계는 씬의 리듬으로 고릅니다: 빠른 나열 → B `am-push`·`am-card-swap`, C `beat-montage-wipe`, D `wipe`. 성격이 바뀜 → B `am-cover-flood`. 같은 장소 → 컷 또는 D.
3. 드롭·피크 한 곳에만 B `am-flash-streak` 또는 C `transition-flash-streak`.
4. 씬표 예: `2→3 | am-cover-flood (브랜드 노랑, 제품 쪽 origin) | 0.6초 | 마디 5 첫 박`.
