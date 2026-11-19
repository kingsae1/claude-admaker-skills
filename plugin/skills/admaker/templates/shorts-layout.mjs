// 줄거리 쇼츠 9:16 레이아웃 — 위 검은 띠(훅 제목 1–2줄, 줄·단어별 색, 검은 외곽선) · 가운데 원본 영상 · 아래 검은 띠(작품명·시청처).
// references/recap-shorts.md §6. 순수 모듈 + CLI(파일·네트워크 없음, 결정적).
// 앱 admaker/src/services/admaker/mcpShortsLayout.ts(MCP apply_shorts_layout)와 같은 규칙 — 바꿀 때는 두 곳을 같이 고친다.
//
//   parseHookTitle(input, lineColors?) → 줄마다 [{ text, color }]   ("{red|1억}"으로 단어 색, 2줄 기본 형광 초록 → 노랑)
//   computeShortsLayout({ width, height, variant, titleLines }) → topBand·video·bottomBand·title·subtitle·show 상자(px)·warnings
//     variant: banded(위 22%·영상 58%·아래 20%) | wide(16:9 영상 폭 맞춤) | fullbleed(영상 화면 전체)
//              | news(남색 띠·16:9 영상·자막은 영상 아래 띠·제목 위 꼬리표 tagBox, references/news-shorts.md)
//   fitCropToRect(source, currentCrop, rect, focusX?, focusY?) → 원본에서 영상 자리 비율로 자를 영역(px)
//   containRect(media, box) → 로고 이미지를 상자 안에 비율 유지로
//   computeLandscapeLayout({ width, height, contentType }) → 16:9: 영상 전체 + 왼쪽 위 프로그램 로고 · 오른쪽 위 채널 로고(영화는 프로그램 로고 없음)
//
// CLI:  node shorts-layout.mjs [banded|wide|fullbleed|news] "줄1" "줄2" [--size 1080x1920]
//       node shorts-layout.mjs landscape [drama|movie|show] [--size 1920x1080]
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SHORTS_VARIANTS = ["banded", "wide", "fullbleed", "news"];
// 뉴스 쇼츠 — 남색 띠, 2줄 제목 흰색 → 하늘색, 굵은 고딕, 제목 위 빨간 꼬리표(속보 등)
export const NEWS_DEFAULTS = { bandColor: "#0B1736", lineColors: { 1: ["#FFFFFF"], 2: ["#FFFFFF", "#5CC8FF"], 3: ["#FFFFFF", "#FFFFFF", "#5CC8FF"] }, font: "NanumSquareNeo", fontWeight: 900, tagColor: "#E5212B" };
export const HOOK_COLORS = {
  white: "#FFFFFF",
  green: "#3CFF5A",
  yellow: "#FFE45C",
  red: "#FF3B30",
  mint: "#5CF2C9",
  orange: "#FF9F1C",
  pink: "#FF5FA2",
  sky: "#5CC8FF"
};
export const DEFAULT_LINE_COLORS = { 1: ["#FFFFFF"], 2: ["#3CFF5A", "#FFE45C"], 3: ["#FFFFFF", "#3CFF5A", "#FFE45C"] };
export function resolveColor(name, fallback) {
  if (!name) return fallback;
  const n = name.trim();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(n)) return n.toUpperCase();
  return HOOK_COLORS[n.toLowerCase()] ?? fallback;
}
export function parseHookTitle(input, lineColors, defaultsByCount = DEFAULT_LINE_COLORS) {
  const lines = (Array.isArray(input) ? input : String(input ?? "").split(/\r?\n/)).map((l) => String(l).trim()).filter(Boolean).slice(0, 3);
  const defaults = defaultsByCount[lines.length] ?? defaultsByCount[2] ?? DEFAULT_LINE_COLORS[2];
  return lines.map((line, li) => {
    const base = resolveColor(lineColors?.[li], defaults[li] ?? "#FFFFFF");
    const runs = [];
    const re = /\{([^|{}]+)\|([^{}]*)\}/g;
    let last = 0;
    let m;
    const push = (text, color) => {
      if (!text) return;
      const prev = runs[runs.length - 1];
      if (prev && prev.color === color) prev.text += text;
      else runs.push({ text, color });
    };
    while (m = re.exec(line)) {
      push(line.slice(last, m.index), base);
      push(m[2], resolveColor(m[1], base));
      last = m.index + m[0].length;
    }
    push(line.slice(last), base);
    return runs;
  });
}
export function titleLineLength(runs) {
  return Array.from(runs.map((r) => r.text).join("")).length;
}
export function computeShortsLayout(opts) {
  const W = Math.round(opts.width);
  const H = Math.round(opts.height);
  const variant = opts.variant && SHORTS_VARIANTS.includes(opts.variant) ? opts.variant : "banded";
  const warnings = [];
  if (!(H > W)) warnings.push(`\uCE94\uBC84\uC2A4\uAC00 \uC138\uB85C\uAC00 \uC544\uB2D9\uB2C8\uB2E4(${W}\xD7${H}) \u2014 \uC1FC\uCE20\uB294 1080\xD71920(9:16)`);
  const lines = opts.titleLines?.length ? opts.titleLines : [[{ text: "\uD6C5 \uC81C\uBAA9", color: "#FFFFFF" }]];
  const n = lines.length;
  const longest = Math.max(1, ...lines.map(titleLineLength));
  const lineHeight = 1.16;
  const pad = Math.round(H * 0.022);
  let topBand;
  let video;
  let bottomBand;
  if (variant === "fullbleed") {
    topBand = null;
    bottomBand = null;
    video = { x: 0, y: 0, width: W, height: H };
  } else if (variant === "wide" || variant === "news") {
    const vh = Math.round(W * 9 / 16);
    const top = Math.round(H * (variant === "news" ? 0.27 : 0.3));
    topBand = { x: 0, y: 0, width: W, height: top };
    video = { x: 0, y: top, width: W, height: vh };
    bottomBand = { x: 0, y: top + vh, width: W, height: H - top - vh };
  } else {
    const top = Math.round(H * 0.22);
    const vh = Math.round(H * 0.58);
    topBand = { x: 0, y: 0, width: W, height: top };
    video = { x: 0, y: top, width: W, height: vh };
    bottomBand = { x: 0, y: top + vh, width: W, height: H - top - vh };
  }
  const titleW = Math.round(W * 0.92);
  const bandH = topBand ? topBand.height : Math.round(H * 0.2);
  let fontSize = Math.min(W * 0.092, titleW / (longest * 0.95), (bandH - pad * 2) / (n * lineHeight));
  fontSize = Math.max(Math.round(W * 0.045), Math.round(fontSize));
  if (longest > 14) warnings.push(`\uC81C\uBAA9 \uD55C \uC904\uC774 ${longest}\uC790 \u2014 12\uC790 \uC548\uD30E\uC774 \uC77D\uAE30 \uC88B\uC2B5\uB2C8\uB2E4(\uAE00\uC790\uAC00 \uC791\uC544\uC9D0)`);
  if (n > 2) warnings.push("\uC81C\uBAA9\uC740 2\uC904\uAE4C\uC9C0\uAC00 \uC88B\uC2B5\uB2C8\uB2E4");
  const titleH = Math.round(n * fontSize * lineHeight);
  const titleY = topBand ? topBand.y + topBand.height - pad - titleH : Math.round(H * 0.07);
  const title = {
    box: { x: Math.round((W - titleW) / 2), y: Math.max(pad, titleY), width: titleW, height: titleH },
    fontSize,
    strokeWidth: Math.max(3, Math.round(fontSize * 0.09)),
    lineHeight
  };
  // 뉴스는 영상 아래 띠 위쪽에 굵게(영상 안 원본 하단 자막과 겹치지 않게)
  const subSize = Math.round(W * (variant === "news" ? 0.064 : variant === "wide" ? 0.046 : 0.052));
  const subW = Math.round(W * 0.88);
  const subH = Math.round(subSize * 2.5);
  const subY = variant === "fullbleed" ? Math.round(H * 0.68) : variant === "news" ? video.y + video.height + Math.round(H * 0.025) : video.y + video.height - subH - Math.round(video.height * 0.06);
  const subtitle = { box: { x: Math.round((W - subW) / 2), y: subY, width: subW, height: subH }, fontSize: subSize, strokeWidth: Math.max(2, Math.round(subSize * 0.1)) };
  const showSize = Math.round(W * 0.07);
  const tagSize = Math.round(W * 0.028);
  const showW = Math.round(W * 0.8);
  const blockH = Math.round(showSize * 1.25 + tagSize * 1.6);
  const blockY = bottomBand ? variant === "news" ? Math.min(H - blockH - pad, subY + subH + Math.round(H * 0.04)) : bottomBand.y + Math.round((bottomBand.height - blockH) * 0.42) : Math.round(H * 0.83);
  const show = {
    titleBox: { x: Math.round((W - showW) / 2), y: blockY, width: showW, height: Math.round(showSize * 1.25) },
    fontSize: showSize,
    taglineBox: { x: Math.round((W - showW) / 2), y: blockY + Math.round(showSize * 1.25), width: showW, height: Math.round(tagSize * 1.6) },
    taglineSize: tagSize
  };
  const tagH = Math.round(H * 0.045);
  const tagW = Math.round(W * 0.24);
  const tagBox = variant === "news" ? { x: Math.round((W - tagW) / 2), y: Math.max(Math.round(pad * 0.6), title.box.y - tagH - Math.round(pad * 0.5)), width: tagW, height: tagH } : null;
  return { variant, canvas: { width: W, height: H }, topBand, video, bottomBand, title, subtitle, show, tagBox, warnings };
}
export function fitCropToRect(source, current, rect, focusX = 0.5, focusY = 0.5) {
  const base = current && current.width > 0 && current.height > 0 ? current : { x: 0, y: 0, width: source.width, height: source.height };
  const r = rect.width / rect.height;
  let w = base.width;
  let h = base.height;
  if (w / h > r) w = h * r;
  else h = w / r;
  const fx = Math.min(1, Math.max(0, focusX));
  const fy = Math.min(1, Math.max(0, focusY));
  return {
    x: Math.round(base.x + (base.width - w) * fx),
    y: Math.round(base.y + (base.height - h) * fy),
    width: Math.round(w),
    height: Math.round(h)
  };
}
export function containRect(media, box) {
  const s = Math.min(box.width / media.width, box.height / media.height);
  const w = Math.round(media.width * s);
  const h = Math.round(media.height * s);
  return { x: Math.round(box.x + (box.width - w) / 2), y: Math.round(box.y + (box.height - h) / 2), width: w, height: h };
}

