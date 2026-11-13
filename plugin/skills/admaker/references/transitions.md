# 씬 전환 고르기

씬이 바뀌는 곳마다 "어떻게 넘어갈지"를 씬표의 **전환 칸**에 적습니다. 컷이나 `fade`·`dissolve`만 이어지면 광고가 밋밋해 보입니다. 아래 메뉴에서 씬의 성격에 맞는 것을 고릅니다.

## 0. 이음새 원칙 (모든 전환에 먼저 적용)

전환 종류를 고르기 전에 "컷 양쪽이 어떻게 움직이는가"를 정합니다. 장면을 따로따로 만들면 컷마다 눈의 흐름이 끊깁니다. 아래 원칙과 수치는 HyperFrames의 motion-doctrine·cut-the-curve(Apache-2.0, `ATTRIBUTION.md`)를 admaker 엔진에 맞게 옮긴 것입니다.

### 0.1 방향 법칙

앞 장면이 나가는 방식이 다음 장면이 들어오는 방식을 정합니다.

1. **축이 같다.** 가로로 나가면 가로로 들어오고, 크기(Z)로 나가면 크기로 들어옵니다. 컷에서 축을 바꾸지 않습니다.
2. **방향이 같다.** 거울처럼 뒤집지 않습니다. Z축 방향은 **크기 변화의 부호**입니다. 커지면 앞으로(밀기), 작아지면 뒤로(당기기)입니다.
   - 가장 흔한 위반: 작아지며(멀어지며) 나간 장면 다음에 작은 데서 커지는 입장(`pop`, `zoom_settle`, `entrance()` 기본 scale 0.96)이 오는 것. admaker 기본 입장이 바로 이 모양이라 특히 조심합니다. 이음새 0.5초 동안은 다음 장면 요소를 자리 잡은 채로 두거나 같은 부호로 움직입니다.
3. **속도가 같다.** 나갈 때 easeIn(`easeInQuint`·power4.in), 들어올 때 easeOut(`easeOutQuint`·power4.out)을 같은 거리·같은 길이로 씁니다. 둘을 이으면 하나의 InOut이 되어 컷 순간 속도가 같습니다.
4. **움직이는 도중에 컷.** 나가는 쪽이 멈춘 뒤 컷하거나, 들어오는 쪽이 멈춘 데서 출발하면 죽은 박이 됩니다. 들어오는 쪽은 경로 중간(절반 이상 지난 자리)에서 이어 들어옵니다.

### 0.2 흐름(기본 방향)과 아껴 쓰는 방향

광고마다 기본 방향을 하나 정하고(기본: 왼쪽), 보통 경계는 모두 그 방향으로 잇습니다. 다른 방향은 뜻이 있을 때만 씁니다.

| 방향 | 뜻 |
|---|---|
| 기본 방향(왼쪽) | 다음 이야기 |
| 위로 | 결론·공개가 앞 내용 위로 올라섬 |
| Z 앞으로(줌 스루, 커짐) | 같은 생각 속으로 더 들어감 |
| Z 뒤로(인버스 줌, 작아짐) | 도착. 더 큰 것이 자리 잡음(결론·엔드카드 직전) |
| 터지며 나감 | 한 세계를 떠남 |

- 연속한 두 경계를 반대 방향으로 잇지 않습니다(핑퐁은 실수처럼 보임).
- 방향을 바꾸려면 화면에 보이는 원인(탭, 부딪힘, 튕김)이 있거나 장(챕터)이 바뀌어야 합니다.

### 0.3 수치

