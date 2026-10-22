import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import "./hand-scene.css";
import { handPoses as POSES, type HandPose } from './hand-poses';
import { HAND_DIGITS as DIGITS, articulateHand, beginJointTransition, poseWristProgress, type PoseJoint } from './hand-rig';
export type { HandPose } from './hand-poses';

export type NailAppearance = {
  color: string;
  finish: "gloss" | "chrome" | "matte";
  shape: "almond" | "round" | "square" | "coffin";
  length: number;
  pattern?: "solid" | "french" | "swirl";
  accentColor?: string;
  elements: {
    id: string;
    kind: "star" | "pearl" | "flower" | "heart";
    color: string;
    x: number;
    y: number;
    scale: number;
    rotation: number;
  }[];
};

export type HandSceneHandle = {
  capture(): string | null;
  resetView(): void;
  rotateBy(x: number, y: number): void;
  zoomBy(factor: number): void;
  hitNail(x: number, y: number): { index: number; x: number; y: number } | null;
};

type Props = {
  nails: NailAppearance[];
  skinTone: string;
  selectedNail: number | null;
  handedness?: "left" | "right";
  pose?: HandPose;
  resetViewKey?: number;
  onSelectNail?: (index: number) => void;
  onMoveElement?: (index: number, id: string, x: number, y: number, phase: "start" | "move" | "end") => void;
  interactive?: boolean;
  className?: string;
  onReady?: () => void;
  onError?: () => void;
};

const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"];
const JOINTS = ["thumb-tip", "index-finger-tip", "middle-finger-tip", "ring-finger-tip", "pinky-finger-tip"];
const WIDTHS = [0.0136, 0.0116, 0.0119, 0.0114, 0.0095];
const DEFAULT_ROTATION = { x: -0.06, y: -0.13 };
const VIEW_PITCH_AXIS = new THREE.Vector3(1, 0, 0);
const VIEW_YAW_AXIS = new THREE.Vector3(0, 1, 0);
export const nailLength = (value: number) => 0.012 + Math.max(0, Math.min(1, value)) * 0.021;
const POSE_DURATION = 980;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

/** Half-width of a nail at a given distance from its cuticle. */
function profile(t: number, shape: NailAppearance["shape"]) {
  const cuticle = t < 0.19 ? Math.sqrt(Math.max(0.0004, 1 - ((t - 0.19) / 0.19) ** 2)) : 1;
  if (shape === "almond") return cuticle * (t > 0.5 ? Math.sqrt(Math.max(0.001, 1 - ((t - 0.5) / 0.5) ** 1.5)) : 1);
  if (shape === "round") return cuticle * (t > 0.72 ? Math.sqrt(Math.max(0.001, 1 - ((t - 0.72) / 0.28) ** 2)) : 1);
  const taper = shape === "coffin" ? 1 - Math.max(0, t - 0.42) * 0.46 : 1;
  return cuticle * taper * (t > 0.96 ? Math.sqrt(Math.max(0.65, 1 - ((t - 0.96) / 0.075) ** 2)) : 1);
}

function nailSurfaceZ(x: number, t: number, width: number, shape: NailAppearance["shape"]) {
  const halfWidth = width * 0.5 * profile(t, shape);
  return 0.0003 + 0.00115 * Math.sqrt(Math.max(0, 1 - (x / Math.max(halfWidth, 0.0001)) ** 2)) + Math.sin(t * Math.PI) * 0.00023;
}

