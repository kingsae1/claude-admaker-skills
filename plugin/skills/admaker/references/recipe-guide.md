# 레시피 고르기 지도

스킬에는 레시피 목록이 여러 개 있습니다. 이 문서는 **어느 목록을 언제 열고, 목록 안에서 어떤 아이템을 어떤 경우에 쓰는지**를 한 장에 모은 것입니다. 기획안(1.5단계)을 고른 뒤, 샷 선택(4단계)에서 씬표 칸을 채울 때 먼저 읽습니다. 아이템을 고르면 그 아이템의 카드·문서 전문을 읽고 구현합니다.

읽는 순서: §1에서 목록 고르기 → §2에서 광고 목적에 맞는 묶음 보기 → §3–§5 아이템 표에서 "쓸 때 / 피할 때" 확인 → 비슷한 것끼리 헷갈리면 §6.

## 1. 목록별로 언제 여나

| 목록 | 파일 | 이럴 때 연다 | 고르는 단위 |
|---|---|---|---|
| 모션 방향 (10) | `motion-directions.md` | 광고 한 편의 전체 톤·골격을 정할 때. `gallery.mjs recommend`가 3개를 뽑음 | 광고당 1개 |
| 갤러리 예시 | `gallery/README.md`, `gallery/data/references.json` | 사용자가 "이런 느낌" 예시를 원하거나, 고른 기획안의 형태 참고가 필요할 때 | 기획안마다 미리보기 |
| 아이디어·참신안 | `ideas.md`, `novel-concepts.md` | 로그라인·훅 문장을 정할 때. "참신·병맛·B급" 요청이면 참신안 | 기획안마다 1개 |
| 변주 카드 | `variety.md`, `templates/variety-core.mjs` | 기획안을 고른 직후. 구도·주인공 글자·그래픽 층·빛 층·카메라·전환·색·리듬·훅 샷·모션 말투·엔드카드를 한 칸씩 뽑아 광고끼리 닮지 않게 | 광고당 1벌 |
| 샷 카드 (41) | `shots/README.md` + 카드 | 씬표의 슬롯(훅·주인공·상승부·엔드카드·전환)마다 "무엇이 어떻게 움직이나"를 정할 때 | 슬롯마다 1개 |
| 영상 이펙트 (39) | `video-effects.md` + 카테고리 카드 | 사용자가 효과 이름으로 요청하거나("인물 뒤 거대 글자", "알림 폭탄"), 사람이 나오는 소재에 재미를 줄 때 | 광고당 주인공 1 + 보조 1 |
| 전환 | `transitions.md` (+ `shots/transition-*`) | 씬 경계마다. 시그니처 1곳을 먼저 정하고 나머지는 흐름 잇기 | 경계마다 1개 |
| 모션 전용 씬 | `interludes.md` | 소재 없이 그래픽만으로 숨 돌리는 씬이 필요할 때(템포가 정함) | 광고당 0–2 |
| 기법 조합(앱 AI) | `techniques.md` | 모션그래픽만으로 부족해 생성 이미지·영상·누끼·Lottie를 섞을 때 | 씬마다 주인공 기법 1 |
| 엔진 원리 | `engine-recipes.md` | 위 목록에 없는 움직임을 직접 짤 때(트랙 매트, 마스크, keyframes, gsap) | 필요할 때 |

규칙: 한 씬의 **주인공**은 샷 카드 하나 또는 이펙트 하나입니다. 빛 층(`sheen-sweep`), 손그림 강조, Lottie 같은 "얹는 샷"은 주인공 위에 하나까지 더합니다(aesthetic-rules F2·Q4).

## 2. 광고 목적별 빠른 묶음

슬롯마다 1순위 → 대안 순서입니다. **변주 카드의 훅 샷·엔드카드 방식 칸이 이 표의 훅·엔드카드 칸보다 먼저**입니다(`variety.md` "카드가 골격보다 먼저"). 표는 카드가 없을 때의 기본값과, 카드 칸이 브리프와 맞지 않을 때 바꿀 대안입니다. 소재(사용자 영상·사진)를 바닥에 깔고 그 위에 얹는 것이 기본입니다(Q11).

