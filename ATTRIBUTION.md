# Attribution

이 스킬의 연출 원칙, 미학 규칙, 샷 카드 형식은 아래 프로젝트들의 문서를 참고해 admaker 엔진과 광고 제작에 맞게 다시 쓴 것입니다. 원문을 그대로 옮기지 않고 번역·요약·수정했습니다.

## lemo-opuscar
- 저장소: https://github.com/lemomo-ai/lemo-opuscar
- 참고: `DIRECTOR.md`, `TECHNIQUE.md`, `styles/*/STYLE.md` (연출 순서, 트리트먼트 양식, 사운드 3레이어, 리듬·카메라 원칙, 결정적 렌더링)
- 라이선스: 코드와 문서 MIT, Copyright (c) 2026 LemoLab
- 레퍼런스 색인(`gallery/data/references.json`, 2026-11-04, 스냅샷 f171360): `styleboard/catalog.json`과 `styles/*/STYLE.md` 첫 문단을 보고 스타일 66종의 한국어 이름·요약·admaker 구현 힌트를 새로 썼습니다. 데모 영상·스틸(CC BY 4.0, LemoLab)은 넣지 않고 원 저장소 poster.jpg와 데모 영상(Releases `films`, 스냅샷 bebbbe1) 링크만 둡니다.

## video-shotcraft
- 저장소: https://github.com/Vincentwei1021/video-shotcraft
- 참고: `SKILL.md`, `references/aesthetic-rules.md`, `references/sequences/promo-energy-arc.md`, `references/shots/*` (에너지 골격, 미학 규칙 R/Q/S, 샷 카드 형식)
- 레퍼런스 색인(`gallery/data/references.json`, 2026-11-04, 스냅샷 1266a3e): `gallery/api/library.json`의 샷 카드 124장을 보고 한국어 요약·태그·admaker 구현 힌트를 새로 썼습니다. 카드 원문·데모 코드·미리보기 영상은 넣지 않고 원 저장소와 GitHub Pages 링크만 둡니다. shotcraft 카드 일부는 공개 제품 영상의 손법을 다시 구현한 것이라(그 저장소 `references/shots/ATTRIBUTION.md`), 우리도 손법만 참고하고 원작 화면·문구·브랜드는 옮기지 않습니다.
- 라이선스: Apache License 2.0. 이 저장소의 해당 문서는 원문을 수정한 파생물입니다(광고·admaker 엔진용으로 재작성, 한국어 번역, 규칙 추가·삭제).

## claude-remotion-skill
- 저장소: https://github.com/haidrrrry/claude-remotion-skill
- 참고: `remotion-motion-graphics/SKILL.md`, `references/design-rules.md`, `references/motion-patterns.md`, `examples/scripts/` (5층 룩 스택, Ken Burns, 숨쉬기, 모션 블러 기준, 입장·시차·퇴장 규칙, 단어 단위 자막, 합성 사운드 키트 아이디어)
- 라이선스: MIT, Copyright (c) 2025 haidrrrry. 코드는 복사하지 않고 admaker 엔진용으로 새로 작성했습니다(`templates/motion.mjs`, `templates/gen-audio-kit.mjs`).

## marketingskills
- 저장소: https://github.com/coreyhaines31/marketingskills
- 참고: `skills/ad-creative/references/hook-system.md`, `skills/ad-creative/references/awareness-headlines.md`, `skills/copywriting/references/ai-tells.md`, `skills/offers/references/scarcity-urgency.md` (훅 세 칸과 반복 금지, 오프닝 메뉴, 온램프, 시청자 인지 단계, 기계 같은 문구 목록, 정직한 희소성)
- 라이선스: MIT, Copyright (c) 2025 Corey Haines. 원문을 옮기지 않고 한국어로 새로 썼습니다(`references/copy.md`, aesthetic-rules C3–C5). 한국 표시·광고 관련 항목과 예시 문구는 이 저장소에서 새로 쓴 것입니다.

## pro-motion
- 저장소: https://github.com/jack-reson8/pro-motion
- 참고: `plugins/pro-motion/skills/pro-motion/references/lessons.md`, `aesthetic-checklist.md` (구간별 음악 사건 밀도, 조용한 구간은 다른 장면, 같은 틀에 내용만 바꾸면 슬라이드, 문구는 장면과 함께, 스타일 × 서사 두 축 제안)
- 라이선스: MIT, Copyright (c) 2026 jack-reson8. 코드는 쓰지 않았고 원칙만 다시 썼습니다(`director.md` §7.1, aesthetic-rules R10, Q16–Q17).

## reels
- 저장소: https://github.com/VishiATChoudhary/reels
- 참고: `RECIPE.md` (결정적 단어를 음악 드롭에 맞추는 역산, 드롭 직전 컷 가속)
- 라이선스: MIT, Copyright (c) 2026 Vishisht Choudhary. 코드는 쓰지 않았습니다(`director.md` §7.2, `templates/timeline.mjs`의 `DROP`).

## gsap-skills
- 저장소: https://github.com/greensock/gsap-skills
- 참고: `skills/gsap-timeline/SKILL.md`, `skills/gsap-core/SKILL.md`, `skills/gsap-utils/SKILL.md`, `skills/gsap-plugins/SKILL.md` (position 문법, delay 대신 타임라인으로 잇기, 이징 고르기, 순수 유틸 함수, 플러그인 기능 목록)
- 라이선스: MIT, Copyright (c) 2026 GreenSock. 원문을 옮기지 않고 admaker 엔진의 `gsapTimeline`에 맞게 한국어로 새로 썼습니다(`references/gsap.md`, `engine-recipes.md` §2.2–2.3). 지원·미지원 표와 패턴은 이 저장소에서 엔진 동작을 확인해 새로 쓴 것입니다. GSAP 라이브러리 자체는 이 스킬에 포함되지 않습니다(엔진 의존성, GSAP Standard License).

