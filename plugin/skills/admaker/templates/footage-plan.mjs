// 바닥 소재(FOOTAGE) 계획 검사: 앱 AI로 만든 소재(gen)의 길이·컷 위치·프롬프트를 렌더 전에 확인한다. references/footage-gen.md
// build-project.mjs가 불러 경고(△)만 출력한다. 종료 코드에는 영향 없음.
//
// FOOTAGE 항목에 선택 필드 gen을 붙인다 (생성하지 않은 사용자 소재는 gen 없음):
//   gen: {
//     tool: "ai.video.imageToVideo" | "ai.video.framesToVideo" | "ai.video.referenceToVideo" | "ai.video.extend" | "ai.video.generate" | "ai.video.regenerate" | "ai.image.edit" | "ai.image.generate",
//     prompt: "Slow dolly-in on the bottle ...",   // 영문 프롬프트 (footage-gen.md §2)
//     durationSec: 6,                               // 영상 생성 길이 (첫 모델 video.models durations 안, Veo는 4·6·8)
//     source: "assets/product.jpg",                 // 시작 이미지 (imageToVideo, ai.image.edit), framesToVideo는 첫 프레임
//     lastFrame: "assets/s3_end.png",               // framesToVideo 끝 프레임
//     references: ["assets/face.png", "assets/product.jpg"], // referenceToVideo 레퍼런스 1–3장 (얼굴 > 제품 > 스타일)
//     product: true,                                // 실제 제품이 화면에 나오는 씬
//     continues: true,                              // 바로 앞 씬 영상에서 컷 없이 이어짐 → framesToVideo 또는 extend (footage-gen.md §7.2 4번)
//     why: "앞 컷 동작이 이어짐",                     // 이 도구를 고른 이유 (씬표에도 적음, 선택)
//     model: "veo3.1-lite",                         // 앱이 알려 준 모델 (CREDITS용, 선택)
//   }

const TEXT_ASK = /\b(text|title|caption|subtitle|logo|wordmark|letters?|typography|words?|slogan|headline|price tag|label that says)\b/i;
const QUOTED = /["“”'‘’][^"“”'‘’]{2,}["“”'‘’]/;
const HANGUL = /[ㄱ-ㆎ가-힣]/;
// 금지 줄("No text, no new logos")과 보존 줄("logo and label stay exactly as in the source")은 글자 요청이 아니므로 빼고 본다
const withoutGuards = (p) => p.split(/(?<=[.;])\s+|\n/)
  .filter((s) => !/^\s*(\[(avoid|keep)\]|avoid\b|negative constraints:|fixed product facts:|post-production plan:)/i.test(s)
    && !/exactly as in the (source|reference)|stays? (exactly )?(the same|unchanged)/i.test(s))
  .join(" ")
  .replace(/\b(no|without|never)\s+[^,.;]*/gi, "");

/**
 * @param {Array} footage timeline.mjs FOOTAGE
 * @param {{ duration: number, grid?: { beatSec: number, origin: number, fps: number }, fps?: number }} o
 * @returns {string[]} 경고 문장
 */
