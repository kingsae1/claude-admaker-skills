---
name: admaker
description: Make short ad and promo videos (6/15/30/60 s, 16:9, 9:16, 1:1, 4:5) as motion graphics built as admaker engine ProjectJSON and rendered with the browser Exporter. Use when the user asks for an ad, commercial, promo, product video, launch teaser, social ad, bumper or end card (광고, 광고영상, 홍보영상, 프로모션, 제품 영상, 런칭 티저, 숏폼 광고, 엔드카드), or wants a single motion shot for one. Requires the admaker engine (@admaker/engine). Not for trimming or converting existing video files.
allowed-tools:
  - Bash(sh build.sh:*)
  - Bash(bash build.sh:*)
  - Bash(./build.sh:*)
  - Bash(node build-project.mjs:*)
  - Bash(node validate.mjs:*)
  - Bash(node to-admaker-import.mjs:*)
  - Bash(node to-admaker-template.mjs:*)
  - Bash(node gen-audio-kit.mjs:*)
  - Bash(node install-engine.mjs:*)
  - Bash(node render/render.mjs:*)
  - Bash(node render/sheet.mjs:*)
  - Bash(node shape-pngs.mjs:*)
  - Bash(node sfx-peak.mjs:*)
  - Bash(node gallery.mjs:*)
  - Bash(node beats.mjs:*)
  - Bash(node footage-plan.mjs:*)
  - Bash(node templates/sfx-peak.mjs:*)
  - Bash(python3 mix.py)
---

# admaker: admaker 엔진으로 만드는 광고 모션그래픽