/** 16:9 가로 레이아웃 — 영상이 화면 전체, 왼쪽 위 프로그램 로고, 오른쪽 위 채널 로고 (contentType: movie면 프로그램 로고 없음) */
export function computeLandscapeLayout(opts) {
  const W = Math.round(opts.width);
  const H = Math.round(opts.height);
  const warnings = [];
  if (!(W > H)) warnings.push(`캔버스가 가로가 아닙니다(${W}×${H}) — 가로 하이라이트는 1920×1080(16:9)`);
  const mx = Math.round(W * 0.025);
  const my = Math.round(H * 0.035);
  const lw = Math.round(W * 0.2);
  const lh = Math.round(H * 0.08);
  const programLogo = opts.contentType === "movie" ? null : { x: mx, y: my, width: lw, height: lh };
  const channelLogo = { x: W - mx - lw, y: my, width: lw, height: lh };
  const subSize = Math.round(H * 0.052);
  const subW = Math.round(W * 0.8);
  const subH = Math.round(subSize * 2.5);
  const subtitle = { box: { x: Math.round((W - subW) / 2), y: Math.round(H * 0.9) - subH, width: subW, height: subH }, fontSize: subSize, strokeWidth: Math.max(2, Math.round(subSize * 0.1)) };
  return { canvas: { width: W, height: H }, video: { x: 0, y: 0, width: W, height: H }, programLogo, channelLogo, subtitle, warnings };
}

