# 영상 이펙트 39종

사용자가 효과 이름으로 요청하는 영상 이펙트("인물 뒤에 거대 글자", "알림 폭탄", "칼날 베기로 넘겨 줘")를 엔진 클립으로 만드는 카탈로그입니다. 6개 카테고리, 39종이고 모두 `templates/effects.mjs`의 함수 하나로 만듭니다.

- **빌더**: `templates/effects.mjs` (`import * as fx from "./effects.mjs"`). 함수가 클립 배열을 돌려주고, 배열 순서가 겹침 순서(앞 = 아래)입니다.
- **카드**: 카테고리마다 한 장. 값·함정·앱에서 쓰는 법이 들어 있습니다.
  `video-effects-behind.md` · `video-effects-transform.md` · `video-effects-face.md` · `video-effects-overlay.md` · `video-effects-impact.md` · `video-effects-camera.md`
- **샘플**: 저장소 `samples/video-effects/` (카테고리별 ProjectJSON 6개, 렌더 GIF·스틸, `build.mjs`가 39종 호출 예).
- **앱으로**: 엔진 기본 클립(Image·Video·Text·Shape)과 keyframes·마스크·트랙 매트·클립 효과만 씁니다. script 어댑터를 쓰지 않으니 `to-admaker-import.mjs` → 앱 "광고 불러오기" 또는 MCP `import_to_admaker`로 그대로 넘어갑니다.

## 고르는 법

1. 요청에서 효과 이름을 아래 표에서 찾습니다. 이름이 조금 달라도("윤곽선 빛나게" = 네온 윤곽선, "속보 자막" = 뉴스 속보) 가장 가까운 것을 고르고, 고른 이름을 사용자에게 한 줄로 말합니다.
2. **지원 수준**을 봅니다. `cutout`이면 소재가 누끼를 딸 수 있는지(사진, 그린스크린 영상)부터 확인합니다(아래 §소재).
3. 카테고리 카드를 읽고, 카드의 함정 값을 낮추지 않습니다.
4. 구간은 시간(초)으로 받습니다. 대사로 받으면 §구간 지정.
5. 한 광고에 이펙트는 주인공 하나 + 보조 하나까지. 같은 카테고리를 연달아 쓰지 않습니다(aesthetic-rules Q4, R5).

## 39종

지원 수준: **ready** 바로 가능 · **approx** 근사(고정 위치, 계단식 속도, 정지 컷 등. 카드에 차이를 적음) · **cutout** 인물 누끼가 있으면 가능(사진은 `ai.image.removeBackground`·`ai.image.separateLayers`, 그린스크린 영상은 `chroma_key`). 프레임마다 움직이는 일반 영상의 인물 누끼는 아직 도구가 없어 그 경우는 사진 한 장 + `ai.video.imageToVideo`로 갑니다.

