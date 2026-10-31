// 광고 프로젝트 폴더에 admaker 엔진(@admaker/core·engine·animation)을 설치한다.
// 엔진은 비공개 패키지라 npm 레지스트리에 없다. admaker 데스크톱 앱의 "스킬 설치" 버튼이
// 스킬 폴더의 vendor/ 에 패키지 파일(.tgz)과 packages.json 을 같이 넣어 두므로 그걸 쓴다.
//
// 사용 (광고 프로젝트 폴더에서):
//   node install-engine.mjs              # 엔진만
//   node install-engine.mjs --render     # 렌더 하니스용 vite·playwright 도 같이
// vendor 위치를 바꾸려면 ADMAKER_ENGINE_VENDOR=<폴더>.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
const candidates = [
  process.env.ADMAKER_ENGINE_VENDOR,
  path.resolve(here, "..", "vendor"), // 스킬 폴더의 templates/ 에서 바로 돌릴 때
  path.join(claudeDir, "skills", "admaker", "vendor"),
].filter(Boolean);

const vendor = candidates.find((dir) => fs.existsSync(path.join(dir, "packages.json")));
if (!vendor) {
  console.error("엔진 패키지를 찾지 못했습니다. admaker 앱의 MCP 메뉴 → Claude와 연결하기 → Claude Code 탭에서 '스킬 설치'를 눌러 주세요.");
  console.error("찾아본 곳:\n  " + candidates.join("\n  "));
  process.exit(1);
}

const { packages } = JSON.parse(fs.readFileSync(path.join(vendor, "packages.json"), "utf8"));
// 프로젝트 안 vendor/ 로 복사해 package.json 에 상대 경로(file:vendor/...)로 남긴다 — 스킬을 업데이트해도 이 프로젝트는 그대로
const localVendor = path.resolve("vendor");
fs.mkdirSync(localVendor, { recursive: true });
const specs = packages.map((p) => {
  fs.copyFileSync(path.join(vendor, p.file), path.join(localVendor, p.file));
  return `./vendor/${p.file}`;
});
if (!fs.existsSync("package.json")) fs.writeFileSync("package.json", JSON.stringify({ name: path.basename(process.cwd()), private: true, type: "module" }, null, 2) + "\n");

const extra = process.argv.includes("--render") ? ["vite", "playwright"] : [];
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
// 엔진이 @admaker/core 를 버전으로 찾으므로 세 패키지를 한 번에 설치한다
execFileSync(npm, ["install", "--no-audit", "--no-fund", ...specs, ...extra], { stdio: "inherit", shell: process.platform === "win32" });
console.log(`설치했습니다: ${packages.map((p) => `${p.name}@${p.version}`).join(", ")}`);
