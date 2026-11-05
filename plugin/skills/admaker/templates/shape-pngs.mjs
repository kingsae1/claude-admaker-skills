// 간단한 도형 PNG 여러 장을 한 번에 만든다 — 시트 한 장에 모두 그려 한 번 래스터화하고 칸마다 잘라 저장한다.
// 사용: node shape-pngs.mjs shapes.json out/shapes [--scale 2] [--gap 4] [--sheet]
//   shapes.json: [{ "name": "star-gold", "shape": "star", "width": 256, "height": 256, "fill": "#FFC83D" }, …]
//                또는 { "items": [...], "scale": 2 }. 항목 규칙은 shape-sheet.mjs 머리말.
//   --sheet: 잘라 내기 전 시트 그림(_sheet-1.png …)도 남긴다(검수·시트 한 장 재사용)
// 결과: out/shapes/<name>.png 와 out/shapes/shapes.json(이름·크기·경로, 시트 안 칸 좌표 crop)
// 필요: playwright (install-engine.mjs --render 로 프로젝트 폴더에 설치). Chromium 한 번만 띄운다.
// admaker 앱 MCP가 연결되어 있으면 이 스크립트 대신 make_shape_pngs 도구를 써도 된다(설치 없이 앱이 그린다).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { buildShapeSheets, rasterizeSheets } from "./shape-sheet.mjs";

const [specFile, outDir = "out/shapes", ...rest] = process.argv.slice(2);
if (!specFile) {
  console.error("사용: node shape-pngs.mjs shapes.json out/shapes [--scale 2] [--gap 4] [--sheet]");
  process.exit(1);
}
const flag = (n) => rest.includes(`--${n}`);
const opt = (n) => {
  const i = rest.indexOf(`--${n}`);
  return i >= 0 ? rest[i + 1] : undefined;
};

const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
const items = Array.isArray(spec) ? spec : spec.items;
const options = { scale: opt("scale") ?? spec.scale, gap: opt("gap") ?? spec.gap, background: spec.background };

/** 프로젝트 폴더(cwd)의 playwright를 먼저 찾는다 — 스킬 폴더에서 바로 실행해도 되게 */
async function loadPlaywright() {
  try {
    const resolved = createRequire(path.join(process.cwd(), "noop.js")).resolve("playwright");
    return await import(pathToFileURL(resolved).href);
  } catch {
    try {
      return await import("playwright");
    } catch {
      console.error("playwright가 없습니다. 프로젝트 폴더에서 node <스킬 폴더>/templates/install-engine.mjs --render 로 설치하거나, admaker 앱 MCP의 make_shape_pngs를 쓰세요.");
      process.exit(1);
    }
  }
}

const t0 = Date.now();
const { sheets, cells } = buildShapeSheets(items, options);
const pw = await loadPlaywright();
const chromium = pw.chromium ?? pw.default?.chromium;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><body></body></html>");
  const result = await page.evaluate(([s, o]) => {
    // rasterizeSheets 본문을 그대로 넘긴다 (모듈 함수는 직렬화해서 보냄)
    return new Function(`return (${o.fn})`)()(s, { keepSheet: o.keepSheet });
  }, [sheets, { fn: rasterizeSheets.toString(), keepSheet: flag("sheet") }]);

  fs.mkdirSync(outDir, { recursive: true });
  const files = result.pngs.map(({ index, dataUrl }) => {
    const c = cells[index];
    const file = path.join(outDir, `${c.name}.png`);
    fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
    const cell = sheets[c.sheet].cells.find((x) => x.index === index);
    // sheet·crop: 시트 한 장을 같이 쓰고 위치만 달리할 때의 칸 좌표 (시트 픽셀, crop_clip의 crop과 같은 공간)
    return { name: c.name, width: c.width, height: c.height, path: file, sheet: `_sheet-${c.sheet + 1}.png`, crop: { x: cell.x, y: cell.y, width: cell.w, height: cell.h } };
  });
  result.sheets.forEach((d, i) => d && fs.writeFileSync(path.join(outDir, `_sheet-${i + 1}.png`), Buffer.from(d.split(",")[1], "base64")));
  fs.writeFileSync(path.join(outDir, "shapes.json"), JSON.stringify(files, null, 2) + "\n");
  console.log(`${files.length}장 → ${outDir} (시트 ${sheets.length}장, 래스터화 ${result.ms}ms, 전체 ${Date.now() - t0}ms)`);
} finally {
  await browser.close();
}
