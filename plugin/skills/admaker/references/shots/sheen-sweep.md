---
name: sheen-sweep
한 줄: 빛띠·색띠·크롬 결이 글자나 박스 **모양 안에서만** 지나간다 (밖으로 넘치지 않음)
슬롯: 훅 | 주인공 | 상승부 | 엔드카드 (얹는 샷, F2의 빛층)
에너지: 저–중
길이: glint 0.8–1초 · gradient 1.2–1.6초 · chrome 장면 내내
검증: 엔진 3.0.27 + composer 가시성 수정(admaker-plugin PR) 렌더 하니스, `samples/sheen-sweep`
엔진: Image(SVG 그라데이션) + `style.matte { clipId: 대상, mode: "alpha", hideSource: false }` — `templates/effects.mjs` `sheenSweep`
---

## 의도
"반짝" 하고 지나가는 광택을 주인공 글자·가격 박스·로고에 한 번 줍니다. 띠를 그냥 얹으면 기울어진 막대가 박스 밖으로 삐져나와 싸 보입니다. **띠는 반드시 대상의 알파로 도려냅니다**(트랙 매트). 그러면 띠가 커도 박스·글자 획 밖으로는 안 나가고, 대상이 팝·흔들림으로 움직여도 매트가 그 프레임의 대상 픽셀을 따라갑니다.

## 세 가지
| kind | 모습 | 어울리는 곳 | 기본값 |
|---|---|---|---|
| `glint` | 흰 빛띠가 한 번 스침 | 가격 박스, 버튼, 로고, 밝은 회색 글자 | 기울기 20°, 띠 폭 = 대상 폭 × 0.22, opacity 0.7, 0.9초 |
| `gradient` | 색 띠가 글자를 물들이며 지나감 | 흰 글자 슬로건, 런칭 문구 | 기울기 10°, 폭 × 0.6, 보라 → 주황 → 크림, 1.4초 |
| `chrome` | 금속 결과 사선 반사광이 글자 안에서 계속 흐름 | 프리미엄·테크·자동차, 큰 제목 | 기울기 24°, 90px/초, 장면 내내 |

## 쓰는 법
```js
import * as fx from "./effects.mjs";
const box = fx.shape("price_box", "rectangle", 0, 3, { x: 120, y: 200, width: 840, height: 300 }, { fill: brand.colors.accent, radius: 10 });
add(box); add(priceText);                                   // 박스 안 글자까지 함께 훑으려면 박스를 대상으로
add(fx.sheenSweep({ target: box, kind: "glint", at: 0.4 })); // 대상 바로 위에 넣음

const title = fx.text("title", "MOTION", 0, 4, box2, { ...font, fontSize: 210, color: "#EEF1F6" });
add(title);
add(fx.sheenSweep({ target: title, kind: "gradient", at: 0.3, colors: [brand.colors.primary, brand.colors.accent, "#FFF1C4"] }));
add(fx.sheenSweep({ target: title2, kind: "chrome", at: 0, to: 4 }));
```
- 대상은 Text(글자 획), Shape(박스·알약), 누끼 Image(제품·로고) 무엇이든 됩니다.
- `passes: 2, every: 2`로 두 번. 같은 장면에서 세 번 넘게 반복하지 않습니다.
- `dir: -1`이면 오른쪽 → 왼쪽. `angle`·`width`·`opacity`·`colors`로 덮어씁니다.
- 직접 만들 때도 같은 원리: 띠 클립 `style.matte = { clipId: 대상 id, mode: "alpha", hideSource: false }`, zIndex는 대상보다 위, 띠의 display 구간은 대상 구간 안.

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 시점 | 대상이 자리잡은 뒤 0.1–0.3초 | 등장 중에 지나가면 안 보임 |
| glint 길이 | 0.8–1초 | 0.5초 아래는 번쩍임, 1.5초 위는 느림 |
| glint opacity | 0.5–0.8 | 흰 글자 위에서는 안 보이니 gradient나 chrome으로 |
| gradient 폭 | 대상 폭 × 0.5–0.7 | 좁으면 빛띠처럼 보임 |
| chrome 바탕 글자색 | 중간 회색(#9098A8) | 결이 덮지 못한 가장자리도 금속처럼 |

## 사운드
glint는 "샤랑" 한 번(띠가 대상 가운데를 지날 때, 시작 + 길이 × 0.5). gradient·chrome은 소리 없이.

## 알려진 함정
- **엔진 3.0.27까지**는 매트 묶음이 장면 중간에 켜지거나 꺼지는 프레임에 다른 클립이 한 프레임 사라지고 띠가 도려지지 않은 채 보였습니다(composer가 자식 가시성을 인덱스로 되돌리던 버그). 이 수정이 들어간 엔진 버전부터 씁니다. 그 전 엔진이면 띠 클립 display를 대상과 같게 두고 keyframes로 지나가는 구간만 움직입니다.
- 흰 글자에 흰 glint는 안 보입니다. 밝은 회색 글자나 색 박스에 쓰거나 kind를 바꿉니다.
- 한 화면에 스윕은 주인공 하나에만(aesthetic-rules Q4). 여러 줄에 동시에 걸지 않습니다.
- `validate.mjs`가 이름에 sheen·shine·glint·sweep·광택이 들어간 Image·Shape에 `style.matte`가 없으면 경고합니다.
- 앱으로 넘기면 `transform.matte`로 옮겨지고 앱 미리보기·내보내기에서 같은 모양으로 잘립니다.
