// 템플릿 파라미터 — references/subtitles-params.md §2
// 같은 광고를 문구·색·이미지만 바꿔 여러 버전으로 찍을 때 쓴다.
// 프로젝트 JSON 최상위에 params.schema를 두고, 문자열 필드 어디서나 "{{이름}}"으로 참조한다.
//
//   { "params": { "schema": {
//       "title": { "type": "text", "default": "신메뉴 출시", "label": "제목" },
//       "price": { "type": "number", "default": 4500, "min": 0, "max": 99999, "label": "가격" },
//       "accent": { "type": "color", "default": "#FF5A1F", "label": "강조색" },
//       "hero": { "type": "image", "default": "assets/hero.jpg", "label": "제품 사진" },
//       "tone": { "type": "enum", "default": "day", "options": ["day", "night"], "label": "톤" } } },
//     "clips": { "t1": { "type": "Text", "text": "{{title}}" }, "t2": { "type": "Text", "text": "가격 {{price}}원" } } }
//
//   node params.mjs project.json values.json --out project.v2.json   # 값 넣어 새 프로젝트
//   node params.mjs project.json --out project.default.json          # 기본값만으로
//
// 규칙: 값이 없으면 default. 문자열 전체가 "{{이름}}"이면 값의 타입 그대로(숫자는 숫자), 일부면 문자열로 치환.
// color는 CSS 색(#hex·rgb()·hsl()·이름)이 아니면 default + 경고, number는 min/max로 자름, enum은 options 밖이면 default + 경고.
// 모르는 이름은 그대로 두고 경고. 렌더·앱 가져오기(to-admaker-import.mjs) 전에 먼저 적용한다.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PARAM_TYPES = ["text", "color", "image", "video", "number", "enum"];
const REF_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;
const WHOLE_RE = /^\{\{\s*([\w.-]+)\s*\}\}$/;

// CSS Color Module Level 4 이름 색 (https://www.w3.org/TR/css-color-4/#named-colors)
const NAMED = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen transparent").split(" "));
const NUM = "[+-]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[+-]?\\d+)?";
const FUNC_RE = new RegExp(`^(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\\(\\s*(?:none|${NUM}(?:%|deg|rad|grad|turn)?)(?:\\s*[,\\s/]\\s*(?:none|${NUM}(?:%|deg|rad|grad|turn)?)){2,3}\\s*\\)$`, "i");

/** CSS 색 문자열인지 (#rgb·#rgba·#rrggbb·#rrggbbaa, rgb()/hsl() 등 함수형, 이름 색) */
export function isCssColor(v) {
  if (typeof v !== "string") return false;
  const s = v.trim();
  return /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s) || NAMED.has(s.toLowerCase()) || FUNC_RE.test(s);
}

/** schema 한 항목에 맞춰 값을 고른다. 잘못된 값은 default로 바꾸고 경고. */
function resolveValue(name, spec, value, warn) {
  const def = spec.default;
  if (value === undefined || value === null) return def;
  switch (spec.type) {
    case "number": {
      const n = typeof value === "number" ? value : Number(String(value).trim());
      if (!Number.isFinite(n)) { warn(`param "${name}": 숫자가 아님(${JSON.stringify(value)}) → 기본값 ${def}`); return def; }
      const lo = spec.min ?? -Infinity, hi = spec.max ?? Infinity;
      const c = Math.min(hi, Math.max(lo, n));
      if (c !== n) warn(`param "${name}": ${n}이 범위 [${spec.min ?? ""}, ${spec.max ?? ""}] 밖이라 ${c}로 맞춤`);
      return c;
    }
    case "color":
      if (!isCssColor(value)) { warn(`param "${name}": CSS 색이 아님(${JSON.stringify(value)}) → 기본값 ${def}`); return def; }
      return String(value).trim();
    case "enum":
      if (!(spec.options ?? []).includes(value)) { warn(`param "${name}": ${JSON.stringify(value)}는 options(${(spec.options ?? []).join(", ")}) 밖 → 기본값 ${def}`); return def; }
      return value;
    case "image":
    case "video":
      if (typeof value !== "string" || !value.trim()) { warn(`param "${name}": 경로·URL 문자열이 아님 → 기본값 ${def}`); return def; }
      return value;
    default: // text
      return String(value);
  }
}

/**
 * "{{이름}}" 참조를 값으로 바꾼 새 프로젝트를 돌려준다(원본은 그대로). params 블록은 남겨 둔다.
 * @param {object} project ProjectJSON (+ params.schema)
 * @param {Record<string, unknown>} [values]
 * @param {{ warn?: (msg: string) => void }} [opts]
 */
export function applyParams(project, values = {}, opts = {}) {
  const warn = opts.warn ?? ((m) => console.warn(`△ ${m}`));
  const schema = project?.params?.schema ?? {};
  for (const [name, spec] of Object.entries(schema)) {
    if (!PARAM_TYPES.includes(spec?.type)) warn(`param "${name}": type "${spec?.type}"은 ${PARAM_TYPES.join("|")} 중 하나가 아님 (text로 처리)`);
  }
  for (const name of Object.keys(values ?? {})) if (!(name in schema)) warn(`param "${name}": schema에 없는 값이라 무시`);

  const resolved = {};
  for (const [name, spec] of Object.entries(schema)) resolved[name] = resolveValue(name, { ...spec, type: PARAM_TYPES.includes(spec?.type) ? spec.type : "text" }, values?.[name], warn);

  const unknown = new Set();
  const has = (name) => name in resolved && resolved[name] !== undefined;
  const sub = (s) => {
    const whole = WHOLE_RE.exec(s);
    if (whole) {
      if (has(whole[1])) return resolved[whole[1]];
      unknown.add(whole[1]);
      return s;
    }
    return s.replace(REF_RE, (all, name) => {
      if (has(name)) return String(resolved[name]);
      unknown.add(name);
      return all;
    });
  };
  const walk = (v) => {
    if (typeof v === "string") return v.includes("{{") ? sub(v) : v;
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  const out = {};
  for (const [k, v] of Object.entries(project)) out[k] = k === "params" ? structuredClone(v) : walk(v);
  for (const name of unknown) warn(name in schema ? `param "${name}": 값도 기본값도 없어 "{{${name}}}"를 그대로 둠` : `param "${name}": schema에 없는 참조라 그대로 둠`);
  return out;
}

/** 프로젝트에 남은 "{{이름}}" 참조 목록 (validate용) */
export function paramRefs(project) {
  const refs = new Set();
  const walk = (v, key) => {
    if (key === "params") return;
    if (typeof v === "string") for (const m of v.matchAll(REF_RE)) refs.add(m[1]);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(project);
  return [...refs];
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const oi = args.indexOf("--out");
  const out = oi >= 0 ? args[oi + 1] : undefined;
  const [input, valuesFile] = args.filter((a, i) => !a.startsWith("--") && (oi < 0 || i !== oi + 1));
  if (!input || !out) {
    console.log("사용: node params.mjs project.json [values.json] --out out.json");
    process.exit(1);
  }
  const project = JSON.parse(fs.readFileSync(input, "utf8"));
  const values = valuesFile ? JSON.parse(fs.readFileSync(valuesFile, "utf8")) : {};
  fs.writeFileSync(out, JSON.stringify(applyParams(project, values), null, 2));
  console.log(`✓ ${out}`);
}
