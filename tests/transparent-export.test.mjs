// 수용 기준 검사 — transparent-export (admaker-plugin cleanroom/remotion/specs/transparent-export.md)
// node --test tests/*.test.mjs
// 엔진 쪽(모서리 알파 0, 원 중심 (255,0,0,255), 가장자리 straight 알파)은 엔진 저장소 tests/transparent-export.test.ts가 본다.
// 여기서는 렌더 하네스의 ffmpeg 경로: pix_fmt, VP9 폴백, PNG zip.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  alphaEncodeArgs,
  alphaOutPath,
  crc32,
  encodeAlpha,
  pickAlphaKind,
  probeVideo,
  streamHasAlpha,
  zipStore,
} from "../plugin/skills/admaker/templates/render/alpha.mjs";

const has = (bin) => {
  try {
    execFileSync(bin, [bin.startsWith("python") ? "--version" : "-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const FF = has("ffmpeg") && has("ffprobe");
const encoders = FF ? execFileSync("ffmpeg", ["-hide_banner", "-encoders"], { encoding: "utf8" }) : "";

test("출력 확장자: prores → .mov, webm → .webm, png → .zip", () => {
  assert.equal(alphaOutPath("prores", "out/logo.mp4"), "out/logo.mov");
  assert.equal(alphaOutPath("webm", "out/logo.mov"), "out/logo.webm");
  assert.equal(alphaOutPath("png", "out/logo"), "out/logo.zip");
  assert.equal(alphaOutPath("prores", "out/logo.MOV"), "out/logo.MOV");
});

test("ffmpeg 인자: 사양의 코덱·픽셀 형식·오디오 코덱", () => {
  const p = alphaEncodeArgs("prores", { framesDir: "f", fps: 30, audio: "a.mp4", out: "o.mov" }).join(" ");
  assert.match(p, /-c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le/);
  assert.match(p, /-c:a pcm_s16le/);
  const w = alphaEncodeArgs("webm", { framesDir: "f", fps: 24, audio: "a.mp4", out: "o.webm" }).join(" ");
  assert.match(w, /-c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0/);
  assert.match(w, /-c:a libopus/);
  assert.match(w, /-framerate 24/);
  const silent = alphaEncodeArgs("webm", { framesDir: "f", fps: 30, out: "o.webm" }).join(" ");
  assert.doesNotMatch(silent, /-c:a|1:a/);
});

test("libvpx-vp9가 없으면 webm → prores + 경고, 잘못된 형식은 오류", () => {
  assert.deepEqual(pickAlphaKind("webm", " V....D libvpx-vp9  libvpx VP9\n VFS... prores_ks"), { kind: "webm", warning: null });
  const r = pickAlphaKind("webm", " VFS... prores_ks  Apple ProRes");
  assert.equal(r.kind, "prores");
  assert.match(r.warning, /libvpx-vp9/);
  assert.throws(() => pickAlphaKind("gif", ""), /prores\|webm\|png/);
});

test("알파 판정: yuva*, 또는 VP9 alpha_mode=1 태그", () => {
  assert.equal(streamHasAlpha({ pix_fmt: "yuva444p10le" }), true);
  assert.equal(streamHasAlpha({ pix_fmt: "yuv420p", tags: { alpha_mode: "1" } }), true);
  assert.equal(streamHasAlpha({ pix_fmt: "yuv420p", tags: { ALPHA_MODE: "1" } }), true);
  assert.equal(streamHasAlpha({ pix_fmt: "yuv420p" }), false);
  assert.equal(streamHasAlpha(null), false);
});

test("PNG zip: 표준 zip으로 열리고 내용·CRC가 같다", { skip: !has("python3") }, () => {
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-zip-"));
  const files = [
    { name: "frame_000000.png", data: Buffer.from([1, 2, 3]) },
    { name: "frame_000001.png", data: Buffer.alloc(1000, 7) },
  ];
  const zip = path.join(dir, "a.zip");
  fs.writeFileSync(zip, zipStore(files));
  const out = execFileSync("python3", ["-I", "-c", "import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(','.join(f'{i.filename}:{len(z.read(i))}' for i in z.infolist()))", zip], { encoding: "utf8" }).trim();
  assert.equal(out, "frame_000000.png:3,frame_000001.png:1000");
  fs.rmSync(dir, { recursive: true, force: true });
});

// 빈 배경 + 가운데 빨간 원 RGBA 프레임을 ffmpeg로 만들고 하네스 인코딩 → ffprobe pix_fmt, 디코드 픽셀
function circleFrames(dir, n = 6, size = 64) {
  const r = size * 0.3;
  const c = size / 2;
  execFileSync("ffmpeg", [
    "-loglevel", "error", "-y", "-f", "lavfi", "-i", `color=c=black@0:s=${size}x${size}:r=30:d=${n / 30},format=rgba`,
    "-vf", `geq=r='255':g='0':b='0':a='if(lte(hypot(X-${c},Y-${c}),${r}),255,0)'`,
    "-frames:v", String(n), "-start_number", "0", path.join(dir, "frame_%06d.png"), // 하네스처럼 0부터
  ]);
}
function decodeRGBA(file, size, vp9) {
  return execFileSync("ffmpeg", ["-loglevel", "error", ...(vp9 ? ["-c:v", "libvpx-vp9"] : []), "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"], { maxBuffer: size * size * 4 + 1024 });
}

for (const kind of ["prores", "webm"]) {
  const skip = !FF || (kind === "webm" ? !/libvpx-vp9/.test(encoders) : !/prores_ks/.test(encoders));
  test(`ffmpeg ${kind}: 알파가 남고 모서리 알파 0 · 원 중심 빨강`, { skip }, () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), `alpha-${kind}-`));
    const frames = path.join(dir, "frames");
    fs.mkdirSync(frames);
    circleFrames(frames);
    const audio = path.join(dir, "tone.wav");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", audio]);
    const { kind: used, out } = encodeAlpha(kind, { framesDir: frames, fps: 30, audio, outPath: path.join(dir, "out.mp4"), log: () => {} });
    assert.equal(used, kind);
    const s = probeVideo(out);
    if (kind === "prores") {
      assert.equal(s.codec_name, "prores");
      // 인코딩은 yuva444p10le; ffprobe는 디코더 출력(12비트)으로 보여 줄 수 있다
      assert.match(s.pix_fmt, /^yuva444p1[02]le$/);
    } else {
      assert.equal(s.codec_name, "vp9");
      assert.ok(s.pix_fmt === "yuva420p" || s.tags?.alpha_mode === "1", JSON.stringify(s));
    }
    const audioCodec = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_streams", "-of", "json", out], { encoding: "utf8" })).streams[0]?.codec_name;
    assert.equal(audioCodec, kind === "prores" ? "pcm_s16le" : "opus");
    const px = decodeRGBA(out, 64, kind === "webm");
    const at = (x, y) => [...px.subarray((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)];
    assert.ok(at(0, 0)[3] <= 2, `corner ${at(0, 0)}`);
    const [r, g, b, a] = at(32, 32);
    assert.ok(a >= 250 && r >= 240 && g <= 20 && b <= 20, `centre ${[r, g, b, a]}`);
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

test("png: 프레임 zip, ffmpeg 없이도 된다", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "alpha-png-"));
  const frames = path.join(dir, "frames");
  fs.mkdirSync(frames);
  for (let i = 0; i < 3; i++) fs.writeFileSync(path.join(frames, `frame_${String(i).padStart(6, "0")}.png`), Buffer.from([i]));
  fs.writeFileSync(path.join(frames, "audio.mp4"), "x");
  const { kind, out } = encodeAlpha("png", { framesDir: frames, fps: 30, outPath: path.join(dir, "seq.mov"), ffmpeg: "/nonexistent/ffmpeg" });
  assert.equal(kind, "png");
  assert.equal(path.basename(out), "seq.zip");
  const buf = fs.readFileSync(out);
  assert.equal(buf.readUInt16LE(buf.length - 22 + 10), 3); // 파일 3개 (audio.mp4 제외)
  fs.rmSync(dir, { recursive: true, force: true });
});
