# 영상 모델별 프롬프트

앱 AI로 영상을 만들 때 **어떤 모델이 받는지에 맞춰** 프롬프트를 다듬는 문서입니다. 공통 양식(Shot → Subject → Environment → Camera → Style → Keep → Avoid), 카메라 어휘, 일관성, 검수는 `footage-gen.md`가 기준이고, 여기는 그 위에 모델마다 다른 점만 적습니다.
모델은 기본적으로 Claude가 고르지 않습니다. 앱 기본 설정이나 관리자 설정이 정하고, Claude는 그 모델을 확인해 프롬프트를 맞춥니다. 사용자가 모델을 지정했을 때만 `model` 인자로 넘깁니다(§1.1).

## 1. 먼저 모델 확인

1. 영상 프롬프트를 쓰기 전에 `run_studio_tool { toolId: 'video.models' }`를 부릅니다(크레딧 없음). 도구마다 시도할 모델 순서(`models`)와 계열(`families`: veo·kling·omni·minimax·seedance), 모델별 능력(`capabilities`)이 나옵니다. `source: 'admin'`이면 관리자가 저장한 모델 하나만 쓰고 폴백하지 않습니다.
   - `capabilities`: `durations`(받는 길이, `values` 목록이나 `min`–`max`), `maxImageRefs`·`maxVideoRefs`(레퍼런스 상한), `aspectRatios`, `endFrame`(끝 프레임), `multiShot`(한 클립 여러 샷), `audio`(소리 생성). 길이·멀티샷은 **첫 모델** 능력 안에서 고릅니다. 폴백 모델은 앱 서버가 그 모델 범위로 맞춥니다. 능력이 비어 있는(`null`) 모델은 4·6·8초, 한 샷, 레퍼런스 3장으로 봅니다.
2. 순서에 모델이 둘이면 **첫 모델이 실패할 때 같은 프롬프트가 두 번째 모델로 갑니다.** 그래서 프롬프트는 두 모델이 모두 따를 수 있게 씁니다(§2).
3. 생성 결과의 `data.model`, `data.modelFamily`가 실제로 만든 모델입니다. 검수(§4)와 재생성은 이 계열 기준으로 하고, `FOOTAGE[].gen.model`과 `CREDITS`에 그대로 적습니다.
4. `video.models` 도구가 없는 앱 버전이면 아래 기본 순서로 보고, 결과에 모델이 없으면 기본 순서의 첫 모델로 기록합니다.

### 1.1 사용자가 모델을 지정할 때

1. `run_studio_tool { toolId: 'generation.models' }`(크레딧 없음)로 종류별 고정 provider, 자동 모델(`autoModel`), 고를 수 있는 모델(`models[].id`, 기본 옵션 크레딧)을 봅니다.
2. 생성 도구(`ai.image.generate`, `ai.image.edit`, `ai.video.generate`, `imageToVideo`, `regenerate`, `framesToVideo`, `referenceToVideo`)에 `model`로 그 id를 넘깁니다. 목록 밖 모델은 오류로 돌아옵니다. 비우면 자동(추천)입니다.
3. provider는 서비스 전체에 고정입니다. SUPER_ADMIN만 `provider` 인자(또는 `fal_veo3.1-lite` 같은 PROVIDER_모델 표기)로 다른 provider 모델을 씁니다. 일반 유저에게 provider를 바꿔 주겠다고 하지 않습니다.
4. 직접 고른 모델은 실패해도 다른 모델로 폴백하지 않습니다. 실패하면 사용자에게 다른 모델을 고를지 묻습니다. 크레딧은 모델마다 다르니 확인 화면에 고른 모델과 크레딧을 같이 보여 줍니다.

앱 기본 순서(관리자 설정이 없을 때):

| 도구 | 1차 | 실패하면 |
|---|---|---|
| `ai.video.generate` (글→영상) | Veo 3.1 Lite | 없음 |
| `ai.video.imageToVideo`, `ai.video.regenerate` | Veo 3.1 Lite | Kling 2.5 Turbo |
| `ai.video.framesToVideo` (첫·끝 프레임) | Veo 3.1 Lite | Kling 2.5 Turbo |
| `ai.video.referenceToVideo` (레퍼런스 1–3장) | Gemini Omni Flash 1.1 | MiniMax H3 |

사용자가 고르거나(§1.1) 관리자 설정으로 Seedance 2.5 같은 다른 모델이 들어올 수 있습니다. 위 표에 없는 계열(`other`)이면 공통 양식만 쓰고 모델별 보강은 넣지 않습니다.

## 2. 폴백에 안전하게 쓰기

