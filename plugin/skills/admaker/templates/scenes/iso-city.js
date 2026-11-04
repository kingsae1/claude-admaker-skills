// three 커스텀 씬 "iso-city": 정사영(아이소메트릭) 카메라로 본 블록 도시. 바닥판이 깔리고 건물이 뒤에서 앞으로 솟아오른 뒤,
// 카메라가 천천히 돌아 입체감을 보여준다(평면 SVG 버전 iso-city-flat 과의 차이). 배경 투명(소재 위 ③층).
// params: { boxes: [{ x, y, h, c, w?, d? }] (iso-city-flat 과 같은 형식), palette: ["#FBD36B", …], ground: "#A9E3C6",
//           start: 0.25 (첫 건물 초), stagger: 0.07, rise: 0.45, orbit: 18 (도, 카메라가 도는 폭), zoom: 1 }
// 그림자는 shadowMap 대신 바닥에 붙인 반투명 사각형(가짜 접촉 그림자, three.md §4). 움직임은 time의 함수.
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const easeOutBack = (t, c = 1.6) => { t = Math.min(1, Math.max(0, t)); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeInOut = (t) => { t = Math.min(1, Math.max(0, t)); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };
const PALETTE = ["#FBD36B", "#F7A6C4", "#C4B2FA", "#A9E3C6"];

export default async function setup({ THREE, params }) {
  const boxes = params.boxes ?? [];
  const pal = params.palette ?? PALETTE;
  const start = params.start ?? 0.25, stagger = params.stagger ?? 0.07, rise = params.rise ?? 0.45;
  const orbit = ((params.orbit ?? 18) * Math.PI) / 180, zoom = params.zoom ?? 1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);

  const spanX = Math.max(...boxes.map((b) => b.x + (b.w ?? 1))), spanY = Math.max(...boxes.map((b) => b.y + (b.d ?? 1)));
  const world = new THREE.Group();
  world.position.set(-spanX / 2, 0, -spanY / 2);  // 격자 중심을 원점으로
  scene.add(world);

  // 바닥판 (두께 있음)
  const g = 0.35;
  const ground = new THREE.Mesh(new THREE.BoxGeometry(spanX + 2 * g, 0.18, spanY + 2 * g),
    new THREE.MeshStandardMaterial({ color: params.ground ?? "#A9E3C6", roughness: 0.85 }));
  ground.position.set(spanX / 2, -0.09, spanY / 2);
  world.add(ground);

  const winMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3, emissive: "#ffffff", emissiveIntensity: 0.15 });
  const shadowMat = new THREE.MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.18, depthWrite: false });
  const order = boxes.map((b, i) => ({ b, i })).sort((p, q) => (p.b.x + p.b.y) - (q.b.x + q.b.y) || p.b.x - q.b.x);
  const towers = order.map(({ b }, k) => {
    const w = b.w ?? 1, d = b.d ?? 1, h = b.h;
    const grp = new THREE.Group();
    grp.position.set(b.x + w / 2, 0, b.y + d / 2);
    const mat = new THREE.MeshStandardMaterial({ color: pal[(b.c ?? k) % pal.length], roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h, d * 0.92), mat);
    body.position.y = h / 2;
    grp.add(body);
    // 창문: 앞 두 면(+x, +z)에 층마다 두 개
    for (let z0 = 0.3; z0 + 0.22 < h - 0.1; z0 += 0.5) {
      for (const u of [-0.2, 0.2]) {
        const wz = new THREE.Mesh(new THREE.BoxGeometry(0.2 * w, 0.2, 0.02), winMat); wz.position.set(u * w, z0 + 0.11, d * 0.46 + 0.01); grp.add(wz);
        const wx = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.2, 0.2 * d), winMat); wx.position.set(w * 0.46 + 0.01, z0 + 0.11, u * d); grp.add(wx);
      }
    }
    // 가짜 접촉 그림자: 바닥에 붙은 사각형, 건물이 솟을수록 진해짐
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.25, d * 1.25), shadowMat.clone());
    sh.rotation.x = -Math.PI / 2; sh.position.set(0.12, 0.002, 0.12);
    world.add(grp);
    const shadowHolder = new THREE.Group(); shadowHolder.position.copy(grp.position); shadowHolder.add(sh); world.add(shadowHolder);
    return { grp, sh, t0: start + k * stagger };
  });

  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-4, 10, 6);
  const fill = new THREE.DirectionalLight(0xffe8f0, 0.6); fill.position.set(6, 4, -2);
  scene.add(key, fill, new THREE.HemisphereLight(0xffffff, 0x8a7fb0, 0.5));

  let env = null;
  return {
    scene, camera, background: null,
    toneMapping: THREE.NeutralToneMapping, exposure: 1, // ACES는 파스텔을 바래게 함
    attach(renderer) {
      env?.dispose();
      const pmrem = new THREE.PMREMGenerator(renderer);
      env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
      scene.environment = env; scene.environmentIntensity = 0.25;
    },
    update({ time, width = 1, height = 1 }) {
      // 정사영 화면 크기: 도시 대각선이 화면 폭의 ~85%
      const half = (Math.hypot(spanX, spanY) * 0.62) / zoom, aspect = width / height;
      camera.left = -half; camera.right = half; camera.top = half / aspect; camera.bottom = -half / aspect;
      // 아이소메트릭: 방위 45° · 고도 35.26°, 등장 뒤 천천히 orbit 만큼 돈다
      const last = towers.length ? towers.at(-1).t0 + rise : 0;
      const az = Math.PI / 4 - orbit / 2 + orbit * easeInOut((time - last) / 2.2);
      const el = Math.atan(1 / Math.SQRT2), R = 30;
      camera.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R + 0.8, Math.cos(az) * Math.cos(el) * R);
      camera.lookAt(0, 0.8, 0);
      camera.updateProjectionMatrix();
      // 바닥판: 처음 0.35초에 커지며 등장
      const gk = easeOutBack(time / 0.35, 1.2);
      ground.scale.set(Math.max(0.001, gk), 1, Math.max(0.001, gk));
      for (const t of towers) {
        const k = easeOutBack((time - t.t0) / rise, 1.8);
        t.grp.visible = k > 0.001;
        t.grp.scale.set(1, Math.max(0.001, k), 1);
        t.sh.material.opacity = 0.18 * Math.min(1, Math.max(0, k));
      }
    },
    destroy() { env?.dispose(); scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
}
export const options = { fps: 30 };
