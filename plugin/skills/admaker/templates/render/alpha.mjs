// 투명 배경 내보내기(--alpha)의 ffmpeg·zip 부분. render.mjs가 쓴다.
// 사양: admaker-plugin cleanroom/remotion/specs/transparent-export.md
//   prores → ProRes 4444 .mov (yuva444p10le, 오디오 pcm_s16le)
//   webm   → VP9 + 알파 .webm (yuva420p, 오디오 opus)
//   png    → PNG 시퀀스 zip (오디오 없음)
// 브라우저 VideoEncoder로는 알파를 인코딩하지 않는다(지원이 고르지 않음). 엔진은 프레임만 RGBA PNG로 넘긴다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const ALPHA_KINDS = ["prores", "webm", "png"];
const EXT = { prores: ".mov", webm: ".webm", png: ".zip" };

/** 출력 경로의 확장자를 형식에 맞춘다(out/logo.mp4 + prores → out/logo.mov). */
export function alphaOutPath(kind, outPath) {
  const ext = EXT[kind];
  return path.extname(outPath).toLowerCase() === ext ? outPath : outPath.slice(0, outPath.length - path.extname(outPath).length) + ext;
}

/** 쓸 형식을 정한다. ffmpeg에 libvpx-vp9가 없으면 webm 대신 prores로 바꾸고 경고를 돌려준다. */
export function pickAlphaKind(kind, encoders) {
  if (!ALPHA_KINDS.includes(kind)) throw new Error(`--alpha 는 ${ALPHA_KINDS.join("|")} 중 하나여야 합니다 (받은 값: ${kind})`);
  if (kind === "webm" && !/\blibvpx-vp9\b/.test(encoders)) {
    return { kind: "prores", warning: "ffmpeg에 libvpx-vp9 인코더가 없어 ProRes 4444(.mov)로 바꿔 내보냅니다" };
  }
  if (kind === "prores" && !/\bprores_ks\b/.test(encoders)) throw new Error("ffmpeg에 prores_ks 인코더가 없습니다");
  return { kind, warning: null };
}

/** 프레임 PNG(frame_000000.png …) + 선택 오디오 → 알파 영상 ffmpeg 인자. */
export function alphaEncodeArgs(kind, { framesDir, fps, audio = null, out }) {
  const input = ["-y", "-hide_banner", "-loglevel", "error", "-framerate", String(fps), "-i", path.join(framesDir, "frame_%06d.png")];
  if (audio) input.push("-i", audio);
  const map = audio ? ["-map", "0:v:0", "-map", "1:a:0", "-shortest"] : ["-map", "0:v:0"];
  if (kind === "prores") {
    return [...input, ...map, "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", ...(audio ? ["-c:a", "pcm_s16le"] : []), out];
  }
  if (kind === "webm") {
    return [...input, ...map, "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-auto-alt-ref", "0", "-b:v", "0", "-crf", "24", ...(audio ? ["-c:a", "libopus"] : []), out];
  }
  throw new Error(`ffmpeg 인코딩이 없는 형식: ${kind}`);
}

/** ffprobe 결과(첫 영상 스트림)에 알파가 있는지. VP9는 pix_fmt가 yuv420p로 보이고 alpha_mode=1 태그가 붙는다. */
export function streamHasAlpha(stream) {
  if (!stream) return false;
  if (/^(yuva|rgba|bgra|argb|abgr|gbrap|ya)/.test(String(stream.pix_fmt ?? ""))) return true;
  const tags = Object.fromEntries(Object.entries(stream.tags ?? {}).map(([k, v]) => [k.toLowerCase(), String(v)]));
  return tags.alpha_mode === "1";
}

/** ffprobe로 첫 영상 스트림을 읽는다. */
export function probeVideo(file, ffprobe = "ffprobe") {
  const json = JSON.parse(execFileSync(ffprobe, ["-v", "error", "-select_streams", "v:0", "-show_streams", "-of", "json", file], { encoding: "utf8" }));
  return json.streams?.[0] ?? null;
}

/**
 * 결과 확인: 알파가 없으면 실패. 인코딩은 prores → yuva444p10le, webm → yuva420p 로 한다.
 * ffprobe는 디코더 출력 형식을 보여 주므로 ProRes 4444는 yuva444p12le로 보일 수 있고, VP9 알파는 yuv420p + alpha_mode=1로 보인다.
 */
export function assertAlpha(kind, file, ffprobe = "ffprobe") {
  const s = probeVideo(file, ffprobe);
  if (!streamHasAlpha(s)) throw new Error(`${file}: 알파 채널이 없습니다 (pix_fmt=${s?.pix_fmt}, tags=${JSON.stringify(s?.tags ?? {})})`);
  if (kind === "prores" && !/^yuva444p1[02]le$/.test(s.pix_fmt)) throw new Error(`${file}: pix_fmt ${s.pix_fmt} (기대 yuva444p10le)`);
  return s;
}

// --- PNG 시퀀스 zip (압축 없음: PNG는 이미 압축돼 있다) ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** [{ name, data: Buffer }] → stored(무압축) zip Buffer. 파일 수·크기는 zip32 범위(65535개, 4GB) 안. */
export function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 이름
    local.writeUInt16LE(0, 8); // stored
    local.writeUInt32LE(0, 10); // 시간·날짜 0 (결정적)
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBuf, data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

/** framesDir의 frame_*.png 를 zip 하나로. */
export function zipFrames(framesDir, out) {
  const names = fs.readdirSync(framesDir).filter((n) => /^frame_\d+\.png$/.test(n)).sort();
  fs.writeFileSync(out, zipStore(names.map((name) => ({ name, data: fs.readFileSync(path.join(framesDir, name)) }))));
  return names.length;
}

/** 프레임 폴더(+오디오)를 형식대로 묶고 알파를 확인한다. 돌려주는 값은 실제 출력 경로. */
export function encodeAlpha(kindWanted, { framesDir, fps, audio = null, outPath, ffmpeg = "ffmpeg", ffprobe = "ffprobe", log = console.warn }) {
  const encoders = kindWanted === "png" ? "" : execFileSync(ffmpeg, ["-hide_banner", "-encoders"], { encoding: "utf8" });
  const { kind, warning } = kindWanted === "png" ? { kind: "png", warning: null } : pickAlphaKind(kindWanted, encoders);
  if (warning) log(`경고: ${warning}`);
  const out = alphaOutPath(kind, outPath);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  if (kind === "png") {
    zipFrames(framesDir, out);
    return { kind, out };
  }
  execFileSync(ffmpeg, alphaEncodeArgs(kind, { framesDir, fps, audio, out }), { stdio: ["ignore", "inherit", "inherit"] });
  assertAlpha(kind, out, ffprobe);
  return { kind, out };
}
