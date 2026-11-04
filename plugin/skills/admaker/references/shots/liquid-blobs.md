---
name: liquid-blobs
한 줄: 광택 있는 액체 방울들이 부풀어 나와 일렁이며 서로 붙었다 떨어짐 (메타볼)
슬롯: 훅 · 주인공 배경 · 엔드카드
에너지: 저–중
길이: 3–6초 (계속 움직이므로 길이 제한 없음)
엔진: Adapter three 커스텀 씬 `liquid-blobs`(`templates/scenes/liquid-blobs.js`, three `MarchingCubes`), `templates/shots/liquid-blobs.mjs` (브라우저 렌더 전용)
검증: 엔진 3.0.8 렌더 하니스, `samples/motion-styles` 14–17.5초. 같은 시각 스틸 두 번 PNG 같음
---

## 의도
리퀴드 모션은 부드럽고 유기적인 톤(뷰티, 음료, 테크 브랜드 무드, 앱 런칭)에 씁니다. 방울은 브랜드 색 하나, 투명 배경으로 소재 위에 떠 있고, 문구는 엔진 Text로 따로 얹습니다(three.md §1).

## 동작 핵심
- `MarchingCubes`(해상도 64)에 방울 6개를 프레임마다 `addBall`로 다시 넣습니다. 방울끼리 가까우면 저절로 붙고 멀어지면 갈라집니다.
- 방울 위치 = 궤도 중심 + cos/sin(위상 + time × 속도). 배치·속도는 시드 RNG로 setup에서 한 번만 → 결정적.
- 등장: 방울마다 0–0.25초 늦게 세기가 `easeOutBack`으로 0 → 1 (부풀어 나옴).
- 재질: `MeshPhysicalMaterial` roughness 0.1 · clearcoat 1 · 약한 iridescence 0.15, `RoomEnvironment` 환경광(세기 0.6)이 반사를 만듦. 톤매핑 `NeutralToneMapping` exposure 0.95.
- 전체가 천천히 y축으로 ±0.25 라디안 흔들려 반사가 흐릅니다.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| count | 6 | 4–8. 많으면 한 덩어리로 뭉쳐 보임 |
| spread | 0.75 | 1이면 방울이 화면 가장자리에서 잘릴 수 있음 |
| speed | 1 | 0.6이면 느긋, 1.5면 끓는 느낌 |
| intro | 0.6초 | 엔드카드면 0.4 |
| color | `brand.colors.accent` | 진한 색일수록 광택이 잘 보임. 파스텔은 exposure를 0.85로 |
| box | 0, 260, 1080 × 1180 | 아래 30%는 문구 자리로 비움 |

## 사운드
낮은 앰비언트 패드, 방울이 붙는 순간마다 아주 작은 물방울 소리(과하면 장난스러움).

## 알려진 함정
- ACES 톤매핑은 진한 파랑을 보라·라벤더로 바래게 합니다. `NeutralToneMapping`을 씁니다.
- sheen을 크게 주면 방울이 플라스틱처럼 뿌옇게 보입니다.
- 앱 불러오기에서 빠집니다. 앱에서 고칠 광고면 이 클립만 투명 PNG 시퀀스나 영상으로 미리 렌더해 넣습니다(three.md §6).
- 해상도 64보다 낮추면 가장자리가 각져 보이고, 96 넘기면 렌더가 느려집니다.

## 참조 구현
`templates/shots/liquid-blobs.mjs` + `templates/scenes/liquid-blobs.js`를 프로젝트 `scenes/`로 복사. `props`: `{ at, dur, box?, color?, count?, seed?, intro?, speed?, spread?, title?, titleY?, titleAt? }`.
