---
name: admaker
description: Make short ad and promo videos (6/15/30/60 s, 16:9, 9:16, 1:1, 4:5) as motion graphics built as admaker engine ProjectJSON and rendered with the browser Exporter. Use when the user asks for an ad, commercial, promo, product video, launch teaser, social ad, bumper or end card (광고, 광고영상, 홍보영상, 프로모션, 제품 영상, 런칭 티저, 숏폼 광고, 엔드카드), or wants a single motion shot for one. Not for trimming or converting existing video files.
---

# admaker: admaker 엔진으로 만드는 광고 모션그래픽

광고 한 편을 **기획 → 연출 → 샷 조립 → 사운드 → 렌더 → 검수**까지 끌고 가는 스킬입니다.
결과물은 `@admaker/engine`의 **ProjectJSON**이고, 브라우저 `Exporter`로 mp4를 만듭니다. 같은 JSON은 admaker Studio에서 열어 고칠 수 있습니다.
영상 생성 AI나 스톡 푸티지는 쓰지 않습니다(사용자가 준 소재는 씁니다).

광고의 판단 순서는 **메시지 전달 → 브랜드 기억 → 리듬·사운드 → 카메라 → 장식**입니다.

## 시작할 때

1. **범위를 판단합니다.**
   - 광고 한 편 → 아래 워크플로.
   - 샷 하나(엔드카드, 로고 스팅, 가격 롤 등) → `references/shots/`에서 카드를 고르고 전문을 읽은 뒤 구현.
   - 이미 있는 광고의 사운드만 → `references/director.md` §6–7, `references/engine-recipes.md` §6.
2. **엔진을 확인합니다.** `references/engine-recipes.md` §0. 설치 위치와 버전을 찾고, 기준 버전과 다르면 이름·파라미터를 다시 대조합니다. 엔진이 없으면 사용자에게 설치 경로를 묻습니다(사내 비공개 패키지라 직접 받을 수 없습니다).
3. **질문은 한 번, 한 메시지로** 합니다. 요청에 답이 있는 항목은 건너뜁니다.
   - 제품/서비스, 이 광고의 **단 하나의 메시지**, CTA 문구와 URL
   - 매체와 규격 → `references/ad-formats.md`
   - 브랜드 자산: 로고(SVG 권장), 컬러, 폰트, 제품 이미지·스크린샷, 금지 표현
   - 내레이션(TTS/본인 녹음/없음), 음악 보유 여부
   - 스토리보드를 먼저 볼지(기본: 아니요)
   답을 받으면 나머지는 기본값으로 채우고 브리프를 몇 줄로 요약해 시작합니다. 다시 묻지 않습니다.
4. **모드**: 기본은 자율 진행. 사용자가 "같이 정하자"고 하면 브리프 → 비주얼 방향 → 스토리보드 세 지점에서만 확인을 받습니다.

## 워크플로

| 단계 | 할 일 | 읽을 파일 |
|---|---|---|
| 1. 브리프 | 질문 한 번, 브리프 요약 | `references/ad-formats.md` |
| 2. 트리트먼트 | `TREATMENT.md`: 후보 구조 3개 + 선택 이유, 로그라인, 벤치마크, 샷 리스트, 비트시트, 큐맵, 사운드 표 | `references/director.md`, `templates/TREATMENT.md` |
| 3. 브랜드 토큰 | 브랜드 자산에서 폰트·색·그리드·라운드를 `brand.json`으로. 브랜드 폰트가 없으면 무드별 페어링 후보 2–3개를 골라 6단계에서 비교. 모든 요소는 이 토큰만 사용 | `references/aesthetic-rules.md` B1–B5, `references/fonts.md` |
| 4. 샷 선택 | 에너지 골격의 슬롯마다 샷 카드를 고름. 한 기법은 전체에서 한 번만 주인공 | `references/shots/README.md` + 고른 카드 전문 |
| 5. 타임라인 | `timeline.mjs`에 섹션·BPM·비트·히트·카메라 키를 씀 | `templates/timeline.mjs` |
| 6. 룩 검증 | 실제 엔진으로 스타일 프레임 3장(1장은 시그니처 샷) 렌더, 토큰·규칙과 대조. 폰트 후보가 여럿이면 여기서 하나로 정함 | `references/engine-recipes.md` §8 |
| 7. 스토리보드 | 원했을 때만. 핵심 샷 6–9장 한 장으로 타일링, **승인을 기다림** | |
| 8. 제작 | 보이스 → 음악(없으면 `gen-audio-kit.mjs`로 임시 합성) → `build-project.mjs`로 ProjectJSON 생성(룩 스택 포함) → SFX 표 → 오프라인 믹스 → `Exporter` 렌더 | `references/engine-recipes.md`, `templates/` |
| 9. 검수 | 숫자 체크리스트 + 독립 리뷰(가능하면 깨끗한 컨텍스트의 서브에이전트) | `references/aesthetic-rules.md` 전체 |
| 10. 납품 | `to-admaker-import.mjs`로 앱 불러오기 파일 생성 → 아래 목록 | `references/engine-recipes.md` §9 |

