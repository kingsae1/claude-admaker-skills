# 바닥 소재 만들기: 앱 AI로 이미지·영상 생성하기

광고의 바닥(z 0–9)에 깔 소재를 admaker 앱 AI로 만들 때 읽는 문서입니다. 모션그래픽은 지금처럼 그 위에 얹습니다.
도구 목록과 조합 레시피는 `techniques.md`, 제작 순서는 `get_production_workflow`, 비트는 `director.md` §7을 따릅니다. 이 문서는 **프롬프트를 어떻게 쓰고, 생성한 클립을 어떻게 검수해 `FOOTAGE`에 넣는지**를 다룹니다.

앱 MCP가 연결되어 있을 때만 씁니다. MCP가 없으면 외부 생성 API·스킬·MCP 서버를 직접 부르지 않습니다(API 키, 과금, 고객 자산 유출). 소재는 사용자가 줍니다.

## 1. 언어 규칙

- **프롬프트, 카메라 어휘, 금지 목록은 영문으로 씁니다.** 앱의 이미지·영상 모델(Veo, Kling, gpt-image 등)은 영문 프롬프트를 가장 정확히 따릅니다. 아래 영문 블록은 번역하지 않고 그대로 채워 씁니다.
- 사용자에게 보여 줄 때는 영문 프롬프트 아래에 한 줄 한글 요약을 붙입니다("천천히 다가가며 병을 비추고, 오른쪽에서 빛이 지나감").
- 화면에 들어갈 한글 문구는 프롬프트에 넣지 않습니다. 글자는 엔진 텍스트로 얹습니다(§5).

## 2. 이미지→영상 프롬프트 (`ai.video.imageToVideo`)

시작 이미지가 피사체·구도·색을 이미 정하므로, 프롬프트는 **무엇이 움직이고 카메라가 어떻게 가는지**에 씁니다. 이미지에 이미 보이는 것을 길게 다시 묘사하지 않습니다.
한 클립에는 **주된 동작 하나, 카메라 아이디어 하나**만 둡니다. 둘 이상이면 모델이 컷을 지어내거나 피사체를 바꿉니다.

순서는 Shot → Subject → Environment → Camera → Style이고, 마지막에 끝 프레임과 금지 줄을 붙입니다.

```text
[Shot] <shot size + editorial job>, single continuous shot, no cuts.
[Subject] <the subject from the image> <one dominant action, physically plausible>.
[Environment] <what moves around it: steam, light sweep, fabric, water, particles>.
[Camera] <one move with direction, speed and distance>, ending on <end frame>.
[Style] <lighting + lens + mood in concrete terms>.
[Keep] The product's shape, color, logo and label stay exactly as in the source image.
[Avoid] No text, no new logos, no extra objects, no morphing, no cuts, no camera shake.
```

예시 (제품 클로즈업, 4초):

```text
Medium close-up product hero shot, single continuous shot, no cuts.
The glass bottle from the image stays upright and centered; condensation droplets slowly run down its side.
A soft beam of warm light sweeps across the background from left to right.
Slow dolly-in, about 15% closer over the whole clip, ending on a steady chest-height frame with the bottle filling the center third.
Low-key studio lighting with a crisp rim light, shallow depth of field, clean luxury commercial look.
The product's shape, color, logo and label stay exactly as in the source image.
No text, no new logos, no extra objects, no morphing, no cuts, no camera shake.
```

예시 (분위기 컷, 6초, 사람 없음):

```text
Wide establishing shot, single continuous shot, no cuts.
Morning mist drifts slowly over the empty city rooftop from the image.
Sunlight breaks through the clouds and warms the building edges.
Slow crane up, revealing more of the skyline, ending on a level horizon with open sky in the upper third.
Soft natural light, gentle haze kept light so the scene stays clear, calm optimistic mood.
No text, no people, no birds, no cuts, no camera shake.
```

쓰는 요령:

