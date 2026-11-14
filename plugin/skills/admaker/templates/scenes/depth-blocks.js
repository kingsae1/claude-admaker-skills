// three 커스텀 씬 "depth-blocks": 2D 바우하우스 격자(정사각·원·반원·사분원·삼각)를 같은 배치 그대로 받아,
// 처음엔 바로 위에서 내려다본 납작한 판(앞 장면의 2D 격자와 매치 컷)으로 시작해 카메라가 비스듬히 눕고
// 조각들이 뒤에서 앞으로 솟아오른다. 빨간 공이 박마다 가운데 블록 위에서 튄다(찌그러짐·늘어남 포함). 배경 투명.
// params: { cells: [{ col, row, kind: "square"|"circle"|"half"|"quarter"|"triangle", rot: 0|90|180|270, color }],
//           cols: 8, rows: 4, frameCols: 10.667 (화면 폭에 들어갈 칸 수, 2D 격자와 같게),
//           tilt: [0.15, 1.25] (카메라가 눕는 시작·끝 초), rise: [0.3, 1.4], elevation: 34 (도), orbit: 14 (도),
//           ball: { col, row, t0: 0.9, beat: 0.5, height: 2.4, color: "#FF4A1C" }, push: [2.2, 2.5] (끝에 공으로 다가감) }
// 움직임은 모두 time의 함수. 그림자는 shadowMap(공유 렌더러에서 켬)으로 바닥에 떨어진다.
const clamp01 = (t) => Math.min(1, Math.max(0, t));
const easeInOutCubic = (t) => { t = clamp01(t); return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2; };
const easeOutBack = (t, c = 1.7) => { t = clamp01(t); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeInExpo = (t) => { t = clamp01(t); return t === 0 ? 0 : 2 ** (10 * t - 10); };

const HEIGHTS = { square: 1, circle: 0.8, half: 0.55, quarter: 0.7, triangle: 0.6 };

export default async function setup({ THREE, params }) {
  const cells = params.cells ?? [];
  const cols = params.cols ?? 8, rows = params.rows ?? 4;
  const frameCols = params.frameCols ?? cols * 1.333;
  const [tilt0, tilt1] = params.tilt ?? [0.15, 1.25];
  const [rise0, rise1] = params.rise ?? [0.3, 1.4];
  const elev = ((params.elevation ?? 34) * Math.PI) / 180;
  const orbit = ((params.orbit ?? 14) * Math.PI) / 180;
  const ball = params.ball ?? null;
  const [push0, push1] = params.push ?? [2.2, 2.5];

  const scene = new THREE.Scene();
  const fov = 22;
  const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 0.1, 400);
  const world = new THREE.Group();
  scene.add(world);

  const mats = new Map();
  const mat = (c) => {
    if (!mats.has(c)) mats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.0 }));
    return mats.get(c);
  };

  // 바닥: 그림자만 받는 투명 판 + 얇은 격자선
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: 0.22 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const lineMat = new THREE.LineBasicMaterial({ color: "#141414", transparent: true, opacity: 0.18 });
  const gridPts = [];
  for (let c = 0; c <= cols; c++) gridPts.push(c - cols / 2, 0.001, -rows / 2, c - cols / 2, 0.001, rows / 2);
  for (let r = 0; r <= rows; r++) gridPts.push(-cols / 2, 0.001, r - rows / 2, cols / 2, 0.001, r - rows / 2);
  const gridGeo = new THREE.BufferGeometry();
  gridGeo.setAttribute("position", new THREE.Float32BufferAttribute(gridPts, 3));
  scene.add(new THREE.LineSegments(gridGeo, lineMat));

  // 2D 조각 → 3D 기둥. 2D 각도 φ(0=12시, 시계방향)는 three 실린더 θ = π − φ 로 옮긴다(위에서 볼 때 같은 모양).
  const S = 0.94; // 칸 안 여백
  const pieces = cells.map((cell, i) => {
    const h = (HEIGHTS[cell.kind] ?? 0.8) * (cell.h ?? 1);
    const rot = ((cell.rot ?? 0) * Math.PI) / 180;
    let geo;
    const half = S / 2;
    if (cell.kind === "circle") geo = new THREE.CylinderGeometry(half, half, 1, 48);
    else if (cell.kind === "half") {
      // 반원: 2D pie(0→180°, 칸 가득 원) = 오른쪽 반
      geo = new THREE.CylinderGeometry(half, half, 1, 48, 1, false, Math.PI - Math.PI, Math.PI);
    } else if (cell.kind === "quarter") {
      // 사분원: 칸 왼쪽 위 모서리가 중심, 반지름 = 칸 (2D pie 90→180°를 2배 상자에 둔 것)
      geo = new THREE.CylinderGeometry(S, S, 1, 48, 1, false, Math.PI - Math.PI, Math.PI / 2);
      geo.translate(-half, 0, -half);
    } else if (cell.kind === "triangle") {
      const sh = new THREE.Shape();
      sh.moveTo(0, half); sh.lineTo(half, -half); sh.lineTo(-half, -half); sh.closePath();
      geo = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2); // 모양 y(위) → -z(화면 위), 돌출 → +y
      geo.translate(0, -0.5, 0);
    } else geo = new THREE.BoxGeometry(S, 1, S);
    geo.translate(0, 0.5, 0); // 밑면을 y=0에
    const mesh = new THREE.Mesh(geo, mat(cell.color ?? "#141414"));
    mesh.castShadow = true; mesh.receiveShadow = true;
    const grp = new THREE.Group();
    grp.position.set(cell.col - cols / 2 + 0.5, 0, cell.row - rows / 2 + 0.5);
    grp.rotation.y = -rot;
    grp.add(mesh);
    world.add(grp);
    // 뒤(위쪽 줄)에서 앞으로, 왼쪽에서 오른쪽으로 솟음
    const order = (cell.row * 0.6 + cell.col * 0.25) / (rows * 0.6 + cols * 0.25);
    return { grp, mesh, h, t0: rise0 + order * (rise1 - rise0 - 0.4) };
  });

  let ballMesh = null, ballBase = 0;
  if (ball) {
    ballMesh = new THREE.Mesh(new THREE.SphereGeometry(0.36, 48, 32), new THREE.MeshStandardMaterial({ color: ball.color ?? "#FF4A1C", roughness: 0.35 }));
    ballMesh.castShadow = true;
    const under = cells.find((c) => c.col === ball.col && c.row === ball.row);
    ballBase = under ? (HEIGHTS[under.kind] ?? 0.8) * (under.h ?? 1) : 0;
    scene.add(ballMesh);
  }

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-6, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  key.shadow.bias = -0.0005;
  const fill = new THREE.DirectionalLight(0xfff1e0, 0.7);
  fill.position.set(7, 5, -4);
  scene.add(key, fill, new THREE.HemisphereLight(0xffffff, 0xb8ad9c, 0.9));

  return {
    scene, camera, background: null,
    toneMapping: THREE.NeutralToneMapping, exposure: 1.05,
    attach(renderer) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    },
    update({ time, width = 1920, height = 1080 }) {
      camera.aspect = width / height;
      // 처음: 바로 위에서 frameCols 칸이 화면 폭에 들어가는 거리 (2D 격자와 같은 크기)
      const hfov = 2 * Math.atan(Math.tan(((fov / 2) * Math.PI) / 180) * camera.aspect);
      const dist0 = frameCols / 2 / Math.tan(hfov / 2);
      const k = easeInOutCubic((time - tilt0) / (tilt1 - tilt0));
      const el = Math.PI / 2 - 0.0001 + (elev - Math.PI / 2) * k;
      const az = -orbit * 0.5 * k + orbit * easeInOutCubic((time - tilt1) / 1.4) * 0.6;
      const pk = easeInExpo((time - push0) / (push1 - push0));
      let dist = dist0 * (1 + 0.22 * k) * (1 - 0.82 * pk);
      let target = new THREE.Vector3(0, 0.75 * k, 0.35 * k);
      if (ballMesh && pk > 0) target.lerp(ballMesh.position, pk);
      camera.position.set(target.x + Math.sin(az) * Math.cos(el) * dist, target.y + Math.sin(el) * dist, target.z + Math.cos(az) * Math.cos(el) * dist);
      camera.up.set(0, 1, 0);
      if (k < 0.001) camera.up.set(0, 0, -1);
      camera.lookAt(target);
      camera.updateProjectionMatrix();

      for (const p of pieces) {
        const r = easeOutBack((time - p.t0) / 0.45, 1.6);
        p.grp.scale.set(1, Math.max(0.02, p.h * r), 1);
      }
      if (ballMesh) {
        const beat = ball.beat ?? 0.5, t0 = ball.t0 ?? 0.9, H = ball.height ?? 2.4;
        const c = new THREE.Vector3(ball.col - cols / 2 + 0.5, 0, ball.row - rows / 2 + 0.5);
        const r = 0.36;
        let y, sx = 1, sy = 1;
        if (time < t0) { y = ballBase + r + H * 3 + (t0 - time) * 8; }
        else {
          // 첫 낙하는 높이 3H에서, 그 뒤는 박마다 같은 높이 H로 튐 (포물선)
          const n = Math.floor((time - t0) / beat), f = ((time - t0) % beat) / beat;
          const top = n === 0 ? H * 1.2 : H;
          y = ballBase + r + top * 4 * f * (1 - f);
          // 닿는 순간 앞뒤 2프레임 찌그러짐, 공중에선 속도만큼 늘어남
          const near = Math.min(f, 1 - f) * beat;
          if (near < 0.05) { const q = 1 - near / 0.05; sy = 1 - 0.32 * q; sx = 1 + 0.22 * q; y = ballBase + r * sy; }
          else { const v = Math.abs(1 - 2 * f); sy = 1 + 0.12 * v; sx = 1 - 0.06 * v; }
        }
        ballMesh.position.set(c.x, y, c.z);
        ballMesh.scale.set(sx, sy, sx);
        ballMesh.visible = time > t0 - 0.6;
      }
    },
    destroy() { scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); }); },
  };
}
export const options = { fps: 30 };
