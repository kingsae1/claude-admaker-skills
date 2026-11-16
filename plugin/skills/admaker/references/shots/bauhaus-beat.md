---
name: bauhaus-beat
한 줄: 바우하우스 기본 도형 칸이 박마다 튀어나오고 90°씩 돌며 가장자리 L자 격자·발판·셔터를 만들고, 글자는 도형 받침 위에 착지한다 (플래너 "도형" 그룹 6씬)
슬롯: 훅 · 주인공 · 상승부 · 엔드카드
에너지: 고
길이: 씬당 4박 또는 8박 (128 BPM 1.88 / 3.75초)
엔진: Shape `path`(원·반원·사분원·삼각·사각) + `gsapTimeline`(`back.out`·`back.inOut`·`expo`) — 코드 씬·3D 없음
검증: 엔진 3.0.24 렌더 하니스, admaker 앱 Planner 템플릿 42 도형(6씬)으로 내보냄
---

## 의도
[bauhaus-grid-flip](bauhaus-grid-flip.md)의 2D 부분만 떼어 **플래너 템플릿으로 그대로 가는** 빠른 템포 버전입니다. 3D 블록(`depth-blocks`)은 코드 씬이라 앱 플래너에서 빠지므로 쓰지 않습니다. 도형은 가장자리와 글자 받침에만 두고 가운데는 비워 소재가 보이게 합니다(덮는 순간은 포인트 씬 2박뿐).

## 씬 6개 (`props.scene`)
| scene | 박 | 움직임 | 필드 | 나갈 때 |
|---|---|---|---|---|
| opening | 8 | 왼쪽 5칸 + 아래 11칸 L자 격자가 왼쪽 아래 모서리부터 0.035초 간격으로 튀어나옴, 2·4·6박에 25% 칸 90° 회전, 5.5박 파란 반원 솟고 6박 상호 슬램, 태그라인 띠 | `store_name`, `tagline` | `am-card-swap` 0.4 |
| main | 4 | 노란 원(빨간 사분원 표시)이 오른쪽에서 굴러와 멈추고 1박에 단어 슬램, 2·3박 펀치, 왼쪽 아래 작은 칸 3개 박마다 회전 | `menu_name_1` | `am-push` 0.35 (왼쪽으로 12% 빠짐) |
| point | 4 | 빨강·파랑 반원 판이 양쪽에서 닫혀 2박 덮고 노란 원 위 배지 슬램, 2.5박에 열림 | `badge` | `am-cut-curve` 0.35 |
| showcase | 8 | 사각·삼각·원 발판과 메뉴 이름이 1·3·5박에 위에서 떨어지고 이후 박마다 발판 90° | `menu_name_1–3` | `am-zoom-blur` 0.35 (1→1.2 커지며 사라짐) |
| detail | 4 | 사분원 4개가 화면 모서리에서 돌아 들어와 어긋난 프레임, 크림 띠 위 위치, 2박 함께 회전 | `location` | 그룹 대표 `am-card-swap` 0.4 |
| closing | 8 | 크림 판 + 도형 칸 8개, 로고(0.5박) → 상호(1.5박) → CTA(2.5박) → 전화(3박), 4박 드롭에 전부 회전·판 튐, 이후 정지 | `logo`, `store_name`, `cta`, `phone` | (끝) |

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 칸 | 180px (1920 폭) | 160–200. 작으면 장식처럼 보이고 크면 소재를 가림 |
| 입장 | `back.out(2.2)` 0.32초, 칸 간격 0.035초 | fast 등급(interludes.md §2) |
| 회전 | 90°, `back.inOut(1.6)` 0.32초, 박 위 | 한 박에 25% 칸 이하 |
| 퇴장 | 씬 끝 − 전환 길이 − 0.3초에 시작, 0.22–0.25초 | 전환 전에 끝나야 함 |
| 색 | 빨강 `#E63B2E` · 파랑 `#1F4FD8` · 노랑 `#F5C518` · 먹 `#1A1A1A` · 크림 `#F2EDE2` | 앱 주 컬러 기준색은 빨강·파랑(`--colors`) |
| 글꼴 | 굵은 한글 고딕 한 가지 | 앱으로 낼 때 `--font NotoSansKR-Black.ttf` (Paperozi 굵은 파일은 앱 레지스트리에 없음) |

## 만들기
```sh
# timeline.mjs: 128 BPM, SECTIONS = 박 0·8·12·16·24·28·36, SHOTS = 씬마다 { card: "bauhaus-beat", props: { scene, beat, out, text } }
node build-project.mjs --size 1920x1080 --look off
node render/render.mjs project.json out/ad.mp4
node to-admaker-import.mjs project.json admaker-import.json
node to-admaker-template.mjs project.json admaker-import.json 42-1_도형_오프닝-1.json \
  --from 0 --to 3.75 --group 도형 --name 오프닝-1 --beats 8 --bpm 128 \
  --scene-transition am-card-swap:0.4 --colors "#E63B2E,#1F4FD8" --font NotoSansKR-Black.ttf --desc "…"
```

## 주의
- 템플릿 박 수(`--beats`)를 꼭 적습니다. 앱은 BGM을 만든 뒤 이 값을 보고 씬 경계를 박에 맞춥니다(앱 `planSceneBeatSnap`). 없으면 씬 길이에 비례해 늘어난 모션이 박에서 밀립니다.
- `gsapTimeline`의 `from`은 그 위치 전까지 유지됩니다. 늦게 들어오는 요소는 `from`에 `scale: 0`이나 `opacity: 0`을 넣어 미리 안 보이게 합니다.
- 클립 zIndex가 같으면 트랙 순서가 섞입니다. 겹치는 바탕·도형은 반드시 다른 zIndex로 둡니다(샷 모듈은 클립마다 1씩 올림, 최대 69).