광고 한 편을 **기획 → 연출 → 샷 조립 → 사운드 → 렌더 → 검수**까지 끌고 가는 스킬입니다.
결과물은 `@admaker/engine`의 **ProjectJSON**이고, 브라우저 `Exporter`로 mp4를 만듭니다. 같은 JSON은 admaker Studio에서 열어 고칠 수 있습니다.
**바닥은 사용자가 준 영상·이미지, 또는 그것을 바탕으로 앱 AI가 만든 영상·이미지입니다.** 광고는 항상 바닥 소재(영상 또는 이미지)를 맨 아래(z 0–9)에 프레임 가득 깔고, 모션 그래픽(글자·도형·지도·자막·룩 레이어)을 그 위에 얹는 구조입니다. 소재가 뿌옇게 묻히지 않는 쪽이 기본이라, 화면 전체를 덮는 어둡게·틴트·반투명 면은 꼭 필요할 때만 약하게 쓰고 가독성은 주로 글자 주변(그림자, 작은 알약, 글자 띠 그라데이션)에서 만듭니다(aesthetic-rules Q11). 소재는 `timeline.mjs`의 `FOOTAGE`에 적습니다.
**admaker 앱 MCP가 연결되어 있으면(`get_production_workflow` 도구가 보이면) 광고 한 편은 그 순서대로 끝까지 만들고, 모션그래픽에서 멈추지 않습니다.**
순서: 브리프 → **기획안 고르기(기획안 3개 + 자유롭게 생성, 아래 "시작할 때" 4번, 앱 순서 A 기획 단계에서 씬표보다 먼저)** → BGM을 앱 AI로 먼저 만들기 → `audio.analyzeBeats`로 BGM의 템포·마디·피크를 받아 씬 나누기 → 모션그래픽(이 스킬, 씬 경계·비트에 맞춰) → 내레이션(씬 시작에 맞춰) → 바닥 이미지 img2img(`ai.image.edit`) → **사용자 확인** → 씬별 영상 생성 → 배치·검토.
씬별 영상 도구는 씬표를 만들 때 두 단계로 정합니다(`footage-gen.md` §7.2). 먼저 광고 전체가 컷 중심(i2v 중심, 씬 사이는 엔진 전환)인지 호흡 중심(인물·제품 시트와 씬보드를 먼저 만들고 r2v·f2v 중심, §7.3)인지 정하고, 씬마다 판단표에서 처음 맞는 줄을 고릅니다. 기본은 이미지→영상(`ai.video.imageToVideo`)이고, 맞는 씬에만 첫·끝 프레임 영상(`ai.video.framesToVideo`), 레퍼런스 영상(`ai.video.referenceToVideo`), 이어 늘리기(`ai.video.extend`)를 씁니다. 길이·레퍼런스 장수·멀티샷은 `video.models`의 모델 능력 안에서 고르고, 8초 넘는 한 호흡은 §7.4대로 만듭니다. 고른 도구·모델·길이와 이유는 씬표에 적어 제안합니다.
바닥 소재를 생성할 때는 `references/footage-gen.md`(MCP에서는 `get_ad_guide({ name: 'footage-gen.md' })`)를 읽습니다. 생성 프롬프트·카메라 어휘·금지 줄은 영문으로 쓰고 사용자에게는 한 줄 한글 요약을 붙여 보여 줍니다. 제품이 나오는 씬은 사용자 제품 사진에서 시작하고, 영상으로 만들기 전에 사진을 진단해 고칠 곳만 사용자 확인 후 고칩니다(`footage-gen.md` §4.1, img2img → 이미지→영상). 글로만 만드는 영상(`ai.video.generate`)은 분위기 컷에만 씁니다. 글자·로고·가격은 생성 모델에 그리게 하지 않고 모션그래픽으로 얹습니다. 영상 프롬프트를 쓰기 전에 `run_studio_tool { toolId: 'video.models' }`로 도구마다 받을 모델(Veo, Kling, Gemini Omni, MiniMax, Seedance)을 확인하고 `references/video-models.md`(MCP에서는 `get_ad_guide({ name: 'video-models.md' })`)의 그 계열 공식에 맞춥니다. 레퍼런스는 `{ref1}`, `{ref2}`로 가리킵니다.
이때 `timeline.mjs`의 BPM·비트·섹션은 분석값을 그대로 쓰고, 소리는 ProjectJSON에 넣지 않고 `import_to_admaker { keepAudio: true }`로 앱에서 먼저 만든 BGM을 그대로 옮깁니다. AI 생성 전에는 예상 크레딧과 프롬프트를 보여 주고 확인받습니다.
앱에 넣고 배치까지 끝나면 `arrange_tracks { scenes: 씬표 }`로 타임라인을 정리합니다. 앞 씬 행이 위에서부터 계단처럼 놓이고, 화면 전체 층(룩·파티클·어둡게 깔기·배경 영상)과 오디오는 아래로 가며, 행 이름이 '1씬 · 텍스트 · 첫 문구'처럼 붙습니다. 시간이 겹치는 행의 앞/뒤는 그대로라 화면은 바뀌지 않으니 `move_track`을 하나씩 부르지 않습니다.
이미 앱에 있는 광고를 고칠 때는 `get_editor_state`로 행 목록을 보고, `get_timeline_items { trackIndexes | trackIds | clipIds, fromSec?, toSec?, types? }`로 고칠 행(Row)이나 클립만 불러와 `raw` 필드 이름 그대로 `update_clip` 합니다. 행·클립이 많아 결과가 크면 `outputPath`(작업 폴더의 .json)로 파일에 받습니다.
이미지·영상 소재에 자막·워터마크·검은 띠가 있거나 비율이 캔버스와 맞지 않으면 `view_clip_media`로 원본을 보고 `crop_clip`으로 자릅니다. 영역은 `region`(원본 대비 0~1 비율, 예: 아래 20% 빼기 `{ x: 0, y: 0, width: 1, height: 0.8 }`)이나 `aspect`(`'9:16'` 등) + `focusX`/`focusY`(주체가 있는 쪽)로 주고, `fit`은 `keep`(보이던 자리 그대로, 기본)·`cover`(캔버스 채우기)·`contain` 중에서 고릅니다. 원본은 그대로라 `reset: true`로 되돌릴 수 있습니다. 위치·크기만 바꿀 때는 `update_clip`을 씁니다.
그린·블루 스크린으로 찍은 인물·제품 소재는 `chroma_key { clipId, color: 'auto' }`로 배경을 뺍니다. 키 색은 가장자리에서 찾고 `similarity`는 추천값이 들어갑니다. 결과 미리보기(체크무늬 = 투명)와 `check.borderLeft`(남은 배경)를 보고 배경이 남으면 `similarity`를 0.05~0.1씩 올리고, 주체가 비면 내립니다. 키를 뺀 클립 아래 행에 배경을 깔아야 합성이 보입니다. 흰 벽처럼 무채색 배경은 크로마키 대신 배경 제거(`ai.image.removeBackground`)를 씁니다.
함께 움직일 요소(CTA 버튼 배경+글자, 로고+태그라인, 가격표 묶음, 제품+그림자)는 클립 그룹으로 묶습니다. 그룹은 논리 그룹이라 멤버는 각자 클립 그대로이고, 사용자가 캔버스·타임라인에서 누르면 한 덩어리로 선택·이동됩니다. 앱에서는 `group_clips { clipIds, name }`으로 묶고(멤버 행은 맨 위 멤버 행 아래로 모임, 오디오·잠긴 클립 제외), `update_group`으로 `dx`/`dy`·`left`/`top`(이동), `rotate`/`angle`(그룹 중심 회전), `scale`(글자·외곽선·그림자도 같이 커짐)을 주고, 덩어리째 등장·퇴장은 `update_group { animations }`로 줍니다. 이 애니메이션은 멤버마다 같은 값에 `options.origin: 'group'`이 붙어 그룹 중심을 기준으로 돌고 커집니다. 푸는 것은 `ungroup_clips`, 그룹 목록·bounds는 `get_editor_state`의 `groups`입니다. ProjectJSON으로 만들 때는 멤버 클립에 `groupId`를, 프로젝트에 `groups: { g_cta: { id: 'g_cta', name: 'CTA 버튼', angle: 0 } }`을 넣고, 같이 움직일 애니메이션은 멤버마다 같은 값에 `options: { …, origin: 'group' }`을 줍니다. 앱으로 가져오면 그룹과 origin이 그대로 남습니다. 그룹 하나에 멤버는 2개 이상이고, 중첩 그룹은 없습니다.
MCP가 있으면 모션그래픽만으로 끝내지 않습니다. `references/techniques.md`(MCP에서는 `get_ad_guide({ name: 'techniques.md' })`)의 기법 메뉴에서 씬마다 이미지 생성·img2img·누끼/레이어 분리·이미지→영상·영상 생성·효과음·Lottie·손그림·레터링을 골라 섞고, 씬표에 기법과 예상 크레딧을 적어 제안합니다.

