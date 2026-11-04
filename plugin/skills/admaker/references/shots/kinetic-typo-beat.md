---
name: kinetic-typo-beat
한 줄: 짧은 단어 줄이 박마다 하나씩 꽂히고, 강조 줄 뒤로 색 띠가 깔리며, 다 나오면 전체가 한 번 눌렸다 펴짐
슬롯: 훅 · 상승부 · 엔드카드
에너지: 중고
길이: 박 × (줄 수 + 2–3), 120 BPM 3줄이면 2.5–3초
엔진: Text `gsapTimeline`(fromTo 슬램 · scaleX/scaleY 눌림 · elastic 복귀) + Shape rectangle `wipe`, `templates/shots/kinetic-typo-beat.mjs`
검증: 엔진 3.0.8 렌더 하니스(Preview 스틸 + Exporter mp4), `samples/motion-styles` 0–3.5초. 앱 불러오기 파일에 gsapTimeline·wipe가 그대로 실림(앱 화면 재생은 미확인)
---

## 의도
키네틱 타이포는 글자가 음악의 박을 대신 쳐 주는 샷입니다. "보고 · 반하고 · 가져라"처럼 리듬이 같은 짧은 줄 2–4개를 박에 하나씩 꽂아, 소리를 끄고 봐도 박자가 느껴지게 합니다. 핵심 한 줄만 색 띠로 강조합니다.

## 동작 핵심
- 줄마다 같은 클립 시작, 등장 시각은 tween `position`(박 번호 × 박 길이). `fromTo`라 그 전에는 투명하게 붙잡혀 있습니다(delay를 쓰지 않음, engine-recipes §2.6).
- 슬램: scale 1.7 · opacity 0 · blur 10 → 1, `power4.out` 0.16초. 이어서 scaleX 1.04 / scaleY 0.9로 0.05초 눌렸다 `back.out(3)`로 복귀.
- 다음 줄이 나올 때 이미 나온 줄은 scale 1.06으로 작게 펀치(박을 같이 침).
- 강조 띠: 강조 줄의 박에 클립을 시작하고 `wipe` right 0.22초. 띠 위 글자는 그림자 없이 흰색.
- 다 나온 다음 박: 모든 줄이 scaleY 0.86 / scaleX 1.05로 눌렸다 `elastic.out(1,0.45)`로 펴짐. 퇴장은 위로 90px, 줄마다 2프레임 차이.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 줄 수 | 3 (2–4) | 5줄 넘으면 박이 아니라 목록처럼 읽힘 |
| 줄 길이 | 영문 8자 / 한글 6자 이하 | 길면 `size`를 줄이기보다 문구를 줄임 |
| 글자 크기 | 150px (1080 폭) | 120 아래로 내리면 슬램 힘이 빠짐 |
| 줄 간격 `gap` | 190px | 띠 높이가 글자 1.55배라 150px 글자면 180 이상 |
| 박 `beat` | `timeline.mjs` `BEAT` | 140 BPM 넘으면 한 박 걸러 한 줄(2박) |
| hold | 2–3박 | 다 나온 뒤 읽을 시간. 엔드카드면 4박 |

## 사운드
줄마다 박에 킥 또는 짧은 hit. 다 나온 다음 박의 눌림에 스네어나 clap.

## 알려진 함정
- `from` 없이 `to`만 쓰면 등장 전 줄이 처음부터 보입니다. 등장 tween은 꼭 `from`/`to`를 같이 씁니다.
- 강조 띠는 마스크라 delay 전에는 다 보입니다. 띠 클립의 시작을 강조 줄의 박으로 둡니다(참조 구현이 그렇게 함).
- 한 광고에서 화면 전체 폭 띠는 한 번만. 매 줄 띠를 깔면 강조가 사라집니다.

## 참조 구현
`templates/shots/kinetic-typo-beat.mjs`. `props`: `{ at, beat, words: [...], accent: 강조 줄 번호(-1이면 없음), y, gap, size, hold, color?, barColor?, onBar? }` (좌표는 1080×1920 기준).