/** 로고를 상자 안에 비율 유지로 맞추고 바깥 가장자리에 붙임 */
export function anchorRect(media, box, align) {
  const r = containRect(media, box);
  if (align === "left") return { ...r, x: box.x };
  if (align === "right") return { ...r, x: box.x + box.width - r.width };
  return r;
}

function main(argv) {
  const args = argv.filter((a, i) => !(a === "--size" || argv[i - 1] === "--size"));
  const sizeArg = argv[argv.indexOf("--size") + 1];
  const [w, h] = argv.includes("--size") && /^\d+x\d+$/.test(sizeArg ?? "") ? sizeArg.split("x").map(Number) : [1080, 1920];
  if (args[0] === "landscape") {
    console.log(JSON.stringify(computeLandscapeLayout({ width: argv.includes("--size") ? w : 1920, height: argv.includes("--size") ? h : 1080, contentType: args[1] }), null, 2));
    return;
  }
  const variant = SHORTS_VARIANTS.includes(args[0]) ? args.shift() : "banded";
  if (!args.length) {
    console.log('usage: node shorts-layout.mjs [banded|wide|fullbleed|news] "줄1" "{red|강조} 줄2" [--size 1080x1920]');
    process.exit(0);
  }
  const titleLines = parseHookTitle(args, undefined, variant === "news" ? NEWS_DEFAULTS.lineColors : undefined);
  console.log(JSON.stringify({ titleLines, ...computeShortsLayout({ width: w, height: h, variant, titleLines }) }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
