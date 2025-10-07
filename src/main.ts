import "./style.css";

import { GUI } from "lil-gui";
import Stats from "stats.js";
import {
  Clock,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
  type IUniform,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export type WebGPURendererLike = WebGLRenderer & { init?: () => Promise<void> };
type WebGPUConstructor = new (
  parameters?: Record<string, unknown>
) => WebGPURendererLike;

interface WebGPUExports {
  WebGPURenderer: WebGPUConstructor;
}

const loadWebGPURenderer = async (): Promise<WebGPUConstructor | null> => {
  try {
    const module = (await import(
      "three/webgpu"
    )) as unknown as Partial<WebGPUExports>;
    if (module.WebGPURenderer) {
      return module.WebGPURenderer;
    }
  } catch (error) {
    console.warn(
      "WebGPURenderer is unavailable; continuing with WebGL.",
      error
    );
  }
  return null;
};

const navigatorHasGPU = (
  candidate: Navigator
): candidate is Navigator & { gpu: GPU } => "gpu" in candidate;

type Renderer = WebGPURendererLike | WebGLRenderer;

const appContainer = document.querySelector<HTMLDivElement>("#app");

if (!appContainer) {
  throw new Error(
    "App container not found. Ensure index.html contains the #app element."
  );
}

let renderer: Renderer | null = null;

const createRenderer = async (): Promise<Renderer> => {
  if (navigatorHasGPU(window.navigator)) {
    const WebGPURendererCtor = await loadWebGPURenderer();
    if (WebGPURendererCtor) {
      const webgpuRenderer = new WebGPURendererCtor({
        canvas: document.createElement("canvas"),
        antialias: true,
        alpha: false,
      });
      // WebGPURenderer currently requires NodeMaterial-based pipelines. Because
      // our playground relies on ShaderMaterial for custom GLSL (per Three.js
      // docs & recent forum guidance), we fallback to WebGL to avoid runtime
      // compatibility warnings while keeping the WebGPU path ready for later.
      if ("isWebGPURenderer" in webgpuRenderer) {
        console.info(
          "WebGPURenderer available but ShaderMaterial is incompatible; using WebGLRenderer for now."
        );
        webgpuRenderer.dispose?.();
      } else {
        await webgpuRenderer?.init?.();
        return webgpuRenderer;
      }
    }
  }

  const webglRenderer = new WebGLRenderer({ antialias: true, alpha: false });
  return webglRenderer;
};

const canvas = document.createElement("canvas");
appContainer.append(canvas);

const stats = new Stats();
stats.showPanel(0);
stats.dom.classList.add("stats-panel");
appContainer.append(stats.dom);

const gui = new GUI({ title: "Playground Controls" });
gui.domElement.classList.add("stats-panel");
gui.domElement.style.top = "0.5rem";
gui.domElement.style.right = "0.5rem";
gui.domElement.style.left = "auto";

const pointer = new Vector2();

const uniforms = {
  time: { value: 0 },
  resolution: { value: new Vector2(window.innerWidth, window.innerHeight) },
  pointer: { value: pointer.clone() },
} satisfies Record<string, IUniform<number | Vector2>>;

const fragmentShader = /* glsl */ `
  uniform float time;
  uniform vec2 resolution;
  uniform vec2 pointer;

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 centered = uv * 2.0 - 1.0;
    float dist = length(centered - pointer);
    float glow = 0.1 / (dist + 0.1);
    float pulse = 0.5 + 0.5 * sin(time * 0.75);
    gl_FragColor = vec4(vec3(glow * pulse), 1.0);
  }
`;

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const material = new ShaderMaterial({
  uniforms,
  fragmentShader,
  vertexShader,
});

const geometry = new PlaneGeometry(2, 2);
const mesh = new Mesh(geometry, material);

const scene = new Scene();
scene.add(mesh);

const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

const controls = new OrbitControls(camera, canvas);
controls.enableRotate = false;
controls.enablePan = false;
controls.enableZoom = false;

const clock = new Clock();

const resize = () => {
  if (!renderer) return;
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height);
  uniforms.resolution.value.set(width, height);
};

const updatePointer = (event: PointerEvent) => {
  pointer.set(
    event.clientX / window.innerWidth,
    1 - event.clientY / window.innerHeight
  );
  uniforms.pointer.value.copy(pointer);
};

const render = () => {
  if (!renderer) return;
  stats.begin();
  uniforms.time.value = clock.getElapsedTime();
  renderer.render(scene, camera);
  stats.end();
};

const init = async () => {
  renderer = await createRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(render);
  renderer.domElement.classList.add("app-canvas");
  canvas.replaceWith(renderer.domElement);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", updatePointer);

  resize();
};

init().catch((error) => {
  console.error("Failed to initialize renderer", error);
});