- **핵심 세 문장을 앞에 둡니다.** 동작 하나, 카메라 하나, 끝 프레임. 어느 모델이 받아도 이 세 문장만 지키면 쓸 수 있는 클립이 나옵니다. 모델별 보강(빛, 렌즈, 질감)은 그 뒤에 붙입니다. 길이를 줄여야 할 때 뒤에서부터 잘려도 핵심은 남습니다.
- **Keep 줄과 Avoid 줄은 짧게.** 금지는 6개 안으로, 그 클립에서 실제로 틀어질 만한 것만 씁니다. 긴 금지 목록은 모델이 오히려 그 단어를 그립니다.
- **빈 형용사를 쓰지 않습니다.** `cinematic`, `epic`, `8k`, `masterpiece`, `ultra realistic`, `award-winning`은 화면을 정하지 못하고 모델마다 다르게 읽힙니다. 대신 빛 방향, 렌즈, 재질을 적습니다(`footage-gen.md` §6).
- **레퍼런스는 `{ref1}`, `{ref2}`로 가리킵니다.** `clipRefs` 순서와 같은 번호입니다. 앱이 보낼 때 그 모델 문법으로 바꿉니다(§3.3). 모델 문법(`<IMAGE_REF_0>`, `@Image1`)을 직접 쓰지 않습니다. 폴백하면 다른 모델이 받기 때문입니다.
- **영문 120단어 안팎.** 앱은 프롬프트가 너무 길다는 오류가 나면 다른 모델로 줄여서 다시 보냅니다. 줄이는 과정에서 Keep·Avoid가 빠질 수 있으니 처음부터 짧게 씁니다.

## 3. 계열별 공식

### 3.1 Veo (Veo 3.1 Lite, Veo 3.1) — 글→영상, 이미지→영상, 첫·끝 프레임의 기본

- `footage-gen.md` §2 공통 양식이 그대로 맞습니다. 서술형 문장을 잘 따르고 카메라 용어(`slow dolly-in`, `rack focus`, `arc a quarter turn`)를 정확히 읽습니다.
- 빛과 렌즈를 구체적으로 쓸수록 좋습니다: `soft key light from camera left, crisp rim light, about 85mm, shallow depth of field`.
- 소리를 같이 만들 수 있지만 `generateAudio`는 끄고 앱 BGM·효과음으로 맞춥니다(`director.md` §6). 대사·소리 묘사는 프롬프트에 넣지 않습니다.
- 이미지→영상은 이미지가 이미 정한 것(피사체, 색, 구도)을 다시 길게 쓰지 않습니다. 무엇이 움직이고 카메라가 어떻게 가는지만 씁니다.
- 첫·끝 프레임은 두 장 사이의 **움직임과 시간 흐름**만 씁니다("the light shifts from cool morning to warm afternoon while the camera arcs a quarter turn").

### 3.2 Kling (Kling 2.5 Turbo) — 이미지→영상·첫·끝 프레임의 폴백

- 짧고 동작 중심으로 읽습니다. 문장 하나에 동작 하나, 주어를 분명히("The bottle stays still; condensation runs down its side").
- 동작 세기를 말로 정합니다: `subtle`, `gentle`, `slow`. 세기를 안 쓰면 움직임이 커져 제품이 휘기 쉽습니다.
- 카메라는 한 가지, 기본형 용어만(`slow push-in`, `static camera`, `pan left`). 렌즈·초점 이동 같은 세부는 잘 안 따릅니다.
- 앞 핵심 세 문장만으로 Kling에서도 통하도록 쓰면 Veo 보강 문장은 뒤에 붙여도 괜찮습니다.

### 3.3 Gemini Omni (Gemini Omni Flash 1.1) — 레퍼런스→영상의 기본

- **레퍼런스마다 역할을 먼저 선언**하고 장면을 씁니다. 앱이 `{ref1}`을 `<IMAGE_REF_0>`(0부터)로 바꿉니다.

```text
{ref1} is the woman (face, hair, outfit). {ref2} is the product (shape, color, label).
In a sunlit kitchen, the woman from {ref1} picks up the product from {ref2} with her right hand and turns it so the label faces the camera.
Medium shot, single continuous shot, no cuts. Slow truck right, ending on a steady frame with the label centered and the top third clear.
Keep the face, outfit and the product's shape, color and label exactly as in the references. No text, no extra people.
```

- 자연스러운 문장을 잘 따르니 장면은 서술형으로. 길이는 `durations`(3–10초) 안에서 고릅니다.
- 화면 비율은 16:9와 9:16만 받습니다. 1:1·4:5 캔버스에서는 앱이 `auto`를 보내므로 가로나 세로 영상이 올 수 있습니다. 엔진에서 `fit: cover`·`focusY`로 잘라 쓰는 것을 전제로 중요한 것을 화면 가운데에 두고, 받은 뒤 `view_clip_media`로 잘린 구도를 확인합니다.

### 3.4 MiniMax (MiniMax H3) — 레퍼런스→영상의 폴백

- 앱이 `{ref1}`을 "reference image 1"처럼 말로 바꿉니다. 그래서 Omni용으로 쓴 역할 선언 문장이 그대로 뜻이 통하게 씁니다("{ref1} is the woman" → "reference image 1 is the woman").
- 주체는 1–2개, 동작은 시간 순서로 하나씩("first …, then …"), 장면은 짧게, 물리 디테일(천의 흔들림, 물방울, 반사)을 한 가지 강조합니다.