씬이 바뀌는 곳은 컷·fade로 두지 않습니다. `references/transitions.md`(MCP: `get_ad_guide({ name: 'transitions.md' })`)에서 시그니처 한 곳(트랙 매트 "글자 속으로"·줌 스루·잉크 번짐)을 먼저 정하고, 나머지 경계는 `am-*` 전환·전환 샷·마스크로 2–4종을 섞어 씬표 전환 칸에 적습니다. 앱으로 넘길 광고에는 `hf-*` 셰이더 전환을 쓰지 않습니다.
MCP가 없으면 영상 생성 AI나 스톡 푸티지는 쓰지 않습니다(소재는 사용자가 줍니다). 외부 생성 API·스킬·MCP 서버를 따로 설치하거나 API 키를 받아 직접 부르지 않습니다(과금, 키 노출, 고객 자산 유출).

## 필요 조건

**이 스킬은 admaker 엔진(`@admaker/engine`, 사내 비공개 패키지)이 있어야 동작합니다.**

- **엔진(필수)**: ProjectJSON을 그리고 브라우저 `Exporter`로 mp4를 렌더하는 부분입니다. 같이 쓰는 `@admaker/core`·`@admaker/animation`도 엔진과 함께 설치됩니다. 기준 버전은 3.0.7입니다(`references/engine-recipes.md`).
- **설치 위치**: 광고마다 작업 폴더에 따로 설치하고 버전을 고정합니다(`node <이 스킬 폴더>/templates/install-engine.mjs`). npm에는 없고, admaker 앱의 '스킬 설치'가 이 스킬 폴더의 `vendor/`에 넣어 둔 파일로 설치합니다.
- **엔진이 없으면 멈춥니다.** 설치 스크립트가 실패하거나 `vendor/`가 없으면, 엔진 없이 HTML·CSS·Remotion 같은 다른 방식으로 대신 만들지 않습니다. 사용자에게 엔진이 필요하다고 알리고 설치 방법(admaker 앱 MCP 메뉴 → Claude와 연결하기 → Claude Code 탭 → '스킬 설치')을 안내한 뒤 기다립니다.
- **admaker 앱(선택)**: 없어도 스킬은 동작합니다. 앱 MCP가 연결되어 있으면 광고 불러오기(`import_to_admaker`), AI 이미지·영상·BGM·TTS 생성, `get_ad_guide`, 템플릿을 같이 씁니다. 없으면 사용자가 준 소재와 엔진만으로 만들고, 납품은 mp4와 불러오기 파일(`to-admaker-import.mjs`)입니다.

광고의 판단 순서는 **메시지 전달 → 브랜드 기억 → 리듬·사운드 → 카메라 → 장식**입니다.

## 시작할 때

