# 지도 샘플 샷: 서울 → 부산 배송

1080×1920, 6초, 30fps. `@admaker/engine` 3.0.5 브라우저 Exporter로 렌더했습니다.

![미리보기](map_sample.gif)

| 시간 | 일어나는 일 | 쓰는 것 |
|---|---|---|
| 0–0.7초 | 바탕 지도와 강조 지역이 들어옴 | Image(SVG) + Shape path, `entrance` |
| 0.8–1.2초 | 서울이 칠해지고 핀·지명 | `paint`, 핀 팝(`holdFrom`), Text |
| 1.4–3.4초 | 경로가 그려지며 경로 쪽으로 1.55배 줌 | `strokeDraw`, `mapCamera` |
| 3.2–3.6초 | 부산이 강조색으로, 핀·지명 | `paint`, 핀 팝 |
| 3.5–4.8초 | 가림막, 서브 카피, 헤드라인, 밑줄 | `entrance`(시차), `wipe` |

다시 만들기 (프로젝트 폴더에 `templates/`의 `map.mjs`, `motion.mjs`, `timeline.mjs`, `fonts.mjs`와 `references/fonts.json`을 복사한 상태):

```sh
npm i d3-geo
curl -L -o kor.geojson https://raw.githubusercontent.com/southkorea/southkorea-maps/master/kostat/2013/json/skorea_provinces_geo_simple.json
node sample-map.mjs project.json        # project.json
node validate.mjs project.json
node render/render.mjs project.json out/map_sample_9x16.mp4
node to-admaker-import.mjs project.json admaker-import.json
```

- 지도 데이터: southkorea/southkorea-maps의 시도 경계(통계청 KOSTAT 2013 기반). 광고에 쓸 때는 `CREDITS`에 적습니다. 데이터 파일은 이 저장소에 넣지 않았습니다.
- 폰트: Black Han Sans(제목), Noto Sans KR 500(본문). 렌더 하니스에서는 `--local-fonts`로 로컬 파일을 씁니다.
- 색·타이밍은 첫 렌더 뒤 한 번 고친 값입니다(줌 1.35 → 1.55, 가림막 50% → 42%).
