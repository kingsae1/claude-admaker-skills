---
name: transition-scribble-cover
한 줄: 굵은 마커 획이 지그재그로 화면을 칠해 덮고, 같은 획 자국을 따라 다음 장면이 긁혀 드러남
슬롯: 전환
에너지: 중
길이: 0.36초 덮기 + 0.32초 드러내기
엔진: Shape path + stroke + `strokeDraw`, 트랙 매트(`alphaInverted`, 엔진 3.0.13+). `templates/shots/transition-scribble-cover.mjs`
검증: 엔진 3.0.19, 브라우저 Exporter mp4 (`samples/seams`)
---

## 의도
손그림 톤(`hand-drawn-emphasis`, `handwritten-title`, 키즈·수제·SNS)의 광고에서 커버 전환 대신 씁니다. 커버(`transition-cover-flood`)와 같은 자리지만 손이 칠한 느낌입니다.

## 동작 핵심
- 덮기: 화면 높이를 rows줄로 나눈 지그재그 한 획. 굵기는 줄 간격의 1.45배라 틈 없이 덮이고, `roughenPath`로 가장자리가 흔들립니다. `strokeDraw` `easeInCubic`.
- 컷 앞뒤 1프레임은 꽉 찬 색 사각형(획 사이 틈 방지).
- 드러내기: 색 사각형에 같은 지그재그 획을 트랙 매트(`alphaInverted`)로 다시 그려, 획이 지나간 자리부터 다음 장면이 보입니다. `strokeDraw`를 앞으로만 쓰므로 앱에서도 같게 보입니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| rows | 6 | 4면 굵고 거침, 8이면 촘촘하고 느려 보임 |
| grow / clear | 0.36 / 0.32초 | 0.5초 넘으면 늘어짐 |
| color | 브랜드 강조색 | 다음 장면 첫 색과 다른 색 |

## 사운드
마커 긁는 소리(덮기), 짧은 종이 소리(드러내기).

## 알려진 함정
- 흰색·밝은 노랑은 소재가 밝을 때 경계가 안 보입니다.
- 매트 클립(`scribble<N>_eraser`)이 대상보다 짧으면 대상이 사라집니다. 샷이 같은 길이로 만듭니다.
- 클립 id가 있어야 매트가 찾습니다. `build-project.mjs`가 키를 id로 적습니다.

## 참조 구현
`templates/shots/transition-scribble-cover.mjs`. `props`: `{ at, color?, rows?, grow?, clear?, seed? }`.
