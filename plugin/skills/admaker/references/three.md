# three.js 3D 샷 가이드

기준: `@admaker/engine` 3.0.7 `three` 어댑터, three 0.182(admaker 앱) / 0.180(엔진 개발). API 계약(클립 형식, `update`·`attach`·`render` 훅, 공유 렌더러)은 `engine-recipes.md` §7.1이 기준이고, 이 문서는 **장면을 어떻게 짜면 광고에서 예쁜가**와 **외부 three.js 예제를 우리 씬으로 옮기는 법**을 다룹니다. 조명·재질·후처리·에셋 원칙은 cloudai-x/threejs-skills(MIT)를 참고해 다시 썼습니다(ATTRIBUTION.md).

## 1. 언제 3D를 쓰나

- 제품 실물(병, 기기, 패키지)을 돌려 보여줄 때 → 내장 `model` 씬(JSON만, 앱까지 감).
- 제품 모델이 없거나 추상 오브젝트(링, 캡슐, 유리 조각, 로우폴리 섬, 데이터 막대)가 주인공일 때 → 커스텀 씬(코드, 렌더 하니스 전용).
- 한 광고에서 3D는 **주인공 한 번**입니다(aesthetic-rules Q4와 같은 원리). 텍스트·CTA는 3D 안에 넣지 않고 엔진 Text로 위에 얹습니다(폰트·앱 편집 유지).

## 2. 층 규칙

- 사용자 소재가 맨 아래, 3D는 그 위 ③층(그래픽)입니다. **`background: null`(투명)이 기본**이고, 배경을 채우는 3D는 소재가 없는 씬(엔드카드 등)에서만 씁니다.
- 소재를 뿌옇게 만들지 않습니다(약한 규칙). 블룸·DOF·안개는 3D 클립 안에서만 쓰고, 엔진 `bloom` 필터를 화면 전체에 걸지 않습니다. 3D 아래 그림자는 씬 안 접촉 그림자(§4) 정도로 끝냅니다.
- 3D 클립은 일반 클립이라 위치·keyframes·`gsapTimeline`·마스크를 받습니다. 화면 안 등장(올라오기, 와이프)은 클립 모션으로, 씬 안 움직임(회전, 카메라)은 `update`로 나눕니다.

## 3. 외부 three.js 예제를 옮길 때 바꿀 것

인터넷과 threejs-skills의 예제는 실시간 웹 페이지용입니다. 그대로 쓰면 Exporter에서 프레임이 틀어지거나 다른 3D 클립이 깨집니다.

| 웹 예제 | 우리 씬 |
|---|---|
| `requestAnimationFrame`, `renderer.setAnimationLoop` | 없음. 어댑터가 프레임마다 `update({time})`을 부름 |
| `THREE.Clock`, `THREE.Timer`, `getDelta()`, `Date.now()`, `performance.now()` | `time`(초)만 씀 |
| `mixer.update(delta)` | `mixer.setTime(time)` |
| `action.crossFadeTo()`, `fadeIn()` (델타 누적) | 가중치를 `time`으로 직접 계산해 `setEffectiveWeight` |
| `Math.random()` | 시드 RNG (아래 §6) — setup에서 한 번 만들고 프레임마다 같은 값 |
| `new THREE.WebGLRenderer()`, `document.body.appendChild(renderer.domElement)` | 금지. `attach(renderer)`로 받은 공유 렌더러 |
| `window.addEventListener('resize')`, `renderer.setSize` | 어댑터가 함. 후처리는 `render`에서 `composer.setSize(width, height)` |
| `renderer.setEffects([...])` (r18x 내장 효과) | 금지. 공유 렌더러는 `outputBufferType` 없이 만들어짐 → `EffectComposer` |
| `WebGPURenderer`, TSL, `RenderPipeline`, node material | 금지. 엔진은 WebGLRenderer |
| OrbitControls, 레이캐스팅, 드래그, React Three Fiber, drei | 쓸 데 없음. 카메라는 `update`에서 시간으로 |
| `RGBELoader` | `HDRLoader` (r180에서 이름 바뀜). HDR 파일은 `mapping = EquirectangularReflectionMapping` 후 `scene.environment`에 |
| `renderer.shadowMap.enabled = true` | 공유 렌더러 설정이라 다른 3D 클립에도 걸림. 켜려면 `attach`에서, 끄는 씬이 없을 때만. 보통은 §4의 가짜 접촉 그림자 |
| r183 이후 API (예제가 r186 기준인 경우) | 앱의 three 버전(0.182)에 있는지 먼저 확인 |

## 4. 제품 샷 레시피

