# 모션 방향 메뉴

광고를 만들기 전에 사용자에게 보여 줄 **모션 방향**(어떤 모션그래픽을 어떤 형태로 얹을지) 목록입니다. `gallery.mjs recommend`(MCP: `get_gallery({ request })`)가 이 파일을 읽어 요청에 맞는 방향 3개를 기획안 A–C로 고르고, 기획안마다 `예시`의 갤러리 예시 미리보기를 붙입니다. 사용자에게는 그 아래 "자유롭게 생성"까지 4줄을 보여 줍니다(SKILL.md "시작할 때" 4번).

- 모든 방향은 **바닥 소재(영상·이미지) 위에 얹는 모션**입니다. 화면 전체를 덮는 면·짙은 틴트로 소재를 묻지 않습니다(aesthetic-rules Q11).
- 예외로 소재 씬 사이에 **모션 전용 씬(인터루드)**을 템포에 맞춰 끼웁니다. 빠른 템포는 15초에 2개까지 화려하게, 느린 템포·제품 극대화는 30초 이상에서 하나만 살짝(`interludes.md`, `templates/interludes.mjs`). 방향의 골격 슬롯 사이 경계에 들어가며, 주인공 방향의 색·글꼴을 그대로 씁니다.
- 기본은 굵고 **화려하게**입니다: 큰 글자, 분명한 그리드, 박에 꽂히는 expo·back 이징, 브랜드 색 2–3개. 장면마다 그래픽·빛 층을 쌓고(세 층), 박마다 히트, 주인공 문구는 글자 단위 3D, 카메라는 쉬지 않습니다(`aesthetic-rules.md` F1–F6). 시그니처는 그중 가장 센 한 번입니다. 가는 선 일러스트, 부드러운 페이드, 비네트·필름 그레인 위주 연출은 오래된 느낌이라 사용자가 원할 때만 씁니다.
- 한 광고의 주인공 방향은 하나입니다. 다른 방향에서 샷 하나를 빌려 오는 것은 됩니다(예: 혜택 펀치 + 비트 몽타주의 플래시 전환).

## 형식

방향마다 `## <id> · <이름>` 제목과 아래 줄을 씁니다. `gallery.mjs`가 줄 이름으로 읽으니 줄 이름을 바꾸지 않습니다.

| 줄 | 뜻 |
|---|---|
| 한 줄 | 화면에서 무엇이 어떻게 움직이는지 |
| 형태 | 레이아웃·구조 (글자 크기, 그리드, 소재와 그래픽의 관계) |
| 골격 | 슬롯 순서 (훅 → 주인공 → 상승부 → 엔드카드)와 샷 카드 |
| 시그니처 | 이 광고에서 한 번만 주인공이 되는 움직임 |
| 전환 | 컷 사이에 쓸 전환 카드 2–3종. 어느 방향이든 시그니처 한 곳은 트랙 매트("글자 속으로"·"질감으로 번짐")나 `am-*` 전환으로 바꿔 쓸 수 있음 (`transitions.md`) |
| 글꼴·색 | 무드 (`fonts.md` 페어링 이름이나 성격) |
| 어울림 | 요청 낱말 (제품·목적·무드). `/`로 나눔, 점수에 씀 |
| 예시 | `gallery/data/ads.json` slug, 레퍼런스 id (없으면 `-`). 기획안 목록에서 이 방향의 "이런 형태로" 예시로 붙음(앞에 적은 것부터, 다른 기획안이 이미 쓴 예시는 건너뜀) |
| 레퍼런스 낱말 | 외부 레퍼런스를 찾을 낱말 |
| 앱 | 앱 불러오기로 그대로 가는지, 영상으로 구워 넣을 부분 |
| 기본 | `예`면 요청 낱말이 안 맞을 때 기본 후보로 씀 |

## editorial-kinetic · 에디토리얼 키네틱 타이포

