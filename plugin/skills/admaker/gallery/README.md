# 갤러리: 예시 영상 + 프롬프트 + 데이터

이 스킬로 만든 예시 광고 모음입니다. 항목마다 **요청 프롬프트(영문), 쓴 샷 카드와 기법, 엔진 버전, 결과 영상**을 한 줄로 묶습니다. 형식은 yihui-dev/awesome-opus5-5-videos의 `prompts/` + `data/videos.json` 구조를 admaker 광고에 맞게 바꾼 것입니다(ATTRIBUTION).

- `../references/motion-directions.md`: 모션 방향 메뉴(형태·골격·시그니처·전환·어울리는 제품/목적). `recommend`는 이 메뉴에서 언제나 방향 3개를 먼저 고르고, 아래 예시·레퍼런스는 그 방향을 보여 주는 자료로 붙입니다.
- `data/ads.json`: 우리가 렌더한 예시 목록(빌드 키트 있음).
- `data/references.json`: 외부 레퍼런스 색인 190개(video-shotcraft 샷 카드 124장, lemo-opuscar 필름 스타일 66종). 항목마다 한국어 요약, 태그, "admaker로 만들면" 힌트, 원문·미리보기 링크. opuscar 66종은 `demo`(데모 영상 제목·길이·mp4 링크, 원 저장소 Releases `films`)도 있습니다. 영상 한 편이 4–283MB(대부분 수십 MB)라 저장소에는 넣지 않고 링크만 둡니다(CC BY 4.0, LemoLab 표기). 원문·영상·코드는 넣지 않았고 미리보기는 원 저장소에서 불러옵니다. 빌드 키트가 없으니 샷 카드로 새로 짤 때 연출 후보로 씁니다.
- (아래 `ads.json` 설명) 스킬이 비슷한 요청을 받으면 `techniques`·`shots`·`category`로 가까운 항목을 찾아 트리트먼트 출발점으로 씁니다.
- `prompts/<slug>.md`: 사람이 읽는 항목 한 장. 요청 프롬프트, 결과, 다시 만들기.
- `kits/<slug>/`: 다시 만드는 빌드 키트(빌드 스크립트, 씬, 자리표시 소재 생성기). 스킬 설치본에 들어 있습니다.
- `previews/<slug>.webp`: 추천 페이지용 작은 움직이는 미리보기(180px 폭, 10fps).
- 원본 결과 파일(큰 gif·스틸·README)은 저장소의 `samples/<폴더>/`에만 있습니다. `preview`·`build`는 그 GitHub 경로입니다.

## 쓰는 법

예시는 광고를 만들기 전에 고르는 출발점입니다(SKILL.md "시작할 때" 4번).

```sh
node templates/gallery.mjs list                                   # 전체 목록
node templates/gallery.mjs recommend "<요청 요약>" --out gallery-preview.html   # 모션 방향 3개 + 가까운 예시 2–3개 미리보기 페이지
node templates/gallery.mjs directions                              # 모션 방향 메뉴 목록
node templates/gallery.mjs refs "카드 스택 3d" [--refs 12]       # 외부 레퍼런스 검색
node templates/gallery.mjs use <slug> <프로젝트 폴더>              # 고른 예시의 빌드 키트 복사
```

