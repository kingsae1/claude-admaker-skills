# 효과음(SFX) 가이드

광고에서 효과음은 컷 전환, 제품 공개, 가격·CTA 같은 강조 순간을 귀로 짚어 줍니다. 효과음이 많으면 오히려 지저분해지니, 씬마다 0~1개를 기본으로 하고 피크 순간에만 겹칩니다.

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

- 좋은 예: `Short bright cartoon bubble pop, single hit, no music`
- 좋은 예: `Cinematic tension riser, rising synth sweep building to a hit, no drums`
- 나쁜 예: `광고에 어울리는 효과음`. 무슨 소리인지 정해지지 않아서 결과가 매번 달라집니다.

규칙:
1. 한 번에 소리 하나만 만듭니다. "whoosh then pop"처럼 두 소리를 이어서 쓰지 말고, 두 번 만들어 시각을 따로 둡니다.
2. 음악이 섞이면 안 되는 효과음은 `no music`을 붙입니다.
3. 상표·실존 제품의 소리(특정 기기 알림음 등)는 흉내 내게 하지 않습니다.
4. 사람 목소리는 내레이션(`ai.voice.generate`)으로 만듭니다. 박수나 군중 함성은 효과음으로 만들어도 됩니다.

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

BGM이 있으면 `run_studio_tool { toolId: 'audio.analyzeBeats' }`로 `suggestedCuts`와 `peaks`를 받습니다. 그다음 효과음의 `startSec`를 아래처럼 정합니다.
- 전환 whoosh는 컷 시각에서 0.15초를 뺀 시각에 둡니다.
- impact와 pop은 피크 시각에 정확히 맞춥니다.
- riser는 피크 시각에서 riser 길이를 뺀 시각에 시작해, 끝나는 순간이 피크에 오게 합니다.
