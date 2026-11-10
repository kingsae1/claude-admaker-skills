// 변주 카드 CLI: 고른 모션 방향 안에서 구도·글자·그래픽·빛·카메라·전환·색·리듬을 광고마다 다르게 뽑고, 만든 광고를 기록해 다음 광고가 겹치지 않게 한다.
// 사용:
//   node variety.mjs card <방향 id | free> [--seed N] [--request "요청 문장"] [--json]   # 카드 한 장 (최근 기록과 겹치는 칸, 분위기에 안 맞는 칸은 피함)
//   node variety.mjs record <카드 JSON 파일 | -> [--title "광고 이름"]   # 만든 광고의 카드를 기록
//   node variety.mjs history                                       # 최근 기록과 서로 닮은 정도
//   node variety.mjs axes [방향 id]                                # 축과 칸 목록
// 기록 위치: --history <파일> > ADMAKER_VARIETY_HISTORY > ~/.admaker/variety-history.json (앱 MCP get_gallery와 같은 파일)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { AXES, cardText, drawCard, historyEntry, optionsFor, similarity } from "./variety-core.mjs";

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
const seedArg = flag("seed");
const title = flag("title");
const requestArg = flag("request");
const asJson = has("json");
const [cmd, arg] = args;

const readHistory = () => {
  try {
    return JSON.parse(fs.readFileSync(HISTORY, "utf8")).items ?? [];
  } catch {
    return [];
  }
};

if (cmd === "card") {
  const card = drawCard({ direction: arg ?? "free", seed: seedArg ? Number(seedArg) : undefined, history: readHistory(), request: requestArg });
  if (asJson) console.log(JSON.stringify(card, null, 2));
  else {
    console.log(cardText(card));
    console.log(`\n최근 광고와 가장 닮은 정도: ${Math.round(card.maxSimilarity * 100)}% (50% 미만이 목표)`);
    console.log(`기록: node variety.mjs card ${card.direction} --seed ${card.seed} --json > variety.json && node variety.mjs record variety.json`);
  }
} else if (cmd === "record") {
  if (!arg) throw new Error("기록할 카드 JSON 파일을 주세요 (- 이면 표준 입력)");
  const card = JSON.parse(fs.readFileSync(arg === "-" ? 0 : arg, "utf8"));
  const items = [...readHistory(), historyEntry(card, title ? { title } : {})].slice(-50);
  fs.mkdirSync(path.dirname(HISTORY), { recursive: true });
  fs.writeFileSync(HISTORY, JSON.stringify({ items }, null, 2));
  console.log(`✓ 기록 ${items.length}개 (${HISTORY})`);
} else if (cmd === "history") {
  const items = readHistory();
  if (!items.length) console.log("기록 없음");
  items.slice(-10).forEach((h, i, arr) => {
    const prev = arr.slice(0, i);
    const near = Math.max(0, ...prev.map((p) => similarity(h, p)));
    const sameIdea = h.idea && prev.some((p) => p.idea === h.idea);
    console.log(`${h.at?.slice(0, 10) ?? "-"} ${h.direction}${h.idea ? ` · ${h.idea}` : ""} ${h.title ?? ""} — 앞 광고와 최대 ${Math.round(near * 100)}%${sameIdea ? " (아이디어가 앞 광고와 같음)" : ""}`);
  });
} else if (cmd === "axes") {
  for (const a of AXES) {
    const opts = arg ? optionsFor(a, arg) : a.options;
    console.log(`${a.label} (${a.id}): ${opts.map((o) => o.label).join(" / ")}`);
  }
} else {
  console.log("사용: node variety.mjs card <방향> | record <카드.json> | history | axes [방향]");
  process.exit(cmd ? 1 : 0);
}