| 항목 | 값 | 메모 |
|---|---|---|
| 흐름 잇기 이동 | 화면 폭의 약 12% (1080 폭 130px, 1920 폭 230px) | 화면 밖까지 보내지 않음 |
| 나가기 / 들어오기 길이 | 0.2–0.4초 / 나가기 이상 | 들어오기가 조금 길게 |
| 투명도 | 나가는 쪽은 이동보다 먼저 빠져 컷 직전에 0, 들어오는 쪽은 0.35에서 켜짐 | 0 → 1로 켜면 튐 |
| 줌 잇기 | 앞으로: 1 → 1.2 다음 0.75 → 1 / 뒤로: 1 → 0.8 다음 1.25 → 1 | 나가기 30% · 들어오기 70% |
| 블러 | 글자 크기 10px, 화면 전체 면 18–20px | 글자에 20px면 깨져 보임. 컷 프레임 양쪽 같은 값 |
| 초점 넘기기(rack-focus) | 블러 8–12px(최대 18), 렌즈 숨쉬기 scale 1.06, 투명도 그대로 | 8초에 한 번 이하, 같은 장소·같은 제품 상태 바뀜에만 |
| 결정적 순간 전 멈춤 | 0.3–0.75초 | 동작 → 결과 사이 쉼표 |

### 0.4 바닥 (흰 번쩍임 막기)

흐름 잇기·줌 잇기처럼 두 장면 투명도 합이 1보다 작아지는 순간, 또는 소재가 밀리거나 작아져 틈이 생기는 순간에는 그 아래가 비칩니다. Exporter는 `settings.backgroundColor`를 칠하지 않으니 맨 아래에 화면 가득 불투명한 배경이 있어야 합니다.

- 소재가 프레임을 다 덮는 보통 광고는 이미 괜찮습니다.
- 소재를 밀거나 투명하게 하는 이음새 샷(`transition-cut-the-curve`)은 `needsGround`를 내보내고, `build-project.mjs`가 생성 배경(`look_bg`)을 소재 아래에 깝니다.
- 소재 없는 그래픽 장면은 화면 가득한 배경 Shape를 꼭 둡니다. `validate.mjs`가 이음새마다 검사합니다.

### 0.5 admaker 규칙과 다른 점

HyperFrames는 장면 안의 숨쉬기·떠다니기 같은 반복 움직임을 금지합니다("기다리는 영상처럼 보임"). admaker는 **aesthetic-rules Q12(Ken Burns)·Q13(숨쉬기)을 그대로 둡니다.** 광고는 짧고 바닥이 사진·영상이라, 멈춘 사진이 더 죽어 보이기 때문입니다. 다만 HyperFrames의 시험("아무 초에서 멈춰도 무언가 의미 있는 것이 움직이는 중인가")은 그대로 씁니다. 숨쉬기는 조연의 바탕이고, 장면의 시간을 채우는 주된 움직임이 되면 안 됩니다. 장면이 일찍 다 들어와서 시간이 남으면 숨쉬기를 늘리지 말고 정보(문구 단계 공개, 카메라 이동, 수치 변화)를 더합니다.

## 1. 규칙

- **씬 경계마다 전환 칸을 채웁니다.** 비워 두거나 "fade"만 적지 않습니다. 같은 장소·같은 소재 안의 짧은 이음(0.3초 이하 컷, 비트 컷)은 "컷"이라고 적어도 됩니다.
- **기본 경계는 흐름 잇기**(§0, 셰이더 `am-cut-curve` 또는 샷 `transition-cut-the-curve`). 그 위에 **한 광고에 2–4종을 섞고, 같은 전환을 연속 두 번 쓰지 않습니다.** (흐름 잇기와 매치 컷·모프처럼 손으로 맞춘 이음새는 이 개수에 넣지 않습니다.) 30초 광고 기준 셰이더·번쩍 계열(아래 B의 flash-streak·zoom-through·cover-flood)은 두 번까지입니다.
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
| `am-cut-curve` | 흐름 잇기: 두 화면이 같은 쪽으로 12%만 움직이고 컷 순간이 가장 빠름 (§0.3) | `direction` [x, y], `travel` 0.12, `blur`, `dim`(컷 순간 어두워지는 정도), `ground`(비치는 색) | **기본 경계** |
| `am-zoom-blur` | 줌 잇기: 앞으로(`push` 1, 둘 다 커짐) / 뒤로(`push` −1, 둘 다 작아짐) + 방사 블러 | `push`, `origin`, `blur`, `dim`, `ground`, `cut`(0.3) | 같은 생각 속으로(앞) · 도착·결론(뒤) |
| `am-rack-focus` | 초점이 풀리는 정점에서 바뀜, 렌즈 숨쉬기 | `blur`(0.011 = 12px), `breathe` 0.06, `origin` | 같은 장소·같은 제품의 상태 바뀜 (8초에 한 번 이하) |
| `am-light-leak` | 필름 빛샘이 번지고 가장 밝을 때 바뀜 | `color`, `origin`(화면 밖도 됨), `intensity`, `spread` | 감성·뷰티·카페, 따뜻한 무드 |
| `am-pixelate` | 점점 큰 픽셀로 쪼개지고 칸마다 뒤집힘 | `cells`, `levels`, `spread`, `seed` | 게임·테크·레트로, 도트 그래픽과 함께 |
| `am-rgb-split` | RGB가 갈라지는 경계가 쓸고 지나감 | `direction`, `amount`, `softness` | 테크·음악·글리치 톤, 드롭 직후 |