| 목적·업종 | 훅 | 주인공 | 상승부 | 엔드카드 | 빛·장식 | 전환 시그니처 |
|---|---|---|---|---|---|---|
| 할인·가격·쿠폰·오픈 이벤트 | `hook-number-slam` → `beat-flicker-sting` | `kinetic-typo-beat` | `price-countup`, `group-build`(가격표) | `endcard-logo-cta` | `sheen-sweep` glint(가격 박스), `hand-drawn-emphasis` | `transition-flash-streak`(드롭 1곳) |
| 제품·가전·테크 신제품 | `model-orbit-text` → `z-fly-through` | `hero-tilt-push`, `morph-reveal` | `feature-mask-reveal`, `transition-footage-card` | `endcard-logo-cta` | `sheen-sweep` chrome(제목) | `transition-zoom-through` |
| 앱·SaaS·서비스 | `hook-number-slam` | `hero-tilt-push` | `feature-mask-reveal` + 이펙트 `liveCursor`·`windowPopup`·`notificationBomb` | `endcard-logo-cta` + `group-build`(CTA) | `lottie-accent`(체크) | `transition-cover-flood` |
| 뷰티·음료·프리미엄 | `liquid-blobs` → `particle-logo` | `hero-tilt-push` | `feature-mask-reveal` | `particle-logo`(로고 스팅) | `sheen-sweep` gradient·glint | `transition-glyph-dive`(글자 속으로) |
| 장소·매장·배송·여행 | `map-region-pin` | `map-route-draw` | `iso-build-up`(구성도·진열) | `endcard-logo-cta` | — | `transition-whip-pan`(장소 이동) |
| 음악·스포츠·패션 몽타주 | `beat-flicker-sting` | `kinetic-typo-beat` | `beat-montage-wipe`, `transition-beat-freeze` | `endcard-logo-cta` | 이펙트 `glitch`, `glitch-hit` | `transition-flash-streak` |
| 고깃집·구이·식당 메뉴(조리 장면) | `sizzle-hit` → `beat-flicker-sting` | 한 점 집어 올리는 슬로 소재 + `kinetic-typo-beat`(메뉴명) | `beat-montage-wipe`(메뉴 컷), `transition-beat-freeze`(육즙 한 컷) | `endcard-logo-cta`(위치·영업시간) | `sheen-sweep` glint(가격) | `transition-whip-pan` / `transition-beat-freeze` |
| 키즈·푸드·친근한 앱 | `squash-bounce` → `pixel-sprite-hop` | `kinetic-typo-beat` | `group-build`, `lottie-accent` | `endcard-logo-cta` + `squash-bounce` 장식 | `hand-drawn-emphasis` | `transition-scribble-cover` |
| 감성·선물·수제·로컬 | `handwritten-title` | 소재 + `handwritten-title` 한 줄 | `hand-drawn-emphasis`, 이펙트 `halftonePrint` | `handwritten-title` + 로고 | 종이 결(변주) | `am-ink-bleed` / 매트 "질감으로 번짐" |
| 브랜드 리뉴얼·디자인·폰트 | `variable-type-breath` | `bauhaus-grid-flip` | `bauhaus-beat` | `endcard-logo-cta` | — | `transition-shape-grid` |
| 게임·레트로·편의점 | `pixel-sprite-hop` | `pixel-arcade` | `pixel-arcade` 씬 | `pixel-sprite-hop` 블록 → 로고 | 도트 질감 | `am-pixelate` |
| 테크·AI·보안·e스포츠 | `glitch-hit` | `z-fly-through` | 이펙트 `terminalTyping`·`faceScan`·`codeHuman` | `endcard-logo-cta` | 스캔라인(변주) | 글리치 컷 |
| 리뷰·입소문·SNS | 이펙트 `postWall`·`commentWaterfall` | 인물 소재 + `stickerPop` | `emojiReact`, `headLabel` | `endcard-logo-cta` | `lottie-accent`(하트) | `transition-cut-the-curve` |
| 뉴스형·긴급·마감 | 이펙트 `breakingNews` | `hook-number-slam` | `clockDial`(마감), `price-countup` | `endcard-logo-cta` | — | `transition-flash-streak` |

