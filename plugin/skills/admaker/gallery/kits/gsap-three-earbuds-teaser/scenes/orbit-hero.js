// three 커스텀 씬 "orbit-hero": 크롬 링 + 유리 링 + 광택 코어 + 궤도 구슬. 배경 투명(소재 위 ③층).
// 카메라·링 안무는 멈춘 GSAP 타임라인을 clip 시간으로 맞춘다(references/gsap.md §7, three.md §6).
// params: { accent: "#FF5A36", seed: 7, beats: [초...] }
import { gsap } from "gsap/gsap-core";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// 시드 RNG: 같은 seed면 매번 같은 배치 (Math.random 금지)
const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

export default async function setup({ THREE, params }) {
  const accent = new THREE.Color(params.accent ?? "#FF5A36");
  const rand = rng(params.seed ?? 7);
  const beats = Array.isArray(params.beats) ? params.beats : [];

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const rig = new THREE.Group();
  scene.add(rig);

  // 재질 (three.md §4 값)
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.8, ior: 1.5,
    attenuationColor: accent.clone().lerp(new THREE.Color(0xffffff), 0.6), attenuationDistance: 2.5 });
  const core = new THREE.MeshPhysicalMaterial({ color: accent, metalness: 0, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });

  const outer = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.07, 48, 200), chrome);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.16, 48, 160), glass);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.42, 96, 64), core);
  rig.add(outer, inner, ball);

  // 궤도 구슬: 배치만 난수, 움직임은 time의 함수
  const beadGeo = new THREE.SphereGeometry(1, 32, 24);
  const beads = [];
  for (let i = 0; i < 9; i++) {
    const m = new THREE.Mesh(beadGeo, i % 3 === 0 ? core : chrome);
    const r = 1.55 + rand() * 0.5, s = 0.035 + rand() * 0.04, phase = rand() * Math.PI * 2, tilt = (rand() - 0.5) * 0.9, speed = 0.35 + rand() * 0.35;
    m.scale.setScalar(s);
    beads.push({ m, r, phase, tilt, speed });
    rig.add(m);
  }

  // 조명: 환경광(attach) + 키·림 약하게 (형태만)
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2, 3, 3);
  const rimL = new THREE.DirectionalLight(accent, 1.4); rimL.position.set(-3, 1, -2);
  scene.add(key, rimL, new THREE.HemisphereLight(0xffffff, 0x222233, 0.4));

  // GSAP 안무: 카메라 다가가기 → 올려다보기, 링 세우기. 멈춘 타임라인, 글로벌에서 뗌
  const st = { camZ: 8.5, camY: 1.6, ringTilt: 1.25, innerTilt: -0.6, spin: 0 };
  const tl = gsap.timeline({ paused: true });
  gsap.globalTimeline.remove(tl);
  tl.to(st, { camZ: 5.6, duration: 2.4, ease: "power2.inOut" }, 0)
    .to(st, { camY: 0.35, duration: 1.6, ease: "power1.inOut" }, "<0.5")
    .to(st, { ringTilt: 0.35, duration: 1.4, ease: "back.out(1.4)" }, "<0.2")
    .to(st, { innerTilt: 0.25, duration: 1.2, ease: "power3.out" }, "<0.15")
    .to(st, { spin: Math.PI * 2, duration: 6, ease: "none" }, 0);
  tl.time(tl.duration(), true);
  tl.time(0, true);

  // 비트 펄스: 가장 최근 비트로부터 지난 시간으로 계산 (이전 프레임 상태 없음)
  const pulse = (t) => {
    let last = -Infinity;
    for (const b of beats) if (b <= t) last = b;
    const d = t - last;
    return d >= 0 && d < 0.35 ? Math.exp(-d * 9) : 0;
  };

  let env = null;
  return {
    scene, camera,
    background: null,
    toneMapping: THREE.ACESFilmicToneMapping,
    exposure: 1.05,
    width: 1080, height: 1080,
    attach(renderer) {
      env?.dispose();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      env = pmrem.fromScene(room, 0.04).texture;
      pmrem.dispose();
      scene.environment = env;
    },
    update({ time }) {
      tl.time(Math.min(time, tl.duration()), true);
      camera.position.set(0, st.camY, st.camZ);
      camera.lookAt(0, 0, 0);
      outer.rotation.set(st.ringTilt, st.spin * 0.5, 0);
      inner.rotation.set(st.innerTilt + 1.2, -st.spin * 0.35, 0.3);
      const p = pulse(time);
      ball.scale.setScalar(1 + p * 0.12);
      core.emissive.copy(accent).multiplyScalar(p * 0.35);
      rig.rotation.y = st.spin * 0.15;
      for (const b of beads) {
        const a = b.phase + time * b.speed * Math.PI;
        b.m.position.set(Math.cos(a) * b.r, Math.sin(a) * b.r * Math.sin(b.tilt), Math.sin(a) * b.r * Math.cos(b.tilt));
      }
    },
    destroy() {
      env?.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); });
      chrome.dispose(); glass.dispose(); core.dispose();
    },
  };
}

export const options = { fps: 30 };