- 한 줄: 화면 폭을 넘는 큰 문구 줄이 박마다 꽂히고 흘러가며, 소재는 그리드 칸 안에서 보임
- 형태: 왼쪽 정렬 그리드, 번호 라벨·얇은 구분선, 화면 높이 15–25% 글자, 소재는 풀프레임 또는 큰 칸 하나
- 골격: 훅 kinetic-typo-beat → 주인공 feature-mask-reveal(소재 칸이 열림) → 상승부 마키 줄(neon-triple-marquee 손법) → 엔드카드 endcard-logo-cta
- 시그니처: 핵심 단어 줄 뒤로 색 띠가 박에 맞춰 깔리고 전체가 눌렸다 펴짐
- 전환: transition-flash-streak, 마스크 wipe·angleWipe, transition-match-cut
- 글꼴·색: 굵은 라틴 디스플레이 + 한글 고딕 800, 플랫 3색(잉크·바탕·포인트 1)
- 어울림: 카페/커피/음료/패션/브랜드/런칭/신제품/신메뉴/뷰티/음악/페스티벌/매장/오픈/모던/트렌디/세련/요즘/감각/베이커리/클리닉/피부과/성형/치과/병원/금융/보험/투자/요가/필라테스/피트니스/학원/강의/클래스/교육
- 예시: motion-styles-five, shotcraft/neon-triple-marquee
- 레퍼런스 낱말: 키네틱 타이포 마키 그리드 모던
- 앱: 그대로
- 기본: 예

## beat-montage · 비트 몽타주

- 한 줄: 소재 컷이 박마다 바뀌고 컷마다 라벨·제목이 붙으며, 컷 사이를 사선 띠가 덮음
- 형태: 풀프레임 소재 위 하단·좌상단 라벨, 컷당 0.8–1.4초, 훅은 막대·컬러 바 깜빡임
- 골격: 훅 beat-flicker-sting → 상승부 beat-montage-wipe(소재 3–6컷) → 주인공 kinetic-typo-beat 한 줄 → 엔드카드 endcard-logo-cta
- 시그니처: 드롭에서 워드마크가 박에 슬램
- 전환: beat-montage-wipe 사선 띠, transition-flash-streak, `am-push`(다음 컷이 박에 밀어냄), transition-footage-card
- 글꼴·색: 컨덴스드 고딕·굵은 산세리프, 브랜드 색 + 형광 포인트
- 어울림: 헬스/피트니스/스포츠/운동/이벤트/세일/축제/페스티벌/여러/라인업/컬렉션/쇼핑/패션/게임/음악/에너지/빠른/역동/숏폼/릴스/쇼츠/맛집/메뉴/식당/레스토랑/음식/크로스핏/요가/필라테스
- 예시: transitions-four-ways
- 레퍼런스 낱말: 비트 몽타주 와이프 플래시
- 앱: 그대로
- 기본: 예

## offer-punch · 혜택·가격 펀치

- 한 줄: 큰 숫자가 꽂히고 가격이 굴러가다 멈추며, 기울어진 스티커와 굵은 마커 강조가 붙음
- 형태: 숫자가 화면 높이 25–35%, 소재 위 한쪽에 정보 블록, 스티커·배지는 도형 시트(`make_shape_pngs`)
- 골격: 훅 hook-number-slam → 주인공 소재 + kinetic-typo-beat 한 줄 → 상승부 price-countup + hand-drawn-emphasis(굵은 마커) + lottie-accent(체크·반짝이) → 엔드카드 endcard-logo-cta(가격표 묶음은 group-build)
- 시그니처: 가격이 드롭에서 멈추며 스티커가 back 이징으로 박힘
- 전환: transition-flash-streak, transition-cover-flood, 마스크 wipe
- 글꼴·색: 숫자용 굵은 디스플레이, 높은 대비(검정·흰색 + 세일 색 1)
- 어울림: 할인/세일/가격/특가/쿠폰/혜택/프로모션/이벤트/오픈/1+1/원/%/마트/배달/쇼핑/구독/요금/무료/증정/한정/마감/식당/맛집/분식/헬스/피트니스/회원/등록/수강/모집/금리/캐시백/적금/카드
- 예시: -, shotcraft/countdown-arc-scatter
- 레퍼런스 낱말: 숫자 카운트 가격 스티커
- 앱: 그대로
- 기본: 예

## product-hero · 제품 주인공 3D·카드