## 3. 샷 카드별: 쓸 때 · 피할 때

"앱"은 앱 광고 불러오기에서 그대로 보이는지입니다. **구움** = 브라우저 전용(three·script)이라 영상으로 구워 넣어야 함.

### 훅·주인공·상승부·엔드카드

| 카드 | 쓸 때 | 피할 때 | 앱 |
|---|---|---|---|
| `hook-number-slam` | 메시지가 숫자 하나로 읽힐 때(0원, 87%, 3초, 1+1) | 숫자가 없거나 숫자가 작은 글씨 정보일 때 | 그대로 |
| `beat-flicker-sting` | BGM이 강하고 첫 1초에 브랜드+리듬을 세울 때(숏폼, 몽타주) | 느린 템포, 프리미엄·의료·금융 | 그대로 |
| `kinetic-typo-beat` | 리듬이 같은 짧은 줄 2–4개(슬로건, "보고·반하고·가져라") | 문장이 길거나 BGM이 없을 때 | 그대로 |
| `variable-type-breath` | 글자 자체가 주인공(폰트·브랜드 리뉴얼·타이포 쇼릴) | 한글 가변 폰트가 없을 때, 정보 전달형 | 엔진 3.0.25+ |
| `handwritten-title` | 감성·선물·푸드·키즈, 메시지 한 줄 | 테크·금융, 긴 문장 | 그대로 |
| `hero-tilt-push` | 제품 대표 화면·패키지 하나를 세울 때(앱 화면, 상세 이미지) | 소재가 사람·풍경일 때 | 그대로 |
| `model-orbit-text` | 제품 3D 모델(또는 사진→3D)이 있고 "살아 움직이는" 공개가 필요할 때 | 모양이 중요한 실물이 3D로 잘 안 나올 때 | 그대로(three model) |
| `morph-reveal` | 그래픽 도형이 브랜드 아이콘·로고로 정리되는 순간 | 실제 제품 모양을 바꿔야 할 때(금지) | MCP `Morph3D` |
| `z-fly-through` | 공간·여행·부동산·전시, 층층이 놓인 사진·문구 사이로 들어갈 때 | 소재 1장뿐일 때 | 그대로 |
| `feature-mask-reveal` | 혜택·기능 하나를 한 화면으로, 여러 개면 반복 | 혜택이 5개 이상(→ `beat-montage-wipe`) | 그대로 |
| `beat-montage-wipe` | 장르·기능·라인업을 빠르게 나열, 소재 컷이 여러 개 | 소재가 1–2개, 느린 톤 | 그대로 |
| `price-countup` | 가격·통계가 결론, 엔드카드 바로 앞 | 가격이 비밀이거나 "문의"일 때 | 그대로 |
| `group-build` | CTA 버튼·가격표·칩 묶음처럼 함께 움직여야 하는 조각 | 조각이 하나뿐일 때 | 그대로 |
| `endcard-logo-cta` | 거의 모든 광고의 마지막(로고+메시지+행동, 1초 이상 정지) | 6초 범퍼에서 시간이 없으면 로고만 | 그대로 |
| `map-region-pin` | "어디서"가 메시지(매장, 서비스 지역, 출시 도시) | 위치가 부가 정보일 때 | 그대로 |
| `map-route-draw` | "어디서 어디로·얼마나 빨리"(배송, 이사, 여행, 노선) | 출발·도착이 없을 때 | 그대로 |
| `iso-build-up` | 여러 요소를 한눈에(구성도, 매장 지도, 진열) | 감성 톤. 입체형은 앱이면 구움 | 평면 그대로 / 입체 구움 |
| `bauhaus-grid-flip` | 디자인 시스템·브랜드 리뉴얼·굿즈, "모양이 모여 체계" | 소재가 주인공이어야 할 때 | 2D 그대로 / 3D 블록 구움 |
| `bauhaus-beat` | 빠른 템포의 도형 비트 광고 전체, 플래너 "도형" 그룹 | 느린 템포 | 그대로(플래너) |
| `pixel-sprite-hop` | 레트로·게임·키즈 훅, 캐릭터가 브랜드를 꺼내 보여 줌 | 프리미엄·의료 | 그대로 |
| `pixel-arcade` | 8비트 게임 화면으로 광고 전체, 플래너 "아케이드" 그룹 | 레트로가 아닌 브랜드 | 그대로(플래너) |
| `squash-bounce` | 귀여움·친근함, 로딩·"곧 공개", 로고 점을 공으로 | 진지한 톤 | 그대로 |
| `liquid-blobs` | 뷰티·음료·테크 무드의 배경 주인공 | 정보형, 앱으로 바로 넘길 때 | 구움 |
| `particle-logo` | 로고 스팅·런칭 훅, "흩어진 것이 하나로" | 로고가 복잡하거나 밝은 배경 | 구움 |
| `particle-morph` | 시간·흐름·에너지를 모양 변화로(어두운 배경) | 밝은 배경, 정보형 | 구움 |
| `glitch-hit` | 테크·음악 드롭에 2–4프레임 충격 | 길게 쓰기(불량 화면처럼 보임), 의료·키즈 | 그대로 |
| `sizzle-hit` | 조리 장면(불판에 닿기·뒤집기·붓기)이 있는 음식점의 훅·시그니처, 지글 소리가 박에 떨어질 때 | 완성된 접시만 있을 때(→ `feature-mask-reveal`), 디저트·음료처럼 김이 안 맞는 메뉴 | 그대로 |

