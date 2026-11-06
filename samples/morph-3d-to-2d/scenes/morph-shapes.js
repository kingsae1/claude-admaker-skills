// three 커스텀 씬 "morph-shapes": 하나의 메시가 구 → 둥근 큐브 → 퍼피 별 → 도넛(토러스) → 납작한 2D 링 → 2D 원판으로 변신한다.
// 모든 모양을 같은 (u, v) 격자로 만들어(꼭짓점 수가 같음) 위치·법선을 그대로 보간한다. 정점 대응: 구의 극점 → 도넛 구멍, 적도 → 도넛 바깥 둘레.
// 마지막 두 단계는 z를 0으로 눌러 평면이 되고 재질도 반사·조명 없는 단색(emissive)으로 바뀐다 → 엔진 2D 원(Shape)과 같은 자리·크기로 이어 받는다.
// 배경은 투명(엔진의 배경 면·큰 글자가 뒤에 보인다). 모든 움직임은 time의 함수 → 같은 시간이면 같은 프레임.
// params: { morphs: [[시작초, 길이초] × 5], colors: [5단계 색], flat: 평면 색, intro: 등장 길이 }
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const clamp = (v) => Math.min(1, Math.max(0, v));
const ease4 = (t) => { t = clamp(t); return t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2; }; // power4.inOut
const easeOutBack = (t, c = 1.8) => { t = clamp(t); return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; };
const easeOutCubic = (t) => 1 - (1 - clamp(t)) ** 3;
const lerp = (a, b, k) => a + (b - a) * k;

// 카메라: z=12, 세로 화각 30° → z=0 평면에서 1 단위 = 1920 / (2·12·tan15°) ≈ 298.56 px (샷 코드가 같은 값으로 2D 원을 놓는다)
export const CAM_Z = 12, FOV = 30;
const R = 0.95, r = 0.45; // 도넛 반지름(바깥 = R + r = 1.4 → 2D 원 반지름 418 px)

const SHAPES = [
  // 0 구
  (u, v) => { const th = Math.PI * (1 - v), s = Math.sin(th); return [1.25 * s * Math.cos(u), 1.25 * s * Math.sin(u), 1.25 * Math.cos(th)]; },
  // 1 둥근 큐브(초타원체): 구 방향을 max-norm에 가깝게 늘린다
  (u, v) => {
    const th = Math.PI * (1 - v), s = Math.sin(th), d = [s * Math.cos(u), s * Math.sin(u), Math.cos(th)], n = 7;
    const k = (Math.abs(d[0]) ** n + Math.abs(d[1]) ** n + Math.abs(d[2]) ** n) ** (-1 / n) * 1.02;
    return d.map((x) => x * k);
  },
  // 2 퍼피 별: 단면이 다섯 꼭짓점 별, 앞뒤로 부푼 쿠션
  (u, v) => {
    const th = Math.PI * (1 - v), s = Math.sin(th), a = u - Math.PI / 2;
    const star = 0.78 + 0.72 * ((Math.cos(5 * a) + 1) / 2) ** 2.2;
    const puff = s ** 0.85;
    return [star * puff * Math.cos(u), star * puff * Math.sin(u), 0.62 * Math.cos(th) * (0.55 + 0.45 * star / 1.5)];
  },
  // 3 도넛: w = π + 2πv (v=0 구멍 아래 → 바깥 둘레 → 위 → 구멍)
  (u, v) => { const w = Math.PI + 2 * Math.PI * v, q = R + r * Math.cos(w); return [q * Math.cos(u), q * Math.sin(u), r * Math.sin(w)]; },
  // 4 납작한 2D 링(두께 거의 0)
  (u, v) => { const w = Math.PI + 2 * Math.PI * v, q = R + r * Math.cos(w); return [q * Math.cos(u), q * Math.sin(u), 0.002 * Math.sin(w)]; },
  // 5 2D 원판: 안쪽 반지름이 0으로 닫힌다
  (u, v) => { const w = Math.PI + 2 * Math.PI * v, q = (R + r) * (1 + Math.cos(w)) / 2; return [q * Math.cos(u), q * Math.sin(u), 0.002 * Math.sin(w)]; },
];