- 한 줄: 제품 소재가 기울어진 카드나 3D 오브젝트로 다가와 정면으로 서고, 기능 칩이 주변에 붙음
- 형태: 화면 가운데 제품, 기능 문구는 칩·라벨로 짧게, 소재 카드 사이를 2D↔2.5D로 넘김
- 골격: 훅 kinetic-typo-beat 또는 hook-number-slam → 주인공 hero-tilt-push(three면 three.md) → 상승부 feature-mask-reveal + transition-footage-card, 기능 칩 묶음은 group-build → 엔드카드 endcard-logo-cta
- 시그니처: 제품이 한 바퀴 돌거나 카드가 정면으로 펴지는 순간
- 전환: transition-footage-card, transition-zoom-through, transition-match-cut
- 글꼴·색: 정갈한 그로테스크, 어두운 바탕 + 스트립 조명·글로우 포인트
- 어울림: 제품/전자/가전/이어폰/폰/스마트/앱/서비스/테크/it/기기/노트북/자동차/화장품/뷰티/런칭/신제품/티저/프리미엄/기능/스펙/핀테크/카드/은행/금융/의료기기
- 예시: gsap-three-earbuds-teaser, morph-3d-to-2d, opuscar/glass-product
- 레퍼런스 낱말: 제품 3d 카드 글로우
- 앱: 카드·칩은 그대로, three 장면은 영상으로 구워 넣음
- 기본: 아니요

## info-map · 지도·정보형

- 한 줄: 지도가 들어오고 지역이 칠해지거나 경로가 그려지며, 숫자·핀으로 정보를 보여 줌
- 형태: 소재 위에 반투명하지 않은 플랫 지도 카드, 정보는 숫자 + 짧은 라벨, 아이소메트릭 블록으로 구성도
- 골격: 훅 map-region-pin → 주인공 map-route-draw → 상승부 iso-build-up(평면형) 또는 price-countup → 엔드카드 endcard-logo-cta
- 시그니처: 경로가 그려지며 지도가 다가감
- 전환: transition-zoom-through, transition-cover-flood, transition-match-cut
- 글꼴·색: 고딕 600–800, 지도 바탕 1색 + 경로 포인트 1색
- 어울림: 배송/배달/택배/물류/지도/지역/위치/매장/지점/전국/부동산/분양/여행/관광/노선/교통/인포/정보/통계/데이터/구성/병원/의원/클리닉/치과/한의원/약국/검진/의료/금융/은행/보험/증권/투자/연금/적금/학원/교육/강의/입시/커리큘럼
- 예시: map-route-delivery
- 레퍼런스 낱말: 지도 경로 아이소 데이터
- 앱: 그대로(입체 아이소는 영상으로 구워 넣음)
- 기본: 아니요

## glossy-signature · 리퀴드·파티클 시그니처

- 한 줄: 광택 액체 방울이나 입자 소용돌이가 한 번 화면의 주인공이 되고, 나머지는 굵은 타이포로 정리
- 형태: 시그니처 장면 하나(3–6초) + 앞뒤는 소재 위 키네틱 타이포, 색은 2색 그라데이션까지
- 골격: 훅 particle-logo 또는 liquid-blobs → 주인공 소재 + kinetic-typo-beat → 상승부 feature-mask-reveal → 엔드카드 endcard-logo-cta(particle-logo로 모여도 됨)
- 시그니처: 입자가 모여 워드마크가 되거나 액체가 제품 색으로 바뀜
- 전환: transition-cover-flood, transition-zoom-through, transition-flash-streak
- 글꼴·색: 둥근 디스플레이 + 고딕, 광택 2색(톤 매핑은 Neutral)
- 어울림: 뷰티/화장품/향수/음료/주스/탄산/맥주/테크/ai/런칭/티저/프리미엄/럭셔리/고급/신비/몽환/로고/커피/라떼/카페/피부과/성형/클리닉/에스테틱
- 예시: motion-styles-five, opuscar/glass-product
- 레퍼런스 낱말: 파티클 리퀴드 글로우 프리미엄
- 앱: 시그니처 장면은 영상으로 구워 넣음, 나머지는 그대로
- 기본: 아니요

## playful-bounce · 플레이풀 바운스

- 한 줄: 도형·스티커가 통통 튀며 납작해졌다 늘어나고, 문구가 박에 맞춰 튀어 올라옴
- 형태: 큰 둥근 도형·스티커(도형 시트), 밝은 플랫 색 3–4개, 소재는 둥근 칸이나 풀프레임
- 골격: 훅 squash-bounce → 주인공 소재 + kinetic-typo-beat(back 이징) → 상승부 hand-drawn-emphasis(굵은 마커) 또는 price-countup, 하트·폭죽은 lottie-accent → 엔드카드 endcard-logo-cta + squash-bounce 장식
- 시그니처: 로고나 제품 위로 공이 떨어져 출렁이며 멈춤
- 전환: transition-cover-flood, transition-match-cut, 마스크 wipe
- 글꼴·색: 둥근 굵은 고딕, 원색 계열 밝은 팔레트
- 어울림: 키즈/어린이/유아/장난감/디저트/과자/간식/푸드/음식/치킨/피자/반려/펫/앱/게임/귀여운/친근/발랄/유쾌/재밌/분식/식당/학원/교육/공부/영어/유치원
- 예시: motion-styles-five
- 레퍼런스 낱말: 바운스 스티커 카툰
- 앱: 그대로
- 기본: 아니요