### 얹는 샷 (주인공 위에 하나까지)

| 카드 | 쓸 때 | 피할 때 | 앱 |
|---|---|---|---|
| `sheen-sweep` glint | 가격 박스·버튼·로고·밝은 회색 글자에 "반짝" 한 번 | 흰 글자 위(안 보임), 한 화면 여러 요소 | 그대로 |
| `sheen-sweep` gradient | 흰 글자 슬로건·런칭 문구를 브랜드 색으로 물들일 때 | 글자가 작을 때(띠가 안 읽힘) | 그대로 |
| `sheen-sweep` chrome | 프리미엄·테크·자동차의 큰 제목 | 귀여운·수제 톤 | 그대로 |
| `drip-melt` | 단색 글자·아이콘이 녹거나 흘러넘치는 느낌: 여름 세일, 소스·시럽·초콜릿·페인트·제형, 앱 아이콘 등장 | 그라데이션·외곽선 글자, 가는 글꼴, 프리미엄 미니멀 톤, 한 장면 두 대상 | 그대로 |
| `hand-drawn-emphasis` | 화면의 가장 중요한 한 단어·가격을 짚을 때 | 장면당 3개 이상 | 그대로 |
| `lottie-accent` | 혜택 문구·버튼 옆 체크·하트·반짝이·폭죽 | 화면 주인공으로 크게, 색을 못 바꾸는데 브랜드와 안 맞을 때 | 그대로 |

### 전환 샷