/** A curved polish shell, including its thin free edge; no flat image overlays. */
function nailGeometry(width: number, length: number, shape: NailAppearance["shape"]) {
  const across = 20;
  const rows = 36;
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let col = 0; col <= across; col++) {
      const u = col / across;
      const x = (u - 0.5) * width * profile(t, shape);
      positions.push(x, (t - 0.5) * length, nailSurfaceZ(x, t, width, shape));
      uv.push(u, t);
      if (row < rows && col < across) {
        const i = row * (across + 1) + col;
        indices.push(i, i + 1, i + across + 1, i + 1, i + across + 2, i + across + 1);
      }
    }
  }
  const rim: number[] = [];
  for (let row = 0; row <= rows; row++) rim.push(row * (across + 1));
  for (let col = 1; col <= across; col++) rim.push(rows * (across + 1) + col);
  for (let row = rows - 1; row >= 0; row--) rim.push(row * (across + 1) + across);
  for (let col = across - 1; col >= 1; col--) rim.push(col);
  const bottomStart = positions.length / 3;
  rim.forEach(i => { positions.push(positions[i * 3], positions[i * 3 + 1], -0.00045); uv.push(0, 0); });
  rim.forEach((top, i) => {
    const next = (i + 1) % rim.length;
    indices.push(top, bottomStart + i, rim[next], rim[next], bottomStart + i, bottomStart + next);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Painted motifs follow the curved polish shell and change with nail shape. */
function paintedGeometry(width: number, length: number, shape: NailAppearance["shape"], pattern: "french" | "swirl") {
  const positions: number[] = [];
  const indices: number[] = [];
  const point = (xRatio: number, t: number) => {
    const x = xRatio * width * profile(t, shape);
    positions.push(x, (t - 0.5) * length, nailSurfaceZ(x, t, width, shape) + 0.000055);
  };
  if (pattern === "french") {
    const rows = 16;
    const columns = 32;
    for (let row = 0; row <= rows; row++) {
      for (let col = 0; col <= columns; col++) {
        const u = col / columns;
        const smile = 0.8 - 0.16 * ((u - 0.5) * 2) ** 2;
        point(u - 0.5, smile + (1 - smile) * row / rows);
        if (row < rows && col < columns) {
          const i = row * (columns + 1) + col;
          indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1);
        }
      }
    }
  } else {
    const steps = 72;
    for (let ribbon = 0; ribbon < 2; ribbon++) {
      const start = positions.length / 3;
      for (let i = 0; i <= steps; i++) {
        const t = 0.025 + i / steps * 0.95;
        const center = Math.sin(t * 6.8 + ribbon * 0.45) * 0.22 + (ribbon === 0 ? -0.18 : 0.19);
        const halfWidth = (ribbon === 0 ? 0.074 : 0.045) * (0.75 + Math.sin(t * Math.PI) * 0.25);
        point(clamp(center - halfWidth, -0.49, 0.49), t);
        point(clamp(center + halfWidth, -0.49, 0.49), t);
        if (i < steps) {
          const j = start + i * 2;
          indices.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
        }
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function disposeTree(object: THREE.Object3D) {
  object.traverse(child => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
  });
}

function charm(kind: NailAppearance["elements"][number]["kind"], color: string) {
  const group = new THREE.Group();
  const material = new THREE.MeshPhysicalMaterial({ color, metalness: 0.025, roughness: 0.28, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.45 });
  if (kind === "pearl") {
    material.metalness = 0;
    material.roughness = 0.18;
    material.iridescence = 0.45;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.0013, 20, 12), material);
    sphere.scale.z = 0.65;
    group.add(sphere);
  } else if (kind === "flower") {
    for (let i = 0; i < 5; i++) {
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.00094, 16, 10), material);
      const angle = (i / 5) * Math.PI * 2;
      petal.position.set(Math.cos(angle) * 0.0011, Math.sin(angle) * 0.0011, 0);
      petal.scale.set(0.8, 1.05, 0.32);
      petal.rotation.z = angle - Math.PI / 2;
      group.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.00055, 16, 10), new THREE.MeshPhysicalMaterial({ color: "#e8bd68", roughness: 0.25, metalness: 0.4 }));
    center.scale.z = 0.6;
    center.position.z = 0.0002;
    group.add(center);
  } else {
    const shape = new THREE.Shape();
    if (kind === "star") {
      for (let i = 0; i < 10; i++) {
        const angle = Math.PI / 2 + i * Math.PI / 5;
        const radius = i % 2 === 0 ? 0.002 : 0.00083;
        if (!i) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      }
      shape.closePath();
    } else {
      shape.moveTo(0, -0.0017);
      shape.bezierCurveTo(-0.0006, -0.0009, -0.0022, 0.00025, -0.0017, 0.00115);
      shape.bezierCurveTo(-0.0011, 0.0021, -0.0001, 0.00155, 0, 0.0009);
      shape.bezierCurveTo(0.0001, 0.00155, 0.0011, 0.0021, 0.0017, 0.00115);
      shape.bezierCurveTo(0.0022, 0.00025, 0.0006, -0.0009, 0, -0.0017);
    }
    const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.00017, bevelEnabled: true, bevelSize: 0.00008, bevelThickness: 0.00006, bevelSegments: 2, steps: 1, curveSegments: 12 }), material);
    group.add(mesh);
  }
  return group;
}

