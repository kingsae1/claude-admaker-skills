---
name: map-route-draw
한 줄: 두 지점 사이에 곡선 경로가 그려지는 동안 지도가 경로 쪽으로 다가간다
슬롯: 주인공 | 상승부
에너지: 중고
길이: 2–3초
엔진: Shape path `strokeDraw`, 지도 클립 전체에 `mapCamera` keyframes — `templates/map.mjs`
검증: engine 3.0.5 (samples/map)
---

## 의도
"어디에서 어디로"와 "얼마나 빨리"를 보여줍니다. 배송, 여행, 이사, 물류, 연결 서비스 광고에 씁니다. 도착 지점이 칠해지는 순간이 이 샷의 히트입니다.

## 동작 핵심
- 출발 핀이 먼저 박혀 있음([map-region-pin](map-region-pin.md))
- 경로 `strokeDraw` 1.4–1.8초 `easeInOutCubic`, 같은 구간에 카메라가 경로 가운데로 줌(zoom 1 → 1.4–1.6, 2초)
- 경로가 도착하는 프레임에 도착 지역 paint + 도착 핀 팝 + 지명. 이 셋이 같은 프레임에 맞아야 "도착"으로 읽힘
- 0.3초 뒤 카피 입장(가림막이 먼저, 그 위에 서브 → 헤드라인 순서로 3–6프레임 시차)

## 파라미터 표
| 항목 | 값 | 조절 감각 |
|---|---|---|
| 경로 굵기 | 9–10px (zoom 1.55 후 약 15px) | 최종 zoom에서 보고 정함 |
| 휨 `bend` | ±0.25–0.3 | 0이면 직선이라 밋밋, 0.4 넘으면 돌아가는 길처럼 보임. 바다 쪽으로 휘지 않게 부호를 고름 |
| strokeDraw | 1.6초 `easeInOutCubic`, `fill: "hidden"` | 짧으면 거리감이 없어짐 |
| 카메라 | t 1.4 → 3.4초, `easeInOutCubic`, zoom 1.55, 경로 가운데를 화면 y 740에 | 경로 양끝이 화면 밖으로 나가지 않게 |
| 글자 받침 | 아래 28%, 투명 → 배경색 0.6 | 진하게 할수록 글자는 읽기 쉽고 영상은 덜 보임(Q11) |

## 사운드
경로가 그려지는 동안 riser(작게), 도착 프레임에 impact 또는 착지음. 광고 전체 큰 히트(R4) 중 하나로 셉니다.

## 알려진 함정
- 카메라 keyframes는 지도에 속한 **모든** 클립(바탕, 지역, 경로, 핀, 지명)에 같은 키로 넣어야 한 장처럼 움직임. 카피·가림막·룩 스택에는 넣지 않음
- 지도 클립을 첫 카메라 키보다 늦게 시작시키면 `mapCamera`가 오류. 모두 0초에 시작시키고 입장으로 숨김
- 경로가 아래쪽 글자 받침에 덮이면 도착 핀이 흐려 보임. 받침은 글자 띠에만 걸침
- `strokeDraw`는 delay 전에도 "안 그려진 상태"를 보여주므로 delay를 써도 됨(keyframes·마스크와 다름)

## 참조 구현
`samples/map/sample-map.mjs`의 `map_route`와 카메라 부분.
```js
routeShape(map, SEOUL, BUSAN, { timing, z: 30, color: C.accent, width: 9, bend: -0.28,
  animations: [{ type: "strokeDraw", options: { duration: us(1.6), delay: us(1.6), easing: "easeInOutCubic" }, params: { fill: "hidden" } }] });
const [ax, ay] = map.point(SEOUL), [bx, by] = map.point(BUSAN);
const Z = 1.55, targetY = 740;
const cam = [
  { t: 1.4, cx: W / 2, cy: H / 2, zoom: 1, easing: "easeInOutCubic" },
  { t: 3.4, cx: (ax + bx) / 2, cy: (ay + by) / 2 + (H / 2 - targetY) / Z, zoom: Z },
];
for (const clip of mapClips) clip.animations.push(mapCamera(clip, cam, { W, H, us, clipFrom: 0 }));
```