- 흐름 잇기·줌 잇기·초점 넘기기도 §0.1을 지킵니다. `am-cut-curve`의 `direction`은 광고의 기본 방향과 같게, `am-zoom-blur`의 `push`는 앞뒤 장면 요소의 크기 변화 부호와 같게 둡니다.
- 엔진 렌더와 앱에서 같은 박에 보이려면 두 소재를 전환 길이만큼 겹치고 전환을 그 겹침에 둡니다(`engine-recipes.md` §5.2). `shots/transition-shader.mjs`가 이 배치를 해 줍니다.
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
| `transition-cut-the-curve` | 흐름 잇기: 앞 소재가 12%만 빨라지며 빠지고 다음 소재가 같은 쪽으로 이어 들어옴 (기본 경계) | 거의 모든 경계 |
| `transition-whip-pan` | 휩팬: 두 소재가 붙은 채 한 화면 미끄러지며 가운데서 모션 블러 최대 | 장소 이동, 빠른 나열 |
| `transition-beat-freeze` | 박에 정지 프레임 + 번쩍 + 테두리, 다음 박에 하드 컷 | 음악 중심 몽타주 (`fast-montage`) |
| `transition-scribble-cover` | 굵은 마커 지그재그가 화면을 칠하고, 같은 획 자국으로 다음 장면이 드러남 | 손그림·수제·키즈·SNS 톤 |
| `transition-shader` | `am-*` 전환 클립을 앱 규칙대로 배치 (그래픽 없음) | B의 전환을 쓸 때 |

### D. 마스크 등장·퇴장 (클립 하나에 거는 모션, engine-recipes §2.4)

나가는 장면에 퇴장(`params.mode: "out"`, 앱은 `options.direction: "reverse"`를 보존하지 않음), 들어오는 장면에 등장을 걸어 이어 붙입니다. 글자·카드 같은 그래픽을 컷 너머로 이을 때는 `motion.mjs`의 `cutCurveOut`/`cutCurveIn`, `zoomSeamOut`/`zoomSeamIn`, `rackFocusOut`/`rackFocusIn`을 짝으로 겁니다(Studio에서는 애니메이션 에셋 `curve`·`zoom_push`·`zoom_pull`, 앞 클립 '사라질 때' + 다음 클립 '나타날 때'를 같은 화살표로). `wipe`·`angleWipe`(사선), `circleReveal`(아이리스, 주인공 쪽 origin), `rectExpand`(프레임 속 프레임), `centerExpand`(가운데서 벌어짐), `blockReveal`(격자). 앱으로 그대로 들어갑니다.

### E. 그 밖

- 3D 이동: 나가는 장면을 `z` −1200·`rotateY`로 멀리 보내고 다음 장면이 앞으로 옴(engine-recipes §2.1, `samples/clip-3d-depth`).
- 3D↔2D 모프: 제품·아이콘이 다음 장면의 평면 그래픽이 됨(`samples/morph-3d-to-2d`).
- 생성 영상 사이는 첫·끝 프레임을 맞춘 `ai.video.framesToVideo`로 컷 없이 이을 수 있습니다(`footage-gen.md` §7.2). 무관한 두 장소는 위 A–D로 잇습니다.