1. **범위를 판단합니다.**
   - 광고 한 편 → 아래 워크플로.
   - 샷 하나(엔드카드, 로고 스팅, 가격 롤 등) → `references/shots/`에서 카드를 고르고 전문을 읽은 뒤 구현.
   - 이미 있는 광고의 사운드만 → `references/director.md` §6–7, `references/engine-recipes.md` §6.
   - 내레이션(연출표: 화면 문구와 읽을 문장 분리·숫자/기호 읽기·강조·큐 단어, 스타일, 분량, 줄 단위 생성과 비트 싱크, TTS 감정·말투·쉼 태그 `[excited]`, `[short pause]` 등) → `references/narration.md`.
   - 효과음(소스 고르는 순서, 프롬프트 공식, 광고 순간별 추천 소리·길이, `durationSec`·`loop`, 피크 지연 재기 `templates/sfx-peak.mjs`, 비트에 맞춰 놓기) → `references/sfx.md`.
   - 바닥 이미지·영상 생성(이미지→영상 프롬프트, 카메라 무브, 제품 사진, 스타일, 인물·제품 일관성) → `references/footage-gen.md`.
   - 영상 모델별 프롬프트(Veo·Kling·Gemini Omni·MiniMax·Seedance 공식, 폴백에 안전하게 쓰기, 레퍼런스 태그, 증상별 고치기) → `references/video-models.md`.
   - 손글씨 폰트를 쓰거나 "손글씨로" 써 달라는 문구 → `references/engine-recipes.md` §3.2(손글씨 쓰기 + 라인 보일), 샷 카드 `handwritten-title`.
   - 기본 도형·폰트로 안 되는 모양(손그림 강조, 붓 획, 윤곽선 타이포 같은 특수 레터링, 자유 도형) → `references/drawing.md`, `templates/draw.mjs`.
   - 간단한 도형 PNG(스티커·배지·아이콘)가 2장 이상 필요하면 하나씩 만들지 않고 한 장의 시트에 모두 그려 자릅니다: MCP `make_shape_pngs`(앱에 넣을 때는 시트 한 장만 올리고 클립마다 crop 위치만 다르게 하는 시트 모드가 기본), 없으면 `node shape-pngs.mjs shapes.json out/shapes` → `references/drawing.md` "도형 PNG 여러 장".
   - 픽셀 아트·도트 캐릭터·레트로 게임 느낌(스프라이트 시트 플립북, 선명한 픽셀 `style.pixelated`, 계단식 `steps(n)` 이징) → `references/pixel-art.md`, `templates/pixel-sprite.mjs`.
   - 이징 고르기(들어오기·나가기·튀기·꽂히기 등 용도별 토큰, 31종 곡선, 전환 클립 easing) → `references/easing.md`, `templates/motion.mjs`의 `EASE`·`ease()`.
   - 씬 전환 고르기(트랙 매트·`am-*` 전환·전환 샷·마스크, 규칙·values·앱 호환) → `references/transitions.md`.
   - 한 클립의 여러 단계 동작(올라오며 펀치, 비트 펀치, 카드 뒤집기) → `references/gsap.md` (`gsapTimeline`). 3D 제품·오브젝트 샷 → `references/three.md` + `engine-recipes.md` §7.1. 웹용 GSAP·three.js 예제(ScrollTrigger, rAF, Clock, `new WebGLRenderer`)는 그대로 쓰지 않고 이 두 문서의 변환표대로 바꿉니다.
2. **엔진을 확인합니다.** `references/engine-recipes.md` §0. 프로젝트 폴더에 엔진이 없으면 `node <이 스킬 폴더>/templates/install-engine.mjs`(렌더까지 하면 `--render`)로 설치합니다. 엔진은 비공개 패키지라 npm에서 받을 수 없고, admaker 앱의 "스킬 설치"가 이 스킬 폴더의 `vendor/`에 넣어 둔 파일을 씁니다. `vendor/`가 없으면 사용자에게 admaker 앱의 MCP 메뉴 → Claude와 연결하기 → Claude Code 탭에서 '스킬 설치'를 눌러 달라고 합니다. 버전이 기준과 다르면 이름·파라미터를 다시 대조합니다.
3. **질문은 한 번, 한 메시지로** 합니다. 요청에 답이 있는 항목은 건너뜁니다.
   - 제품/서비스, 이 광고의 **단 하나의 메시지**, CTA 문구와 URL
   - 매체와 규격 → `references/ad-formats.md`
   - **바닥에 깔 영상·이미지**(필수, 여러 개면 순서와 길이), 브랜드 자산: 로고(SVG 권장), 컬러, 폰트, 금지 표현
   - 내레이션(TTS/본인 녹음/없음), 음악 보유 여부. TTS면 줄마다 연출표(화면 문구·읽을 문장·강조·큐)를 만들고 오디오 태그를 넣습니다(`references/narration.md`)
   - 스토리보드를 먼저 볼지(기본: 아니요)
   답을 받으면 나머지는 기본값으로 채우고 브리프를 몇 줄로 요약해 시작합니다. 다시 묻지 않습니다.