| 카드 | 쓸 때 | 피할 때 |
|---|---|---|
| `transition-cut-the-curve` | 특별한 이유가 없는 모든 경계(기본) | — |
| `transition-whip-pan` | 장소 이동, 같은 종류 컷 빠르게 넘김 | 한 광고 3번 이상 |
| `transition-match-cut` | 양쪽에 비슷한 모양·움직임이 있을 때 | 모양이 전혀 다를 때 |
| `transition-zoom-through` | 소재에 둥근 창·화면·렌즈 같은 "안"이 있을 때(시그니처) | 그런 물체가 없을 때 |
| `transition-glyph-dive` | 브랜드명·제품명·한 단어 훅에서 제품 장면으로(시그니처). 소재가 어떤 것이든 됨 | 가는 글꼴, 7자 넘는 문구, 한 광고 두 번 |
| `transition-cover-flood` | 장면 성격이 바뀔 때, 화면 속 점(로고 점·버튼·핀)이 있을 때 | 아무 데서나 원이 생길 때 |
| `transition-scribble-cover` | 손그림 톤 광고의 커버 | 테크·프리미엄 |
| `transition-flash-streak` | 음악 드롭·훅 직후 에너지 한 번(R4 충격 1회로 셈) | 느린 톤, 두 번 이상 |
| `transition-beat-freeze` | 음악 몽타주에서 한 컷 박제 | BGM 없을 때 |
| `transition-footage-card` | 여러 소재를 넘겨 보여 주는 상승부(2D↔2.5D) | 소재 1개 |
| `transition-shape-grid` | 모션 전용 씬으로 들어갈 때 | 소재 씬끼리의 평범한 경계 |
| `transition-ring-iris` | 모션 씬에서 나올 때, 느린 템포 시그니처 | 빠른 템포 |

## 4. 영상 이펙트별: 쓸 때 · 피할 때

`cutout`은 인물 누끼(사진 `removeBackground`·`separateLayers`, 그린스크린 `chroma_key`)가 있어야 합니다. 일반 영상 속 인물은 아직 누끼가 안 되니 사진 + `imageToVideo`로 갑니다.

| 카테고리 | 이펙트 | 쓸 때 | 피할 때 |
|---|---|---|---|
| 인물 뒤 공간 | `clockDial` | 마감 임박, 타임랩스, "24시간" | 시간과 무관한 메시지 |
| | `giantType` | 브랜드명·한 단어를 인물 뒤에 크게 | 단어가 길 때(4자 넘으면 작아짐) |
| | `postWall` | 입소문·SNS 인기 | 후기를 지어내야 할 때 |
| | `orbitRing` | 인물 주변에 혜택 칩 3–4개 | 칩 문구가 길 때 |
| | `countUpBehind` | 누적 판매·회원 수 같은 큰 숫자 | 숫자가 작을 때 |
| | `chartRise` | 성장·성과·수익률 | 근거 없는 수치 |
| | `infiniteTunnel` | 몰입·속도·끝없는 선택 | 차분한 톤 |
| 인물 변형 | `cloneLineup` | "여러 역할을 혼자", 라인업 | 단체 사진 |
| | `headStack` | 병맛·코믹 | 진지한 톤 |
| | `codeHuman` · `asciiHuman` | 테크·개발·AI | 일반 소비재 |
| | `neonOutline` | 밤·클럽·나이트·게임 | 밝은 낮 장면 |
| | `stickerPop` | SNS·리뷰어·인플루언서 | 프리미엄 |
| | `halftonePrint` | 인쇄·잡지·레트로·콜라주 | 제품 색이 정확해야 할 때 |
| | `banknotePortrait` | 금융·용돈·캐시백 (농담 톤) | 실제 지폐로 오인될 수 있는 크기·디자인 |
| | `colorSplit` | 음악·테크 강조 한 순간 | 길게 |
| | `echoTrail` | 춤·운동·빠른 동작 | 정적인 소재 |
| | `frameEscape` | "틀을 깬다", 반전 | 누끼가 없을 때 |
| 얼굴 추적 | `headLabel` | 인물 소개, "사장님 추천" | 인물이 크게 움직일 때(approx) |
| | `faceScan` | 테크·뷰티 진단·AI 분석 | 의료 진단처럼 보이면 안 될 때 |
| | `emojiReact` | 반응·후기·라이브 | 진지한 톤 |
| 화면 오버레이 | `windowPopup` | 앱·SaaS, 혜택 나열 | 소재를 가릴 때 |
| | `commentWaterfall` | 라이브 커머스·입소문 | 댓글을 지어내 사실처럼 보일 때 |
| | `handDoodle` | 친근한 강조, 리뷰 | 장면당 3개 이상 |
| | `liveCursor` | 협업 툴, "직접 골라 보세요" | 화면 UI가 없는 소재 |
| | `predictiveKeyboard` | 검색·"○○ 하면 생각나는" | 문구가 길 때 |
| | `terminalTyping` | 개발·테크 | 일반 소비재 |
| | `notificationBomb` | "알림이 쏟아지는" 인기·주문 폭주 | 차분한 톤 |
| | `breakingNews` | 긴급·속보 톤 이벤트 발표 | 실제 뉴스로 오인될 내용 |
| 전환·임팩트 | `comicImpact` | 코믹·병맛 반전 | 프리미엄 |
| | `bladeSlash` | 가격 "싹둑", 빠른 전환 | 키즈·의료 |
| | `paperTear` | 반전·공개, 종이 톤 | 테크 |
| | `letterDive` | 큰 글자 속으로 다음 장면(시그니처) | 트랙 매트 "글자 속으로"와 같은 광고에서 둘 다 |
| | `glitch` | 테크·음악 전환 | 의료·키즈 |
| | `splitScreen` | 비교·전후·여러 소재 동시 | 소재가 1개 |
| 카메라 | `dollyZoom` | 깨달음·충격의 순간 | 남발 |
| | `rackFocus` | 앞·뒤 피사체로 시선 이동 | 누끼가 없을 때 |
| | `freezeZoom` | 영상 속 한 점(제품·표정) 짚기 | 정지 화면 |
| | `speedRamp` | 운동·자동차·액션 | 정적인 소재 |

