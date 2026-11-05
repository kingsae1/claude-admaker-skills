# 효과음(SFX) 가이드

광고에서 효과음은 컷 전환, 제품 공개, 가격·CTA 같은 강조 순간을 귀로 짚어 줍니다. 효과음이 많으면 오히려 지저분해지니, 씬마다 0~1개를 기본으로 하고 피크 순간에만 겹칩니다.

## 0. 소리를 어디서 가져오나 (고르는 순서)

위에서부터 처음 되는 것을 씁니다. 아래로 내려갈수록 품질이 떨어지거나 비용이 듭니다.

| 순서 | 소스 | 언제 | 비용 |
| --- | --- | --- | --- |
| 1 | 사용자가 준 효과음·라이선스 소재 | 받은 게 있으면 항상 먼저 | 없음 |
| 2 | 앱 Studio **오디오 → 효과음** 기본 라이브러리(휙, 팝, 딩, 라이저 등) | 앱이 있고 맞는 소리가 있을 때 | 없음 |
| 3 | 앱 AI 효과음 `ai.sfx.generate` (§1) | 앱 MCP가 연결되어 있고 1·2에 맞는 소리가 없을 때. 동작 재질의 소리(셔터, 종이, 유리잔)도 여기서 만듭니다 | 크레딧 |
| 4 | `templates/gen-audio-kit.mjs` 합성 키트 | **앱 MCP가 없을 때만**. 납품 시 "합성 임시음"이라고 알리고 교체를 권합니다(aesthetic-rules S7) | 없음 |

- 앱이 연결되어 있는데 gen-audio-kit으로 바로 가지 않습니다. 합성 키트는 whoosh·impact·riser·tick·click 다섯 가지 단순한 음색뿐이라 광고 품질의 기본값이 아닙니다.
- 외부 효과음 API·MCP 서버(ElevenLabs MCP 등)를 따로 설치하거나 API 키를 받아 부르지 않습니다(SKILL.md: 과금, 키 노출). 앱의 `ai.sfx.generate`가 같은 생성 서버를 씁니다.
- 앱 없이 만든 광고를 나중에 앱에서 열 때는 §6 표의 프롬프트로 합성음을 같은 이름의 AI 효과음으로 바꿀 수 있습니다.

## 1. 만드는 방법

MCP에서는 `run_studio_tool`로 만듭니다 (MCP 없이 스킬만 쓰면 Studio 왼쪽 **오디오 → 효과음** 탭에서 같은 값으로 만듭니다).

```json
{ "toolId": "ai.sfx.generate",
  "params": { "prompt": "fast airy whoosh transition, no music", "durationSec": 1.2, "startSec": 3.8 } }
```

| 파라미터 | 값 | 설명 |
| --- | --- | --- |
| `prompt` | 영문 문장 (필수) | 무슨 소리인지와 질감을 씁니다. 사용자에게는 한 줄 한글 요약을 붙여 보여 줍니다 |
| `durationSec` | 0.5~30 | 생략하면 프롬프트를 보고 길이를 정합니다. 짧은 효과음은 길이를 정해 주는 편이 정확합니다 |
| `loop` | true/false | 빗소리·군중·환경음처럼 깔아 두는 소리를 끊김 없이 반복하게 만듭니다 |
| `startSec` | 타임라인 초 | 소리가 시작될 시각입니다. 전환 효과음(whoosh)은 컷보다 0.1~0.2초 먼저 시작해야 컷에 맞게 들립니다 |

- 크레딧을 쓰므로 먼저 `get_credits`로 예상 비용을 알리고, 사용자가 확인한 뒤에 실행합니다. 결과의 `credits.spent`와 `credits.after`도 알립니다.
- 결과 `data.clipId`로 `update_clip`을 호출해 볼륨(`volume`)과 길이를 다듬습니다. 효과음은 BGM보다 조금 크고 내레이션보다는 작게 둡니다. BGM과 내레이션 사이 정도가 기본입니다.
- 생성 서버는 ElevenLabs Sound Effects(v3)를 기본으로 씁니다. 한 번에 최대 30초까지 만들 수 있습니다.
- Studio 왼쪽 **오디오 → 효과음** 탭의 기본 라이브러리(휙, 팝, 딩, 라이저 등)에 맞는 소리가 있으면 생성하지 않고 그 소리를 쓰라고 사용자에게 권할 수 있습니다. 라이브러리 소리는 크레딧을 쓰지 않습니다.

## 2. 프롬프트 쓰는 법

공식은 **소리 이름 + 질감·크기 + 길이감 + 빼야 할 것** 입니다.

- 좋은 예: `Crisp soft UI pop, single short hit, starts immediately, no music`
- 좋은 예: `Cinematic tension riser, rising synth sweep building to a hit, no drums`
- 나쁜 예: `광고에 어울리는 효과음`. 무슨 소리인지 정해지지 않아서 결과가 매번 달라집니다.