**조명 (환경광 + 형태광):**
- 금속·유리·광택 플라스틱은 환경광이 없으면 검게 나옵니다. `RoomEnvironment` → `PMREMGenerator.fromScene(room, 0.04)`를 `attach`에서 만들고(내장 model 씬은 `environment: true`가 기본), 직접광은 형태만 잡도록 약하게 둡니다.
- 3점: 키(앞 위 대각, 가장 셈), 림(뒤쪽 반대편, 윤곽 분리 — 어두운 소재 위에서 특히 중요), 필(반구광 약하게).
- 톤매핑 `ACESFilmicToneMapping`, `exposure` 0.9–1.2. 소재 위에 얹을 때는 3D만 너무 밝아 떠 보이지 않게 소재 밝기에 맞춥니다(스틸로 확인).

**재질 값 (MeshPhysicalMaterial / MeshStandardMaterial):**

| 느낌 | 값 |
|---|---|
| 무광 플라스틱 | `roughness 0.6–0.8, metalness 0` |
| 광택 플라스틱·도자기 | `roughness 0.15–0.3, clearcoat 1, clearcoatRoughness 0.1` |
| 브러시드 금속 | `metalness 1, roughness 0.3–0.45` |
| 크롬 | `metalness 1, roughness 0.05–0.1` |
| 유리 | `transmission 1, roughness 0.05, thickness 0.5–1.5, ior 1.45–1.5` (+ `attenuationColor`로 옅은 색) |

`transmission`은 비싸고, 투명 배경에서는 뒤의 소재가 아니라 씬 안의 것만 굴절합니다. 소재가 비쳐 보여야 하는 느낌이면 유리 대신 반투명 `opacity` + 환경 반사로 흉내 냅니다.

**접촉 그림자 (가짜, 싸고 투명 배경과 잘 맞음):** 제품 밑에 원형 그라데이션 텍스처를 붙인 평면(`MeshBasicMaterial`, `transparent`, `depthWrite: false`, opacity 0.3–0.5)을 둡니다. 실제 shadowMap보다 소재 위 합성이 깔끔합니다.

**후처리 (`EffectComposer`, `attach`에서 만들고 `render`에서 실행):** 순서는 `RenderPass` → (AO `GTAOPass`) → (DOF `BokehPass`) → (`UnrealBloomPass`) → `OutputPass`(항상 마지막, 톤매핑·색공간). 투명 배경에서 AO·Bokeh가 알파를 지울 수 있으니 스틸로 먼저 확인합니다(engine-recipes §7.1). 블룸은 씬 안 하나와 엔진 필터 하나 중 하나만.

**카메라 안무:** 3D 카메라 무브는 `update`에서. 여러 단계 무브(다가가기 → 올려다보기 → 초점 이동)는 references/gsap.md §7처럼 멈춘 GSAP 타임라인을 `tl.time(time)`으로 맞추면 position 문법(`"<0.4"`)으로 겹치게 쓸 수 있습니다. 제품 광고의 카메라는 느리게: 2–3초에 거리 30–50% 이하, 회전 초당 15–30도.

## 5. 에셋 (glb)

- 내장 `model` 씬의 기본 로더는 **Draco·meshopt·KTX2 압축을 못 읽습니다.** 압축된 glb는 풀어서 쓰거나(`gltf-transform copy` 후 압축 단계 제외), 커스텀 씬에서 `DRACOLoader` 등을 직접 붙입니다(디코더 파일 경로가 렌더 환경에서 열려야 함).
- 앱으로 넘기는 model 씬은 `params.src`가 data URL이어야 해서 파일이 작아야 합니다. 텍스처를 1024–2048px로 줄이고 WebP로(`gltf-transform resize`, `webp`), 중복 제거(`dedup`, `prune`)까지만 합니다. 목표 5MB 이하.
- **AI로 GLB 만들기 (Agent·앱 MCP, 유료):** 두 가지 도구가 있습니다. 둘 다 `run_studio_tool`로 실행하고, 먼저 `get_credits({ plan: [{ toolId, params }] })`로 예상 크레딧을 알린 뒤 확인받습니다.

  | 상황 | 도구 | 필수 인자 | 메모 |
  |---|---|---|---|
  | 사용자 제품 사진이 있음 | `ai.model3d.imageToModel` | `clipRef`(이미지 클립) | 물체 하나가 온전히 보이고 배경이 단순한 사진. 복잡하면 먼저 `ai.image.removeBackground`. `texture_size` 512·1024·2048 |
  | 사진 없이 소품·아이콘·콘셉트 오브젝트가 필요 | `ai.model3d.textToModel` | `prompt`(물체 설명, 영문 권장, 최대 1024자) | `texture_quality`·`geometry_quality`(standard·detailed), `negative_prompt`, `face_limit`. 텍스처 없이는 `texture:false, pbr:false` |

  - 실제 제품은 `imageToModel`이 우선입니다. `textToModel`은 모양이 브랜드 제품과 달라지니 소품, 아이콘, 장식 오브젝트, 아직 사진이 없는 콘셉트 시안에만 씁니다.
  - `textToModel` 프롬프트는 물체 하나만, 모양 → 색 → 재질 → 디테일 순서로 씁니다(예: `"A glossy red sneaker, white rubber sole, mesh upper, studio product"`). 배경, 사람, 장면 설명, 글자는 넣지 않습니다. 글자가 생기면 `negative_prompt: "text, logo, pedestal"`.
  - 비용은 `textToModel` 옵션에 따라 달라집니다. 기본(표준 텍스처)을 1로 보면 텍스처 없음은 0.5, HD 텍스처는 1.5이고, `geometry_quality: "detailed"`는 +1입니다. 광고용 턴테이블은 기본값이면 충분합니다.
  - `addToTimeline: false`면 타임라인에 넣지 않고 `data.glbUrl`만 받습니다. `assets/`에 내려받아 `model` 씬 `src`로 씁니다. 비우면 앱이 3D 모델 클립을 맨 위 행에 바로 넣습니다. imageToModel은 원본 시각에, textToModel은 `startSec`이나 재생 위치에 넣습니다. 움직임은 `update_clip { patch: { model: { spin, angle, tilt, zoom } } }`로 줍니다.
  - 결과 GLB는 텍스처가 구워진 일반 glb라 기본 로더로 읽힙니다. `textToModel`은 `data.previewUrl`(미리보기 렌더)도 주니 모양을 먼저 확인합니다. 돌며 가로지르는 연출은 샷 카드 `model-orbit-text`.
