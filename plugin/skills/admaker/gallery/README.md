# 갤러리: 예시 영상 + 프롬프트 + 데이터

이 스킬로 만든 예시 광고 모음입니다. 항목마다 **요청 프롬프트(영문), 쓴 샷 카드와 기법, 엔진 버전, 결과 영상**을 한 줄로 묶습니다. 형식은 yihui-dev/awesome-opus5-5-videos의 `prompts/` + `data/videos.json` 구조를 admaker 광고에 맞게 바꾼 것입니다(ATTRIBUTION).

- `data/ads.json`: 전체 목록. 스킬이 비슷한 요청을 받으면 `techniques`·`shots`·`category`로 가까운 항목을 찾아 트리트먼트 출발점으로 씁니다.
- `prompts/<slug>.md`: 사람이 읽는 항목 한 장. 요청 프롬프트, 결과, 다시 만들기.
- 결과 파일(gif·스틸·빌드 스크립트)은 저장소의 `samples/<폴더>/`에 있습니다. 스킬 설치본에는 들어가지 않으니 `preview`는 GitHub 경로로 적습니다.

## 쓰는 법

1. 요청과 가까운 항목을 고릅니다(같은 `techniques` 또는 `shots`).
2. 그 항목의 `prompts/<slug>.md`를 읽고, `build`의 샘플 스크립트를 출발점으로 `timeline.mjs`를 씁니다.
3. 값을 바꿨으면 원래 항목을 고치지 말고 새 항목으로 추가합니다.

## 항목 추가

광고를 렌더하고 검수(aesthetic-rules)를 마친 뒤:

1. `samples/<slug>/`에 gif(270px 폭, 15fps 권장), `stills.png`, 빌드 스크립트, README를 둡니다. 사용자 소재·브랜드는 넣지 않습니다(자리표시 소재로 다시 렌더).
2. `prompts/<slug>.md`를 `_template.md` 형식으로 씁니다. 프롬프트는 영문, 설명은 한국어.
3. `data/ads.json`에 항목을 추가합니다. `verified`는 실제 엔진 렌더로 확인했을 때만 true.

| 필드 | 뜻 |
|---|---|
| `slug` | 폴더·파일 이름 (kebab-case) |
| `title` | 한국어 제목 |
| `category` | `motion` · `typography` · `map` · `3d` · `transition` · `montage` |
| `duration`, `aspect`, `fps` | 초, `9:16` 등, 프레임 |
| `engine` | 렌더한 `@admaker/engine` 버전 |
| `footage` | `user`(사용자 소재 자리) · `generated`(앱 AI 생성) · `placeholder`(자리표시) |
| `shots` | 쓴 샷 카드 이름 (`references/shots/`) |
| `techniques` | 기법 태그: `swipe` `cover` `match-cut` `dimension` `morph` `zoom-through` `mask-reveal` `keyframes` `gsapTimeline` `three` `handwriting` `strokeDraw` `map` `countUp` |
| `prompt` | 요청 프롬프트 전문 (영문) |
| `prompt_file` | `prompts/<slug>.md` |
| `preview` | 결과 gif (저장소 경로) |
| `build` | 다시 만드는 스크립트 (저장소 경로) |
| `app_import` | `full` · `partial`(앱에서 빠지는 클립 있음) · `unverified` |
| `added` | 추가 날짜 |
| `verified` | 엔진 렌더로 확인했는지 |