- **끝 프레임을 적습니다.** "ending on …"이 없으면 카메라가 계속 흘러 다음 컷과 이어지지 않습니다. 끝 프레임에는 위쪽 또는 아래쪽 1/3에 글자 자리를 남겨 둡니다(모션그래픽 자리).
- **속도와 거리를 숫자나 비교로.** "slowly"보다 "about 15% closer over the whole clip", "a quarter turn".
- **물리적으로 그럴듯한 동작 하나.** 김, 물방울, 천, 빛, 머리카락처럼 작은 움직임이 제품을 망가뜨리지 않습니다. 제품 자체를 변형시키는 동작(열리기, 접히기)은 피합니다.
- **화면을 뿌옇게 하지 않습니다.** "heavy fog", "dreamy haze"는 소재를 흐리게 만듭니다(aesthetic-rules Q11). 쓰더라도 "kept light so the scene stays clear".
- `generateAudio`는 기본 끕니다. 소리는 앱 BGM·효과음으로 맞춥니다(`director.md` §6).

## 3. 카메라 어휘

카메라 용어는 영문 그대로 씁니다. "low angle"처럼 모호한 말 대신 높이와 각도를 따로 적습니다("camera at waist height, tilted up 15 degrees").
움직임은 **이유가 있을 때만** 씁니다. 이유가 없으면 고정(locked-off)이 낫고, 모션그래픽이 화면 위에서 움직임을 만듭니다.

| 영문 (프롬프트에 그대로) | 하는 일 | 광고에서 쓰는 곳 |
|---|---|---|
| `locked-off static camera` | 고정. 피사체·빛만 움직임 | 정보·가격 씬 바닥, 글자가 많은 씬 |
| `slow dolly-in` / `dolly-out` | 카메라가 실제로 다가감/물러남 | 제품 공개, 엔드카드 직전 |
| `push-in` | 짧고 빠른 다가감 | 훅, 비트 펀치 |
| `truck left` / `truck right` (`tracking shot`) | 옆으로 평행 이동 | 라인업, 진열대 |
| `arc` / `orbit around the subject, a quarter turn` | 피사체 주위를 돎 | 제품 360 느낌, 고급 제품 |
| `crane up` / `pedestal down` | 위아래 이동 | 공간 공개, 스케일 |
| `pan left` / `tilt up` | 제자리에서 회전 | 시선 유도, 위로 드러내기 |
| `rack focus from foreground to the product` | 초점 이동 | 시선을 제품으로 넘기기 |
| `zoom in` (camera stays in place) | 렌즈만 당김 | 긴장, 디테일 (dolly와 구분) |
| `stabilized follow` | 피사체를 따라감 | 사람이 움직이는 라이프스타일 |
| `macro close-up` / `extreme close-up insert` | 질감·디테일 | 소재감, 원료 |

숏 크기: `extreme wide`, `wide`, `medium wide`, `medium`, `medium close-up`, `close-up`, `extreme close-up`. 사람이 나오면 경계를 적습니다("framed from mid-torso up").
렌즈는 화각으로: `moderate wide, about 28mm full-frame equivalent`, `short telephoto, about 85mm`, `shallow depth of field`.
제품 광고에 `handheld`나 `camera shake`는 쓰지 않습니다(`director.md` §8).

## 4. 제품 사진과 img2img (`ai.image.edit`)

**제품이 나오는 씬은 사용자 제품 사진에서 시작합니다.** 글로만 만든 제품(`ai.image.generate`, `ai.video.generate`)은 실물과 달라집니다. 순서는 사용자 사진 → `ai.image.edit`(배경·조명·계절) → 사용자 확인 → `ai.video.imageToVideo`입니다.
프롬프트는 네 덩어리로 나눠, 연출이 제품 사실을 바꾸지 못하게 합니다.

```text
Fixed product facts: <product name/variant>, <exact color and material>, <size cue>, logo and label exactly as in the source photo, only the items in the photo.
Creative direction: <scene/background>, <lighting>, <mood>, <clean empty area in the top/bottom third>.
Negative constraints: No extra accessories, no changed logo, no invented text, no badges, no claims, no altered color, no deformation, no additional variants.
Post-production plan: Headline, price and CTA are added later as motion graphics; keep the <top/bottom> third clean.
```

