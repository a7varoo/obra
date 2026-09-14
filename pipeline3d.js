// Escena 3D del pipeline. Exporta montar(canvas, opciones) → { iluminarRuta(ids), seleccionar(id), destruir() } o null sin WebGL.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { NODOS, ARISTAS, CAPAS } from "./pipeline-datos.js";

const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;

function partir(texto) {
  const lineas = [];
  for (const parte of texto.split(" · ")) {
    if (parte.length > 15 && parte.includes(" ")) {
      const i = parte.lastIndexOf(" ", Math.ceil(parte.length / 2) + 2);
      lineas.push(parte.slice(0, i), parte.slice(i + 1));
    } else lineas.push(parte);
  }
  return lineas;
}

function etiqueta(texto, { tam = 30, color = "#f3efe6", peso = 600, anchoMax = 0, multilinea = false } = {}) {
  const lineas = multilinea ? partir(texto) : [texto];
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  const dpr = 2, alto = tam * 1.18;
  ctx.font = `${peso} ${tam}px Inter, system-ui, sans-serif`;
  const w = Math.ceil(Math.max(...lineas.map((l) => ctx.measureText(l).width))) + 24;
  const h = Math.ceil(alto * lineas.length) + 16;
  c.width = w * dpr; c.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.font = `${peso} ${tam}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = color; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  lineas.forEach((l, i) => ctx.fillText(l, w / 2, h / 2 + (i - (lineas.length - 1) / 2) * alto));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const k = Math.min(0.0165, (anchoMax || 99) / w);
  sp.scale.set(w * k, h * k, 1);
  return sp;
}

export function montar(canvas, { onSeleccion } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  } catch (_) {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1.6, 0.1, 100);
  camera.position.set(0.3, 3.0, 19);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.6); key.position.set(4, 8, 10); scene.add(key);
  const fill = new THREE.PointLight(0xf2b544, 8, 40); fill.position.set(-6, -4, 6); scene.add(fill);

  const grupo = new THREE.Group();
  scene.add(grupo);
  const grid = new THREE.GridHelper(40, 40, 0x3a3020, 0x232b34);
  grid.position.y = -4.2; grid.material.transparent = true; grid.material.opacity = 0.45; grupo.add(grid);

  // Nodos
  const porId = new Map();
  const mallas = [];
  const geo = new THREE.BoxGeometry(2.8, 1.05, 0.5);
  for (const n of NODOS) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x18232d, emissive: n.color, emissiveIntensity: 0.18, roughness: 0.55, metalness: 0.2 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...n.pos);
    m.userData = { nodo: n, base: 0.18, objetivo: 0.18, escala: 1 };
    const borde = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: n.color, transparent: true, opacity: 0.7 }));
    m.add(borde);
    const lab = etiqueta(n.etiqueta, { tam: 22, anchoMax: 2.6, multilinea: true });
    lab.material.depthTest = false;
    lab.position.set(0, 0, 0.3);
    m.add(lab);
    grupo.add(m);
    porId.set(n.id, m);
    mallas.push(m);
  }
  for (const c of CAPAS) {
    const lab = etiqueta(c.etiqueta.toUpperCase(), { tam: 20, color: "#f2b544", peso: 600 });
    lab.position.set(c.x, 4.3, 0);
    grupo.add(lab);
  }

  // Aristas y partículas
  const aristas = new Map();
  const particulas = [];
  const geoP = new THREE.SphereGeometry(0.075, 10, 10);
  for (const [a, b] of ARISTAS) {
    const pa = porId.get(a).position, pb = porId.get(b).position;
    const mid = new THREE.Vector3().addVectors(pa, pb).multiplyScalar(0.5);
    // Las que vuelven (persona → datos) pasan por delante para no tapar el resto.
    const vuelve = a === "persona";
    mid.z += vuelve ? 1.6 : (Math.abs(pa.y - pb.y) > 0.5 ? 0.9 : 0.4);
    const curva = new THREE.QuadraticBezierCurve3(pa.clone(), mid, pb.clone());
    const pts = curva.getPoints(40);
    const mat = new THREE.LineBasicMaterial({ color: vuelve ? 0xe8e0d0 : 0xf2b544, transparent: true, opacity: 0.28 });
    const linea = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat);
    grupo.add(linea);
    const clave = `${a}>${b}`;
    const arista = { curva, mat, base: 0.28, objetivo: 0.28, velocidad: 1 };
    aristas.set(clave, arista);
    if (!reducido) {
      const cuantas = vuelve ? 1 : 2;
      for (let i = 0; i < cuantas; i++) {
        const p = new THREE.Mesh(geoP, new THREE.MeshBasicMaterial({ color: vuelve ? 0xe8e0d0 : 0xf2b544 }));
        p.userData = { arista, t: i / cuantas + Math.random() * 0.3 };
        grupo.add(p);
        particulas.push(p);
      }
    }
  }

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enableZoom = false; controls.enablePan = false;
  controls.minPolarAngle = 1.0; controls.maxPolarAngle = 2.0;
  controls.minAzimuthAngle = -1.1; controls.maxAzimuthAngle = 1.1;
  let oscila = !reducido, reanudar = 0;
  controls.addEventListener("start", () => { oscila = false; reanudar = 0; });
  controls.addEventListener("end", () => { reanudar = performance.now() + 6000; });

  // Selección
  const ray = new THREE.Raycaster();
  const puntero = new THREE.Vector2(-2, -2);
  let inicio = null, seleccionado = null, sobre = null;
  const aNDC = (e) => {
    const r = canvas.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const impacto = () => { ray.setFromCamera(puntero, camera); const h = ray.intersectObjects(mallas, false); return h.length ? h[0].object : null; };
  canvas.addEventListener("pointerdown", (e) => { inicio = [e.clientX, e.clientY]; });
  canvas.addEventListener("pointermove", (e) => { aNDC(e); });
  canvas.addEventListener("pointerup", (e) => {
    if (!inicio) return;
    const dx = e.clientX - inicio[0], dy = e.clientY - inicio[1];
    inicio = null;
    if (dx * dx + dy * dy > 36) return;
    aNDC(e);
    const m = impacto();
    if (m) seleccionar(m.userData.nodo.id, true);
  });
  canvas.addEventListener("pointerleave", () => { puntero.set(-2, -2); });

  function seleccionar(id, avisar) {
    if (seleccionado) { seleccionado.userData.objetivo = seleccionado.userData.base; seleccionado.userData.escala = 1; }
    seleccionado = porId.get(id) || null;
    if (seleccionado) { seleccionado.userData.objetivo = 1.1; seleccionado.userData.escala = 1.12; }
    if (avisar && seleccionado && onSeleccion) onSeleccion(seleccionado.userData.nodo);
  }

  // Ruta iluminada
  let rutaActiva = 0;
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  async function iluminarRuta(ids) {
    const mia = ++rutaActiva;
    apagarRuta();
    const paso = reducido ? 120 : 380;
    for (let i = 0; i < ids.length; i++) {
      if (mia !== rutaActiva) return;
      const m = porId.get(ids[i]);
      if (m) { m.userData.objetivo = 1.3; m.userData.escala = 1.1; }
      if (i > 0) {
        const ar = aristas.get(`${ids[i - 1]}>${ids[i]}`) || aristas.get(`${ids[i]}>${ids[i - 1]}`);
        if (ar) { ar.objetivo = 1; ar.velocidad = 3.2; ar.mat.color.set(0xffd98a); }
      }
      await espera(paso);
    }
    await espera(reducido ? 600 : 2400);
    if (mia === rutaActiva) apagarRuta();
  }
  function apagarRuta() {
    for (const m of mallas) { if (m !== seleccionado) { m.userData.objetivo = m.userData.base; m.userData.escala = 1; } }
    for (const ar of aristas.values()) { ar.objetivo = ar.base; ar.velocidad = 1; ar.mat.color.set(ar.base === 0.28 && ar.curva.v2.z > 1.5 ? 0xe8e0d0 : 0xf2b544); }
  }

  // Tamaño
  function redimensionar() {
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 500;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.z = w < 480 ? 21 : 19;
  }
  const ro = new ResizeObserver(redimensionar);
  ro.observe(canvas);
  redimensionar();

  // Bucle, pausado fuera de pantalla
  let visible = true, raf = 0, previo = performance.now();
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible && !raf) { previo = performance.now(); raf = requestAnimationFrame(cuadro); } });
  io.observe(canvas);
  function cuadro(t) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min((t - previo) / 1000, 0.05); previo = t;
    if (!oscila && !reducido && reanudar && t > reanudar) { oscila = true; reanudar = 0; }
    const objetivoY = oscila ? Math.sin(t * 0.00035) * 0.32 : 0;
    grupo.rotation.y += (objetivoY - grupo.rotation.y) * 0.03;
    controls.update();
    for (const m of mallas) {
      const u = m.userData;
      m.material.emissiveIntensity += (u.objetivo - m.material.emissiveIntensity) * 0.12;
      const s = m.scale.x + (u.escala - m.scale.x) * 0.15; m.scale.setScalar(s);
    }
    for (const ar of aristas.values()) ar.mat.opacity += (ar.objetivo - ar.mat.opacity) * 0.1;
    for (const p of particulas) {
      const u = p.userData;
      u.t = (u.t + dt * 0.22 * u.arista.velocidad) % 1;
      p.position.copy(u.arista.curva.getPoint(u.t));
      p.material.opacity = 1;
    }
    const h = impacto();
    if (h !== sobre) { sobre = h; canvas.style.cursor = h ? "pointer" : "grab"; }
    renderer.render(scene, camera);
    raf = requestAnimationFrame(cuadro);
  }
  canvas.style.cursor = "grab";
  raf = requestAnimationFrame(cuadro);

  return {
    iluminarRuta,
    seleccionar: (id) => seleccionar(id, false),
    estado: () => ({ rotY: grupo.rotation.y, cam: camera.position.toArray(), azimut: controls.getAzimuthalAngle(), polar: controls.getPolarAngle() }),
    destruir() { rutaActiva++; visible = false; if (raf) cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}
