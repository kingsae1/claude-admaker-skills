---
name: sizzle-hit
한 줄: 고기가 불판에 닿는 박에 바닥 소재가 확 당겨지고, 음식 둘레에서 김이 피어오르며 의성어 스티커가 기울어 꽂힘
슬롯: 훅·주인공 (음식 시즐 방향의 시그니처)
에너지: 중상
길이: 1.5–3초 (박부터 다음 컷까지)
엔진: 바닥 소재 keyframes(scale), Image(SVG 흐린 원) keyframes, Text(background·shadow) keyframes. `templates/shots/sizzle-hit.mjs`
검증: 엔진 3.0.28, 브라우저 Exporter 스틸·mp4 (`/mnt/project-files/samples/sizzle-hit/`, 임시 불판 소재)
---

## 의도
음식 광고의 1순위 장면은 "지글" 하는 순간입니다. 굽기·붓기·김이 오르는 바닥 소재를 그대로 주인공으로 두고, 모션그래픽은 그 순간을 박과 소리에 못 박는 일만 합니다. 고깃집·구이·치킨·국밥·분식처럼 조리 장면이 있는 업종의 훅이나 시그니처로 씁니다(`motion-directions.md` `food-sizzle`).

## 동작 핵심
- 박 `at`(소리 피크와 같은 프레임)에 바닥 소재가 0.12초 만에 1 → 1.07로 당겨지고, 다음 컷까지 1.1로 천천히 더 들어갑니다.
- 같은 박에 의성어 스티커(기본 "치익")가 1.7배·−14°에서 0.14초 만에 꽂히고, 남은 동안 박마다 1.06으로 살짝 떨립니다.
- 김: 흐린 흰 원 3개가 음식 자리(`steam`)에서 2·5프레임 시차로 피어올라 위로 흩어집니다. 불투명도 최대 0.55, 화면 전체가 아니라 음식 둘레에만.
- 메뉴명이 있으면 한 박 뒤 아래쪽에서 흰 알약으로 올라옵니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| punch | 1 → 1.07 (0.12초), 끝 1.1 | 1.12 넘으면 소재 화질이 무너짐 |
| 의성어 | 2–4자, 150px(1080 기준), −6° | 길면 스티커가 아니라 자막이 됨 |
| 김 | 3개, `steam.w` 400–700px, 최대 불투명도 0.55 | 더 짙거나 화면 전체로 퍼지면 소재가 뿌옇게 묻힘(Q11) |
| 메뉴명 | 2–10자, at + 1박 | 의성어와 동시에 나오면 시선이 갈라짐 |

## 소재
- 바닥은 실제 조리 영상(불판에 닿는 순간, 뒤집기, 소스 붓기)이 가장 좋습니다. 사진뿐이면 앱 이미지→영상으로 "meat lands on the hot grill, sizzling, smoke and steam rise, macro close-up, shallow depth of field, no text"처럼 만들고(`footage-gen.md`), 생성 영상 속 닿는 순간을 `at`으로 씁니다.
- 김은 그래픽이라 실제 연기가 이미 많이 보이는 소재면 `steam`을 작게(400px) 하거나 김 클립을 지웁니다.

## 사운드
`at`에 지글(sizzle) 효과음, 피크가 `at`과 같은 프레임에 오게 `sfx-peak.mjs`로 지연을 잽니다. 메뉴명 알약에는 짧은 pop. 음악은 이 박에 비워 두면 더 잘 들립니다(`sfx.md`).

## 알려진 함정
- `at`이 `footage` 소재 구간 밖이면 샷이 에러를 냅니다. 소재가 바뀌는 박에 걸치지 않게 합니다.
- 바닥 소재에 이미 Ken Burns가 걸려 있으면 punch가 그 위에 더해집니다(합성). 시즐 컷은 Ken Burns zoom을 1.03 이하로 둡니다.
- 의성어 스티커 색은 음식 색(주황·갈색)과 겹치면 묻히니, 브랜드 강조색이 비슷하면 `color`를 흰 글자가 읽히는 짙은 색으로 바꿉니다.

## 참조 구현
`templates/shots/sizzle-hit.mjs`. `props`: `{ at, to, footage, word?, label?, steam?: { x, y, w }, color?, font?, beat?, index? }`.

```js
{ card: "sizzle-hit", section: "hook", from: beat(1), to: beat(5),
  props: { at: beat(1), to: beat(5), footage: 0, word: "치익", label: "참숯 삼겹살", steam: { x: 540, y: 1180, w: 560 }, beat: BEAT } }
```