모델에게 만들게 하지 않는 것: 로고, 라벨 글자, 성분·영양 정보, 인증 마크·씰, QR·바코드, 별점·리뷰, 배지, 효과 주장("24시간 보냉", "7일 만에"). 필요하면 사용자가 준 원본을 엔진 Image 클립으로 얹습니다.
라이프스타일 장면의 소품은 구성품으로 오해받지 않게 합니다("props clearly separate from the product, not looking included").
여러 색상·용량은 한 프롬프트에 섞지 않고 변형마다 따로 만듭니다.

### 4.1 생성 전 진단과 보정

사용자 사진을 이미지→영상에 넣기 전에 먼저 진단하고, 고칠 곳만 고칩니다. 문제가 있는 사진을 그대로 영상으로 만들면 흐림·색 틀어짐·글자 깨짐이 모든 프레임으로 번집니다.
**진단은 자동으로, 수정은 사용자 확인 후에** 합니다. 진단표(문제, 고칠 방법, 예상 크레딧)를 보여 주고 고를 수 있게 합니다. 원본은 덮어쓰지 않고 새 파일로 만듭니다(`ai.image.edit`의 기본값, `replaceSource` 쓰지 않음).

| 진단 항목 | 확인 방법 | 고치는 법 |
|---|---|---|
| 해상도 | 짧은 변이 출력 해상도(1080px)의 2/3 미만이면 부족 | 앱 업스케일 메뉴(`list_menu_commands`) 또는 사용자에게 원본 요청 |
| 흐림·노이즈 | 제품 가장자리와 라벨 글자가 2배 확대에서 읽히는지 | 업스케일, 안 되면 원본 요청. 생성 모델로 선명하게 "다시 그리게" 하지 않음 |
| 밝기·색 | 노출 부족·과다, 색 틀어짐(흰 배경이 누렇거나 파람) | `ai.image.edit` 아래 영문 프롬프트. 제품 색이 달라지면 버림 |
| 배경 | 어수선함, 다른 제품, 글자 여백 없음 | `ai.image.removeBackground` → 엔진 배경, 또는 `ai.image.edit`로 배경만 교체 |
| 제품 | 반사·먼지·찌그러짐, 라벨 가림 | 사용자에게 다른 컷 요청이 먼저. 리터칭은 반사·먼지까지만 |
| 기존 글자 | 사진에 박힌 문구·가격·워터마크 | 지우고(`ai.image.edit`) 문구는 엔진으로 다시 얹음 |

보정 프롬프트는 영문으로, 고칠 것 하나씩 씁니다.

```text
Correct only the <exposure / white balance / background>: <what to change, e.g. lift shadows slightly and neutralize the yellow cast so the white background reads pure white>.
Keep the product exactly as in the source photo: same geometry, packaging, logo, label text, color and material. Do not redraw, sharpen or relight the label.
No new objects, no text, no changes outside the requested correction.
```

보정본 검수(영상 생성 전에 사용자에게 원본과 나란히 보여 줌):

- 제품 형태·패키지·로고·라벨·색·재질이 원본과 같은가. 사용자가 승인한 변경만 허용합니다.
- 라벨을 2배 확대해 원본과 비교합니다. 글자가 다시 그려졌거나, 비었거나, 뒤를 보는 패키지가 되었으면 치명 결함으로 버립니다.
- 보정 때문에 없던 그림자·반사·소품이 생기지 않았나.
- 두 번 고쳐도 제품이 달라지면 보정을 멈추고 원본(또는 누끼 + 엔진 배경)으로 갑니다.

## 5. 글자와 로고는 엔진으로

생성 모델은 글자를 잘 깨뜨립니다(한 프레임에서 워드마크 철자가 바뀌는 식). 화면 문구, 가격, 로고, CTA는 전부 엔진 모션그래픽으로 얹고, 프롬프트에는 `No text` 줄을 넣습니다.
`templates/footage-plan.mjs`가 프롬프트에 text·logo·caption 같은 요청이나 따옴표 문구, 한글이 있으면 경고합니다.

## 6. 스타일 방향 (img2img 룩, 광고 전체 톤)

형용사 나열("premium, modern, cinematic") 대신 **규칙 한 문장**을 정하고, 모든 생성 프롬프트의 `[Style]` 줄에 같은 말로 넣습니다.