## 반드시 지킬 원칙

1. **타임라인이 단일 진실의 원천입니다.** `timeline.mjs` 하나를 ProjectJSON 생성, SFX, 자막, 검사가 모두 읽습니다. 타임라인이 바뀌면 프로젝트를 다시 생성하고 SFX 표 전체를 다시 맞춥니다. ProjectJSON을 손으로 고치지 않습니다.
2. **엔진에 있는 이름만 씁니다.** 모르는 이징 이름은 엔진이 조용히 선형으로 처리하고, 등록되지 않은 모션 type이나 스크립트 이름은 그려지지 않습니다. 생성 후 `templates/validate.mjs`로 이름을 검사합니다.
3. **결정적 렌더링.** script 어댑터와 생성 코드에 `Date.now()`, 시드 없는 `Math.random()`, 이전 프레임 상태 의존을 쓰지 않습니다.
4. **첫 1초 안에 훅, 마지막에 브랜드 + CTA 홀드.** 워드마크와 CTA는 자리잡은 뒤 최소 1초(6초 범퍼는 0.7초) 정지합니다.
5. **샷 카드를 쓸 때는 카드 전문을 읽고**, 카드의 "알려진 함정" 값은 낮추지 않습니다.
6. **모션 기본기는 `templates/motion.mjs`로.** 화면은 5층(배경 → 소재 → 그래픽 → 그레이드 → 그레인·비네트), 입장은 2–3속성 + 3–6프레임 시차, 퇴장은 입장의 절반, 스틸은 Ken Burns, 오래 머무는 조연은 숨쉬기, 빠른 이동은 모션 블러(aesthetic-rules R6–R9, Q11–Q15). 브랜드 요소의 정지(R1)는 이 모든 것보다 우선합니다.
7. **검수는 숫자로.** 자막 실효 글자 높이 ≥ 프레임 높이의 5%, 보조 ≥ 3%, 정보 자막 ≥ max(1.8초, 발화 + 0.6초)(단어 동기 자막은 Q15), −14 LUFS(매체 규격 우선), 블랙/빈 프레임 0, 컷–비트 오차 ≤ 2프레임, 미등록 어댑터 0.
8. **권리.** 사용자 자산과 CC0/CC BY/OFL 소재만. 서드파티 자산은 `CREDITS`에 출처·라이선스와 함께 적습니다. 타사 브랜드·캐릭터는 사용자가 권리를 확인하지 않으면 쓰지 않습니다. 엔진 소스는 프로젝트 폴더로 복사하지 않습니다.

## 납품물 (프로젝트 폴더)

- `<name>_<비율>.mp4` (규격마다), `poster.jpg`, 내레이션/자막이 있으면 `<name>.srt`
- BGM이 있으면 BGM 없는 버전(SFX 유지)
- `admaker-import.json` (admaker 앱 "광고 불러오기"로 여는 파일, `to-admaker-import.mjs`로 생성. 변환 경고도 함께 알림), `project.json` (렌더용 엔진 ProjectJSON), `scripts/`·`scenes/` (script 어댑터나 three 커스텀 씬을 썼다면. 이 둘은 앱에 등록되어 있지 않아 불러오기 파일에서 빠지므로, 앱에서 고칠 광고라면 그 장면을 영상으로 미리 렌더해 Video 클립으로 넣음)
- `TREATMENT.md`, `brand.json`, `timeline.mjs`, `sfx.json`, `CREDITS`, `build.sh`
- 합성 임시음을 썼다면 그 사실(교체 권장)

사용자에게는 프로젝트 폴더 위치, 규격별 파일, `admaker-import.json`을 admaker에서 광고 불러오기로 열 수 있다는 것(앱으로 넘어가지 않은 요소가 있으면 그 목록), `CREDITS`, 소재 책임이 사용자에게 있다는 것을 알려줍니다.
