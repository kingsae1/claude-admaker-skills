# 내레이션 대본과 오디오 태그

admaker의 내레이션(TTS)은 ElevenLabs v3/v4 모델로 만듭니다. 이 모델은 대본 안의 **대괄호 영문 태그**(`[excited]`, `[short pause]`)를 읽지 않고, 감정·말투·쉼·호흡 지시로 씁니다. 태그를 잘 쓰면 같은 문장도 광고답게 살아납니다. 반대로 목록에 없는 태그를 지어내면 그대로 읽힐 수 있습니다.

MCP에서는 `ai.voice.generate { text, voiceId, startSec }`의 `text`에 태그를 넣습니다. 앱(Planner·Quick·Studio)의 입력창에서는 `[`를 치면 같은 목록이 뜹니다. 한국어 화면에서는 `[신남]`처럼 한글 이름으로 보이지만, 실제로 API에 들어가는 값은 영문 태그입니다.

## 1. 규칙

1. **태그는 영문, 대괄호 안에, 아래 목록에서만 고릅니다.** 한글 이름(`[신남]`)으로 써도 앱이 영문으로 바꿔 주지만, MCP에서는 영문으로 씁니다.
2. **문장당 0~2개만 넣습니다.** 태그를 늘린다고 연기가 좋아지지 않고, 오히려 발음이 흔들립니다. 감정 태그는 문장 맨 앞에, 반응·쉼 태그는 그 일이 일어나는 자리에 둡니다.
3. **목소리와 어울리게 고릅니다.** 차분한 목소리에 `[shouts]`를 넣거나 들뜬 목소리에 `[whispers]`를 넣으면 잘 안 됩니다. `list_voices`의 목소리 성격을 먼저 봅니다.
4. **쉼은 태그보다 문장부호가 먼저입니다.** 쉼표·마침표·말줄임표(…)로 리듬을 만들고, 꼭 끊어야 할 곳에만 `[short pause]`(약 0.5초)를 넣습니다. `[long pause]`는 광고 길이를 잡아먹으니 거의 쓰지 않습니다. SSML `<break>`는 지원하지 않습니다.
5. **자막에는 태그를 넣지 않습니다.** 자막은 태그를 뺀 문장만 씁니다(앱도 자막에서 태그를 지웁니다).
6. **길이 계산에서 태그는 빼고 셉니다.** 한국어는 1초에 약 6~7자입니다. 쉼 태그는 0.5~1.5초를 더합니다.
7. **광고에 맞지 않는 태그는 근거가 있을 때만 씁니다.** 슬픔·분노·울먹임은 공익·감성 광고 같은 분명한 이유가 있을 때만 씁니다. 총성·폭발 같은 효과음 태그는 목록에 없으니 쓰지 않습니다. 효과음이 필요하면 `ai.sfx.generate`로 따로 만듭니다.

## 2. 광고에서 자주 쓰는 조합

| 자리 | 태그 | 예 |
|---|---|---|
| 훅 질문 | `[curious]` | `[curious] 아직도 줄 서서 드세요?` |
| 혜택·오픈·이벤트 | `[excited]` | `[excited] 오늘 단 하루, 전 메뉴 반값!` |
| 한정·비밀 | `[whispers]` | `[whispers] 단골만 아는 메뉴가 있어요.` |
| 가격 강조 직전 | `[short pause]` | `단돈 [short pause] 9,900원.` |
| 음식·향 | `[inhales deeply]`, `[gulps]`, `[sighs]` | `[inhales deeply] 이 냄새, 참을 수 있어요?` |
| 프리미엄·병원·금융 | `[Quiet, measured narration]` | `[Quiet, measured narration] 오래 머물수록 더 편안해집니다.` |
| 분식·디저트·팝 | `[Quick, light, playful pace]` | `[Quick, light, playful pace] 바삭, 쫀득, 달콤!` |
| CTA 앞 고조 | `[Gradually building energy]` | `[Gradually building energy] 지금 바로, 가까운 매장에서 만나요!` |
| 바·고깃집 무드 | `[low, gravelly voice]` | `[low, gravelly voice] 오늘 밤은 여기서.` |
| 웃음·여유 | `[chuckles]`, `[laughs]` | `[chuckles] 한 번 오면 또 오게 될걸요.` |

## 3. 전체 태그 목록

| 묶음 | 영문 태그 (한국어 화면 이름) |
|---|---|
| 감정 | `happy`(기쁨) `excited`(신남) `curious`(궁금함) `surprised`(놀람) `thoughtful`(생각에 잠김) `calm`(차분함) `mischievously`(장난스럽게) `awe`(감탄) `sarcastic`(비꼬듯) `worried`(걱정) `tense`(긴장) `frustrated`(답답함) `annoyed`(짜증) `tired`(지침) `sad`(슬픔) `angry`(화남) `crying`(울먹임) |
| 말투·템포 | `whispers`(속삭임) `softly`(부드럽게) `quietly`(조용히) `shouts`(외침) `booming`(우렁차게) `slowly`(천천히) `rushed`(다급하게) `drawn out`(길게 끌며) `cheeky`(능청스럽게) `dismissive`(시큰둥하게) `cautiously`(조심스럽게) `hesitant`(머뭇거리며) `stammer`(말 더듬기) `dry`(건조하게) `Quiet, measured narration`(차분한 내레이션) `Quick, light, playful pace`(경쾌한 템포) `Gradually building energy`(점점 고조) `low, gravelly voice`(낮고 거친 목소리) |
| 쉼 | `short pause`(짧은 쉼) `pause`(쉼) `long pause`(긴 쉼) |
| 반응·호흡 | `laughs`(웃음) `chuckles`(키득) `big laugh`(크게 웃음) `sighs`(한숨) `gasps`(헉) `happy gasp`(기쁜 탄성) `inhales deeply`(깊은 들숨) `exhales`(숨 내쉼) `clears throat`(목 가다듬기) `gulps`(꿀꺽) `swallows`(침 삼킴) `woo`(우후) |
| 억양·캐릭터 | `sings`(노래하듯) `pirate voice`(해적 목소리) `British accent`(영국 억양) `strong American accent`(미국 억양) `strong French accent`(프랑스 억양) |
| 효과음 | `applause`(박수갈채) `clapping`(박수) |

출처: ElevenLabs [Audio Tags 101](https://elevenlabs.io/blog/v3-audiotags), [Text to Speech best practices](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices). 앱 목록과 같은 내용입니다(admaker `voice-tag-catalog.ts`). 한쪽을 고치면 다른 쪽도 같이 고칩니다.

## 4. 자가검사

- 태그가 모두 위 목록에 있고 영문인가요?
- 문장마다 태그가 2개 이하인가요?
- 태그를 뺀 글자 수가 씬 길이(초 × 6~7자) 안에 들어가나요?
- 자막에 태그가 섞여 있지 않나요?
