# claude-admaker-skills

admaker 엔진으로 광고 모션그래픽을 만드는 Claude Code 스킬입니다. 결과물은 `@admaker/engine` ProjectJSON이고, 브라우저 `Exporter`로 mp4를 렌더합니다. 같은 JSON은 admaker Studio에서 열어 고칠 수 있습니다.

## 필요 조건

**이 스킬은 admaker 엔진(`@admaker/engine`, 사내 비공개 패키지, 기준 3.0.7)이 있어야 동작합니다.** 엔진이 ProjectJSON을 그리고 브라우저 `Exporter`로 mp4를 렌더합니다. 엔진이 없으면 스킬은 다른 방식으로 대신 만들지 않고, 설치를 안내한 뒤 멈춥니다.

- 엔진은 npm에 없습니다. admaker 앱의 '스킬 설치'가 스킬 폴더의 `vendor/`에 넣어 주고, 광고 작업 폴더마다 `install-engine.mjs`로 버전을 고정해 설치합니다.
- admaker 앱은 선택입니다. 앱 MCP가 연결되어 있으면 광고 불러오기, AI 이미지·영상·BGM·TTS 생성, `get_ad_guide`, 템플릿을 같이 씁니다.

## 설치

admaker 데스크톱 앱에서 MCP 메뉴 → **Claude와 연결하기**를 엽니다.

- **Claude Code**: "Claude Code" 탭에서 **스킬 설치**를 누르면 `~/.claude/skills/admaker`에 스킬과 엔진 패키지(`vendor/`)가 같이 설치됩니다. admaker에 로그인한 상태여야 합니다.
- **Claude 앱(데스크톱·웹)**: "Claude 앱" 탭에서 스킬 zip을 받아 Claude 설정 → 기능 → 스킬에 올립니다.

이 저장소와 엔진(`@admaker/engine`)은 비공개이고, 배포 파일은 admaker-api(`/api/skills/admaker`, 로그인 필요)에서 내려받습니다. 배포 파일은 admaker-api의 `scripts/build_skill_bundle.py`로 만듭니다.

광고 프로젝트 폴더에서는 `node ~/.claude/skills/admaker/templates/install-engine.mjs`로 엔진을 설치합니다(렌더까지 하면 `--render`).

## 구성

```
plugin/skills/admaker/
├── SKILL.md                     워크플로와 원칙
├── references/
│   ├── director.md              광고 연출 (메시지, 에너지 골격, 사운드, 리듬, 카메라)
│   ├── copy.md                  광고 문구 (훅 세 칸, 오프닝 메뉴, 시청자 단계, 금지 문구, 정직한 할인)
│   ├── aesthetic-rules.md       검수 체크리스트 (B/R/Q/S/C/P)
│   ├── ad-formats.md            길이·비율·세이프존·오디오 규격
│   ├── engine-recipes.md        기법 → admaker ProjectJSON 변환법
│   ├── gsap.md                  gsapTimeline 작성법, 이징, 웹 GSAP과 다른 점
│   ├── three.md                 3D 제품 샷 (조명·재질·후처리·에셋), 웹 three.js 예제 옮기기
│   ├── fonts.md / fonts.json    무드별 폰트 페어링 + admaker 앱 폰트 목록
│   └── shots/                   샷 카드 7장 (지도 2장 포함)
└── templates/                   프로젝트 시작 파일
    ├── TREATMENT.md
    ├── timeline.mjs             단일 진실의 원천
    ├── build-project.mjs        timeline + brand → project.json (카메라·룩 스택 포함)
    ├── fonts.mjs                폰트 토큰 → style(fontFamily·fontUrl)
    ├── motion.mjs               입장·퇴장·Ken Burns·숨쉬기·모션 블러·룩 스택·자막 페이지
    ├── map.mjs                  GeoJSON → 바탕 지도·지역·경로·핀·지도 줌 카메라 (d3-geo)
    ├── shape-pngs.mjs           간단한 도형 PNG 여러 장을 시트 한 장에 그려 잘라 저장 (shape-sheet.mjs, Playwright)
    ├── gen-audio-kit.mjs        소재·앱이 없을 때 임시 SFX·베드 합성
    ├── sfx-peak.mjs             효과음 피크 지연 측정 → PEAK.json·sfx.json
    ├── validate.mjs             엔진에 없는 이름·src 누락 검사 + 모션 규칙 경고
    ├── to-admaker-import.mjs    project.json → admaker 앱 광고 불러오기 파일
    ├── install-engine.mjs       스킬과 같이 받은 엔진(vendor/*.tgz)을 프로젝트에 설치
    ├── to-admaker-template.mjs  → admaker 플래너 모드 템플릿(씬 오버레이, template.json)
    ├── shots/*.mjs              샷 카드별 클립 생성 함수
    ├── render/                  헤드리스 Exporter 렌더 하니스 (Vite + Playwright), sheet.mjs 전환 구간 밀집 시트
    └── build.sh
samples/map/                     지도 샘플 샷 (서울 → 부산 배송, 엔진 3.0.5 렌더)
samples/gsap-three/              GSAP 타임라인 + three.js 커스텀 씬 샘플 (엔진 3.0.7 렌더)
samples/transitions/             소재 사이 전환 5종 샘플 (커버·줌 스루·매치 컷·카드·플래시, 엔진 3.0.7 렌더)
samples/handwriting/             손글씨 샘플 (handwrite_in + strokeDraw, 엔진 3.0.7 렌더)
samples/shape-sheet-3d/          도형 시트 1장 + 클립마다 crop, X·Y·Z 회전·깊이 애니메이션 (엔진 main 렌더)
plugin/skills/admaker/gallery/   예시 갤러리: data/ads.json + prompts/<slug>.md (예시 영상·프롬프트·쓴 기법)
```

## 버전

플러그인 버전(`plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`)은 직접 고치지 않습니다. `plugin/` 아래가 바뀐 커밋이 `main`에 들어오면 GitHub Action(`.github/workflows/bump-version.yml`)이 두 파일의 버전을 같이 한 칸 올리고 `[version bump]` 커밋을 `main`에 넣습니다. PR 하나를 머지하면 한 번 올라갑니다.

- 기본은 가운데 자리(minor, 0.2.6 → 0.3.0)입니다. 저장소 변수 `VERSION_BUMP_LEVEL`을 `patch`로 두면 끝자리(0.2.6 → 0.2.7)만 올라갑니다.
- 큰 변경은 Actions 탭에서 "Bump plugin version"을 직접 실행해 `major`를 고릅니다.
- 로컬에서 확인할 때: `node .github/scripts/bump-version.mjs minor`

## 상태

- 엔진 기준 버전: `@admaker/engine` 3.0.7 (admaker-plugin `455c950`, three 어댑터 + 씬 훅 포함), `@admaker/animation` 2.0.8
- 렌더 하니스, `motion.mjs`의 입장·룩 스택, `map.mjs`, 지도 샷 카드 2장은 엔진 3.0.5로 렌더해 확인했습니다(`samples/map`). `gsapTimeline`과 three 커스텀 씬은 엔진 3.0.7로 렌더해 확인했습니다(`samples/gsap-three`). 전환 샷 카드 5장도 엔진 3.0.7로 렌더해 확인했습니다(`samples/transitions`). 나머지 샷 카드 5장의 값은 아직 렌더로 검증하지 않았습니다.

라이선스: 비공개 라이선스입니다. 저작권자의 허락 없이 복제·수정·재배포할 수 없습니다([LICENSE](LICENSE)). 외부 출처 부분은 [ATTRIBUTION.md](ATTRIBUTION.md)의 원 라이선스를 따릅니다.