## 3. 고르는 순서

0. 광고의 기본 방향을 정합니다(보통 왼쪽). 보통 경계는 흐름 잇기로 그 방향을 탑니다.
1. 시그니처 한 곳을 먼저 정합니다: 글자로 시작하면 A "글자 속으로", 소재에 둥근 창이 있으면 C 줌 스루, 수제·감성이면 A "질감으로 번짐" 또는 B `am-ink-bleed`.
2. 나머지 경계는 씬의 리듬으로 고릅니다: 빠른 나열 → B `am-push`·`am-card-swap`, C `beat-montage-wipe`, D `wipe`. 성격이 바뀜 → B `am-cover-flood`. 같은 장소 → 컷 또는 D.
3. 드롭·피크 한 곳에만 B `am-flash-streak` 또는 C `transition-flash-streak`.
4. 씬표 예: `2→3 | am-cover-flood (브랜드 노랑, 제품 쪽 origin) | 0.6초 | 마디 5 첫 박`.
5. 경계마다 나가는 방향과 들어오는 방향을 장부(§4)에 적습니다.

## 4. 이음새 장부와 검사

`timeline.mjs`에 `SEAMS`를 export하면 `validate.mjs`가 숫자로 검사합니다(`templates/seams.mjs`). 장부는 씬표 전환 칸을 데이터로 옮긴 것입니다. 장부 행이 서로 맞지 않으면 이징을 고치지 말고 계획을 고칩니다.

```js
export const SEAMS = [
  { at: beat(8), technique: "cut-the-curve LEFT",
    exit: { clip: "footage_1", axis: "x", dir: -1 }, entry: { clip: "footage_2", axis: "x", dir: -1 } },
  { at: beat(20), technique: "inverse zoom", exit: { clip: "footage_3", axis: "z", dir: -1 }, entry: { clip: "footage_4", axis: "z", dir: -1 } },
  { at: beat(14), type: "transition", technique: "whip-pan", exit: { clip: "footage_2", axis: "x", dir: -1 }, entry: { clip: "footage_3", axis: "x", dir: -1 } },
  { at: beat(24), type: "match-cut", carrier: { out: "ring_a", in: "logo" } },
];
```

- `axis`: `x` · `y` · `z`(크기). `dir`: x −1 왼쪽 / +1 오른쪽, y −1 위 / +1 아래, z +1 앞으로(커짐) / −1 뒤로(작아짐). 클립 id는 `build-project.mjs`가 만든 id(`footage_<번호>`, 샷 클립 id).
- `type`: `cut`(기본, 한 프레임에 한쪽만 보여야 함) · `transition`(겹치는 전환, 겹침 검사 안 함) · `match-cut`(carrier 위치만).
- 검사: 축·방향이 장부끼리 맞는지(✗), 컷 직전 나가는 쪽·직후 들어오는 쪽이 움직이는 중인지와 실제 방향(✗), 속도 차이 0.5–2배(△), `cut`인데 두 장면이 겹쳐 보이는지(△), Z축 이음새 뒤 0.5초 안에 부호를 거스르는 입장(△), carrier가 컷 앞뒤 1프레임에서 12px·5% 안에 있는지(✗).
- 장부가 없어도 `validate.mjs`가 잡는 것: 작아지며 끝난 소재 다음에 커지며 등장하는 클립(Z축 뒤집힘), 이음새에 화면을 다 덮는 불투명한 층이 없음(§0.4), 앱으로 가져가면 전환 자리가 옮겨짐(`engine-recipes.md` §5.2).
- keyframes만 계산합니다. gsapTimeline·마스크·셰이더 안의 움직임은 밀집 시트(`render/sheet.mjs`)로 봅니다. 장부 행을 고치거나 장면 첫·끝 1초를 바꾸면 그 이음새는 다시 검사합니다.
