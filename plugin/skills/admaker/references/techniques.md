# 기법 조합: 모션그래픽 + 앱 AI로 만들 수 있는 것

admaker MCP의 강점은 **모션그래픽(엔진) 하나로 끝내지 않고, 앱의 AI 생성·편집 도구를 장면마다 섞을 수 있다**는 점입니다. 광고 한 편을 기획할 때 이 문서에서 장면마다 기법을 고르고, 씬표에 "이 씬은 어떤 기법"인지 적은 뒤 사용자에게 보여 줍니다.
제작 순서(BGM → 박자 분석 → 모션그래픽 → 내레이션 → 이미지 → 확인 → 영상)는 `get_production_workflow`를 따릅니다. 이 문서는 그 순서 안에서 **무엇을 만들지**를 고르는 메뉴입니다.

## 1. 도구 상자

| 분류 | 할 수 있는 것 | 도구 | 크레딧 |
|---|---|---|---|
| 모션그래픽 | 키네틱 타이포, 도형·라인, 카운터·가격 롤, 지도, 전환, 키프레임, 카메라 | 엔진 ProjectJSON(스킬) → `import_to_admaker` | 없음 |
| 손그림·레터링 | 밑줄·동그라미·화살표 강조, 붓 획, 형광펜, 윤곽선·이중 외곽선 타이포, 자유 도형, 영역 효과(흑백·모자이크·글로우), 손그림 떨림(`lineBoil`, 샷 `handwritten-title`) | `draw_annotation`, `draw_path`, `text_to_path` (`drawing.md`) | 없음 |
| Lottie·3D | 아이콘 애니메이션, 반짝이·폭죽·체크 같은 장식, 3D 모델(.glb) | `search_lottie` → ProjectJSON의 lottie Adapter 클립(`engine-recipes.md`, 샷 `lottie-accent`), 또는 파일을 `upload_media`(.json/.lottie/.glb) | 없음 |
| 픽셀 아트 | 도트 캐릭터·아이콘, 스프라이트 플립북(걷기·깜빡임), 칸 단위로 끊기는 이동, 사진·영상 도트 질감 | `templates/pixel-sprite.mjs` → Image `style.pixelated`·`style.spriteSheet`, easing `steps(n)`, `pixelateFilter`, 전환 `pixelize` (`pixel-art.md`, 샷 `pixel-sprite-hop`) | 없음 |
| 글리치·디지털 | 가로 조각 찢김, RGB 분리, 스캔라인·HUD 라벨, 깜빡 정착 | Effect `glitchFilter`·`rgbSplitFilter` 2–4프레임 (샷 `glitch-hit`) | 없음 |
| 3D 깊이·모프 | Z축 플라이스루, 깊이별 층 패럴랙스, 카드 기울임, 3D 도형 → 평면 아이콘 모프 | 클립 `transform3d`·keyframes `z`(샷 `z-fly-through`), MCP `add_clip Morph3D`(샷 `morph-reveal`), three 어댑터(`three.md`) | 없음 |
| 클립 그룹 | CTA·가격표·칩·콜라주 조각을 한 덩어리로 등장·회전·확대 | `groupId` + `groups`, `options.origin: "group"`, MCP `group_clips`·`update_group` (샷 `group-build`) | 없음 |
| 인쇄 질감 | 하프톤 점, 리소 2색 겹침, 잉크 번짐 전환, 종이 결 | `dotFilter`, 트랙 매트 "질감으로 번짐", `am-ink-bleed` (`transitions.md`) | 없음 |
| 전환·효과·자막 | 장면 전환(트랙 매트·`am-*` 전환·마스크, 고르는 법은 `transitions.md`), 화면 효과, 자막 | ProjectJSON(스킬) 또는 `add_clip { type: 'Transition' \| 'Effect' \| 'Caption' }` | 없음 |
| 템플릿 | 이미 있는 광고 템플릿에서 출발 | `search_templates` → `open_template` | 없음 |
| 이미지 생성 | 제품 연출 컷, 배경, 라이프스타일 장면, 일러스트 | `ai.image.generate { prompt }` | 있음 |
| 이미지 고치기(img2img) | 사용자 사진의 배경·조명·계절·색감 바꾸기, 텍스트 여백 만들기, 같은 제품으로 장면 여러 벌 | `ai.image.edit { clipRef, prompt }` | 있음 |
| 누끼·레이어 | 제품·인물만 오려내기, 피사체를 앞 레이어로 분리 | `ai.image.removeBackground`, `ai.image.separateLayers` | 있음 |
| 영상 생성 | 글로 장면 만들기, 사진을 움직이게, 영상 첫 프레임으로 다시 만들기, 영상 늘리기 | `ai.video.generate`, `ai.video.imageToVideo`, `ai.video.regenerate`, `ai.video.extend` | 큼 |
| 이어지는 영상 | 앞 컷 마지막 프레임에서 이어 찍기, 시작·끝 장면 사이 움직임, 같은 인물·제품을 새 장면에 (`footage-gen.md` §7.1) | `ai.video.framesToVideo`, `ai.video.referenceToVideo` | 큼 |
| 소리 | BGM, 내레이션(목소리 선택, 대본의 `[excited]`·`[short pause]` 같은 오디오 태그로 감정·말투·쉼 지시: `narration.md`), 효과음 | `ai.bgm.generate`, `ai.voice.generate`(`list_voices`), `ai.sfx.generate` | 있음 |
| 분석 | BGM의 BPM·마디·피크·씬 경계 후보 | `audio.analyzeBeats` | 없음 |
| 사용자 소재 | 로고·제품 사진·영상·음원 | `upload_media` → `add_media_to_timeline` | 없음 |
| 그 밖의 앱 기능 | 패널에만 있는 기능(앵글 바꾸기, 업스케일 등) | `list_menu_commands`, `ui_snapshot` → `ui_*` | 기능마다 |

