---
name: hero-tilt-push
한 줄: 제품 화면 카드 하나가 기울어진 채 다가오다 정면으로 자리잡는다
슬롯: 주인공
에너지: 중 (질감 최고, 가장 느림)
길이: 3–4초
엔진: Image + keyframes(rotateY, rotateX, perspective, scale, y), dropShadow 필터, 배경 Backdrop
---

## 의도
제품의 "원자 단위"(대표 화면 하나)를 주인공으로 세웁니다. 오프닝 주인공은 하나(Q5), 완결된 동작 호.

## 동작 핵심
- 시작: rotateY −18°, rotateX 8°, scale 0.82, y +80, opacity 0 → 0.3초 안에 opacity 1
- 접근: 2초 동안 rotate가 0으로, scale 1.0으로 (`easeInOutQuart`)
- 자리잡음: 정면에서 ≥ 1초 정지. 이때 문구가 들어옴
- 그림자: dropShadow 하나로 떠 있는 느낌, 자리잡으면 그림자도 줄어듦

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 동작 호 | ≥ 3초 (15초 광고 ≥ 2.5초) | 짧으면 "PPT 전환"으로 보임(R3) |
| 기울기 | rotateY ≤ 18°, rotateX ≤ 10° | 더 크면 화면 글자가 안 읽힘(Q6) |
| perspective | 1200–1600 | 작을수록 왜곡이 심함 |
| 원본 해상도 | 최종 표시 크기의 2배 | 다가올 때 글자가 깨짐(Q2) |
| 정지 | 정면 도착 후 ≥ 1초 | 문구는 이 정지 안에서 |

## 사운드
접근 시작에 낮은 whoosh(길게), 정면 도착에 부드러운 착지음. 광효과를 쓰면 sparkle 한 번.

## 알려진 함정
- rotateX/Y와 scale을 다른 구간 이징으로 주면 도착 순간이 두 번 생김 → 같은 stop, 같은 이징
- 고객 데이터가 보이는 스크린샷 금지(Q1)
- 광효과(glow 스윕)는 이 카드에만, 둥근 모서리 안으로(Q4)

## 참조 구현
```jsonc
{ "type": "keyframes",
  "options": { "duration": 2300000, "delay": 0, "easing": "linear" },
  "params": {
    "0%":   { "rotateY": -18, "rotateX": 8, "perspective": 1400, "scale": 0.82, "y": 80, "opacity": 0, "easing": "easeOutCubic" },
    "13%":  { "opacity": 1 },
    "100%": { "rotateY": 0, "rotateX": 0, "perspective": 1400, "scale": 1, "y": 0 } } }
```
(`13%`에서 opacity만 끝나고, 나머지 속성은 0%→100% 한 구간입니다. 이징은 속성별로 다음 stop까지 적용됩니다.)