규칙:
1. 한 번에 소리 하나만 만듭니다. "whoosh then pop"처럼 두 소리를 이어서 쓰지 말고, 두 번 만들어 시각을 따로 둡니다.
2. 음악이 섞이면 안 되는 효과음은 `no music`을 붙입니다.
3. 상표·실존 제품의 소리(특정 기기 알림음 등)는 흉내 내게 하지 않습니다.
4. 사람 목소리는 내레이션(`ai.voice.generate`)으로 만듭니다. 박수나 군중 함성은 효과음으로 만들어도 됩니다.
5. 음색은 광고 어휘를 따릅니다(aesthetic-rules S1). `cartoon`, `8-bit`, `arcade`, `game`, `boing` 같은 게임·카툰 음색 낱말은 쓰지 않습니다. 실제 사물의 소리(셔터, 스위치, 종이, 유리잔)는 좋습니다.
6. 타격음(impact, pop, click, ding)은 `single hit, starts immediately`를 붙여 앞 무음을 없앱니다. 그래야 시작 시각 = 피크 시각으로 놓을 수 있습니다(§5).
7. riser처럼 끝이 정점인 소리는 `builds up and peaks at the very end`, whoosh는 `passes by quickly`처럼 정점이 어디인지 적습니다.

## 3. 광고 순간별 추천

| 순간 | 소리 | 프롬프트 예 | 길이 |
| --- | --- | --- | --- |
| 컷 전환·슬라이드 | whoosh / swipe | `Fast clean whoosh transition, airy swish passing by, no music` | 0.8~1.2 |
| 텍스트·아이콘 등장 | pop / click | `Crisp UI pop, short and soft, single hit` | 0.5 |
| 제품 공개 | sparkle / impact | `Magical sparkle shimmer, product reveal` 또는 `Deep cinematic impact boom with sub bass` | 1.5~2 |
| 피크 직전 긴장 | riser | `Cinematic tension riser building up to a hit, no drums` | 2~4 |
| 가격·할인 | cash register / ding | `Cash register ka-ching, coins, sale sound` | 1~1.5 |
| CTA·완료 | success chime | `Positive success chime, two rising bright notes` | 1~1.5 |
| 배경 환경음 | ambience (loop) | `Light cafe ambience, soft chatter and cups, no music` + `loop: true` | 5~10 |

## 4. 비트에 맞추기

BGM이 있으면 `run_studio_tool { toolId: 'audio.analyzeBeats' }`로 `suggestedCuts`와 `peaks`를 받습니다. 맞출 목표 시각(컷, 피크, 착지 프레임)을 정한 뒤 시작 시각은 늘 같은 식으로 구합니다.

**`startSec` = 목표 시각 − 피크 지연** (피크 지연 = 파일 시작부터 소리가 가장 큰 순간까지, §5)

피크 지연을 아직 못 쟀을 때의 임시값입니다.
- 전환 whoosh: 0.15초 (짧은 whoosh는 가운데쯤이 정점입니다).
- impact, pop, click: 0초 (`starts immediately`로 만들었을 때). 그래도 시각 착지보다 2–3프레임 먼저 들리는 쪽이 맞아 보입니다(aesthetic-rules S5).
- riser: riser 길이 전체. 끝나는 순간이 피크에 옵니다.

## 5. 피크 지연 재기 (`templates/sfx-peak.mjs`)

생성 효과음은 같은 프롬프트라도 정점 위치가 매번 다릅니다. 파일이 손에 있으면(사용자 소재, 합성 키트, 내려받은 AI 효과음) 재서 씁니다. ffmpeg가 필요합니다.

```bash
node <이 스킬 폴더>/templates/sfx-peak.mjs sfx/*.wav --out sfx/PEAK.json --sfx sfx.json
```

- 파일마다 피크 시각·시작 무음(onset)·길이·피크 dBFS를 출력합니다. `--out`은 `{ 파일 이름: 피크 지연(초) }`를 gen-audio-kit의 `PEAK.json`과 같은 모양으로 합쳐 쓰고, `--sfx`는 `sfx.json`에서 파일이 같은 줄의 `peakLagMs`를 채웁니다.
- 타격음 앞에 0.15초가 넘는 무음이 있으면 경고합니다. 프롬프트에 `starts immediately`를 넣어 다시 만들거나, `trim`으로 앞을 잘라 씁니다.
- 앱에서 바로 타임라인에 넣은 AI 효과음은 파일을 따로 재지 않아도 됩니다. §2 규칙 6·7대로 만들고 §4 임시값으로 놓은 뒤 미리보기로 듣고 `update_clip`으로 2–3프레임씩 당기거나 밉니다.
- 타임라인이 바뀌면(aesthetic-rules S3) 목표 시각만 다시 구하고 피크 지연은 그대로 씁니다.

## 6. 합성 키트를 AI 효과음으로 바꾸기

gen-audio-kit 파일 이름과 1:1로 맞춘 프롬프트입니다. 앱이 생기면 이 프롬프트로 만들고 `sfx.json`의 같은 줄 파일만 바꿉니다. 길이는 합성 키트와 같게 두면 피크 지연 임시값도 비슷하게 유지됩니다.

| 키트 파일 | 프롬프트 | `durationSec` |
| --- | --- | --- |
| `whoosh_a.wav` | `Fast clean airy whoosh passing by quickly, cinematic transition, no music` | 0.5 |
| `whoosh_b.wav` | `Short bright swish, quick camera swipe, no music` | 0.5 |
| `impact.wav` | `Deep cinematic impact hit with sub bass thump, single hit, starts immediately, no music` | 1 |
| `riser.wav` | `Cinematic tension riser, rising synth sweep that builds up and peaks at the very end, no drums, no music` | 2 |
| `tick.wav` | `Tiny crisp mechanical tick, single hit, starts immediately` | 0.5 |
| `click.wav` | `Soft clean UI button click, single hit, starts immediately` | 0.5 |
| `bed.wav` | 효과음이 아니라 BGM입니다. 앱에서는 `ai.bgm.generate`로 만듭니다 | — |