## threejs-skills
- 저장소: https://github.com/cloudai-x/threejs-skills
- 참고: `skills/threejs-lighting`, `threejs-materials`, `threejs-postprocessing`, `threejs-loaders`, `threejs-asset-pipeline`, `threejs-animation`의 `SKILL.md` (3점 조명과 환경광, PBR 재질 값, 패스 순서, HDRLoader 이름 변경, glTF 압축과 경량화, 믹서 시간 지정, 흔한 실수 목록)
- 라이선스: MIT, Copyright (c) 2026 CloudAI-X. 코드는 복사하지 않았고 원칙만 admaker `three` 어댑터(공유 렌더러, 시간 기반 `update`)에 맞게 다시 썼습니다(`references/three.md`, `engine-recipes.md` §7.1, `samples/gsap-three`).

## generative-media-skills
- 저장소: https://github.com/calesthio/generative-media-skills
- 참고: `skills/production/creative-direction/cinematic-shot-direction`, `character-design-continuity`, `visual-style-direction`, `skills/production/content-formats/ecommerce-product-imagery`, `skills/production/governance-delivery/asset-continuity-management`의 `SKILL.md` (클립 하나에 동작·카메라 하나, 끝 프레임과 no cuts, 카메라 무브·숏 크기·화각 용어, 높이·각도 분리, 정체성 앵커와 금지 줄, 원장과 버전, 제품 사실·연출·금지·후반 네 덩어리, 만들게 하지 않는 것 목록, 스타일 규칙 한 문장과 고정/변수, 중간 프레임 검수)
- 라이선스: MIT, Copyright (c) 2026 generative-media-skills contributors. 원문을 옮기지 않고 다시 썼습니다(`references/footage-gen.md`). 프롬프트 템플릿과 예시는 생성 모델이 잘 따르도록 영문으로 새로 썼고, 설명은 한국어입니다. admaker 앱 도구 이름, 4·6·8초 길이, 비트 맞추기, `templates/footage-plan.mjs` 검사는 이 저장소에서 새로 쓴 것입니다.

## pexo-skills
- 저장소: https://github.com/pexoai/pexo-skills
- 참고: `skills/veo-3.2-prompter/SKILL.md`, `references/atomic_element_mapping.md`, `references/veo_syntax_guide.md` (Shot → Subject → Environment → Camera → Style 순서, 카메라는 글로 지시, 레퍼런스 우선순위 얼굴 > 제품 > 스타일)
- 라이선스: MIT, Copyright (c) 2026 Pexo (pexoai). 코드와 Pexo 서비스는 쓰지 않았습니다(`references/footage-gen.md` §2, §7).

## claude-ads
- 저장소: https://github.com/AgriciDaniel/claude-ads
- 참고: `skills/ads-photoshoot/SKILL.md` (제품 형태·패키지·로고·라벨·색·재질 보존, 권리 확인, 비용 상한, 사람 검수 필수)
- 라이선스: MIT. 원문을 옮기지 않고 다시 썼습니다(`references/footage-gen.md` §4.1).

## goose-skills
- 저장소: https://github.com/gooseworks-ai/goose-skills
- 참고: `skills/video/create-image-fal/SKILL.md` (빈 패키지·라벨 없는 제품은 치명 결함, 라벨은 2배 확대로 원본과 비교)
- 라이선스: MIT. 도구와 GooseWorks 서비스는 쓰지 않았습니다(`references/footage-gen.md` §4.1).

## admaker 엔진
`@admaker/*` 패키지(kingsae1/admaker-plugin)는 KT 사내 전용 독점 소프트웨어입니다. 이 스킬은 엔진 소스를 포함하지 않고 공개 API 이름만 참조합니다.

## awesome-opus5-5-videos
- 저장소: https://github.com/yihui-dev/awesome-opus5-5-videos
- 참고: `data/videos.json`과 `prompts/` 구조(예시 영상 + 프롬프트 + 분류 태그를 한 항목으로), 상위 프롬프트들에 공통된 모션 원칙(앞에 있는 것이 전환이 됨, 한 요소가 컷을 건너감, 맞을 때만 하드컷, 전환 구간 밀집 프레임 검수)과 함정(덮는 원은 다 덮은 뒤 사각형으로).
- 라이선스: 저장소 MIT, 각 영상과 프롬프트는 제작자 소유. 프롬프트 원문은 옮기지 않았고, 구조와 원칙만 한국어로 다시 썼습니다(`gallery/`, `director.md` §8, aesthetic-rules Q18, `shots/transition-*`). 갤러리 항목의 프롬프트는 이 저장소 샘플을 위해 새로 쓴 것입니다.

## 6가지 화면 전환 기법 분류
- 출처: JohnKOBA Design, "모션그래픽의 꽃, 6가지 화면 전환 기법(트랜지션)" (YouTube, https://www.youtube.com/watch?v=Zz4O86pN5iU)
- 참고: 스와이프, 커버, 매치 컷, 차원 이동(2D↔3D), 몰핑, 공간 전환(줌) 분류. 구현과 값은 admaker 엔진으로 새로 만들고 렌더로 확인했습니다(`shots/README.md` 전환 카드).
