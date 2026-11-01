# Attribution

이 스킬의 연출 원칙, 미학 규칙, 샷 카드 형식은 아래 프로젝트들의 문서를 참고해 admaker 엔진과 광고 제작에 맞게 다시 쓴 것입니다. 원문을 그대로 옮기지 않고 번역·요약·수정했습니다.

## lemo-opuscar
- 저장소: https://github.com/lemomo-ai/lemo-opuscar
- 참고: `DIRECTOR.md`, `TECHNIQUE.md`, `styles/*/STYLE.md` (연출 순서, 트리트먼트 양식, 사운드 3레이어, 리듬·카메라 원칙, 결정적 렌더링)
- 라이선스: 코드와 문서 MIT, Copyright (c) 2026 LemoLab

## video-shotcraft
- 저장소: https://github.com/Vincentwei1021/video-shotcraft
- 참고: `SKILL.md`, `references/aesthetic-rules.md`, `references/sequences/promo-energy-arc.md`, `references/shots/*` (에너지 골격, 미학 규칙 R/Q/S, 샷 카드 형식)
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

## admaker 엔진
`@admaker/*` 패키지(kingsae1/admaker-plugin)는 KT 사내 전용 독점 소프트웨어입니다. 이 스킬은 엔진 소스를 포함하지 않고 공개 API 이름만 참조합니다.