4. **만들기 전에 기획안을 고르게 합니다. 이 단계는 건너뛰지 않습니다.** 앱 MCP로 끝까지 진행하는 광고도, 사용자가 연출을 말하지 않은 요청도 같습니다. 바닥 소재 위에 **어떤 모션그래픽을 어떤 형태로** 얹을지를 씬표·BGM·생성보다 먼저 정합니다.
   - `node <이 스킬 폴더>/templates/gallery.mjs recommend "<요청 요약: 제품, 목적, 무드, 규격>" --out gallery-preview.html`를 실행합니다. 요청에 기법 낱말이 없어도 언제나 **기획안 3개**(`references/motion-directions.md`의 모션 방향: 형태·골격·시그니처·전환·글꼴·색)를 고르고, 기획안마다 "이런 형태로"를 보여 줄 갤러리 예시 하나(미리보기 포함)를 붙입니다. 출력의 기획안 목록을 그대로 쓰고, 페이지 경로도 알려 줍니다.
   - `gallery.mjs`를 실행할 수 없으면(앱 MCP 가이드만 있을 때) MCP `get_gallery({ request: "<요청 요약>" })`를 부릅니다. 같은 규칙으로 고른 기획안 3개와 기획안마다 붙일 예시(제목·미리보기 주소)를 돌려줍니다. 그것도 없으면 `motion-directions.md`를 읽고 `어울림` 낱말이 요청에 많이 걸리는 방향 3개를 직접 고르고(모자라면 `기본: 예`), 방향의 `예시` 줄에서 예시를 고릅니다.
   - **사용자에게는 기획안 3개와 "자유롭게 생성" 하나, 모두 4줄을 번호 목록 하나로 보여 주고 고르게 합니다.** 1번에 추천 표시와 이유 한 줄을 붙입니다.
     ```
     1. 기획안 A · <방향 이름> (추천) — 한 줄 + 훅 → 주인공 → 상승부 → 엔드카드 골격, 시그니처 한 번, 전환 2–3종
        예시: <갤러리 예시 제목> (이런 형태로: 예시에서 보여 줄 구성 한 줄) [미리보기]
     2. 기획안 B · <방향 이름> — … / 예시: …
     3. 기획안 C · <방향 이름> — … / 예시: …
     4. 자유롭게 생성 — 정해 둔 방향·예시에 묶지 않고 브리프만 보고 새 구성을 짬(방향을 섞거나 메뉴에 없는 형태)
     ```
     - 예시는 그 기획안이 화면에서 어떤 형태가 되는지 보여 주는 자료입니다. 우리 갤러리 예시(`gallery/data/ads.json`, 미리보기 `preview_url`)를 먼저 쓰고, 같은 예시를 두 기획안에 쓰지 않습니다. 맞는 예시가 없거나 이미 쓴 예시뿐이면 외부 레퍼런스(`references.json`의 `preview`)를 붙이고 "레퍼런스"라고 적습니다. 둘 다 없으면 예시 줄을 빼고 그렇다고 적습니다.
     - 예시의 `app_import`가 `partial`이면 앱에서 빠지는 부분을 그 줄에 적습니다.
     - 앱 채팅(MCP `ask_user_choice`)에서는 4줄을 options로 넘기고, 기획안마다 `preview`에 예시 미리보기 주소(http/https)를 넣어 카드에 미리보기가 보이게 합니다. "자유롭게 생성"에는 preview를 넣지 않습니다.
   - 사용자가 고른 줄이 다음 단계(샷 선택·씬표, MCP 순서 C)의 출발점입니다.
     - 기획안 A–C: 그 방향의 골격·시그니처·전환에서 시작하고, 붙인 예시의 구성(`prompt`·`shots`·`techniques`, MCP는 `get_gallery({ slug })`)을 형태 참고로 씁니다. 예시 파일을 그대로 쓰지 않고 사용자 소재·문구·색으로 새로 짭니다. 로컬 스킬에서 예시에 빌드 키트가 있고 사용자가 "예시처럼"을 원하면 `node <이 스킬 폴더>/templates/gallery.mjs use <slug> .`로 복사해 출력된 "바꿔 쓸 자리"부터 바꿉니다. 원래 예시 파일은 고치지 않습니다. MCP에는 빌드 키트를 돌릴 곳이 없으니 예시 구성을 보고 ProjectJSON을 직접 짭니다.
     - 자유롭게 생성: 메뉴의 방향에 묶이지 않고 브리프·소재·음악에 맞춰 형태·골격·시그니처를 직접 정합니다. 그래도 `aesthetic-rules.md`·`transitions.md` 규칙(소재를 덮지 않음, 시그니처 한 번, 전환 2–4종)은 지킵니다. 씬표를 보여 줄 때 정한 형태를 한 줄로 먼저 적습니다.
     - 고른 줄(기획안 방향과 예시, 또는 "자유")은 `TREATMENT.md`의 "모션 방향"에 적습니다.
   - 사용자가 갤러리 예시 이름을 직접 말하면(예: "지도 경로 예시처럼") 그 예시를 출발점으로 삼고, 가장 가까운 방향을 한 줄로 알립니다.
   - 기본 방향은 굵고 **화려하게**입니다(큰 글자, 분명한 그리드, 박에 꽂히는 이징, 장면마다 주인공·그래픽·빛 세 층, 박마다 히트, 글자 단위 3D 문구, 쉬지 않는 카메라: `references/aesthetic-rules.md` F1–F6). 사용자가 차분·미니멀·고급 톤을 말하면 한 단계 줄입니다. 가는 선 일러스트·부드러운 페이드·비네트 위주 연출은 사용자가 손글씨·감성을 직접 말했을 때만 후보에 올립니다.
   - 외부 레퍼런스(`gallery/data/references.json`: video-shotcraft 샷 124장 + lemo-opuscar 스타일 66종의 한국어 요약·admaker 구현 힌트, opuscar는 데모 영상 링크 포함)는 연출을 섞을 때도 씁니다. 따로 찾을 때는 `gallery.mjs refs "<낱말>"`(MCP: `get_gallery({ refs })`). 레퍼런스는 손법만 참고하고 원작의 화면·문구·브랜드는 옮기지 않습니다.
   - 사용자가 처음부터 연출을 자세히 정해 왔으면 그 연출에 가장 가까운 방향을 한 줄로 알리고 넘어갑니다. "알아서 해"라고 하면 목록을 보여 주되 답을 기다리지 않고 1번(기획안 A)으로 진행하며, 바꾸고 싶으면 말해 달라고 한 줄 붙입니다.