## handwritten-warm · 손글씨 감성

- 한 줄: 손글씨 문구가 한 글자씩 써지고 핵심 단어에 손그림 강조가 붙음
- 형태: 소재 위 여백에 손글씨 한두 줄, 나머지 정보는 굵은 고딕으로 대비
- 골격: 훅 handwritten-title(lineBoil 떨림) → 주인공 소재 + 고딕 문구 → 상승부 hand-drawn-emphasis → 엔드카드 endcard-logo-cta(브랜드명은 윤곽선 레터링 `text_to_path` + strokeDraw)
- 시그니처: 손글씨 한 줄이 써지는 순간
- 전환: transition-match-cut, 마스크 wipe, `am-ink-bleed`(종이에 번지듯, 한 번)
- 글꼴·색: 손글씨 + 굵은 고딕, 따뜻한 2색
- 어울림: 손글씨/감사/감성/편지/캘리/기념일/웨딩/가족/선물/명절/추석/설날/카페/커피/베이커리/빵/병원/의원/치과/한의원/약국/건강/요양/식당/맛집/한식/집밥
- 예시: handwriting-thank-you
- 레퍼런스 낱말: 손글씨 손그림
- 앱: 그대로
- 기본: 아니요

## pixel-retro · 픽셀 레트로

- 한 줄: 도트 캐릭터·아이콘이 계단식으로 걷고 튀며, 글자와 장면이 큰 픽셀 블록으로 바뀜
- 형태: 격자 하나(도트 8–10px)에 맞춘 스프라이트·아이콘, 8–16색 팔레트, 소재 위 하단 절반은 도트 무대(바닥 줄·구름·코인), 글자는 도트 폰트 화면 높이 8–14%
- 골격: 훅 pixel-sprite-hop(캐릭터가 걸어 들어와 점프) → 주인공 소재 + 도트 말풍선·kinetic-typo-beat(steps 이징) → 상승부 price-countup(도트 숫자, steps) 또는 beat-montage-wipe(픽셀 블록 와이프) → 엔드카드 endcard-logo-cta + 코인·별 반짝임 스프라이트
- 시그니처: 캐릭터가 로고 블록을 머리로 쳐서 로고가 튀어나오는 순간(pixel-sprite-hop 마지막 박)
- 전환: `pixelize` 전환, 큰 블록이 칸 단위로 덮는 blockReveal 마스크, transition-flash-streak(짧게)
- 글꼴·색: 도트 폰트(`search_fonts "pixel"`) + 굵은 고딕 보조, 브랜드 색을 8–16색 팔레트로 줄여 씀, 바깥선은 가장 어두운 색 1px
- 어울림: 픽셀/도트/레트로/뉴트로/8비트/16비트/오락실/아케이드/고전 게임/게임/캐릭터/추억/옛날/빈티지/키즈/장난감/간식/편의점/이벤트
- 예시: opuscar/pixel-rpg
- 레퍼런스 낱말: 픽셀 레트로 게임 도트
- 앱: 그대로(엔진 3.0.19+ 앱 버전에서 `pixelated`·`spriteSheet`·`steps()`가 보임, `pixel-art.md`)
- 기본: 아니요

## glitch-tech · 글리치 테크

- 한 줄: 박마다 화면이 RGB로 찢어지고 가로 조각이 밀리며, 스캔라인 위로 문구가 깜빡이며 정착함
- 형태: 어두운 바탕 소재 + 모노스페이스·그로테스크 문구, 괄호·커서·좌표 같은 HUD 라벨, 화면 가장자리 스캔 브래킷
- 골격: 훅 glitch-hit(워드마크가 찢어졌다 붙음) → 주인공 소재 + kinetic-typo-beat(타자·깜빡 정착) → 상승부 beat-montage-wipe + glitch-hit(드롭마다 2–4프레임) → 엔드카드 endcard-logo-cta(로고가 RGB 분리로 들어와 정렬)
- 시그니처: 드롭 박에 화면 전체가 가로로 찢어지며 다음 장면으로 넘어감
- 전환: glitch-hit(전환으로), transition-flash-streak(시안·마젠타), 마스크 angleWipe
- 글꼴·색: 모노스페이스 + 굵은 그로테스크, 검정·흰색 + 형광 1색(시안 또는 라임), RGB 분리 색은 빨강·시안
- 어울림: 글리치/테크/it/ai/해킹/보안/사이버/디지털/코딩/개발/소프트웨어/플랫폼/e스포츠/게이밍/일렉트로닉/edm/클럽/힙합/스트릿/미래/sf/메타버스/nft/블록체인
- 예시: shotcraft/glitch-cycle, shotcraft/scanline-assemble-flyin, opuscar/ascii-crt
- 레퍼런스 낱말: 글리치 스캔라인 hud 사이버
- 앱: 그대로(Effect 클립 `glitchFilter`·`rgbSplitFilter`)
- 기본: 아니요

