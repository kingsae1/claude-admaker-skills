---
name: hook-number-slam
한 줄: 화면을 채우는 큰 숫자 하나가 꽂히고, 작은 설명 한 줄이 뒤따른다
슬롯: 훅
에너지: 중상
길이: 1.2–1.8초
엔진: Text characterAnimation `slam`(숫자) + `line_rise`(설명), keyframes
---

## 의도
첫 1초에 시선을 잡습니다. 숫자는 질문 없이 바로 읽히는 훅입니다(예: "3초", "87%", "0원").

## 동작 핵심
- 숫자: `slam` 글자 단위, 프레임 높이의 30–45%, 강조 색 1개
- 착지 순간(약 0.35초) impact 1회. 이 광고의 화면 전체 충격 3회 중 1회를 여기에 쓸 수 있음
- 설명: 숫자 착지 0.15초 뒤 `line_rise` 줄 단위, 보조 크기(≥ 3%)

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 숫자 slam | duration 0.35초, stagger 0.05초, char | 0.25초보다 짧으면 읽히기 전에 지나감 |
| 설명 지연 | 숫자 착지 + 0.15초 | 동시에 나오면 시선이 갈라짐 |
| 홀드 | 설명 완료 후 ≥ 0.6초 | 훅은 짧지만 읽을 시간은 줘야 함 |
| 퇴장 | `blur_out` 0.2초 또는 다음 샷이 마스크로 덮음 | 퇴장은 입장보다 빠르게 |

## 사운드
숫자 착지에 impact(짧고 건조하게), 직전 4–6프레임 riser 꼬리 또는 무음. 설명에는 소리 없음.

## 알려진 함정
- 숫자 옆에 단위를 같은 크기로 붙이면 숫자가 약해짐 → 단위는 40–50% 크기
- 9:16에서 숫자가 오른쪽 세이프존(좋아요 버튼)에 걸리기 쉬움

## 참조 구현
```jsonc
// 숫자 텍스트 클립 (style은 참조 JSON의 Text style 사용)
"characterAnimation": [
  { "type": "slam", "duration": 0.35, "stagger": 0.05, "staggerMode": "char", "easing": "easeOutQuart" }
]
// 설명 텍스트 클립: timing.display.from = 숫자 from + 500000
"characterAnimation": [
  { "type": "line_rise", "duration": 0.4, "stagger": 0.08, "staggerMode": "line", "easing": "easeOutCubic" }
]
```