5. **모드**: 기본은 자율 진행. 사용자가 "같이 정하자"고 하면 브리프 → 비주얼 방향 → 스토리보드 세 지점에서만 확인을 받습니다.

## 스크립트 실행 방식

빌드·검사·변환·렌더 스크립트는 사용자에게 매번 허용을 묻지 않고 바로 실행되도록 등록되어 있습니다(크레딧이 드는 AI 생성은 계속 확인을 받습니다). 그 허용은 명령 모양으로 맞추니, 프로젝트 폴더에서 `sh build.sh`, `node build-project.mjs --out project.json`, `node validate.mjs project.json`, `node render/render.mjs project.json out/ad.mp4`처럼 **스크립트 하나를 그대로** 실행합니다. 폴더 이동은 `cd <폴더> && ...` 하나, 출력 줄이기는 끝에 `2>&1 | tail -40`까지만 붙이고, `;`·`$(...)`·리다이렉트(`>`)나 다른 명령(`rm`, `mkdir` 등)을 같은 줄에 섞지 않습니다. 섞으면 사용자에게 다시 허용을 묻게 됩니다.

## 워크플로

| 단계 | 할 일 | 읽을 파일 |
|---|---|---|
| 1. 브리프 | 질문 한 번, 브리프 요약 | `references/ad-formats.md` |
| 1.5 기획안 고르기 | `gallery.mjs recommend`(MCP: `get_gallery({ request })`)로 기획안 3개(모션 방향, 1번 추천, 기획안마다 갤러리 예시 미리보기)와 "자유롭게 생성"을 번호 목록 하나로 보여 주고 고르게 함. 건너뛰지 않음(MCP 순서에서도 씬표 전). 예시처럼 만들 때는 `gallery.mjs use`로 키트 복사 | `references/motion-directions.md`, `gallery/README.md` |
| 2. 트리트먼트 | `TREATMENT.md`: 문구(시청자 단계, 훅 후보 3개, 근거 표), 후보 구조 3개 + 선택 이유, 로그라인, 벤치마크, 샷 리스트, 비트시트, 큐맵(드롭, 섹션별 음악 사건 수), 사운드 표 | `references/director.md`, `references/copy.md`, `templates/TREATMENT.md` |
| 3. 브랜드 토큰 | 브랜드 자산에서 폰트·색·그리드·라운드를 `brand.json`으로. 브랜드 폰트가 없으면 무드별 페어링 후보 2–3개를 골라 6단계에서 비교. 모든 요소는 이 토큰만 사용 | `references/aesthetic-rules.md` B1–B5, `references/fonts.md` |
| 4. 샷 선택 | 1.5에서 고른 기획안의 골격이 출발점(자유롭게 생성이면 직접 정한 형태). 붙인 예시의 구성·프롬프트를 형태 참고로 쓰고, 예시처럼 만들 때는 그 키트(`gallery/kits/<slug>/`)에서 시작함. 에너지 골격의 슬롯마다 샷 카드를 고르고, 씬 경계마다 전환(트랙 매트·`am-*` 전환·전환 카드·마스크 중 하나, fade만 쓰지 않음)과 이어받는 요소를 정해 씬표 전환 칸에 적음. 시그니처 전환 한 곳, 2–4종 섞기. 한 기법은 전체에서 한 번만 주인공 | `references/shots/README.md` + 고른 카드 전문, `references/transitions.md`, `gallery/README.md` |
| 5. 타임라인 | `timeline.mjs`에 섹션·BPM·비트·히트·카메라 키를 씀. `analyzeBeats` 결과는 `ANALYSIS`에. 빠른 몽타주는 `presets/fast-montage.mjs`가 박 단위로 생성 | `templates/timeline.mjs`, `templates/presets/` |
| 6. 룩 검증 | 실제 엔진으로 스타일 프레임 3장(1장은 시그니처 샷) 렌더, 토큰·규칙과 대조. 폰트 후보가 여럿이면 여기서 하나로 정함 | `references/engine-recipes.md` §8 |
| 7. 스토리보드 | 원했을 때만. 핵심 샷 6–9장 한 장으로 타일링, **승인을 기다림** | |
| 8. 제작 | 보이스 → 음악(없으면 `gen-audio-kit.mjs`로 임시 합성) → `build-project.mjs`로 ProjectJSON 생성(룩 스택 포함) → SFX 표(소스는 `sfx.md` §0 순서: 앱이 있으면 라이브러리·`ai.sfx.generate`, 없을 때만 `gen-audio-kit.mjs`. 피크 지연은 `sfx-peak.mjs`) → 오프라인 믹스 → `Exporter` 렌더 | `references/engine-recipes.md`, `templates/` |
| 9. 검수 | 숫자 체크리스트 + 전환 구간 밀집 시트(`render/sheet.mjs`) + 독립 리뷰(가능하면 깨끗한 컨텍스트의 서브에이전트) | `references/aesthetic-rules.md` 전체 |
| 10. 납품 | `to-admaker-import.mjs`로 앱 불러오기 파일, `to-admaker-template.mjs`로 플래너 템플릿 생성 → 아래 목록 | `references/engine-recipes.md` §9, §9.1 |

