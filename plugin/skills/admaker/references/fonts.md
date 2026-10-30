# 폰트 고르기

광고마다 폰트를 **무드에 맞춰 고릅니다.** 브랜드 폰트가 있으면 그것이 우선이고, 없을 때만 아래 표에서 고릅니다. "아무 지정이 없으니 Pretendard"는 금지입니다(aesthetic-rules B4).

- 고를 수 있는 폰트: `fonts.json` (admaker 앱이 아는 폰트 184종, 한글 66종). 여기 없는 폰트는 앱에서 다른 폰트로 보이므로 쓰지 않습니다.
- 토큰: `brand.json`의 `fonts`에 `{ "name": "<fonts.json name>", "weight": 400–900 }`로 적고, 샷 함수에서 `fontStyle(brand.fonts.display)`로 style에 넣습니다(`templates/fonts.mjs`).
- 라이선스: 대부분 SIL OFL 또는 무료 상업용이지만 일부 한글 폰트(배민·카페24·학교안심 등)는 배포처 조건이 따로 있습니다. 브랜드 광고에 쓰기 전에 사용자가 확인합니다.

## 정하는 순서

1. `TREATMENT.md`의 무드 키워드 2–3개를 정합니다(예: "프리미엄, 차분").
2. 아래 표에서 그 무드의 **페어링 후보 2–3개**를 적고, 스타일 프레임(§8)에서 실제로 렌더해 비교한 뒤 하나를 고릅니다.
3. 고른 것을 `brand.json` `fonts`에 씁니다: `display`(제목·숫자 강조), `body`(자막·설명), 필요하면 `numeric`(큰 숫자·가격, Latin 폰트).
4. 직전 광고와 같은 페어링이면 다른 후보로 바꿀 이유가 없는지 한 번 더 봅니다. 같은 브랜드의 시리즈가 아니라면 다르게 갑니다.

## 무드별 페어링 (display / body / numeric)

| 무드 | display (한글) | body (한글) | numeric·영문 (Latin) |
|---|---|---|---|
| 테크·모던·미니멀 | `Paperozi` 800, `NanumSquareNeo` 800 | `Pretendard` 400, `Gothic A1` 400 | `Space Grotesk` 700, `Sora` 700, `Inter` 700 |
| 임팩트·세일·스포츠 | `Black Han Sans`, `Aggravo` 700, `KblJump` 700, `Gasoek One` | `Noto Sans KR` 500, `Pretendard` 500 | `Bebas Neue`, `Anton`, `Oswald` 700 |
| 프리미엄·에디토리얼 | `Noto Serif KR` 700, `Hamlet` 600, `BookendBatang` 600 | `Pretendard` 300, `Nanum Myeongjo` 400 | `Playfair Display` 700, `Cormorant` 600, `DM Serif Display` |
| 차분·웰니스·라이프스타일 | `Gowun Batang` 700, `Cafe24Danjeonghae` | `Gowun Dodum`, `Sunflower` 300 | `Fraunces` 400, `Lora` 400 |
| 레트로·키치 | `Euljiro`, `Dohyun`, `Taenada`, `Black And White Picture` | `Yeonseong`, `Nanum Gothic` 400 | `Bungee`, `Righteous`, `Monoton` |
| 친근·푸드·키즈 | `Jua`, `Cafe24Dangdanghae`, `Bagel Fat One`, `Dongle` 700 | `Gowun Dodum`, `KerisBaeum` 400 | `Fredoka` 600, `Lilita One`, `Quicksand` 700 |
| 귀여움·SNS | `HsSantoki`, `Cute Font`, `Single Day`, `SandollSamlipHobbangOutline` | `Gaegu` 400, `Hi Melody` | `Pacifico`, `Comfortaa` 700 |
| 손글씨·감성 | `Nanum Pen Script`, `Nanum Brush Script`, `East Sea Dokdo` | `Gowun Dodum`, `Nanum Gothic` 400 | `Caveat` 700, `Dancing Script` 700, `Shadows Into Light` |
| 전통·한국적 | `GyeongbokgungSumunjangTitle` 700, `Songmyeong`, `Gugi` | `Gowun Batang` 400, `Nanum Myeongjo` 400 | `Cinzel` 600, `Cormorant` 500 |
| 여행·아웃도어 | `SchoolSafeTravel`, `Sacheonhanggong`, `Jeju Gothic` | `Pretendard` 400, `Sunflower` 300 | `Archivo Black`, `Barlow Condensed` 700 |
| 게임·픽셀·미래 | `Mulmaru`, `Orbit`, `Moirai One` | `NanumSquareNeo` 400, `Nanum Gothic Coding` | `Press Start 2P`, `Exo 2` 700, `Space Mono` 700 |
| 데이터·B2B | `IbmPlexSans` 600, `NanumSquareNeo` 700 | `IbmPlexSans` 400(다른 굵기 금지, 아래 참고) → `Gothic A1` 400 | `IBM Plex Sans` 600, `Source Code Pro` 600 |

## 지켜야 할 것

- **한글 텍스트에는 `korean: true` 폰트만.** Latin 폰트에 한글을 넣으면 대체 폰트로 깨져 보입니다. Latin 폰트는 숫자·영문 단어에만 씁니다(`validate.mjs`가 검사).
- **패밀리는 최대 3개**(display + body + numeric). 굵기 대비는 같은 패밀리의 다른 굵기보다 **다른 패밀리**로 만듭니다.
- **한글 폰트는 한 프로젝트에서 한 굵기만.** 엔진은 폰트 이름 하나에 파일 하나만 등록하기 때문입니다(Pretendard 800 제목과 Pretendard 400 본문을 같이 쓰면 하나가 다른 굵기로 그려짐). 같은 패밀리를 두 굵기로 쓰고 싶으면 한쪽을 다른 패밀리로 바꿉니다. Latin 폰트는 굵기마다 이름(postScriptName)이 달라 여러 굵기를 써도 됩니다.
- 앱으로 넘길 때 한글 폰트의 굵기는 앱의 "굵게"(700) 하나로만 표현됩니다. 800·900을 고른 제목은 앱에서 700으로 보일 수 있습니다.
- `fonts.json`에서 `derived: true`인 URL은 같은 CDN 폴더의 파일명으로 추정한 것입니다. 렌더 하니스에서 폰트가 안 불러지면 그 굵기 대신 기본 굵기를 씁니다.
- 디스플레이 폰트(장식형)는 짧은 제목·숫자에만. 2줄 넘는 문장과 자막은 body 폰트로 씁니다.
