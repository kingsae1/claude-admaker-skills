---
name: morph-reveal
한 줄: 광택 3D 오브젝트가 돌다가 납작해지며 브랜드 아이콘·로고 도형으로 바뀌고, 그 자리에 문구가 붙는다
슬롯: 주인공 | 엔드카드
에너지: 중고
길이: 2.5–4초
검증: 엔진 3.0.19 렌더 하니스 (three `morph` 장면, 구 → 큐브 → 평면 별 3단계, 클립이 끝나면 별도 사라지니 평면 뒤 이어 쓸 Shape를 같은 자리에 둠)
엔진: 앱 MCP `add_clip { type: 'Morph3D', stages | preset }` / 스킬은 three 어댑터 `morph-shapes` 장면(`gallery/kits/morph-3d-to-2d`)
---

## 의도
3D에서 2D로 "정리되는" 순간이 시그니처입니다. 제품 소재는 모양을 바꾸지 않고, **그래픽 도형(구·큐브·별·하트)이 브랜드 아이콘이 되는 것**만 모프합니다.

## 동작 핵심
- 단계 2–4개: 예) 구(candy) → 큐브(matte) → 평면 별(flat). 마지막이 `flat`이면 2D 도형 클립으로 넘겨받아(handoff) 이후는 일반 Shape처럼 움직입니다.
- 단계 전환은 박에 맞춥니다(`at`). 바뀌는 순간 큰 단어·번호가 같이 바뀌면 정보가 생깁니다(갤러리 morph-3d-to-2d).
- 3D 클립이 끝나면 평면 도형도 같이 사라집니다. 평면이 된 뒤에도 보여야 하면 같은 자리·크기·색의 Shape를 핸드오프 시각부터 이어 둡니다(앱 MCP `Morph3D`는 handoffClipIds로 자동).
- 평면이 된 뒤 0.3초 안에 로고·문구가 그 옆에 마스크 상승으로 붙고 ≥ 1초 정지.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 단계 수 | 2–4 | 많으면 정신없음 |
| 단계 길이 | 0.8–1.2초 (모프 0.3–0.5초) | 박 단위로 |
| 크기 | 화면 짧은 변의 40–60% | 작으면 질감이 안 보임 |
| 재질 | candy·chrome은 주인공 하나에만 | 광효과 규칙 Q4 |

## 사운드
모프마다 "뿅/쓱" 같은 짧은 변형음, 평면 도착에 탁.

## 알려진 함정
- 스킬 렌더 하니스에서는 three 장면 파일을 프로젝트 `scenes/`에 복사해야 합니다. 앱으로 보낼 때는 MCP `Morph3D` 클립을 쓰거나 영상으로 구워 넣습니다.
- 브랜드 로고 자체(복잡한 path)를 3D로 만들지 않습니다. 단순 도형 → 로고 옆 배치까지만.

## 참조 구현
```jsonc
// 앱 MCP (스킬 ProjectJSON은 { "type": "Adapter", "adapter": "three", "params": { "scene": "morph", "stages": [...] } })
{ "type": "Morph3D", "stages": [
  { "shape": "sphere", "color": "#FF5A36", "material": "candy" },
  { "shape": "cube", "color": "#2E2A80", "material": "matte", "at": 1.0, "morph": 0.4 },
  { "shape": "flat", "shapeType": "star", "shapeStyle": { "sides": 5, "innerRadius": 0.5 }, "color": "#FFD23F", "at": 2.0, "morph": 0.4 } ] }
```