## 5. 변주 카드 칸은 어떻게 쓰나

변주 칸은 고르는 것이 아니라 **뽑힌 칸을 따르는 것**입니다(`variety.mjs`가 최근 광고와 겹치지 않게 뽑음). 뽑힌 칸을 구현할 때 이 표의 아이템을 씁니다.

| 축 | 칸 → 쓰는 아이템 |
|---|---|
| 주인공 글자 처리 | slam-scale → `kinetic-typo-beat`·`hook-number-slam` · typewriter → `terminalTyping`·`predictiveKeyboard` · outline-draw → `text_to_path` + `strokeDraw` · pixel-type → `pixel-arcade` · glitch-settle → `glitch-hit` · depth-pass → `z-fly-through` · mask-rise → `feature-mask-reveal` |
| 그래픽 지원 층 | shape-burst → `bauhaus-beat` 조각 · stickers → `stickerPop`·`group-build` · halftone → `halftonePrint` · pixel-blocks → `pixel-sprite-hop` · hud → `faceScan` 괄호 · lottie → `lottie-accent` · marker → `hand-drawn-emphasis` · grouped-chips → `group-build` |
| 빛·질감 층 | sweep → `sheen-sweep` · rgb-split → `colorSplit` · paper → `halftonePrint` 종이 · flash-frames → `beat-flicker-sting` |
| 전환 계열 | cover-flood·flash-streak·zoom-through·match-cut·shape-grid·ring-iris → 같은 이름 `transition-*` · ink-bleed → `am-ink-bleed` · matte-text → `transition-glyph-dive`(트랙 매트 "글자 속으로") · pixelize → `am-pixelate` · card-swap → `am-card-swap` · push → `am-push` |
| 카메라 | z-dolly → `z-fly-through` · beat-punch → 스케일 펀치(BGM 피크) · push-in·pull-out → `kenBurns`·`zoomAbout` |
| 훅 샷 | 칸 id가 샷 카드 이름(`shots/<id>.md`) · footage-crash → 샷 카드 없이 소재 zoom 1.35→1 + 한 단어 라벨 |
| 모션 말투 | 칸의 `how` 값(이징·거리·길이)을 고른 샷 카드 파라미터 표의 입장 값 대신 씀. gsapTimeline이면 gsap 문자열(`expo.out`), keyframes면 엔진 이름(`easeOutExpo`, `easing.md` §2) |
| 엔드카드 방식 | logo-settle → `endcard-logo-cta` 기본값 · kinetic-stack → `kinetic-typo-beat` 엔드카드형 · particle-logo·handwritten-sign·pixel-block-logo → 같은 샷 카드 · grid-assemble → `group-build` · matte-name → 트랙 매트(`transitions.md`) · 나머지는 칸의 `how`대로 `endcard-logo-cta`의 순서·정지 규칙 위에서 |