type NailMount = { group: THREE.Group; width: number };
type Runtime = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  turntable: THREE.Group;
  mounts: NailMount[];
  ready: boolean;
  hitNail(x: number, y: number): { index: number; x: number; y: number } | null;
  zoomBy(factor: number): void;
  skin: THREE.MeshPhysicalMaterial;
  setPose(pose: HandPose, animate?: boolean, resetZoom?: boolean): void;
  cancelViewAnimation(): void;
  resetView(): void;
  render(): void;
};

/**
 * Studio hand with editable, raycastable nail shells. The hand is an MIT-licensed
 * WebXR generic model, not a reconstruction of the user's photograph.
 * Element x/y are nail-local, -0.5..0.5, with positive y toward the free edge.
 */
const HandScene = forwardRef<HandSceneHandle, Props>(function HandScene(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const runtime = useRef<Runtime | null>(null);
  const latest = useRef(props);
  latest.current = props;
  const lastResetKey = useRef(props.resetViewKey);
  const paintRef = useRef<() => void>(() => {});

  paintRef.current = () => {
    const current = runtime.current;
    if (!current) return;
    current.turntable.scale.x = latest.current.handedness === "right" ? -1 : 1;
    current.skin.color.set(latest.current.skinTone);
    current.mounts.forEach(({ group, width }, index) => {
      for (const child of [...group.children]) { group.remove(child); disposeTree(child); }
      const nail = latest.current.nails[index];
      if (!nail) return;
      const length = nailLength(nail.length) * (index === 4 ? 0.87 : index === 0 ? 1.04 : 1);
      // Extending a nail preserves the cuticle position.
      const shell = new THREE.Group();
      shell.position.y = (length - 0.017) * 0.5;
      group.add(shell);
      const polish = new THREE.MeshPhysicalMaterial({
        color: nail.color,
        roughness: nail.finish === "matte" ? 0.68 : nail.finish === "chrome" ? 0.16 : 0.3,
        metalness: nail.finish === "chrome" ? 0.96 : 0.03,
        clearcoat: nail.finish === "matte" ? 0.04 : nail.finish === "chrome" ? 1 : 0.2,
        clearcoatRoughness: nail.finish === "matte" ? 0.55 : 0.12,
        envMapIntensity: nail.finish === "chrome" ? 1.25 : nail.finish === "matte" ? 0.1 : 0.18,
        specularIntensity: nail.finish === "chrome" ? 1 : 0.2,
        side: THREE.DoubleSide,
      });
      // The bright cream studio should not bleach pale lacquer into white.
      if (nail.finish !== "chrome") polish.color.multiplyScalar(0.5);
      const mesh = new THREE.Mesh(nailGeometry(width, length, nail.shape), polish);
      mesh.userData.nailIndex = index;
      mesh.castShadow = true;
      shell.add(mesh);
      if (nail.pattern === "french" || nail.pattern === "swirl") {
        const ink = polish.clone();
        ink.color.set(nail.accentColor ?? (nail.pattern === "french" ? "#fffaf0" : "#372425"));
        const painted = new THREE.Mesh(paintedGeometry(width, length, nail.shape, nail.pattern), ink);
        painted.userData.nailIndex = index;
        shell.add(painted);
      }
      nail.elements.forEach(element => {
        const piece = charm(element.kind, element.color);
        const t = clamp(element.y + 0.5, 0.12, 0.88);
        const x = clamp(element.x, -0.42, 0.42) * width * profile(t, nail.shape);
        piece.position.set(x, (t - 0.5) * length, nailSurfaceZ(x, t, width, nail.shape) + 0.00028);
        piece.scale.setScalar(clamp(element.scale, 0.45, 1.8) * 1.35);
        piece.rotation.z = THREE.MathUtils.degToRad(element.rotation);
        piece.userData.nailIndex = index;
        piece.userData.elementId = element.id;
        piece.traverse(child => { child.userData.nailIndex = index; child.userData.elementId = element.id; });
        shell.add(piece);
      });
      if (latest.current.selectedNail === index) {
        const points: THREE.Vector3[] = [];
        for (let side = 0; side < 2; side++) {
          for (let j = 0; j <= 48; j++) {
            const t = side === 0 ? j / 48 : 1 - j / 48;
            points.push(new THREE.Vector3((side === 0 ? -1 : 1) * (width * profile(t, nail.shape) * 0.5 + 0.00027), (t - 0.5) * length, 0.00053));
          }
        }
        const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: "#b33c64", transparent: true, opacity: 0.85, depthTest: false }));
        outline.userData.isNailSelectionOutline = true;
        outline.renderOrder = 3;
        shell.add(outline);
      }
    });
    current.render();
  };

  useImperativeHandle(ref, () => ({
    capture() {
      const current = runtime.current;
      if (!current?.ready) return null;
      const selection: { object: THREE.Object3D; visible: boolean }[] = [];
      current.scene.traverse(object => {
        if (object.userData.isNailSelectionOutline) {
          selection.push({ object, visible: object.visible });
          object.visible = false;
        }
      });
      try {
        current.render();
        return current.renderer.domElement.toDataURL("image/png");
      } catch { return null; }
      finally {
        selection.forEach(({ object, visible }) => { object.visible = visible; });
        current.render();
      }
    },
    resetView() {
      const current = runtime.current;
      current?.resetView();
    },
    zoomBy(factor) { runtime.current?.zoomBy(factor); },
    hitNail(x, y) { return runtime.current?.hitNail(x, y) ?? null; },
    rotateBy(x, y) {
      const current = runtime.current;
      if (current) { current.cancelViewAnimation(); current.turntable.rotateOnWorldAxis(VIEW_YAW_AXIS, x); current.turntable.rotateOnWorldAxis(VIEW_PITCH_AXIS, y); current.render(); }
    },
  }), []);

  useEffect(() => { paintRef.current(); }, [props.nails, props.skinTone, props.selectedNail, props.handedness]);
  useEffect(() => {
    const resetZoom = lastResetKey.current !== props.resetViewKey;
    lastResetKey.current = props.resetViewKey;
    runtime.current?.setPose(props.pose ?? "relaxed", true, resetZoom);
  }, [props.pose, props.resetViewKey]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let stopped = false;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    } catch { latest.current.onError?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.prepend(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.01, 30);
    camera.position.set(0, 0.05, 8);
    camera.lookAt(0, 0.05, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = new RoomEnvironment();
    const environmentMap = pmrem.fromScene(environment, 0.04);
    scene.environment = environmentMap.texture;
    environment.dispose();
    pmrem.dispose();
    const ambient = new THREE.HemisphereLight(0xfffbf0, 0x9e7973, 1);
    scene.add(ambient);
    const key = new THREE.DirectionalLight(0xfff8ed, 2);
    key.position.set(-3, 5, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1);
    rim.position.set(4, 2, -2);
    scene.add(rim);
    const fill = new THREE.DirectionalLight(0xd8eeed, 0.5);
    fill.position.set(3, -1, 4);
    scene.add(fill);
    const turntable = new THREE.Group();
    turntable.rotation.set(DEFAULT_ROTATION.x, DEFAULT_ROTATION.y, 0);
    scene.add(turntable);
    const skin = new THREE.MeshPhysicalMaterial({ color: latest.current.skinTone, roughness: 0.65, metalness: 0, clearcoat: 0.02, sheen: 0.12, sheenRoughness: 0.8, sheenColor: "#e7b3a0", envMapIntensity: 0.35 });
    let joints: PoseJoint[] = [];
    let poseFrame: number | null = null;
    let animateView = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const resetView = () => {
      animateView = false;
      const target = POSES[latest.current.pose ?? "relaxed"];
      turntable.rotation.set(...target.view);
      turntable.position.y = target.lift;
      camera.zoom = 1; camera.updateProjectionMatrix();
      current.render();
    };
    const setPose = (name: HandPose, animate = true, resetZoom = false) => {
      if (poseFrame !== null) { cancelAnimationFrame(poseFrame); poseFrame = null; }
      if (!joints.length || stopped) return;
      const target = POSES[name];
      const start = performance.now();
      const blendJoints = beginJointTransition(joints, target, { coordinated: true });
      const startView = turntable.quaternion.clone();
      const endView = new THREE.Quaternion().setFromEuler(new THREE.Euler(...target.view));
      const startLift = turntable.position.y;
      const startZoom = camera.zoom;
      animateView = true;
      const frame = (now: number) => {
        if (stopped) return;
        const progress = !animate || reducedMotion.matches ? 1 : clamp((now - start) / POSE_DURATION, 0, 1);
        const wristProgress = poseWristProgress(progress);
        blendJoints(progress);
        if (animateView) {
          turntable.quaternion.slerpQuaternions(startView, endView, wristProgress);
          turntable.position.y = THREE.MathUtils.lerp(startLift, target.lift, wristProgress);
          if (resetZoom) {
            camera.zoom = THREE.MathUtils.lerp(startZoom, 1, wristProgress);
            camera.updateProjectionMatrix();
          }
        }
        current.render();
        poseFrame = progress < 1 ? requestAnimationFrame(frame) : null;
      };
      frame(start);
    };
    const current: Runtime = {
      renderer, scene, camera, turntable, mounts: [], ready: false, skin,
      hitNail: () => null,
      zoomBy: factor => { animateView = false; camera.zoom = clamp(camera.zoom * factor, 0.65, 2.6); camera.updateProjectionMatrix(); current.render(); },
      setPose, resetView, cancelViewAnimation: () => { animateView = false; },
      render: () => { if (!stopped) renderer.render(scene, camera); },
    };
    runtime.current = current;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      // Tall, edge-to-edge Studio canvases still need room for the thumb and
      // fanned pinky. Fit the vertical dimension normally; only widen the
      // camera when the narrow screen would otherwise crop an outer finger.
      const halfHeight = Math.max(aspect < 0.8 ? 2.05 : 1.9, 1.68 / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();
      current.render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    new GLTFLoader().load("/assets/3d/generic-hand-left.glb", gltf => {
      if (stopped) { disposeTree(gltf.scene); return; }
      const original = gltf.scene;
      original.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(material => material.dispose());
          mesh.material = skin;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          mesh.frustumCulled = false;
        }
      });
      // Convert WebXR's wrist-relative coordinates to a dorsal, fingertips-up view.
      const orientation = new THREE.Group();
      orientation.rotation.set(Math.PI, -Math.PI / 2, 0);
      orientation.scale.setScalar(17.5);
      const centering = new THREE.Group();
      centering.position.set(0.028, 0.032, -0.001);
      centering.add(original);
      orientation.add(centering);
      turntable.add(orientation);
      original.updateMatrixWorld(true);
      joints = articulateHand(original);
      JOINTS.forEach((name, index) => {
        const joint = original.getObjectByName(name);
        const distal = original.getObjectByName(`${DIGITS[index]}-phalanx-distal`);
        if (!joint || !distal) return;
        const tip = original.worldToLocal(joint.getWorldPosition(new THREE.Vector3()));
        const rootInverse = original.getWorldQuaternion(new THREE.Quaternion()).invert();
        const orientation = rootInverse.multiply(joint.getWorldQuaternion(new THREE.Quaternion()));
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation).normalize();
        const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation).normalize();
        const across = new THREE.Vector3().crossVectors(direction, normal).normalize();
        const group = new THREE.Group();
        group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, direction, normal));
        group.position.copy(tip).addScaledVector(normal, index === 0 ? 0.006 : 0.0054);
        original.add(group);
        // The cuticle, polish, painted motifs and charms follow the same distal
        // joint as the skin, including during interrupted pose transitions.
        distal.attach(group);
        current.mounts.push({ group, width: WIDTHS[index] });
      });
      if (current.mounts.length !== JOINTS.length) { latest.current.onError?.(); return; }
      current.setPose(latest.current.pose ?? "relaxed", false);
      paintRef.current();
      current.ready = true;
      latest.current.onReady?.();
    }, undefined, () => { if (!stopped) { current.ready = false; latest.current.onError?.(); } });

    const raycaster = new THREE.Raycaster();
    const point = new THREE.Vector2();
    let gesture: { id: number; x: number; y: number; lastX: number; lastY: number; dragged: boolean } | null = null;
    const pointers = new Map<number, {x:number;y:number}>();
    let pinchDistance = 0;
    let movingElement: {index:number;id:string;plane:THREE.Plane} | null = null;
    function cast(x:number,y:number) {
      const rect=element!.getBoundingClientRect();
      point.set(((x-rect.left)/rect.width)*2-1,-((y-rect.top)/rect.height)*2+1);
      raycaster.setFromCamera(point,camera);
      return raycaster.intersectObjects(current.mounts.map(m=>m.group),true).find(h=>typeof h.object.userData.nailIndex==='number'&&!h.object.userData.isNailSelectionOutline);
    }
    current.hitNail=(x,y)=>{
      const hit=cast(x,y);if(!hit)return null;
      const index=hit.object.userData.nailIndex as number;
      const mount=current.mounts[index],nail=latest.current.nails[index];
      const local=mount.group.worldToLocal(hit.point.clone());
      const length=nailLength(nail.length)*(index===4?.87:index===0?1.04:1);
      return {index,x:clamp(local.x/mount.width,-.4,.4),y:clamp((local.y-(length-.017)*.5)/length,-.38,.38)};
    };
    const pointerDown = (event: PointerEvent) => {
      if(latest.current.interactive===false)return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      element.setPointerCapture(event.pointerId);
      if(pointers.size===2){
        const [a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);gesture=null;movingElement=null;return;
      }
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,dragged:false};
      const hit=cast(event.clientX,event.clientY);
      if(hit?.object.userData.elementId){
        const index=hit.object.userData.nailIndex as number,id=hit.object.userData.elementId as string;
        const normal=new THREE.Vector3(0,0,1).transformDirection(current.mounts[index].group.matrixWorld);
        movingElement={index,id,plane:new THREE.Plane().setFromNormalAndCoplanarPoint(normal,hit.point)};
        latest.current.onSelectNail?.(index);latest.current.onMoveElement?.(index,id,0,0,'start');
      }
      element.classList.add('is-rotating');
    };
    const pointerMove=(event:PointerEvent)=>{
      if(!pointers.has(event.pointerId))return;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pointers.size>=2){const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance>0)current.zoomBy(distance/pinchDistance);pinchDistance=distance;return;}
      if(!gesture||gesture.id!==event.pointerId)return;
      if(Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>5)gesture.dragged=true;
      if(gesture.dragged&&movingElement){
        cast(event.clientX,event.clientY);const target=new THREE.Vector3();
        if(raycaster.ray.intersectPlane(movingElement.plane,target)){
          const {index,id}=movingElement,mount=current.mounts[index],nail=latest.current.nails[index];
          const local=mount.group.worldToLocal(target),length=nailLength(nail.length)*(index===4?.87:index===0?1.04:1);
          latest.current.onMoveElement?.(index,id,clamp(local.x/mount.width,-.4,.4),clamp((local.y-(length-.017)*.5)/length,-.38,.38),'move');
        }
      }else if(gesture.dragged){current.cancelViewAnimation();turntable.rotateOnWorldAxis(VIEW_YAW_AXIS,(event.clientX-gesture.lastX)*.009);turntable.rotateOnWorldAxis(VIEW_PITCH_AXIS,(event.clientY-gesture.lastY)*.007);current.render();}
      gesture.lastX=event.clientX;gesture.lastY=event.clientY;
    };
    const pointerUp=(event:PointerEvent)=>{
      const wasPinch=pointers.size>1;pointers.delete(event.pointerId);
      if(element.hasPointerCapture(event.pointerId))element.releasePointerCapture(event.pointerId);
      if(movingElement)latest.current.onMoveElement?.(movingElement.index,movingElement.id,0,0,'end');
      if(gesture&&!gesture.dragged&&!wasPinch&&event.type!=='pointercancel'){const hit=cast(event.clientX,event.clientY);if(hit)latest.current.onSelectNail?.(hit.object.userData.nailIndex as number);}
      gesture=null;movingElement=null;pinchDistance=0;element.classList.remove('is-rotating');
    };
    const keyDown = (event: KeyboardEvent) => {
      if (latest.current.interactive === false) return;
      const deltas: Record<string, [number, number]> = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.1], ArrowDown: [0, 0.1] };
      if (event.key === "Home") { event.preventDefault(); current.resetView(); }
      else if (deltas[event.key]) {
        event.preventDefault();
        current.cancelViewAnimation();
        const [x, y] = deltas[event.key];
        turntable.rotateOnWorldAxis(VIEW_YAW_AXIS, x);
        turntable.rotateOnWorldAxis(VIEW_PITCH_AXIS, y);
        current.render();
      } else if (/^[1-5]$/.test(event.key)) { event.preventDefault(); latest.current.onSelectNail?.(Number(event.key) - 1); }
    };
    element.addEventListener("pointerdown", pointerDown);
    element.addEventListener("pointermove", pointerMove);
    element.addEventListener("pointerup", pointerUp);
    element.addEventListener("pointercancel", pointerUp);
    element.addEventListener("keydown", keyDown);
    return () => {
      stopped = true;
      if (poseFrame !== null) cancelAnimationFrame(poseFrame);
      observer.disconnect();
      element.removeEventListener("pointerdown", pointerDown);
      element.removeEventListener("pointermove", pointerMove);
      element.removeEventListener("pointerup", pointerUp);
      element.removeEventListener("pointercancel", pointerUp);
      element.removeEventListener("keydown", keyDown);
      disposeTree(scene);
      environmentMap.dispose();
      skin.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      if (runtime.current === current) runtime.current = null;
    };
  }, []);

  const selected = props.selectedNail === null ? "All nails" : `${FINGERS[props.selectedNail]} nail`;
  return <div ref={host} className={`hand-scene ${props.interactive === false ? "is-still" : ""} ${props.className ?? ""}`} role="img" aria-label={props.interactive === false ? `Sample 3D ${props.handedness ?? "left"} hand in ${props.pose ?? "relaxed"} pose` : `Interactive 3D ${props.handedness ?? "left"} hand, ${props.pose ?? "relaxed"} pose. ${selected} selected. Drag to rotate, pinch to zoom, tap a nail to select. Drag a detail to move it. Arrow keys rotate; keys 1 to 5 select fingers; Home resets the view.`} tabIndex={props.interactive === false ? -1 : 0} data-scroll-drag={props.interactive === false ? undefined : "ignore"} />;
});

export default HandScene;