- `recommend`는 먼저 모션 방향 3개를 고릅니다. 방향의 `어울림` 낱말(제품·목적·무드)이 요청에 걸리면 점수를 얻고, 모자라면 `기본: 예` 방향(에디토리얼 키네틱, 비트 몽타주, 혜택 펀치)으로 채웁니다. 손글씨 감성은 그 낱말이 있을 때만 나옵니다. 요청에 기법 낱말이 없으면 예시도 고른 방향의 `예시` 순으로 보여 줍니다.
- 방향을 새로 넣을 때는 `motion-directions.md` 형식대로 절 하나를 추가합니다(줄 이름을 바꾸면 `gallery.mjs`가 못 읽음).
- `recommend`는 우리 예시 2–3개 아래에 외부 레퍼런스 6개(`--refs N`)를 같이 붙입니다. 레퍼런스는 요청 낱말을 태그·한국어 요약에 맞춰 고르고, 같은 출처·카테고리는 2개까지만 넣어 한쪽으로 몰리지 않게 합니다.
- `recommend`는 요청 문장의 낱말(전환·플래시·지도·손글씨·3D·파티클 …)을 `techniques`·`category`에 맞춰 점수를 매기고, 맞는 예시만 보여 줍니다. 페이지에는 움직이는 미리보기(`previews/<slug>.webp`), 바꿔 쓸 자리(`slots`), 예시 프롬프트가 들어갑니다.
- `use`는 `kits/<slug>/`를 프로젝트에 복사합니다. `kit.kind`가 `timeline-section`이면 프로젝트 `timeline.mjs`의 `// 섹션:` 이하를, `timeline-full`이면 전체를 예시 것으로 바꾸고(원본은 `timeline.before-gallery.mjs`), `script`면 빌드 스크립트를 그대로 둡니다. 그다음 할 명령(`kit.run`)과 바꿔 쓸 자리를 출력합니다.
- 값을 바꿨으면 원래 항목을 고치지 말고 새 항목으로 추가합니다.

## 항목 추가

광고를 렌더하고 검수(aesthetic-rules)를 마친 뒤:

1. `samples/<slug>/`에 gif(270px 폭, 15fps 권장), `stills.png`, 빌드 스크립트, README를 둡니다. 사용자 소재·브랜드는 넣지 않습니다(자리표시 소재로 다시 렌더).
2. `prompts/<slug>.md`를 `_template.md` 형식으로 씁니다. 프롬프트는 영문, 설명은 한국어.
3. 빌드 파일을 `kits/<slug>/`에 복사하고, gif로 `previews/<slug>.webp`를 만듭니다(`ffmpeg -i <gif> -vf "fps=10,scale=180:-2" -loop 0 -quality 55 previews/<slug>.webp`).
4. `data/ads.json`에 항목을 추가합니다(`kit`, `slots` 포함). `verified`는 실제 엔진 렌더로 확인했을 때만 true.

| 필드 | 뜻 |
|---|---|
| `slug` | 폴더·파일 이름 (kebab-case) |
| `title` | 한국어 제목 |
| `category` | `motion` · `typography` · `map` · `3d` · `transition` · `montage` |
| `duration`, `aspect`, `fps` | 초, `9:16` 등, 프레임 |
| `engine` | 렌더한 `@admaker/engine` 버전 |
| `footage` | `user`(사용자 소재 자리) · `generated`(앱 AI 생성) · `placeholder`(자리표시) · `none`(소재 없는 모션그래픽 샘플) |
| `shots` | 쓴 샷 카드 이름 (`references/shots/`) |
| `techniques` | 기법 태그: `swipe` `flash` `cover` `match-cut` `dimension` `morph` `zoom-through` `mask-reveal` `keyframes` `gsapTimeline` `three` `handwriting` `strokeDraw` `map` `countUp` `kinetic-typography` `squash-stretch` `isometric` `metaball` `particles` `script` |
| `prompt` | 요청 프롬프트 전문 (영문) |
| `prompt_file` | `prompts/<slug>.md` |
| `preview` | 결과 gif (저장소 경로) |
| `build` | 다시 만드는 스크립트 (저장소 경로) |
| `kit` | `{ dir, kind: timeline-section·timeline-full·script, entry, run[] }` 빌드 키트 |
| `slots` | 이 예시를 다른 광고로 바꿀 때 고칠 자리 (한국어) |
| `app_import` | `full` · `partial`(앱에서 빠지는 클립 있음) · `unverified` |
| `added` | 추가 날짜 |
| `verified` | 엔진 렌더로 확인했는지 |