### 3.5 Seedance (Seedance 2.5) — 사용자가 고르거나 관리자 설정으로 쓸 때

- 앱이 `{ref1}`을 `@Image1`(1부터)로 바꿉니다. 레퍼런스 역할 선언은 Omni와 같은 방식으로 씁니다.
- 블록을 나눠 쓰면 잘 따릅니다: 주체 → 동작 → 장면 → 카메라 → 빛·스타일 → 제약.
- **한 클립 안의 여러 샷을 허용하는 계열입니다**(`capabilities.multiShot`). 씬표에서 한 씬이 짧은 컷 두세 개로 나뉘고 같은 인물·제품이 이어질 때만, 시간 구간을 적어 한 번에 만듭니다. 이때는 공통 양식의 "single continuous shot, no cuts" 줄을 빼고 구간마다 카메라를 씁니다.

```text
0–2s: close-up of {ref2} on a wooden table, steam rising, locked-off camera.
2–4s: medium shot, the woman from {ref1} lifts the cup with her right hand, slow push-in.
4–6s: close-up of her smile, the cup label facing the camera, camera holds steady; top third clear.
Keep the face, outfit and the product's shape, color and label exactly as in the references. No text, no extra people.
```

- 컷 지점은 박 위에 와야 하니 구간 경계를 씬표의 박(`beat()`)에 맞춰 적습니다. 한 구간은 1.5초 이상.
- 길이는 `durations`(4–30초) 안에서 씬 길이 그대로 줄 수 있습니다. 8초 넘는 한 호흡 씬을 한 번에 만들 때 씁니다(`footage-gen.md` §7.4). 길게 만들수록 크레딧이 늘어나니 확인 화면에 길이와 크레딧을 같이 보여 줍니다.

## 4. 증상별 고치기

생성본을 `footage-gen.md` §9대로 검수하고, 틀어졌으면 같은 프롬프트로 다시 돌리지 않고 아래에서 **한 가지**만 고칩니다. 같은 씬 재생성은 두 번까지입니다.

| 증상 | 흔한 원인 | 고칠 한 가지 |
|---|---|---|
| 제품 모양·라벨이 바뀜 | 동작이 제품에 걸림, 시작 이미지가 작거나 흐림 | 제품은 `stays still`로 두고 주변(빛·김·배경)만 움직임. 흐리면 `footage-gen.md` §4.1 보정부터 |
| 클립 중간에 컷이 생김 | 동작·카메라가 둘 이상, 장소 이동을 씀 | 동작 하나·카메라 하나로 줄이고 `single continuous shot, no cuts`를 첫 줄로 |
| 움직임이 거의 없음 | 세기·거리 없음, 끝 프레임 없음 | `about 15% closer over the whole clip`처럼 거리와 `ending on …` 추가 |
| 움직임이 과함, 흔들림 | 세기 미지정(특히 Kling), `dynamic` 같은 말 | `slow`, `subtle`, `locked-off`로 낮춤. `dynamic`, `fast` 삭제 |
| 인물 얼굴·옷이 바뀜 | 앵커 문구가 씬마다 다름, 레퍼런스 순서가 바뀜 | 같은 앵커 문구 복사, 레퍼런스는 얼굴 > 제품 순서 고정(`footage-gen.md` §7) |
| 레퍼런스 대신 엉뚱한 사람·물건 | 태그 없이 "the person"만 씀 | `{ref1} is …` 역할 선언을 첫 줄에 |
| 글자·로고가 생김 | 프롬프트에 문구·따옴표, `No text` 없음 | 문구 빼고 `No text, no new logos` 추가. 글자는 엔진으로 |
| 화면이 뿌옇거나 어두움 | `haze`, `fog`, `moody`, `dark` | 빼거나 `kept light so the scene stays clear`, 빛 방향을 씀 |
| 끝 프레임에 글자 자리가 없음 | 끝 구도 미지정 | `ending on … with the top third clear` |
| 첫·끝 프레임 사이가 녹아내림(모핑) | 두 이미지 차이가 너무 큼 | 두 이미지를 같은 원본에서 한 가지만 바꿔 다시 만듦 |
| 폴백 모델 결과만 이상함 | 모델별 보강 문장에 핵심이 섞임 | 핵심 세 문장을 앞으로, 보강은 뒤로(§2) |

고친 프롬프트와 이유는 씬표 원장(`footage-gen.md` §7 4번)에 한 줄로 남깁니다.

## 5. 씬표에 적을 것

씬표 `영상 도구` 칸 옆에 `모델` 칸을 두고 `video.models`에서 본 1차 모델(폴백 있으면 "Veo 3.1 Lite → Kling 2.5 Turbo")을 적습니다. 사용자 확인 화면에도 도구·모델·프롬프트 한글 요약·예상 크레딧을 같이 보여 줍니다. 생성 뒤에는 실제 모델(`data.model`)로 고칩니다.