```text
Style thesis: <intent> through <visual tension>, while <behavior rule>.
e.g. Make technical precision feel tactile: rigid clean geometry holds warm, imperfect materials, and the camera moves only when it reveals something new.
```

- 바꾸지 않을 것(invariants)과 씬마다 바꿀 것(controlled variables)을 나눠 TREATMENT에 적습니다. 예: 조명 방향·색온도·렌즈는 고정, 배경 장소만 씬마다.
- 레퍼런스 광고는 이름으로 흉내 내지 않고 **작동 원리로** 옮깁니다. "like Reference A"가 아니라 "low-key side light with fast falloff and one small warm practical in the background".
- 후보를 두세 개 낼 때는 색만 바꾸지 말고 구도·빛·카메라 중 셋 이상을 다르게 합니다.
- `brand.json`의 색은 소품·빛 색으로 넣되, 화면 전체에 브랜드 색 틴트를 씌우지 않습니다(Q11).

## 7. 인물·제품 일관성

글로만 쓴 프롬프트로는 같은 인물·제품이 유지된다고 약속할 수 없습니다. 일관성은 **고정 문구 + 같은 시작 이미지 + 고르기 + 검수**로 만듭니다.

1. **앵커 문구를 정해 모든 프롬프트에 똑같이 넣습니다.** 표현을 바꾸지 않습니다.

```text
Identity anchor: <name/codename>, <age range and build>, <face shape, hair cut/color/part>, <signature item and which side>, <outfit with every layer named>.
Preserve these identity anchors exactly. Avoid changing age, face shape, body proportions, skin tone, hair length or color, signature accessory, outfit cut, or which hand holds the product.
```

제품은 `Product anchor: <shape>, <color/material>, <cap/label layout>, <size relative to hand>` 식으로 씁니다.

2. **시작 이미지를 하나로 묶습니다.** 같은 인물·제품이 나오는 씬은 사용자 사진 한 장(또는 처음 승인한 생성 이미지 한 장)에서 `ai.image.edit`로 장면만 바꾼 변형을 만들고, 그 변형들을 `ai.video.imageToVideo`에 넣습니다. 씬마다 새로 생성하지 않습니다.
3. **한 번에 하나만 바꿉니다.** 장소를 바꿀 때는 조명·옷을 그대로 둡니다.
4. **원장(ledger)을 남깁니다.** 씬표에 씬마다 시작 이미지, 앵커 버전, 프롬프트, 승인한 생성본, 버린 생성본의 틀어짐 메모를 적습니다. 파일 이름이나 대화 기억으로 관리하지 않습니다. 모델이 바뀌면 같은 프롬프트라도 새 버전으로 봅니다.
5. **실존 인물은 사용자가 동의를 확인한 경우만.** 공개된 사진이 있다는 것은 동의가 아닙니다. 유명인·아이·일반인 얼굴은 만들지 않습니다.

### 7.1 일관성 도구 고르기

앱의 `list_studio_tools`에 아래 두 도구가 있으면 씁니다. 없는 앱 버전이면 2번(같은 시작 이미지)과 `ai.video.extend`로 잇고, 두 컷 사이는 엔진 전환(와이프·마스크)으로 가립니다.

| 상황 | 도구 | 넘기는 것 |
|---|---|---|
| 앞 컷에서 끊김 없이 이어지는 다음 컷 | `ai.video.framesToVideo` | `firstClipRef`: 앞 컷 **영상** 클립(마지막 프레임을 씀), `lastClipRef`: 이 컷의 끝 장면 이미지 |
| 정해 둔 시작·끝 장면 사이를 움직임으로 | `ai.video.framesToVideo` | 시작 이미지, 끝 이미지(둘 다 같은 원본에서 `ai.image.edit`로 만든 것) |
| 같은 인물·제품을 새 장소·새 동작으로 | `ai.video.referenceToVideo` | `clipRefs`: 레퍼런스 이미지 1–3장, 중요한 순서(얼굴 > 제품 > 스타일) |
| 사진 한 장을 그대로 움직이게 | `ai.video.imageToVideo` | 그 이미지 |

레퍼런스 영상 프롬프트는 레퍼런스를 직접 가리킵니다. 끝 장면을 정했으면 첫·끝 프레임 영상 프롬프트는 그 사이의 움직임만 씁니다.

