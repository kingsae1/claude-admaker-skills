// 아이디어 카드 CLI: 요청에 맞는 이야기 장치를 뽑고(draw), 고른 아이디어·로그라인·문구가 말이 되는지 검사한다(check). references/ideas.md
// 사용:
//   node idea.mjs draw "카페 신메뉴 15초 광고" [--n 3] [--seed N] [--json]   # 최근 기록(variety-history.json)에 쓴 아이디어는 피함
//   node idea.mjs check concept.json                                     # { request, idea, logline, product, benefits, copy, evidence }
//   node idea.mjs list
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { IDEAS, checkConcept, drawIdea, ideaText } from "./idea-core.mjs";

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const has = (name) => {
  const i = args.indexOf(`--${name}`);
  if (i >= 0) args.splice(i, 1);
  return i >= 0;
};
const HISTORY = flag("history") ?? process.env.ADMAKER_VARIETY_HISTORY ?? path.join(os.homedir(), ".admaker", "variety-history.json");
const n = Number(flag("n", 3));
const seed = flag("seed");
const asJson = has("json");
const [cmd, ...rest] = args;
const history = (() => {
  try {
    return JSON.parse(fs.readFileSync(HISTORY, "utf8")).items ?? [];
  } catch {
    return [];
  }
})();

if (cmd === "draw") {
  const request = rest.join(" ").trim();
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(drawIdea({ request, history, exclude: picked, seed: seed ? Number(seed) + i * 104729 : undefined }));
  if (asJson) console.log(JSON.stringify(picked, null, 2));
  else picked.forEach((idea, i) => console.log(`${i + 1}. ${ideaText(idea)}${idea.why.length ? `\n- 맞는 낱말: ${idea.why.join(", ")}` : "\n- 기본 후보"}\n`));
} else if (cmd === "check") {
  if (!rest[0]) throw new Error("검사할 JSON 파일을 주세요 (- 이면 표준 입력)");
  const input = JSON.parse(fs.readFileSync(rest[0] === "-" ? 0 : rest[0], "utf8"));
  const r = checkConcept(input);
  if (asJson) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(r.ok ? "✓ 기계 검사 통과" : `✗ 고칠 것 ${r.problems.length}개`);
    r.problems.forEach((p) => console.log(`  - ${p}`));
    console.log("직접 답할 질문 (씬표 아래에 답을 적음):");
    r.questions.forEach((q, i) => console.log(`  ${i + 1}. ${q}`));
  }
  process.exit(r.ok ? 0 : 1);
} else if (cmd === "list") {
  for (const i of IDEAS) console.log(`${i.id.padEnd(18)} ${i.name}${i.generic ? " (기본)" : ""}\n${" ".repeat(19)}${i.line}`);
} else {
  console.log("사용: node idea.mjs draw <요청> | check <concept.json> | list");
  process.exit(cmd ? 1 : 0);
}
