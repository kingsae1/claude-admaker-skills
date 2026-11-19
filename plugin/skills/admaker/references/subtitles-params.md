# 자막 파일(SRT·VTT)과 템플릿 파라미터

## 1. 자막 파일 가져오기·내보내기 — `templates/subtitles.mjs`

사용자가 자막 파일(.srt, .vtt)을 주면 다시 타이핑하지 않고 그대로 Caption 클립으로 넣습니다. 만든 자막은 SRT/VTT로 내보내 유튜브·인스타 업로드에 같이 씁니다.

```bash
node templates/subtitles.mjs in.srt --to project.json [--track 자막] [--whole]   # cue마다 Caption 클립 하나
node templates/subtitles.mjs project.json --export out.srt                      # 프로젝트 Caption → SRT (out.vtt면 VTT)
node templates/subtitles.mjs in.vtt --export out.srt                            # 형식만 바꾸기
```

- 넣는 곳: 이름이 `자막`인 트랙(없으면 맨 위에 새로 만듦). 다시 넣으면 그 트랙의 Caption만 바꿔 끼웁니다.
- 모양: 프로젝트에 Caption이 이미 있으면 그 위치·스타일·색·`wordAnimation`을 따르고, 없으면 아래쪽 가운데 흰 글자 + 검은 외곽선(Pretendard Bold)입니다. 넣은 뒤 브랜드 토큰에 맞게 고칩니다.
- 단어 시간: cue 안에서 글자 수에 비례해 나눕니다(`--whole`이면 cue 한 덩어리). 말과 정확히 맞춰야 하면 내레이션 STT 결과로 바꿉니다.
- 읽기 규칙: BOM·CRLF 허용, SRT 번호 줄은 무시, VTT `NOTE`·`STYLE`·cue 설정(`align:` 등)은 무시, `<b>`·`<i>`·`<c.x>`·`<v 이름>` 태그는 벗김. 끝이 시작보다 앞인 cue는 버리고, 시간 줄이 잘못된 블록은 건너뛰며 경고합니다.
- 쓰기 규칙: SRT는 1부터 번호, `,` 소수점, CRLF. VTT는 `WEBVTT` + 빈 줄, `.` 소수점, LF.
- 함수: `readSubtitles(text, { format? })` → `[{ from, to, text, lines }]`(µs), `writeSubtitles(cues, "srt"|"vtt")`, `cuesToCaptionWords(cues, { splitWords, offset })`(클립 기준 ms), `addCaptionClips(project, cues, opts)`, `captionCues(project)`. 엔진 3.0.31+에도 같은 이름·동작의 `readSubtitles`·`writeSubtitles`·`cuesToCaptionWords`가 있습니다.
- 자막 안전 영역·글자 크기·줄 수는 `aesthetic-rules.md`·`ad-formats.md`를 따릅니다.

## 2. 템플릿 파라미터 — `templates/params.mjs`

같은 광고를 문구·색·이미지만 바꿔 여러 버전으로 찍을 때 씁니다. 프로젝트 JSON 최상위에 `params.schema`를 두고 문자열 필드 어디서나 `"{{이름}}"`으로 참조합니다.

```json
{
  "params": { "schema": {
    "title":  { "type": "text",   "default": "신메뉴 출시", "label": "제목" },
    "price":  { "type": "number", "default": 4500, "min": 0, "max": 99999, "label": "가격" },
    "accent": { "type": "color",  "default": "#FF5A1F", "label": "강조색" },
    "hero":   { "type": "image",  "default": "assets/hero.jpg", "label": "제품 사진" },
    "tone":   { "type": "enum",   "default": "day", "options": ["day", "night"], "label": "톤" }
  } },
  "clips": { "t1": { "type": "Text", "text": "{{title}}", "style": { "color": "{{accent}}" } },
             "t2": { "type": "Text", "text": "가격 {{price}}원" } }
}
```

```bash
node templates/params.mjs project.json values.json --out project.v2.json   # 값 넣기
node templates/params.mjs project.json --out project.default.json          # 기본값만
```

- type: `text`·`color`·`image`·`video`·`number`·`enum`. 값이 없으면 `default`.
- 문자열 전체가 `"{{price}}"`이면 값의 타입 그대로(숫자는 숫자) 들어가므로 `transform.x` 같은 숫자 칸에도 씁니다. 일부면 문자열로 치환합니다.
- color는 CSS 색(#hex, `rgb()`·`hsl()`, 이름 색)이 아니면, enum은 `options` 밖이면 `default` + 경고. number는 `min`/`max`로 자릅니다. 모르는 이름은 그대로 두고 경고합니다.
- `validate.mjs`는 `{{…}}`가 남아 있으면 오류를 냅니다. 렌더·`to-admaker-import.mjs` 전에 `applyParams`를 먼저 돌립니다. `params` 블록은 결과에도 남아서 다음 버전을 다시 찍을 수 있습니다.
- 앱은 아직 schema로 입력 폼을 만들지 않습니다(후속). 앱으로 넘길 때는 값을 넣은 프로젝트를 넘깁니다.