export function checkFootage(footage = [], { duration, grid, fps = 30 } = {}) {
  const out = [];
  const w = (i, m) => out.push(`△ FOOTAGE[${i}]: ${m}`);
  const frame = 1 / fps;

  // 1. 빈 구간: 바닥 소재가 없는 시간은 검은 화면이나 생성 배경이 된다
  const spans = footage.map((f) => [f.from, f.to]).sort((a, b) => a[0] - b[0]);
  let cursor = 0;
  for (const [from, to] of spans) {
    if (from - cursor > frame) out.push(`△ FOOTAGE: ${cursor.toFixed(2)}–${from.toFixed(2)}초에 바닥 소재 없음 (생성 클립이 짧으면 다음 컷을 당기거나 ai.video.extend)`);
    cursor = Math.max(cursor, to);
  }
  if (duration !== undefined && duration - cursor > frame) out.push(`△ FOOTAGE: ${cursor.toFixed(2)}–${duration.toFixed(2)}초에 바닥 소재 없음`);

  footage.forEach((f, i) => {
    const g = f.gen;
    const span = f.to - f.from;

    // 2. 컷 위치: 소재가 바뀌는 지점은 박(또는 반박) 위에 (SKILL.md 원칙 7: 컷–비트 오차 ≤ 2프레임)
    if (grid?.beatSec && f.from > frame) {
      const half = grid.beatSec / 2;
      const off = Math.abs(f.from - (grid.origin + Math.round((f.from - grid.origin) / half) * half));
      if (off > 2 * frame + 1e-6) w(i, `컷 ${f.from.toFixed(2)}초가 박에서 ${Math.round(off * fps)}프레임 벗어남 (beat()로 맞추세요)`);
    }
    if (!g) return;

    // 3. 생성 길이: 모델마다 다름(video.models durations). Veo는 4·6·8초, 그 밖은 1–30초 정수. 씬이 더 길면 끝에서 멈춘 화면이 된다
    if (f.type === "Video") {
      const veo = !g.model || /veo/i.test(g.model);
      if (g.durationSec && veo && ![4, 6, 8].includes(g.durationSec)) w(i, `gen.durationSec ${g.durationSec}: ${g.model ?? "기본 모델(Veo)"}은 4·6·8초 (다른 길이는 그 길이를 받는 모델을 gen.model에 적으세요, video.models)`);
      if (g.durationSec && !veo && !(Number.isInteger(g.durationSec) && g.durationSec >= 1 && g.durationSec <= 30)) w(i, `gen.durationSec ${g.durationSec}: 1–30초 정수, 그 모델 durations 안에서`);
      const len = g.durationSec ?? 8;
      if ((f.trimFrom ?? 0) + span > len + 1e-6) w(i, `${span.toFixed(2)}초 씬에 ${len}초 생성 영상 (trimFrom ${f.trimFrom ?? 0}): 끝이 모자람. 컷을 나누거나 더 긴 길이로 생성`);
    }

    // 4. 프롬프트: 글자·로고는 모델에 그리게 하지 않고 엔진 모션그래픽으로 얹는다
    const p = String(g.prompt ?? "");
    if (!p.trim()) w(i, "gen.prompt 없음: 생성 전에 프롬프트를 계획에 적고 사용자에게 보여 주세요");
    else {
      if (HANGUL.test(p)) w(i, "프롬프트에 한글이 있음: 생성 프롬프트는 영문으로 (footage-gen.md §1). 화면 글자라면 엔진 텍스트로");
      if (TEXT_ASK.test(withoutGuards(p)) || QUOTED.test(p)) w(i, "프롬프트가 글자·로고를 그리게 하는 것 같음: 글자는 모델이 깨뜨리기 쉬우니 엔진 모션그래픽으로 얹으세요 (footage-gen.md §5). 의도했다면 무시");
    }

    // 5. 제품 씬은 사용자 사진에서 시작 (제품이 실물과 같아야 함)
    if (g.product && (g.tool === "ai.video.generate" || g.tool === "ai.image.generate")) w(i, `제품 씬을 ${g.tool}(글로만 생성)으로 만듦: 사용자 제품 사진 → ai.image.edit → ai.video.imageToVideo가 기본 (footage-gen.md §4)`);
    if ((g.tool === "ai.video.imageToVideo" || g.tool === "ai.image.edit") && !g.source) w(i, `${g.tool}인데 gen.source(시작 이미지) 없음`);
    if (g.tool === "ai.video.framesToVideo" && (!g.source || !g.lastFrame)) w(i, "ai.video.framesToVideo인데 gen.source(첫 프레임)나 gen.lastFrame(끝 프레임) 없음");
    if (g.tool === "ai.video.referenceToVideo") {
      const n = Array.isArray(g.references) ? g.references.length : 0;
      if (n < 1 || n > 3) w(i, `ai.video.referenceToVideo 레퍼런스 ${n}장: 1–3장 (footage-gen.md §7.1)`);
      if (!/\{ref\d+\}|reference/i.test(p)) w(i, "레퍼런스 영상 프롬프트에 레퍼런스를 가리키는 말이 없음 ({ref1}, {ref2} 태그로, video-models.md §2)");
      const tags = [...p.matchAll(/\{ref(\d+)\}/gi)].map((m) => Number(m[1]));
      if (tags.some((t) => t < 1 || t > n)) w(i, `프롬프트의 {ref} 번호가 레퍼런스 ${n}장 범위를 벗어남: {ref1}부터 clipRefs 순서대로`);
    }
    // 4.1 모델 문법 태그를 직접 쓰면 폴백 모델이 받을 때 깨진다 (앱이 {ref1}을 모델 문법으로 바꿈)
    if (/<IMAGE_REF_\d+>|@Image\d+|@Video\d+/.test(p)) w(i, "프롬프트에 모델 전용 레퍼런스 태그(<IMAGE_REF_0>, @Image1)가 있음: {ref1}, {ref2}로 쓰면 앱이 받는 모델 문법으로 바꿉니다 (video-models.md §2)");
    if (/\b(cinematic|epic|8k|4k|masterpiece|ultra[- ]realistic|award[- ]winning)\b/i.test(p)) w(i, "프롬프트에 화면을 정하지 못하는 빈 형용사(cinematic, 8k 등)가 있음: 빛 방향·렌즈·재질로 바꾸세요 (video-models.md §2)");

    // 6. 씬별 영상 도구 (footage-gen.md §7.2): 기본은 imageToVideo, 맞는 씬에만 framesToVideo·referenceToVideo·extend
    if (f.type === "Video" && g.continues) {
      const prev = footage.filter((x) => x !== f && x.type === "Video" && Math.abs(x.to - f.from) <= frame + 1e-6)[0];
      if (!prev) w(i, "gen.continues인데 바로 앞에 붙은 영상 씬이 없음: 앞 컷이 영상이어야 framesToVideo·extend로 이을 수 있음");
      if (g.tool === "ai.video.extend") { /* 끝 구도가 상관없으면 extend (§7.2 4번) */ }
      else if (g.tool !== "ai.video.framesToVideo") w(i, `앞 씬에서 컷 없이 이어지는 씬(gen.continues)인데 ${g.tool}: 끝 구도가 중요하면 ai.video.framesToVideo(첫 프레임 = 앞 씬 영상), 아니면 ai.video.extend (§7.2 4번)`);
      else if (prev && g.source && g.source !== prev.src) w(i, `framesToVideo 첫 프레임(gen.source ${g.source})이 앞 씬 영상(${prev.src})이 아님`);
    }
  });
  return out;
}

/** CREDITS에 넣을 AI 생성 소재 줄 */
export const creditsLines = (footage = [], date = new Date().toISOString().slice(0, 10)) =>
  footage.filter((f) => f.gen).map((f) => `${f.src}: AI 생성 (${f.gen.tool}${f.gen.model ? `, ${f.gen.model}` : ""}, admaker 앱, ${date})${f.gen.source ? `, 원본 ${f.gen.source}` : ""}`);