- 모델의 단위·원점은 신경 쓰지 않아도 됩니다(model 씬이 가운데 정렬·크기 맞춤). 커스텀 씬에서는 `Box3`로 직접 맞춥니다.

## 6. 커스텀 씬 뼈대

샘플: `samples/gsap-three/scenes/orbit-hero.js` (유리·크롬 링이 도는 히어로, GSAP 카메라 안무). 바로 복사해 쓰는 씬은 `templates/scenes/`에 있습니다: `liquid-blobs.js`(메타볼 액체 방울, `MarchingCubes`), `iso-city.js`(정사영 아이소메트릭 블록 도시). 샷 카드 `liquid-blobs`, `iso-build-up`.

- 정사영 카메라(`OrthographicCamera`)는 어댑터가 aspect를 맞춰 주지 않습니다. `update({ width, height })`에서 left/right/top/bottom을 직접 정합니다(`iso-city.js`).
- 진한 브랜드 색·파스텔은 ACES에서 바랩니다(파랑 → 보라, 파스텔 → 회색빛). 색이 정확해야 하는 그래픽 3D는 `NeutralToneMapping`.

```js
// scenes/<이름>.js — 렌더 하니스가 파일 이름으로 registerThreeScene
import { gsap } from "gsap/gsap-core";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32); // 시드 RNG

export default async function setup({ THREE, params }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const rand = rng(params.seed ?? 7);
  // … 메시·재질·조명 (rand()로 배치해도 매번 같음)
  const cam = { z: 7, y: 0.6 };
  const tl = gsap.timeline({ paused: true }); gsap.globalTimeline.remove(tl);
  tl.to(cam, { z: 4.2, duration: 2, ease: "power2.inOut" }, 0).to(cam, { y: 0.1, duration: 1.2, ease: "power1.inOut" }, "<0.6");
  tl.time(tl.duration(), true); tl.time(0, true);
  let env = null;
  return {
    scene, camera, background: null,
    toneMapping: THREE.ACESFilmicToneMapping, exposure: 1,
    attach(renderer) {
      env?.dispose();
      const pmrem = new THREE.PMREMGenerator(renderer);
      env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
      scene.environment = env;
    },
    update({ time }) {
      tl.time(Math.min(time, tl.duration()), true);
      camera.position.set(0, cam.y, cam.z); camera.lookAt(0, 0, 0);
    },
    destroy() { env?.dispose(); /* 지오메트리·재질 dispose */ },
  };
}
export const options = { fps: 30 };
```

클립: `{ "type": "Adapter", "adapter": "three", "src": "three", "params": { "scene": "orbit-hero", "seed": 7 } }`. 커스텀 씬은 앱 불러오기에서 빠지므로, 앱까지 보내야 하면 3D 클립만 먼저 렌더해(투명이 필요하면 스틸 시퀀스 PNG, 아니면 mp4) Video/Image로 바꿔 넣습니다.

## 7. 검수

- 같은 시간의 스틸을 두 번 뽑아 픽셀이 같은지 봅니다(결정성). 다르면 `update` 밖에서 상태가 바뀌는 곳(난수, 델타, 콜백)을 찾습니다.
- 3D 클립이 있는 프레임과 없는 프레임의 소재 밝기를 비교해, 3D 주변이 뿌옇거나 어둡게 덮이지 않았는지 봅니다(Q11).
- 3D 클립이 둘 이상이면 렌더러를 공유하므로, 한 씬이 바꾼 렌더러 설정(그림자, 톤매핑 외 상태)이 다른 씬에 새지 않는지 확인합니다.