생성 도구의 프롬프트(영문), 길이·비트 맞추기, 일관성, 검수는 `footage-gen.md`를 따릅니다. 크레딧이 드는 도구는 `get_credits({ plan })`로 먼저 견적을 내고 확인받습니다. 크레딧 없는 기법(모션그래픽·드로잉·Lottie·전환)을 기본으로 깔고, 크레딧 쓰는 기법은 **메시지가 가장 중요한 씬에 집중**합니다.

## 2. 조합 레시피

한 광고에 3–5개 기법을 섞습니다. 씬마다 주인공 기법은 하나, 나머지는 조연입니다.

| 레시피 | 만드는 법 | 어울리는 씬 |
|---|---|---|
| **글자 뒤로 숨는 피사체** (깊이감) | 배경 사진 → 큰 타이틀(Text) → `ai.image.separateLayers`로 피사체를 오려 타이틀 위 행에 둠. 타이틀이 피사체 뒤로 지나가게 키프레임 | 훅, 제품 공개 |
| **사진이 살아 움직임** | 사용자 제품 사진 → `ai.image.edit`로 배경을 광고 무드로 → 확인 → `ai.video.imageToVideo`(천천히 돌리·줌인, 김·물방울·빛). 프롬프트 양식·카메라 어휘는 `footage-gen.md` §2–4 | 제품 클로즈업 |
| **같은 제품, 여러 장면** | 사진 한 장을 `ai.image.edit`로 계절·장소·시간대만 바꾼 3–4장 → 비트마다 컷 | 쓰임새·라인업 몽타주 |
| **누끼 + 모션 배경** | `ai.image.removeBackground`로 제품만 → 엔진의 그라데이션·도형·파티클 배경 위에 올리고 스케일 펀치를 BGM 피크에 | 가격·혜택 |
| **실사 + 손그림 강조** | AI 이미지·영상 위에 `draw_annotation`(동그라미·화살표)을 대상이 자리잡은 뒤 0.2–0.4초에 그림 | 기능 설명, 비교 |
| **영상 컷 + 키네틱 타이포** | `ai.video.generate`로 분위기 컷(4–6초) → 그 위에 단어 단위 키네틱 자막을 비트에 맞춰 | 감성·브랜드 필름 |
| **Lottie 포인트** | 체크·하트·반짝이 Lottie를 혜택 문구 옆에 짧게(0.6–1초) | 혜택 나열, CTA |
| **윤곽선 레터링 엔드카드** | `text_to_path` → stroke만 + `strokeDraw`로 브랜드명이 그려짐 → 로고·CTA 홀드 | 엔드카드 |
| **도트 캐릭터 훅** | `pixel-sprite.mjs`로 4칸 걷기 시트 → `pixelated` + `spriteSheet` + `steps` 이동, 블록을 쳐서 로고가 나옴 | 훅, 이벤트·게임·키즈 |
| **글리치 드롭** | 드롭 박마다 `glitchFilter` 2–3프레임 + `rgbSplitFilter`, 같은 프레임에 저음 SFX | 테크·음악 광고의 드롭, 전환 |
| **깊이 속으로** | 문구·사진을 z 0 / −600 / −1400에 두고 같은 z 이동으로 뚫고 들어감, 마지막 층이 다음 장면 | 훅, 공간·여행·부동산 |
| **3D가 로고로** | `Morph3D` 구 → 큐브 → 평면 별, 평면이 되면 로고·문구가 옆에 붙음 | 주인공, 엔드카드 |
| **덩어리 CTA** | 버튼 배경·글자·아이콘을 그룹으로 묶어 `origin: "group"`으로 한 판처럼 등장, 정착 뒤 아이콘만 팝 | 엔드카드, 가격표 |
| **콜라주 쌓기** | 누끼·사진 조각 + 테이프 PNG를 그룹마다 박에 하나씩 붙이고, 하프톤 `dotFilter`, 다음 장면은 `am-ink-bleed` | 감성·로컬·전시 |
| **소리로 리듬** | BGM 피크에 `ai.sfx.generate`(휙·팅·쿵) + 컷·스케일 펀치 동시 | 전환, 공개 순간 |
| **컷 없이 이어지는 두 씬** | 앞 씬을 `ai.video.imageToVideo`로 만든 뒤, 다음 씬은 끝 구도가 중요하면 `ai.video.framesToVideo`(첫 프레임 = 앞 씬 영상, 끝 = 이 씬 끝 장면 이미지), 아니면 `ai.video.extend`. 무관한 두 장소는 f2v로 잇지 않고 엔진 전환으로. 고르는 기준은 `footage-gen.md` §7.2 | 사용 장면이 이어지는 롱테이크, 비포→애프터 |
| **같은 모델·제품, 새 장소** | 앵커 이미지(얼굴·제품) 1–3장 → `ai.video.referenceToVideo`로 사진에 없는 장소·동작. 제품이 2개 이상 씬에 나올 때만 | 쓰임새 몽타주, 라이프스타일 |
| **영상 늘리기** | 생성 영상이 씬보다 짧으면 `ai.video.extend`로 이어 붙임 | 롱테이크 씬 |