## 반드시 지킬 원칙

1. **타임라인이 단일 진실의 원천입니다.** `timeline.mjs` 하나를 ProjectJSON 생성, SFX, 자막, 검사가 모두 읽습니다. 타임라인이 바뀌면 프로젝트를 다시 생성하고 SFX 표 전체를 다시 맞춥니다. ProjectJSON을 손으로 고치지 않습니다.
2. **엔진에 있는 이름만 씁니다.** 모르는 이징 이름은 엔진이 조용히 선형으로 처리하고, 등록되지 않은 모션 type이나 스크립트 이름은 그려지지 않습니다. 생성 후 `templates/validate.mjs`로 이름을 검사합니다.
3. **결정적 렌더링.** script 어댑터, three 커스텀 씬과 생성 코드에 `Date.now()`, `requestAnimationFrame`, `THREE.Clock`/`Timer`, 재생 중인 GSAP 트윈, 시드 없는 `Math.random()`, 이전 프레임 상태 의존을 쓰지 않습니다. 코드 안의 GSAP는 멈춘 타임라인을 `tl.time(time)`으로 맞춥니다(`gsap.md` §7).
4. **첫 1초 안에 훅, 마지막에 브랜드 + CTA 홀드.** 워드마크와 CTA는 자리잡은 뒤 최소 1초(6초 범퍼는 0.7초) 정지합니다. 훅은 화면·내레이션·자막 세 칸으로 쓰고, 화면 문구의 숫자·주장은 사용자 자료에서만 가져옵니다(최상급·할인·마감 표현은 `references/copy.md` §7).
5. **샷 카드를 쓸 때는 카드 전문을 읽고**, 카드의 "알려진 함정" 값은 낮추지 않습니다.
6. **모션 기본기는 `templates/motion.mjs`로.** 화면은 아래부터 소재(사용자 영상·이미지) → 글자 받침 → 그래픽 → 가장자리 비네트, 입장은 2–3속성 + 3–6프레임 시차, 퇴장은 입장의 절반, 스틸은 Ken Burns, 오래 머무는 조연은 숨쉬기, 빠른 이동은 모션 블러(aesthetic-rules R6–R9, Q11–Q15). 브랜드 요소의 정지(R1)는 이 모든 것보다 우선합니다. 늦게 등장하는 요소는 `options.delay` 대신 `entrance()`/`holdFrom()`을 씁니다(엔진은 delay 전에 0% 값을 걸지 않음). 지도는 `templates/map.mjs`(engine-recipes §4.1, 샷 카드 `map-*`).
7. **검수는 숫자로.** 자막 실효 글자 높이 ≥ 프레임 높이의 5%, 보조 ≥ 3%, 정보 자막 ≥ max(1.8초, 발화 + 0.6초)(단어 동기 자막은 Q15), −14 LUFS(매체 규격 우선), 블랙/빈 프레임 0, 컷–비트 오차 ≤ 2프레임, 미등록 어댑터 0.
8. **권리.** 사용자 자산과 CC0/CC BY/OFL 소재만. 서드파티 자산은 `CREDITS`에 출처·라이선스와 함께 적습니다(지도 경계 데이터 포함: 데이터셋 이름, 기준 연도, 원 출처). 타사 브랜드·캐릭터는 사용자가 권리를 확인하지 않으면 쓰지 않습니다. AI 생성 소재는 `CREDITS`에 도구·모델·생성일·원본 사진을 적고, 실존 인물의 얼굴·목소리는 사용자가 동의를 확인한 경우만 생성합니다(`footage-gen.md` §7, §10). 엔진 소스는 프로젝트 폴더로 복사하지 않습니다.
9. **음악이 편집을 정합니다.** 구간마다 화면 변화가 음악의 바쁨을 따라가고, 드롭이 있으면 핵심 순간 하나를 드롭에 둡니다(`director.md` §7.1–7.2, aesthetic-rules R10).
10. **기본은 화려하게.** 사용자가 차분·미니멀·고급 톤을 말하지 않으면 장면마다 주인공·그래픽 보조·빛 세 층이 움직이고, 마디 첫 박마다 요소 히트, 피크에 센 효과, 주인공 문구는 글자 단위 3D, 카메라는 장면마다 움직입니다(`references/aesthetic-rules.md` F1–F6). 정지·가독·세이프존·소재 보존·로고 원본 규칙은 그대로 지킵니다.