const SU = 200, SV = 140;
function bake(fn) {
  const n = (SU + 1) * (SV + 1), pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), e = 1e-4;
  let k = 0;
  for (let j = 0; j <= SV; j++) for (let i = 0; i <= SU; i++, k++) {
    const u = (i / SU) * Math.PI * 2, v = j / SV, p = fn(u, v);
    const pu1 = fn(u + e, v), pu0 = fn(u - e, v), pv1 = fn(u, Math.min(1, v + e)), pv0 = fn(u, Math.max(0, v - e));
    const du = [pu1[0] - pu0[0], pu1[1] - pu0[1], pu1[2] - pu0[2]], dv = [pv1[0] - pv0[0], pv1[1] - pv0[1], pv1[2] - pv0[2]];
    let c = [du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0]];
    let L = Math.hypot(...c);
    if (L < 1e-12) { c = Math.hypot(...p) > 1e-6 ? p : [0, 0, 1]; L = Math.hypot(...c); } // 극점: 방향 벡터
    pos.set(p, k * 3); nrm.set([c[0] / L, c[1] / L, c[2] / L], k * 3);
  }
  return { pos, nrm };
}

export default async function setup({ THREE, params }) {
  const morphs = params.morphs ?? [[2, 0.55], [4, 0.55], [6, 0.55], [8, 0.8], [9, 0.4]];
  const colors = (params.colors ?? ["#2B45FF", "#D4FF3A", "#FF5233", "#FF9BD6"]).map((c) => new THREE.Color(c));
  const flat = new THREE.Color(params.flat ?? "#121212"), intro = params.intro ?? 0.6;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1080 / 1920, 0.1, 100);
  camera.position.set(0, 0, CAM_Z); camera.lookAt(0, 0, 0);

  const T = SHAPES.map(bake);
  const geo = new THREE.BufferGeometry();
  const idx = [];
  for (let j = 0; j < SV; j++) for (let i = 0; i < SU; i++) {
    const a = j * (SU + 1) + i, b = a + 1, c = a + SU + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  geo.setIndex(idx);
  const P = new THREE.BufferAttribute(T[0].pos.slice(), 3), N = new THREE.BufferAttribute(T[0].nrm.slice(), 3);
  geo.setAttribute("position", P); geo.setAttribute("normal", N);
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.2);

  // 단계별 재질 값 [거칠기, 금속성, 클리어코트] — 구: 사탕 광택, 큐브: 무광 고무, 별: 젤리 광택, 도넛: 핑크 크롬
  const look = [[0.16, 0.0, 1.0], [0.42, 0.0, 0.3], [0.2, 0.0, 1.0], [0.14, 0.9, 1.0]];
  const mat = new THREE.MeshPhysicalMaterial({ color: colors[0], roughness: 0.16, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1, emissive: new THREE.Color(0, 0, 0), side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  const holder = new THREE.Group(); holder.add(mesh); scene.add(holder);

  // 바닥 대신 2D식 그림자: 아래에 흐린 타원 판(카메라를 정면으로 봄). 평면 단계에서 사라진다
  const cv = document.createElement("canvas"); cv.width = 256; cv.height = 64;
  const g2 = cv.getContext("2d"), grd = g2.createRadialGradient(128, 32, 2, 128, 32, 120);
  grd.addColorStop(0, "rgba(0,0,0,0.55)"); grd.addColorStop(0.5, "rgba(0,0,0,0.18)"); grd.addColorStop(1, "rgba(0,0,0,0)");
  g2.setTransform(1, 0, 0, 0.25, 0, 24); g2.fillStyle = grd; g2.fillRect(0, -100, 256, 400);
  const shTex = new THREE.CanvasTexture(cv); shTex.colorSpace = THREE.SRGBColorSpace;
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.position.set(0, -1.95, -1); scene.add(shadow);

  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(-4, 5, 6);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2); rim.position.set(5, -2, -3);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

  // 단계 진행값 s: 0(구) … 5(원판). 각 변신은 power4.inOut
  const stage = (t) => { let s = 0; morphs.forEach(([a, d], i) => { s += ease4((t - a) / d); }); return s; };
  const kick = (t) => morphs.slice(0, 3).reduce((acc, [a, d]) => acc + ease4((t - a) / (d + 0.25)), 0); // 변신마다 반 바퀴 더 돈다
  const wobble = (t) => morphs.reduce((acc, [a, d], i) => { const tau = t - a - d; return tau > 0 && i < 3 ? acc + 0.07 * Math.sin(tau * 18) * Math.exp(-tau * 7) : acc; }, 0);
  const pulse = (t) => morphs.reduce((acc, [a, d]) => acc - 0.12 * Math.sin(Math.PI * clamp((t - a) / d)), 0);
  const tilt = [0.35, 0.62, 0.18, 1.05]; // 단계별 앞으로 기울기(rad)
  const flatStart = morphs[3][0], flatDur = morphs[3][1];
  let rotAtFlat = null;

  const tmp = new THREE.Color();
  let pmrem = null, env = null;
  const inst = {
    scene, camera, background: null, toneMapping: THREE.NeutralToneMapping, exposure: 1.0,
    attach(rd) {
      pmrem?.dispose(); env?.dispose();
      pmrem = new THREE.PMREMGenerator(rd);
      env = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
      scene.environment = env;
    },
    update({ time: t, width, height }) {
      if (width && height) { camera.aspect = width / height; camera.updateProjectionMatrix(); }
      const s = stage(t), i0 = Math.min(4, Math.floor(s)), f = s - i0;
      const A = T[i0], B = T[Math.min(5, i0 + 1)], pa = P.array, na = N.array;
      for (let k = 0; k < pa.length; k++) { pa[k] = A.pos[k] + (B.pos[k] - A.pos[k]) * f; na[k] = A.nrm[k] + (B.nrm[k] - A.nrm[k]) * f; }
      P.needsUpdate = true; N.needsUpdate = true;

      // 재질: 0–3 단계 사이 보간, 3→4(평면화)에서 단색으로
      const sm = Math.min(3, s), m0 = Math.min(2, Math.floor(sm)), mf = sm - m0, flatK = clamp(s - 3);
      const L0 = look[m0], L1 = look[m0 + 1];
      tmp.copy(colors[m0]).lerp(colors[m0 + 1], mf);
      mat.color.copy(tmp).lerp(new THREE.Color(0, 0, 0), flatK);
      mat.emissive.copy(flat).multiplyScalar(flatK);
      mat.roughness = lerp(L0[0], L1[0], mf); mat.metalness = lerp(L0[1], L1[1], mf) * (1 - flatK);
      mat.clearcoat = lerp(L0[2], L1[2], mf) * (1 - flatK); mat.envMapIntensity = 1.1 * (1 - flatK);
      mat.specularIntensity = 1 - flatK;

      // 자세: 계속 돌다가 평면화 구간에서 정면(회전 0, π의 배수)으로 맞춘다
      const spin = t * 1.05 + kick(t) * Math.PI * 0.75 + 0.4;
      const tl = tilt[Math.min(3, Math.floor(sm))] + ((tilt[Math.min(3, Math.floor(sm) + 1)] ?? 0) - tilt[Math.min(3, Math.floor(sm))]) * (sm - Math.floor(sm));
      let ry = spin, rx = tl + 0.08 * Math.sin(t * 1.7);
      if (t >= flatStart) {
        if (rotAtFlat === null || rotAtFlat.t !== flatStart) {
          const sp = flatStart * 1.05 + kick(flatStart) * Math.PI * 0.75 + 0.4;
          rotAtFlat = { t: flatStart, ry: sp, target: Math.ceil(sp / Math.PI + 0.35) * Math.PI };
        }
        const k = ease4((t - flatStart) / flatDur);
        ry = lerp(spin, rotAtFlat.target, k); if (k >= 1) ry = rotAtFlat.target;
        rx = lerp(rx, 0, k);
      }
      mesh.rotation.set(rx, ry, 0.0, "XYZ");
      const inK = easeOutBack(t / intro, 2.2);
      const bob = 0.09 * Math.sin(t * 2.2) * (1 - flatK);
      const sc = Math.max(0.0001, inK * (1 + pulse(t) + wobble(t)));
      holder.scale.setScalar(sc);
      holder.position.y = bob - 1.2 * (1 - easeOutCubic(t / intro));
      holder.rotation.z = -0.5 * (1 - easeOutCubic(t / (intro * 1.4)));
      shadow.material.opacity = (1 - flatK) * clamp(t / intro);
      shadow.scale.set(sc * (1 - bob * 1.2), 1, 1);
    },
    destroy() { env?.dispose(); pmrem?.dispose(); geo.dispose(); mat.dispose(); shTex.dispose(); },
  };
  return inst;
}
export const options = { fps: 30 };
