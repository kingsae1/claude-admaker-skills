// 효과음 파일의 피크 지연을 잰다 (sfx.md §5, aesthetic-rules S5).
// 앱 AI 효과음·사용자 소재·gen-audio-kit 합성음 모두 같은 방법으로 잰다. ffmpeg가 있어야 한다.
// 사용: node sfx-peak.mjs <파일...> [--out sfx/PEAK.json] [--sfx sfx.json]
//   --out  결과를 { "파일 이름": 피크 지연(초) } 로 합쳐 쓴다 (gen-audio-kit의 PEAK.json과 같은 모양)
//   --sfx  sfx.json에서 file이 같은 줄의 peakLagMs를 잰 값으로 채운다
// 피크 지연 = 파일 시작부터 소리가 가장 큰 순간(10ms 창 RMS 최대)까지. 시작 무음 길이(onset)도 같이 출력한다.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SR = 44100;
const WIN = Math.round(SR * 0.01);

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  if (i < 0) return undefined;
  const v = args[i + 1];
  args.splice(i, 2);
  return v;
};
const outPath = opt("--out");
const sfxPath = opt("--sfx");
if (!args.length) {
  console.error("사용: node sfx-peak.mjs <파일...> [--out sfx/PEAK.json] [--sfx sfx.json]");
  process.exit(1);
}

/** ffmpeg로 mono f32 PCM을 받아 RMS 피크와 onset(피크의 10%를 처음 넘는 시각)을 잰다. */
function measure(file) {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], {
    maxBuffer: 1 << 30,
  });
  const pcm = new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.length - (raw.length % 4)));
  const rms = [];
  for (let i = 0; i + WIN <= pcm.length; i += WIN) {
    let s = 0;
    for (let j = i; j < i + WIN; j++) s += pcm[j] * pcm[j];
    rms.push(Math.sqrt(s / WIN));
  }
  let peakIdx = 0;
  rms.forEach((v, i) => { if (v > rms[peakIdx]) peakIdx = i; });
  const max = rms[peakIdx] ?? 0;
  const onsetIdx = Math.max(0, rms.findIndex((v) => v >= max * 0.1));
  // 창 가운데를 그 창의 시각으로 본다
  const t = (idx) => +((idx * WIN + WIN / 2) / SR).toFixed(3);
  return { peakSec: t(peakIdx), onsetSec: t(onsetIdx), durationSec: +(pcm.length / SR).toFixed(3), peakDb: +(20 * Math.log10(max || 1e-9)).toFixed(1) };
}

const results = {};
for (const file of args) {
  const m = measure(file);
  results[path.basename(file)] = m;
  console.log(`${file}\tpeak ${m.peakSec}s\tonset ${m.onsetSec}s\tlen ${m.durationSec}s\t${m.peakDb} dBFS`);
  // 타격음(바로 피크)인데 앞에 무음이 길면 경고. riser·whoosh처럼 서서히 커지는 소리는 경고하지 않는다.
  if (m.onsetSec > 0.15 && m.peakSec - m.onsetSec < 0.1)
    console.warn(`  ! 타격 앞 무음 ${m.onsetSec}s: 프롬프트에 "starts immediately"를 넣어 다시 만들거나 앞을 잘라 쓰세요.`);
}

if (outPath) {
  const prev = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
  for (const [name, m] of Object.entries(results)) prev[name] = m.peakSec;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(prev, null, 2));
  console.log(`→ ${outPath}`);
}

if (sfxPath) {
  const rows = JSON.parse(fs.readFileSync(sfxPath, "utf8"));
  let n = 0;
  for (const row of rows) {
    const m = results[path.basename(row.file ?? "")];
    if (m) { row.peakLagMs = Math.round(m.peakSec * 1000); n++; }
  }
  fs.writeFileSync(sfxPath, JSON.stringify(rows, null, 2));
  console.log(`→ ${sfxPath} (${n}줄 peakLagMs 갱신)`);
}