```text
The person from the reference image walks into the sunlit kitchen and picks up the product from the second reference image with the right hand.
Medium shot, single continuous shot, no cuts. Slow truck right following her, ending on a steady frame with the product label facing the camera.
Keep the face, hair, outfit and the product's shape, color, logo and label exactly as in the reference images.
No text, no new logos, no extra people, no cuts.
```

```text
Single continuous shot, no cuts. The camera slowly arcs a quarter turn around the bottle from the first frame to the last frame while the light shifts from cool morning to warm afternoon.
The product's shape, color, logo and label stay exactly as in the source images. No text, no morphing, no camera shake.
```

얼굴이 다른 사람 둘을 한 번에 레퍼런스로 넣지 않습니다. 레퍼런스 슬롯이 모자라면 얼굴 > 제품 > 스타일 > 배경 순으로 남깁니다.

### 7.2 씬마다 영상 도구 정하기 (기본 순서)

영상을 만드는 씬은 **기획 단계(씬표를 만들 때)** 에 씬마다 영상 도구를 하나 정하고, 씬표 `영상 도구` 칸에 도구와 이유를 한 줄로 적습니다. 기본은 이미지→영상이고, 아래 조건에 **맞는 씬에만** 첫·끝 프레임이나 레퍼런스 영상을 씁니다. 위에서부터 보고 처음 맞는 줄을 고릅니다.

| 순서 | 씬이 이러면 | 도구 | 미리 준비할 것 |
|---|---|---|---|
| 1 | 바로 앞 씬의 생성 영상과 **같은 인물·제품·장소가 컷 없이 이어짐**(동작·카메라가 계속됨, 하드컷이나 엔진 전환으로 끊지 않음) | f2v `ai.video.framesToVideo` | 앞 씬 영상(먼저 생성), 이 씬 끝 장면 이미지 |
| 2 | **시작과 끝 상태가 분명히 다름**: 포장이 열림, 비포→애프터, 제품이 돌아 라벨 정면에서 멈춤, 끝 프레임에 문구 자리를 비워야 함 | f2v `ai.video.framesToVideo` | 같은 원본에서 `ai.image.edit`로 만든 시작·끝 이미지 2장 |
| 3 | 이미 정한 인물·제품을 **사진에 없는 장소·동작으로** 보여 줌(사진 한 장의 구도로는 그 장면이 안 나옴), 그리고 그 인물·제품이 2개 이상 씬에 나옴 | r2v `ai.video.referenceToVideo` | 레퍼런스 이미지 1–3장(얼굴 > 제품 > 스타일) |
| 4 | 확인한 사진 한 장의 구도 그대로 살짝 움직이면 됨(돌리·줌, 김·물방울·빛) | i2v `ai.video.imageToVideo` (기본) | 그 이미지 |
| 5 | 제품·인물이 안 나오는 분위기 컷 | t2v `ai.video.generate` | 없음 |

**맞지 않는 경우에는 쓰지 않습니다.**

- 씬 하나짜리 광고, 씬마다 다른 피사체가 나오는 광고, 씬 사이를 하드컷·와이프·마스크로 끊는 연출이면 1번 조건이 아닙니다. 이미지→영상으로 갑니다.
- 끝 장면이 딱히 정해지지 않았는데 끝 이미지를 억지로 만들지 않습니다. 끝 프레임을 고정하면 움직임이 좁아집니다.
- 제품이 한 씬에만 나오고 사용자 사진 구도가 그 씬에 맞으면 레퍼런스 영상보다 이미지→영상이 실물에 더 가깝습니다.
- 앱에 해당 도구가 없으면(`list_studio_tools`) 이미지→영상으로 바꾸고 씬표에 적습니다.

f2v·r2v를 고른 씬은 끝 장면 이미지나 레퍼런스 이미지도 이미지 단계에서 같이 만들고, 사용자 확인 화면에 "첫·끝 프레임 영상: 시작 → 끝" 또는 "레퍼런스 영상: 레퍼런스 n장"처럼 도구와 준비한 이미지를 같이 보여 줍니다. 1번(앞 컷에서 이어짐) 씬은 앞 씬 영상이 나온 뒤에 만들어야 하니 씬 순서대로 하나씩 생성합니다. 크레딧은 도구마다 다르니 `get_credits({ plan })`에 씬별 도구를 넣어 견적을 냅니다.

