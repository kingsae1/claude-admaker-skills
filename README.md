# claude-admaker-skills

admaker 엔진으로 광고 모션그래픽을 만드는 Claude Code 스킬입니다. 결과물은 `@admaker/engine` ProjectJSON이고, 브라우저 `Exporter`로 mp4를 렌더합니다. 같은 JSON은 admaker Studio에서 열어 고칠 수 있습니다.

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
│   ├── fonts.md / fonts.json    무드별 폰트 페어링 + admaker 앱 폰트 목록
│   └── shots/                   샷 카드 7장 (지도 2장 포함)
└── templates/                   프로젝트 시작 파일
    ├── TREATMENT.md
    ├── timeline.mjs             단일 진실의 원천
    ├── build-project.mjs        timeline + brand → project.json (카메라·룩 스택 포함)
    ├── fonts.mjs                폰트 토큰 → style(fontFamily·fontUrl)
    ├── motion.mjs               입장·퇴장·Ken Burns·숨쉬기·모션 블러·룩 스택·자막 페이지
    ├── map.mjs                  GeoJSON → 바탕 지도·지역·경로·핀·지도 줌 카메라 (d3-geo)
    ├── gen-audio-kit.mjs        소재가 없을 때 임시 SFX·베드 합성
    ├── validate.mjs             엔진에 없는 이름·src 누락 검사 + 모션 규칙 경고
    ├── to-admaker-import.mjs    project.json → admaker 앱 광고 불러오기 파일
    ├── install-engine.mjs       스킬과 같이 받은 엔진(vendor/*.tgz)을 프로젝트에 설치
    ├── to-admaker-template.mjs  → admaker 플래너 모드 템플릿(씬 오버레이, template.json)
    ├── shots/*.mjs              샷 카드별 클립 생성 함수
    ├── render/                  헤드리스 Exporter 렌더 하니스 (Vite + Playwright)
    └── build.sh
samples/map/                     지도 샘플 샷 (서울 → 부산 배송, 엔진 3.0.5 렌더)
```

## 상태

- 엔진 기준 버전: `@admaker/engine` 3.0.5 (admaker-plugin `14ef6ee`, three 어댑터 + 씬 훅 포함), `@admaker/animation` 2.0.7
- 렌더 하니스, `motion.mjs`의 입장·룩 스택, `map.mjs`, 지도 샷 카드 2장은 엔진 3.0.5로 렌더해 확인했습니다(`samples/map`). 나머지 샷 카드 5장의 값은 아직 렌더로 검증하지 않았습니다.

출처와 라이선스: [ATTRIBUTION.md](ATTRIBUTION.md)
