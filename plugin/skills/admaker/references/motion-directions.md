# 모션 방향 메뉴

광고를 만들기 전에 사용자에게 보여 줄 **모션 방향**(어떤 모션그래픽을 어떤 형태로 얹을지) 목록입니다. `gallery.mjs recommend`(MCP: `get_gallery({ request })`)가 이 파일을 읽어 요청에 맞는 방향 3개를 기획안 A–C로 고르고, 기획안마다 `예시`의 갤러리 예시 미리보기를 붙입니다. 사용자에게는 그 아래 "자유롭게 생성"까지 4줄을 보여 줍니다(SKILL.md "시작할 때" 4번).

- 모든 방향은 **바닥 소재(영상·이미지) 위에 얹는 모션**입니다. 화면 전체를 덮는 면·짙은 틴트로 소재를 묻지 않습니다(aesthetic-rules Q11).
- 기본은 굵고 요즘 느낌입니다: 큰 글자, 분명한 그리드, 박에 꽂히는 expo·back 이징, 플랫 색 2–3개, 3D·입자는 시그니처 한 번. 가는 선 일러스트, 부드러운 페이드, 비네트·필름 그레인 위주 연출은 오래된 느낌이라 사용자가 원할 때만 씁니다.
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
- 어울림: 카페/커피/음료/패션/브랜드/런칭/신제품/신메뉴/뷰티/음악/페스티벌/매장/오픈/모던/트렌디/세련/요즘/감각
- 예시: motion-styles-five, shotcraft/neon-triple-marquee
- 레퍼런스 낱말: 키네틱 타이포 마키 그리드 모던
- 앱: 그대로
- 기본: 예

## beat-montage · 비트 몽타주

- 한 줄: 소재 컷이 박마다 바뀌고 컷마다 라벨·제목이 붙으며, 컷 사이를 사선 띠가 덮음
- 형태: 풀프레임 소재 위 하단·좌상단 라벨, 컷당 0.8–1.4초, 훅은 막대·컬러 바 깜빡임
- 골격: 훅 beat-flicker-sting → 상승부 beat-montage-wipe(소재 3–6컷) → 주인공 kinetic-typo-beat 한 줄 → 엔드카드 endcard-logo-cta
- 시그니처: 드롭에서 워드마크가 박에 슬램
- 전환: beat-montage-wipe 사선 띠, transition-flash-streak, transition-footage-card
- 글꼴·색: 컨덴스드 고딕·굵은 산세리프, 브랜드 색 + 형광 포인트
- 어울림: 헬스/피트니스/스포츠/운동/이벤트/세일/축제/페스티벌/여러/라인업/컬렉션/쇼핑/패션/게임/음악/에너지/빠른/역동/숏폼/릴스/쇼츠
- 예시: transitions-four-ways
- 레퍼런스 낱말: 비트 몽타주 와이프 플래시
- 앱: 그대로
- 기본: 예

## offer-punch · 혜택·가격 펀치

- 한 줄: 큰 숫자가 꽂히고 가격이 굴러가다 멈추며, 기울어진 스티커와 굵은 마커 강조가 붙음
- 형태: 숫자가 화면 높이 25–35%, 소재 위 한쪽에 정보 블록, 스티커·배지는 도형 시트(`make_shape_pngs`)
- 골격: 훅 hook-number-slam → 주인공 소재 + kinetic-typo-beat 한 줄 → 상승부 price-countup + hand-drawn-emphasis(굵은 마커) → 엔드카드 endcard-logo-cta
- 시그니처: 가격이 드롭에서 멈추며 스티커가 back 이징으로 박힘
- 전환: transition-flash-streak, transition-cover-flood, 마스크 wipe
- 글꼴·색: 숫자용 굵은 디스플레이, 높은 대비(검정·흰색 + 세일 색 1)
- 어울림: 할인/세일/가격/특가/쿠폰/혜택/프로모션/이벤트/오픈/1+1/원/%/마트/배달/쇼핑/구독/요금/무료/증정/한정/마감
- 예시: -, shotcraft/countdown-arc-scatter
- 레퍼런스 낱말: 숫자 카운트 가격 스티커
- 앱: 그대로
- 기본: 예