## 납품물 (프로젝트 폴더)

- `<name>_<비율>.mp4` (규격마다), `poster.jpg`, 내레이션/자막이 있으면 `<name>.srt`
- BGM이 있으면 BGM 없는 버전(SFX 유지)
- `template.json` (admaker 플래너 모드 템플릿: 바닥 소재를 뺀 그래픽 오버레이. 씬 단위로 하나씩, 바꿔 넣을 문구·로고는 `field`/`{{marker}}`로 표시. §9.1)
- `admaker-import.json` (admaker 앱 "광고 불러오기"로 여는 파일, `to-admaker-import.mjs`로 생성. 변환 경고도 함께 알림), `project.json` (렌더용 엔진 ProjectJSON), `scripts/`·`scenes/` (script 어댑터나 three 커스텀 씬을 썼다면. 이 둘은 앱에 등록되어 있지 않아 불러오기 파일에서 빠지므로, 앱에서 고칠 광고라면 그 장면을 영상으로 미리 렌더해 Video 클립으로 넣음)
- `TREATMENT.md`, `brand.json`, `timeline.mjs`, `sfx.json`, `CREDITS`, `build.sh`
- 합성 임시음을 썼다면 그 사실(교체 권장)

사용자에게는 프로젝트 폴더 위치, 규격별 파일, `admaker-import.json`을 admaker에서 광고 불러오기로 열 수 있다는 것(앱으로 넘어가지 않은 요소가 있으면 그 목록), `CREDITS`, 소재 책임이 사용자에게 있다는 것을 알려줍니다.