## 3. 고르는 기준

1. **소재가 있나?** 사용자 사진·영상이 있으면 img2img·누끼·이미지→영상으로 살리는 쪽이 먼저입니다(제품이 실제와 같아야 함). 없으면 이미지 생성 → 이미지→영상. 씬끼리 컷 없이 이어지거나 같은 인물·제품이 여러 씬에 새 장면으로 나오면 그 씬만 첫·끝 프레임·레퍼런스 영상으로 바꿉니다(`footage-gen.md` §7.2).
2. **씬의 역할은?** 훅은 움직임이 크고 낯선 것(깊이감, 생성 영상). 정보·혜택은 모션그래픽·Lottie·손그림. 엔드카드는 레터링·로고 홀드.
3. **BGM 에너지에 맞추기.** `audio.analyzeBeats`의 low 구간은 정적인 기법(Ken Burns, 느린 영상), rise/high 구간은 컷·펀치·생성 영상·효과음.
4. **크레딧 배분.** 영상 생성은 핵심 씬 1–3개에만. 나머지 씬은 이미지 + 모션(Ken Burns, 패럴랙스)으로 충분히 움직여 보입니다.
5. **같은 기법 반복 금지.** 광고마다 기법이 겹치지 않게 기획안마다 변주 카드(`variety.md`)를 뽑아 씁니다. 한 기법이 주인공인 씬은 광고 전체에서 한 번(깊이감·윤곽선 레터링 등). 반복이 필요하면 강도를 낮춰 조연으로.
6. **사용자에게 제안하기.** 기획 단계에서 씬표에 씬마다 "기법 + 쓰는 도구 + 예상 크레딧"을 적어 보여 주고, 원하면 다른 레시피로 바꿀 수 있다고 알립니다. 사용자가 몰랐던 조합(깊이감, 같은 제품 여러 장면 등)을 적극적으로 제안합니다.

## 4. 씬표 예시 (15초, 120 BPM)

| 씬 | 시간 | 기법 | 도구 |
|---|---|---|---|
| 1 훅 | 0–2초 | 글자 뒤로 숨는 피사체 | 배경 img2img + separateLayers + 키네틱 타이틀 |
| 2 문제 | 2–4초 | 실사 + 손그림 강조 | ai.image.generate + draw_annotation |
| 3 제품 공개 (피크) | 4–8초 | 사진이 살아 움직임 + 효과음 | img2img → 확인 → imageToVideo, ai.sfx.generate |
| 4 혜택 | 8–12초 | 누끼 + 모션 배경 + Lottie | removeBackground + 엔진 도형 + search_lottie |
| 5 엔드카드 | 12–15초 | 윤곽선 레터링 + CTA 홀드 | text_to_path + strokeDraw |