| # | 효과 | id | 함수 | 지원 | 한 줄 |
|---|---|---|---|---|---|
| **인물 뒤 공간** | | | | | `video-effects-behind.md` |
| 1 | 시계 다이얼 | clock-dial | `clockDial` | cutout | 인물 뒤 문자판이 열리고 바늘이 빠르게 돎(마감 임박, 타임랩스) |
| 2 | 거대 글자 | giant-type | `giantType` | cutout | 화면보다 큰 글자가 인물 뒤에 깔려 흐름 |
| 3 | 게시물 벽 | post-wall | `postWall` | cutout | SNS 게시물 카드 벽이 기울어진 채 위로 흐름(입소문) |
| 4 | 궤도 링 | orbit-ring | `orbitRing` | cutout | 타원 궤도가 몸을 감싸고 칩이 앞뒤로 돎 |
| 5 | 숫자 카운트 | count-up | `countUpBehind` | cutout | 인물 뒤 큰 숫자가 0에서 목표값까지 오름 |
| 6 | 차트 상승 | chart-rise | `chartRise` | cutout | 막대가 차례로 솟고 상승 화살표가 그려짐 |
| 7 | 무한 터널 | infinite-tunnel | `infiniteTunnel` | cutout | 사각 링이 끝없이 다가오는 공간 |
| **인물 변형** | | | | | `video-effects-transform.md` |
| 8 | 분신 줄세우기 | clone-lineup | `cloneLineup` | cutout | 같은 인물이 양옆으로 줄지어 나타남 |
| 9 | 머리 쌓기 | head-stack | `headStack` | cutout | 머리만 오려 탑처럼 쌓아 올림 |
| 10 | 코드 인간 | code-human | `codeHuman` | cutout | 실루엣 안에서만 코드 글자가 흐름 |
| 11 | 아스키 인간 | ascii-human | `asciiHuman` | cutout | 실루엣이 아스키 문자 격자로 바뀜 |
| 12 | 네온 윤곽선 | neon-outline | `neonOutline` | cutout | 화면이 어두워지고 몸 둘레에 네온관이 켜짐 |
| 13 | 스티커 팝 | sticker-pop | `stickerPop` | cutout | 흰 테두리 스티커가 되어 통통 튀어나옴 |
| 14 | 망점 인쇄 | halftone-print | `halftonePrint` | ready | 화면 전체가 망점 인쇄 + 종이 질감 |
| 15 | 지폐 초상 | banknote-portrait | `banknotePortrait` | approx | 인물이 초록 판화 초상이 된 지폐가 날아옴 |
| 16 | 컬러 분리 | color-split | `colorSplit` | ready | R·G·B 채널이 어긋났다 다시 합쳐짐 |
| 17 | 잔상 트레일 | echo-trail | `echoTrail` | ready | 같은 영상을 몇 프레임씩 늦게 반투명으로 겹침 |
| 18 | 프레임 탈출 | frame-escape | `frameEscape` | cutout | 액자 속 인물이 액자 밖으로 튀어나옴 |
| **얼굴 추적** | | | | | `video-effects-face.md` |
| 19 | 머리 위 라벨 | head-label | `headLabel` | approx | 머리 위 이름표가 따라다님 |
| 20 | 얼굴 스캔 | face-scan | `faceScan` | approx | 모서리 괄호·점 격자·스캔 선·분석 % |
| 21 | 이모지 반응 | emoji-react | `emojiReact` | approx | 얼굴 옆에서 이모지가 튀어나와 떠오름 |
| **화면 오버레이** | | | | | `video-effects-overlay.md` |
| 22 | 창 팝업 | window-popup | `windowPopup` | ready | 운영체제 창이 계단식으로 톡톡 열림 |
| 23 | 댓글 폭포 | comment-waterfall | `commentWaterfall` | ready | 댓글 말풍선이 아래에서 끝없이 올라옴 |
| 24 | 손글씨 낙서 | hand-doodle | `handDoodle` | ready | 펜 동그라미·화살표·별·밑줄이 그려지고 떨림이 남음 |
| 25 | 라이브 커서 | live-cursor | `liveCursor` | ready | 이름표 달린 커서가 돌아다니며 클릭 |
| 26 | 예측 키보드 | predictive-keyboard | `predictiveKeyboard` | ready | 입력창에 문장이 쳐지고 추천 단어가 바뀜 |
| 27 | 터미널 타이핑 | terminal-typing | `terminalTyping` | ready | 검은 터미널에 명령어가 한 글자씩 |
| 28 | 알림 폭탄 | notification-bomb | `notificationBomb` | ready | 알림 배너가 연달아 떨어지며 쌓임 |
| 29 | 뉴스 속보 | breaking-news | `breakingNews` | ready | 빨간 속보 띠 + 헤드라인 + 흐르는 티커 |
| **전환·임팩트** | | | | | `video-effects-impact.md` |
| 30 | 만화 임팩트 | comic-impact | `comicImpact` | ready | 순간 흑백 + 집중선 + 별 폭발 + "쾅!" |
| 31 | 칼날 베기 | blade-slash | `bladeSlash` | ready | 칼빛이 지나가고 화면이 두 조각으로 갈라짐 |
| 32 | 종이 찢기 | paper-tear | `paperTear` | ready | 화면이 지그재그로 찢어지며 벌어짐 |
| 33 | 글자 다이브 | letter-dive | `letterDive` | ready | 다음 장면이 글자 안에 보이다가 획 속으로 날아듦 |
| 34 | 글리치 | glitch | `glitch` | ready | glitch → RGB 분리 + 어긋난 가로 조각 |
| 35 | 화면 분할 | split-screen | `splitScreen` | ready | 2·3·4칸이 차례로 열리며 소재가 하나씩 |
| **카메라** | | | | | `video-effects-camera.md` |
| 36 | 돌리 줌 | dolly-zoom | `dollyZoom` | cutout | 인물 크기는 그대로, 배경만 확 다가옴(버티고) |
| 37 | 초점 이동 | rack-focus | `rackFocus` | cutout | 앞·뒤 흐림을 맞바꿔 시선을 옮김 |
| 38 | 프리즈 줌 | freeze-zoom | `freezeZoom` | ready | 정지 프레임으로 한 점에 확 다가가 짚고 다시 재생 |
| 39 | 스피드 램프 | speed-ramp | `speedRamp` | approx | 구간마다 재생 속도를 바꿔 느려졌다 빨라짐(계단식) |

## 소재

