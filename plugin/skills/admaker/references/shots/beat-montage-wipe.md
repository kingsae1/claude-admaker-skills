---
name: beat-montage-wipe
한 줄: 소재 한 컷마다 라벨 pill과 두 줄 제목이 올라오고, 컷 사이를 투톤 사선 띠가 가로질러 덮음
슬롯: 상승부
에너지: 중고
길이: 블록당 k박 (0.8–1.4초, 드롭 직전 두 블록은 반 길이)
엔진: FOOTAGE(Image/Video + Ken Burns), Shape `gradient`, Shape `pill`, Text keyframes, Shape keyframes(x) 18° 회전
검증: 앱 v0.12.1 미리보기 (지니TV 모든G 15초 9x16). Exporter 렌더 전
---

## 의도
장르·기능을 빠르게 나열하는 상승부입니다. 바뀌는 것은 바닥 소재(사용자 영상·이미지)이고, 그래픽은 같은 자리에서 리듬만 만듭니다. 와이프가 컷을 가려서 같은 틀에 글자만 바뀌는 슬라이드 느낌(Q16)을 피합니다.

## 동작 핵심
- `presets/fast-montage.mjs`가 블록마다 `from`/`to`(k박), `wipeAt`(컷 5프레임 전)을 채우고, `FOOTAGE`에 블록별 소재를 넣습니다.
- 소재는 프레임을 꽉 채우고 Ken Burns(x 0↔−24, scale 1↔1.1)로, 컷마다 방향을 바꿉니다(`build-project.mjs`의 `kenBurns`).
- 아래 43%에만 글자 띠 그라데이션(투명 → 0.9 검정)을 깔아 위쪽 소재는 그대로 보입니다.
- 라벨(230×64 pill + 34px)은 컷과 함께, 제목(100px 두 줄)은 4프레임 뒤에 올라옵니다.
- 와이프: 900×2600 띠 2장, 18° 회전, x −1700 → 1700, 0.3초 `easeInOutCubic`. 두 번째 색은 2프레임 늦게. 화면을 가장 많이 덮는 순간이 컷입니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 컷 길이 | k = round(1.2초 ÷ 박), 0.8–1.4초 | 140BPM 3박, 100BPM 2박 |
| 와이프 | 0.3초, 컷 5프레임 전 시작, 색 2개 2프레임 차 | 0.4초 넘으면 컷보다 와이프가 주인공이 됨 |
| 라벨 | y 20→0 + blur 6, 0.3초 | 3–5자 |
| 제목 | y 50→0 + blur 6, 0.4초 `easeOutExpo`, 컷 +4프레임 | 컷 길이 1초면 4–5자. 프리셋이 길면 경고 |
| 글자 띠 | 아래 820px, `gradient` 0 → 0.82 → 0.9 | 글자 띠에만. 화면 전체로 넓히지 않음(Q11) |

## 사운드
와이프마다 짧은 whoosh(2개 교대), 라벨 착지에 작은 틱. 드롭 직전 반 길이 블록에서 riser.

## 알려진 함정
- **그라데이션은 `style.gradient`.** 실제 광고는 `style.fill`에 `linear-gradient(...)`를 넣었습니다. 엔진은 `fill`을 색으로만 읽어서 단색 면(대개 검정)으로 그려집니다. `validate.mjs`가 오류로 잡습니다.
- **pill은 클립 최상위 `shapeType`.** `style.shapeType`에 넣으면 사각형입니다. 서버 내보내기도 둥글게 나오도록 `borderRadius = 높이 ÷ 2`를 같이 적습니다.
- 실제 광고는 컷 간격이 1.3초(120BPM에서 2.6박)라 컷이 박에서 밀렸습니다. 컷 시각은 프리셋이 정하게 둡니다.
- 트랙 이름은 ASCII(`gfx1`, `copy1`, `wipe1`). 한글 이름은 앱에서 겹쳐 클립이 빠질 수 있습니다(engine-recipes §9).

## 참조 구현
`templates/shots/beat-montage-wipe.mjs`. `props`: `{ index, label, title, wipeAt }`.
```jsonc
// 와이프 띠 (transform: x 90, y −340, 900×2600, angle 18)
{ "type": "keyframes", "options": { "duration": 300000, "delay": 0, "easing": "linear" },
  "params": { "0%": { "x": -1700, "easing": "easeInOutCubic" }, "100%": { "x": 1700 } } }
```