## 8. 길이와 비트 맞추기

- 앱 영상 생성은 **4·6·8초**입니다. 씬 길이보다 한 단계 긴 길이로 만들고 `trimFrom`으로 잘라 씁니다. 생성 영상은 앞 0.3–0.5초가 정지에 가깝고 움직임은 중간에 크니, 씬의 중심 박에 움직임이 오도록 `trimFrom`을 고릅니다.
- 생성 영상이 씬보다 조금 길거나 짧으면(0.8–1.25배) 자르는 대신 재생 속도로 맞출 수 있습니다: 앱에서는 `update_clip { playbackRate: 원본 구간 ÷ 씬 길이 }`, ProjectJSON에서는 `timing.playbackRate`(`engine-recipes.md` §1). 끝 장면(첫·끝 프레임 영상의 끝 프레임)을 살려야 할 때 씁니다. 0.8배보다 느리면 움직임이 끊겨 보이니 더 긴 길이로 다시 만들거나 컷을 나눕니다. 슬로모션(0.5배)·빨리감기(2배)는 연출로 쓸 때만.
- 씬이 8초보다 길면 한 클립으로 늘리지 않고 컷을 나눕니다. 컷 지점은 `beat()`로 박(드롭 근처는 반박) 위에 둡니다.
- 생성은 크레딧이 큽니다. 핵심 씬 1–3개에만 쓰고 나머지는 이미지 + Ken Burns(`techniques.md` §3).
- `FOOTAGE`에 `gen`을 붙여 계획을 남깁니다(`templates/timeline.mjs` 예시). `build-project.mjs`가 `footage-plan.mjs`로 빈 구간, 길이 부족, 박에서 벗어난 컷, 프롬프트 문제를 경고합니다.

```js
{ src: "assets/gen/s3_hero_v1.mp4", type: "Video", from: beat(6), to: beat(14), size: [1080, 1920], trimFrom: 0.4, volume: 0,
  gen: { tool: "ai.video.imageToVideo", source: "assets/gen/s3_hero_still_v1.png", durationSec: 6, product: true, model: "veo3.1-lite",
         prompt: "Medium close-up product hero shot, single continuous shot, no cuts. ..." } }
```

파일 이름은 `s<씬>_<역할>_v<버전>` 식으로 짓고 원본은 덮어쓰지 않습니다.

## 9. 검수

생성본마다 사용자에게 보이기 전에 확인합니다. 영상은 첫 프레임만 보지 말고 **중간과 끝 프레임**을 봅니다(틀어짐은 보통 중간 이후에 나옵니다).

- 제품: 모양·색·로고·라벨이 원본과 같은가, 없던 구성품·글자가 생기지 않았나
- 인물: 얼굴·손가락·액세서리 위치, 시선·화면 방향이 앞 컷과 이어지나
- 카메라: 컷이 생기지 않았나, 끝 프레임이 안정적인가, 글자 자리가 비어 있나
- 화면: 뿌옇거나 어둡지 않나, 깜빡임(초당 3회 초과)이 없나
- 썸네일 크기와 원래 크기 두 번 봅니다

틀어지면 같은 프롬프트로 반복 생성하지 않고 원인 하나를 고칩니다(앵커 문구 보강, 동작 줄이기, 카메라 단순화). 같은 씬의 재생성은 두 번까지, 그 뒤에는 사용자에게 다른 레시피를 제안합니다.

## 10. 권리와 기록

- `CREDITS`에 AI 생성 소재를 적습니다: 파일, 도구, 모델, 생성일, 원본 사진(`footage-plan.mjs`의 `creditsLines()`).
- 효과·건강·비교·가격 주장은 생성 이미지로 보여 주지 않습니다(`copy.md` §7과 같은 기준).
- AI 생성 광고 표시 의무는 매체와 법무 기준을 따릅니다. 사용자에게 AI 생성 소재가 들어갔다는 것을 알립니다.
