// three 커스텀 씬 "liquid-blobs": 광택 액체 방울들이 일렁이며 서로 붙었다 떨어진다 (메타볼, MarchingCubes). 배경 투명(소재 위 ③층).
// 움직임은 모두 time의 함수(사인 합) → 같은 시간이면 같은 프레임. 난수는 시드 RNG로 setup에서 한 번만.
// params: { color: "#1F5BFF", count: 6, seed: 3, intro: 0.6 (방울이 부풀어 나오는 초), speed: 1, resolution: 64, spread: 1 }
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const rng = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const easeOutBack = (t) => { const c = 1.7; t = Math.min(1, Math.max(0, t)); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };

export default async function setup({ THREE, params }) {
  const rand = rng(params.seed ?? 3);
  const count = params.count ?? 6, intro = params.intro ?? 0.6, speed = params.speed ?? 1, spread = params.spread ?? 1;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 6.2);
  camera.lookAt(0, 0, 0);

  // 광택 액체: 맑은 코팅 + 약한 이리데선스. 환경광이 반사를 만든다 (three.md §4)
  const color = new THREE.Color(params.color ?? "#1F5BFF");
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.04, iridescence: 0.15, iridescenceIOR: 1.3 });
  const blobs = new MarchingCubes(params.resolution ?? 64, mat, false, false, 60000);
  blobs.isolation = 80;
  blobs.scale.setScalar(1.9);
  scene.add(blobs);

  // 방울마다 궤도(중심, 반경, 위상, 속도). 화면 안(0.2–0.8)에 머물게
  const orbs = Array.from({ length: count }, () => ({
    cx: 0.5 + (rand() - 0.5) * 0.34 * spread, cy: 0.5 + (rand() - 0.5) * 0.44 * spread,
    rx: 0.06 + rand() * 0.1, ry: 0.06 + rand() * 0.12, ph: rand() * Math.PI * 2, w: (0.5 + rand() * 0.6) * speed,
    s: 0.45 + rand() * 0.45, delay: rand() * 0.25,
  }));

  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-2, 3, 4);
  const rim = new THREE.DirectionalLight(color.clone().lerp(new THREE.Color("#9fd0ff"), 0.5), 2.0); rim.position.set(3, -1, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xbfd4ff, 0x0a0a20, 0.25));

  let env = null;
  return {
    scene, camera, background: null,
    toneMapping: THREE.NeutralToneMapping, exposure: 0.95, // ACES는 진한 파랑을 보라로 바래게 함
    attach(renderer) {
      env?.dispose();
      const pmrem = new THREE.PMREMGenerator(renderer);
      env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = env; scene.environmentIntensity = 0.6;
    },
    update({ time, width, height }) {
      if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); }
      blobs.reset();
      for (const o of orbs) {
        const k = easeOutBack((time - o.delay) / intro);           // 부풀어 나옴
        if (k <= 0) continue;
        const a = o.ph + time * o.w;
        const x = o.cx + Math.cos(a) * o.rx, y = o.cy + Math.sin(a * 1.3) * o.ry, z = 0.5 + Math.sin(a * 0.7) * 0.06;
        blobs.addBall(x, y, z, o.s * k, 12);
      }
      blobs.update();
      blobs.rotation.y = Math.sin(time * 0.4) * 0.25;
    },
    destroy() { env?.dispose(); blobs.geometry.dispose(); mat.dispose(); },
  };
}
export const options = { fps: 30 };