## spatial-3d · 3D 공간 플라이스루

- 한 줄: 카메라가 Z축으로 층층이 놓인 사진·글자 사이를 뚫고 날아가며, 도형이 3D에서 평면 아이콘으로 바뀜
- 형태: 소재 카드·문구를 z 0 / −600 / −1400처럼 깊이별로 배치, 앞 층은 크게 스쳐 지나감, 정보는 깊이마다 하나씩
- 골격: 훅 z-fly-through(문구 층을 뚫고 들어감) → 주인공 hero-tilt-push 또는 morph-reveal(3D 오브젝트 → 브랜드 아이콘) → 상승부 transition-footage-card + group-build(정보 칩 묶음이 깊이에서 날아옴) → 엔드카드 endcard-logo-cta(로고가 깊은 곳에서 다가와 정면)
- 시그니처: 마지막 층을 뚫는 순간 화면이 다음 장면 소재로 열림(z-fly-through + transition-zoom-through)
- 전환: transition-zoom-through, `am-card-swap`, transition-footage-card
- 글꼴·색: 굵은 그로테스크, 어두운 바탕 + 깊이마다 밝기 차(앞 층 밝게, 먼 층 어둡게) + 포인트 1색
- 어울림: 3d/입체/공간/깊이/날아/여행/항공/호텔/부동산/분양/인테리어/가구/쇼룸/전시/박물관/건축/자동차/vr/몰입/우주/테크/런칭
- 예시: morph-3d-to-2d, shotcraft/depth-layer-moves, shotcraft/cloner-depth-echo, opuscar/desktop-flythrough
- 레퍼런스 낱말: 깊이 플라이스루 3d 카메라
- 앱: 그대로(클립 `transform3d`·`z` 키프레임), three 모프 장면은 영상으로 구워 넣음
- 기본: 아니요

## print-collage · 프린트·콜라주

- 한 줄: 하프톤·리소 질감의 오려 붙인 사진 조각이 박마다 겹쳐 쌓이고, 장면은 잉크가 번지듯 넘어감
- 형태: 기울어진 사진 조각(흰 테두리·찢긴 가장자리 PNG), 테이프·스티커, 하프톤 점 패턴 면, 큰 세리프·스텐실 글자, 소재는 조각 하나가 풀프레임으로 커지며 바닥이 됨
- 골격: 훅 kinetic-typo-beat(스텐실 글자 + 하프톤 띠) → 주인공 소재 조각이 탁탁 붙는 group-build(조각 + 테이프 묶음) → 상승부 hand-drawn-emphasis(굵은 마커) + 리소 2색 겹침 → 엔드카드 endcard-logo-cta(도장 찍히듯)
- 시그니처: 잉크가 화면을 번지며 덮고 다음 장면이 종이 결로 열림(`am-ink-bleed`)
- 전환: `am-ink-bleed`, 트랙 매트 "질감으로 번짐"(transitions.md), 마스크 blockReveal
- 글꼴·색: 굵은 세리프·스텐실 + 고딕, 리소 2색(형광 핑크·파랑 같은) + 종이색 바탕, 하프톤은 `dotFilter`
- 어울림: 인쇄/프린트/리소/하프톤/콜라주/잡지/매거진/포스터/종이/아트/전시/책/출판/문구/굿즈/편집샵/독립/로컬/수제/공방/빈티지/페스티벌/공연/카페/커피/베이커리/빵
- 예시: shotcraft/riso-print-hits, shotcraft/print-texture-transitions, opuscar/halftone-dossier, opuscar/risograph
- 레퍼런스 낱말: 하프톤 리소 콜라주 인쇄
- 앱: 그대로(트랙 매트는 앱 EP 변환이 matte를 보존하는 버전부터)
- 기본: 아니요
