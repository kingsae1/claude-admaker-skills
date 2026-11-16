---
name: pixel-arcade
한 줄: 8비트 게임 화면처럼 점수판·바닥 줄·쇼핑백 캐릭터·코인이 칸 단위(steps)로 뚝뚝 움직이며 혜택을 알린다 (플래너 "아케이드" 그룹 6씬)
슬롯: 훅 · 주인공 · 상승부 · 엔드카드
에너지: 고
길이: 씬당 4박 또는 8박 (128 BPM 1.88 / 3.75초)
엔진: Shape `path`(도트 그림을 색마다 path 하나로) + `gsapTimeline` `steps(n)` + `wipe`(타자) + `countUp` — 이미지 호스팅 없음
검증: 엔진 3.0.24 렌더 하니스, admaker 앱 Planner 템플릿 43 아케이드(6씬)로 내보냄
---

## 의도
[pixel-sprite-hop](pixel-sprite-hop.md)을 플래너 템플릿용으로 다시 짠 것입니다. 스프라이트 PNG는 앱 템플릿에 넣으려면 따로 올려야 해서, 도트 그림을 **글자 격자 → 색마다 path 하나**(`pixelPaths`)로 바꿔 Shape로 그립니다. 걷기는 다리 프레임 두 장을 겹쳐 opacity를 `steps(1)`로 바꿉니다. 캐릭터는 원작 쇼핑백 마스코트이고, 기존 게임의 캐릭터·블록·무늬를 따라 하지 않습니다.

## 씬 6개 (`props.scene`)
| scene | 박 | 움직임 | 필드 | 나갈 때 |
|---|---|---|---|---|
| opening | 8 | 점수판·체크무늬 바닥, PRESS START 2박 깜빡임, 캐릭터가 1–3박 걸어와 4박에 별 블록을 머리로 침, 코인 튀고 상호 상자 열림 | `store_name` | `am-pixelate` 0.4 |
| main | 4 | 흰 도트 말풍선이 `steps(4)`로 커지고 단어가 `wipe` `steps(6)`로 타자, 캐릭터 박마다 통통 | `menu_name_1` | `am-push` 0.35 (칸 단위로 왼쪽) |
| point | 4 | 코인색 테두리 점수판, 가격이 `countUp` `steps(12)`로 굴러가다 2박에 멈춤, COMBO! 딱지·코인 3개 | `promo_title`, `promo_price` | `am-flash-streak` 0.3 |
| showcase | 8 | 아이템 칸 3개가 1·3·5박에 열림, 칸마다 코인·별·하트 아이콘, 이름, 가격 | `menu_name_1–3`, `menu_price_1–3` | `am-zoom-blur` 0.35 |
| detail | 4 | TIME LIMIT, HP 바 10칸이 켜진 뒤 끝에서부터 꺼짐, 행사 기간 | `promo_period` | 그룹 대표 `am-pixelate` 0.4 |
| closing | 8 | 밤하늘 별, STAGE CLEAR 깜빡임, 로고(1박) → 상호(2박) → 전화(3박) → CTA(3.5박), 4박 드롭에 코인 4개, 이후 정지 | `logo`, `store_name`, `phone`, `cta` | (끝) |

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 도트 | 8px 기준, 그림은 10–20px 칸 | 한 화면 안에서는 같은 배율 계열로 |
| 이동 | `steps(이동 초 × 12)` | 부드러운 이징·블러 금지(도트가 뭉개짐) |
| 등장 | `scale 0→1` `steps(4)` 0.33초 | 깜빡 등장은 opacity `steps(1)` 2프레임 |
| 퇴장 | 두 번 깜빡이고 사라짐, 또는 칸 단위 이동 | 씬 끝 − 전환 − 0.25초에 시작 |
| 색 | 밤하늘 `#0D0D1A` · 하늘 `#4CC9F0` · 코인 `#FFD23F` · 빨강 `#F25F5C` · 흰색 | 앱 주 컬러 기준색은 하늘·코인(`--colors`) |
| 글꼴 | Mulmaru(앱 `/fonts/Mulmaru.woff2`) | 글자 그림자는 블러 0, 6px 오프셋 |

## 주의
- 가격 `countUp`은 `params.to` 없이 둡니다. 엔진이 글자 안 첫 숫자를 목표로 세므로 앱이 넣은 가격까지 굴러갑니다.
- `wipe`는 delay 전에는 마스크가 안 걸립니다. 타자 전에는 글자 opacity를 0으로 잡아 둡니다.
- 별 40개처럼 작은 조각이 많으면 색마다 path 하나로 합쳐 클립 수를 줄입니다(템플릿 트랙 수 = 클립 수).