## product-hero · 제품 주인공 3D·카드

- 한 줄: 제품 소재가 기울어진 카드나 3D 오브젝트로 다가와 정면으로 서고, 기능 칩이 주변에 붙음
- 형태: 화면 가운데 제품, 기능 문구는 칩·라벨로 짧게, 소재 카드 사이를 2D↔2.5D로 넘김
- 골격: 훅 kinetic-typo-beat 또는 hook-number-slam → 주인공 hero-tilt-push(three면 three.md) → 상승부 feature-mask-reveal + transition-footage-card → 엔드카드 endcard-logo-cta
- 시그니처: 제품이 한 바퀴 돌거나 카드가 정면으로 펴지는 순간
- 전환: transition-footage-card, transition-zoom-through, transition-match-cut
- 글꼴·색: 정갈한 그로테스크, 어두운 바탕 + 스트립 조명·글로우 포인트
- 어울림: 제품/전자/가전/이어폰/폰/스마트/앱/서비스/테크/it/기기/노트북/자동차/화장품/뷰티/런칭/신제품/티저/프리미엄/기능/스펙
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
- 어울림: 배송/배달/택배/물류/지도/지역/위치/매장/지점/전국/부동산/분양/여행/관광/노선/교통/인포/정보/통계/데이터/구성
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
- 어울림: 뷰티/화장품/향수/음료/주스/탄산/맥주/테크/ai/런칭/티저/프리미엄/럭셔리/고급/신비/몽환/로고
- 예시: motion-styles-five, opuscar/glass-product
- 레퍼런스 낱말: 파티클 리퀴드 글로우 프리미엄
- 앱: 시그니처 장면은 영상으로 구워 넣음, 나머지는 그대로
- 기본: 아니요

## playful-bounce · 플레이풀 바운스

- 한 줄: 도형·스티커가 통통 튀며 납작해졌다 늘어나고, 문구가 박에 맞춰 튀어 올라옴
- 형태: 큰 둥근 도형·스티커(도형 시트), 밝은 플랫 색 3–4개, 소재는 둥근 칸이나 풀프레임
- 골격: 훅 squash-bounce → 주인공 소재 + kinetic-typo-beat(back 이징) → 상승부 hand-drawn-emphasis(굵은 마커) 또는 price-countup → 엔드카드 endcard-logo-cta + squash-bounce 장식
- 시그니처: 로고나 제품 위로 공이 떨어져 출렁이며 멈춤
- 전환: transition-cover-flood, transition-match-cut, 마스크 wipe
- 글꼴·색: 둥근 굵은 고딕, 원색 계열 밝은 팔레트
- 어울림: 키즈/어린이/유아/장난감/디저트/과자/간식/푸드/음식/치킨/피자/반려/펫/앱/게임/귀여운/친근/발랄/유쾌/재밌
- 예시: motion-styles-five
- 레퍼런스 낱말: 바운스 스티커 카툰
- 앱: 그대로
- 기본: 아니요

## handwritten-warm · 손글씨 감성

- 한 줄: 손글씨 문구가 한 글자씩 써지고 핵심 단어에 손그림 강조가 붙음
- 형태: 소재 위 여백에 손글씨 한두 줄, 나머지 정보는 굵은 고딕으로 대비
- 골격: 훅 handwritten-title → 주인공 소재 + 고딕 문구 → 상승부 hand-drawn-emphasis → 엔드카드 endcard-logo-cta
- 시그니처: 손글씨 한 줄이 써지는 순간
- 전환: transition-match-cut, 마스크 wipe
- 글꼴·색: 손글씨 + 굵은 고딕, 따뜻한 2색
- 어울림: 손글씨/감사/감성/편지/캘리/기념일/웨딩/가족/선물/명절/추석/설날
- 예시: handwriting-thank-you
- 레퍼런스 낱말: 손글씨 손그림
- 앱: 그대로
- 기본: 아니요