| 필요한 것 | 얻는 법 | 쓰는 효과 |
|---|---|---|
| 인물 누끼 PNG (`subject = { src, box }`) | 사진: MCP `ai.image.removeBackground` 또는 `ai.image.separateLayers`(앞 레이어). 그린스크린 영상: `chroma_key { clipId, color: 'auto' }` | cutout 전부 |
| 인물 없는 배경 | `separateLayers`의 뒤 레이어, 또는 `ai.image.edit`로 인물 지우기. 없으면 원본 사진을 그대로 깔아도 됨(누끼가 위를 덮음) | 인물 뒤 공간, 돌리 줌, 초점 이동 |
| 머리·얼굴 위치 | 스틸에서 재서 캔버스 px로 적음. 움직이면 몇 시각마다 `[[t, x, y], …]` | 얼굴 추적 3종, 머리 쌓기 |
| 정지 프레임 | `ffmpeg -ss <초> -i in.mp4 -frames:v 1 frame.png`, 앱에서는 `app_screenshot { timeSec }` 후 업로드 | 프리즈 줌 |
| 장면 스펙 | `{ type: "Image" | "Video", src, trimFrom? }` — 함수가 클립을 만듦 | 전환·분할·컬러 분리·잔상 |

- 누끼 src를 SVG 안에 넣는 효과(네온 윤곽선·스티커 팝·지폐 초상의 `outlineSvg`)는 **data URL**이어야 합니다. SVG를 이미지로 그릴 때 바깥 URL은 막혀서 빈 그림이 됩니다. 파일이면 `"data:image/png;base64," + fs.readFileSync(p).toString("base64")`.
- 같은 사진의 원본과 누끼는 **같은 박스**에 둡니다. 원본을 프레임 가득(cover)에 깔았다면 누끼도 같은 cover 박스(`fx.coverBox`).

## 구간 지정

- **시간**: `from`·`to`(또는 `at`·`dur`)를 초로 넣습니다. 비트에 맞추려면 `audio.analyzeBeats`의 박·피크 시각을 씁니다.
- **대사**: 우리 TTS 내레이션이면 생성 결과의 단어 타이밍(Caption words)에서 그 단어의 시작 시각을 찾습니다. 사용자가 올린 영상 속 말은 받아쓰기 도구가 아직 앱에 없어서, 사용자에게 몇 초쯤인지 묻거나 영상을 보고(`view_clip_media`) 정합니다. 묻는 말: "‘오늘만’이라고 말하는 부분이 몇 초쯤인가요?"

## 앱에서

- 스킬 작업 폴더에서 효과를 넣은 ProjectJSON을 만들고 `validate.mjs` → `to-admaker-import.mjs` → `import_to_admaker`로 넣습니다. `import_to_admaker`는 새 프로젝트를 만듭니다. 이미 앱에 있는 광고에 하나만 더할 때는 카드의 "MCP로 직접" 줄대로 `add_clip`·`update_clip`을 쓰고, 트랙 매트가 들어가는 효과는 광고 전체를 ProjectJSON으로 다시 가져옵니다.
- 클립 효과(dotFilter·rgbSplit·glitch·grayscale·adjustment·glow)는 앱에서 `transform.clipEffects`로 들어가 미리보기·브라우저 내보내기에서 그대로 보입니다. 서버 인코딩은 지금 쓰지 않습니다.
- 트랙 매트는 앱에 `transform.matte`로 들어갑니다. Studio에는 아직 매트를 거는 UI가 없어서, 매트를 쓰는 효과(머리 쌓기·코드·아스키·프레임 탈출·칼날·종이·글자 다이브·글리치 조각·화면 분할)는 가져오기로만 넣습니다.

## 렌더로 확인할 것

- 스틸은 `render/render.mjs --stills`(Preview 경로)보다 **mp4에서 뽑습니다.** 클립 효과·트랙 매트가 있는 프레임에서 Preview 스틸은 그 위의 글자가 빠져 보입니다(엔진 3.0.20 기준, mp4 내보내기는 정상).
- 효과마다 카드의 "확인" 줄(예: 궤도 칩이 몸 뒤로 지나갈 때 가려지는지, 찢긴 두 조각 사이로 다음 장면이 보이는지)을 스틸에서 봅니다.

## 한계와 다음 도구

| 도구(아직 없음) | 풀리는 것 |
|---|---|
| 영상 인물 매팅(프레임별 마스크 → 알파 영상) | cutout 13종을 일반 영상에서, 인물 뒤 공간 "움직이는 인물" 버전 |
| 얼굴·포즈 추적(MediaPipe 등) | 얼굴 추적 3종과 궤도 링이 실제 움직임을 따라감(지금은 손으로 준 경로) |
| 사용자 영상 받아쓰기(단어 타이밍) | 대사로 구간 지정, 숫자 카운트를 말에 맞추기 |

그 전까지는 사진 한 장으로 효과를 만든 뒤 `ai.video.imageToVideo`로 살짝 움직이거나, 그린스크린 영상을 `chroma_key`로 씁니다.
