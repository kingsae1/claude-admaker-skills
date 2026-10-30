// 폰트 토큰 → Text/Caption style 필드. 목록은 references/fonts.json (admaker 앱이 아는 폰트만).
// 사용: import { fontStyle } from "./fonts.mjs";  style: { ...fontStyle(brand.fonts.display), fontSize, color }
// 규칙: references/fonts.md, aesthetic-rules B4·B5
import fs from "node:fs";

function loadCatalog() {
  for (const rel of ["./fonts.json", "../references/fonts.json"]) {
    const url = new URL(rel, import.meta.url);
    if (fs.existsSync(url)) return JSON.parse(fs.readFileSync(url, "utf8")).fonts;
  }
  throw new Error("fonts.json을 찾을 수 없습니다 (스킬 references/fonts.json을 프로젝트 폴더로 복사)");
}
export const FONTS = loadCatalog();

export const hasHangul = (s) => /[ㄱ-ㆎ가-힣]/.test(String(s ?? ""));

/** 이름(앱 fontName 또는 Latin의 postScriptName)으로 폰트 항목 찾기 */
export function findFont(name) {
  const n = String(name ?? "");
  for (const f of FONTS) {
    if (f.name === n) return { font: f };
    const v = f.variants.find((x) => x.ps === n);
    if (v) return { font: f, variant: v };
  }
  return null;
}

/**
 * 토큰 { name, weight } → { fontFamily, fontUrl, fontWeight: "400", _weight }.
 * 엔진은 fontUrl 파일 하나를 굵기 지정 없이(normal) 등록하므로, 굵은 파일을 고르고 fontWeight는 "400"으로 둔다
 * (700을 주면 이미 굵은 파일에 가짜 볼드가 한 번 더 걸린다). 원래 굵기는 _weight에 남겨 to-admaker-import가 앱의 isBold로 옮긴다.
 * - 한글 폰트(legacy): fontFamily = 앱 이름, 굵기마다 파일이 달라 한 프로젝트에서 한 굵기만 쓴다(엔진은 이름 하나에 URL 하나).
 * - Latin 폰트(catalog): fontFamily = postScriptName(예: "Anton-Regular"), 굵기마다 이름이 달라 여러 굵기를 같이 써도 된다.
 */
export function fontStyle(token) {
  const { name, weight = 400, italic = false } = typeof token === "string" ? { name: token } : token ?? {};
  const hit = findFont(name);
  if (!hit) throw new Error(`fonts.json에 없는 폰트 "${name}" (references/fonts.md 참고)`);
  const { font } = hit;
  const pick = (vs) => vs.reduce((best, v) => (Math.abs(v.weight - weight) < Math.abs(best.weight - weight) ? v : best));
  const v = hit.variant ?? pick(font.variants.filter((x) => !!x.italic === italic).length ? font.variants.filter((x) => !!x.italic === italic) : font.variants);
  if (font.source === "catalog") return { fontFamily: v.ps, fontUrl: v.url, fontWeight: "400", _weight: v.weight, ...(v.italic ? { fontStyle: "italic" } : {}) };
  return { fontFamily: font.name, fontUrl: v.url, fontWeight: "400", _weight: v.weight };
}

/** 글자에 한글이 있는데 Latin 전용 폰트면 예외 (한글이 대체 폰트로 깨져 보임) */
export function assertCovers(token, text) {
  const hit = findFont(typeof token === "string" ? token : token?.name);
  if (hit && !hit.font.korean && hasHangul(text)) throw new Error(`"${hit.font.name}"은 한글이 없습니다: "${String(text).slice(0, 20)}"`);
}