## 6. 비슷한 것끼리 고르기

| 헷갈리는 짝 | 이렇게 고름 |
|---|---|
| `hook-number-slam` / `price-countup` / `countUpBehind` | 훅에서 숫자 하나로 시선 → slam · 끝에서 가격이 결론 → countup · 인물 뒤에 큰 수치 → countUpBehind |
| `kinetic-typo-beat` / `variable-type-breath` | 여러 줄이 박마다 꽂힘 → kinetic · 한 단어의 모양이 숨쉼 → variable |
| `handwritten-title` / `hand-drawn-emphasis` / `handDoodle` | 문구 자체를 손으로 씀 → title · 기존 단어를 짚음 → emphasis · 화면 여기저기 낙서 → handDoodle |
| `particle-logo` / `particle-morph` | 로고로 모이고 끝 → logo · 여러 모양을 오감 → morph |
| `bauhaus-grid-flip` / `bauhaus-beat` / `transition-shape-grid` | 상승부 한 샷 + 3D → grid-flip · 광고 전체를 도형 비트로(플래너) → beat · 경계에서 덮기만 → shape-grid |
| `pixel-sprite-hop` / `pixel-arcade` | 훅·엔드카드 한 순간 → hop · 광고 전체 게임 화면 → arcade |
| `glitch-hit` / 이펙트 `glitch` | 박 위 2–4프레임 충격 → glitch-hit · 장면 전환으로 쓰는 찢김 → glitch |
| `transition-cover-flood` / `transition-scribble-cover` | 깔끔한 원 → cover-flood · 손그림 톤 → scribble |
| `letterDive` / 트랙 매트 "글자 속으로" | 같은 원리. 한 광고에 하나만 |
| `sheen-sweep` / `lottie-accent` 반짝이 | 대상 표면이 빛남 → sheen · 대상 옆에 장식이 터짐 → lottie |
| `drip-melt` / `liquid-blobs` | 글자·아이콘 자체가 녹아 흐름 → drip(평면, 앱까지 감) · 광택 액체 덩어리가 떠서 일렁임 → blobs(three, 브라우저 전용) |
| `hero-tilt-push` / `transition-footage-card` | 한 소재를 세움 → hero · 여러 소재를 넘김 → footage-card |
| `z-fly-through` / `infiniteTunnel` | 사진·문구 층 사이로 들어감 → z-fly · 인물 뒤 끝없는 공간 → tunnel |

## 7. 새 레시피를 넣을 때

- 카드 frontmatter의 `슬롯`·`에너지`·`길이`와 함께, 이 문서 §3(또는 §4)에 "쓸 때 / 피할 때" 한 줄과 앱 여부를 적습니다. 목적별 묶음(§2)에 들어갈 자리가 있으면 거기도 넣습니다.
- 비슷한 아이템이 이미 있으면 §6에 고르는 기준을 한 줄 더합니다. 기준을 못 쓰겠으면 새 카드가 아니라 기존 카드의 변형으로 넣습니다.
- 규칙이나 검사(`validate.mjs`)로 강제할 수 있는 함정은 강제합니다. 문서에만 적은 함정은 잊히기 쉽습니다.
