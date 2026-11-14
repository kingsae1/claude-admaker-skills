---
name: variable-type-breath
한 줄: 굵은 단어 하나가 슬램으로 꽂힌 뒤 박마다 가변 폰트 폭·굵기·자간이 숨쉬고, 윤곽선 메아리가 위아래로 쌓였다가 이탤릭 돌출 글자로 바뀜
슬롯: 훅 · 상승부
에너지: 중고
길이: 2–2.5초 (슬램 0.3 + 숨쉬기 2–3박 + 바뀜 0.35 + 정지 0.5 이상)
엔진: Text `fontVariation` + `paint`(wdth·wght·letterSpacing), `stroke`만 있는 Text, `extrude`, `textPath` 배지 (엔진 3.0.25+)
검증: 엔진 3.0.25 렌더 하니스(Preview 스틸 + Exporter mp4), `samples/kinetic-reel` 2.5–5초
---

## 의도
글자 모양 자체가 박을 칩니다. 같은 단어가 좁아졌다 넓어지는 것만으로 리듬이 보여서, 타이포 쇼릴·폰트·브랜드 리뉴얼 광고의 훅에 맞습니다. 마지막에 성격이 다른 서체(이탤릭 세리프 + 입체 돌출)로 바꿔 "같은 말, 다른 목소리"를 보여 줍니다.

## 동작 핵심
- 슬램: keyframes `x` +1700 → 0, `motionBlur` 90 → 0, `easeOutExpo` 0.32초.
- 숨쉬기: 같은 클립에 `paint` 하나, 박 경계마다 stop. `wdth` 125 → 62 → 112 → 62, `wght` 900 ↔ 620, `letterSpacing` −6 → 30 → −2. 각 stop `easing: "easeInOutExpo"`(스냅 느낌).
- 메아리: 같은 문구·같은 `paint`를 붙인 윤곽선 글자(`color: "rgba(0,0,0,0)"`, `stroke` 1.5px) 4벌을 본 글자 ±250, ±500px에. 둘째 박에 위아래에서 밀려 들어오고 다음 박에 12% 더 벌어짐.
- 바뀜: 본 글자 `blur` 0 → 24, `scale` 0.9로 0.2초에 사라지고, 같은 자리에 이탤릭 세리프 소문자가 `scale` 1.35 → 1, `blur` 26 → 0(0.35초). `extrude: { depth: 34, angle: 52, color: 잉크 }`.
- 배지: 검은 원 + `textPath: { type: "circle", radius: 118, spread: true }` 글자를 원 위에, 클립 `angle` 0 → 140으로 천천히 돎. 가운데 장 번호.
- 왼쪽 아래 작은 정보 글자(`WDTH 125.0`)를 `countUp`으로 같은 박에 같이 굴림(구간마다 클립 하나).

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 글자 크기 | 330px (1920 폭) | wdth 125에서 화면 폭 90% 이하 |
| 축 범위 | wdth 62–125, wght 560–900 | 폰트 파일이 가진 범위 밖은 잘림. 범위가 좁은 폰트면 letterSpacing으로 보탬 |
| 숨쉬기 박 수 | 2–3 | 4박 넘으면 지루함 |
| 메아리 벌 수 | 4 (위 2 · 아래 2) | 6 넘으면 글자가 안 읽힘 |
| 돌출 depth | 28–40px | 60 넘으면 무겁고 렌더가 느려짐 |

## 사운드
슬램에 hit, 박마다 킥. 폭이 좁아지는 순간에 짧은 whoosh(역재생)를 얹으면 숨쉬는 느낌이 커집니다.

## 알려진 함정
- `fontUrl`이 가변 폰트가 아니면 축 애니메이션이 아무 변화가 없습니다(조용히 무시). Google Fonts 저장소의 `[wdth,wght].ttf`처럼 축 이름이 붙은 파일을 씁니다. css2 API가 주는 파일은 글자 범위로 쪼개져 있어 쓰지 않습니다.
- 축이 바뀌어도 상자 크기는 그대로입니다. `align: "center"`, 폭 = 화면 폭으로 두고 가장 넓은 순간이 들어가는지 스틸로 봅니다.
- 앱 불러오기에서는 `fontVariation`·`extrude`·`textPath`가 그려지지 않습니다(engine-recipes §3.0). 앱에서 고칠 광고면 영상으로 미리 렌더합니다.

## 참조 구현
`samples/kinetic-reel/build.mjs`의 `01 LETTER` 블록.
