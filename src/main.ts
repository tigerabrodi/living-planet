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
  Uniform,
  Vector2,
  Vector3,
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

const gui = new GUI({ title: "Raymarch Controls" });
gui.domElement.classList.add("gui-panel");

const pointer = new Vector2();

const uniforms = {
  time: new Uniform(0),
  resolution: new Uniform(new Vector2(window.innerWidth, window.innerHeight)),
  pointer: new Uniform(pointer.clone()),
  cameraPos: new Uniform(new Vector3(0, 2, 4)),
  orbitTarget: new Uniform(new Vector3(0, 0, 0)),
  orbitStrength: new Uniform(0.35),
  hueShift: new Uniform(0.0),
  ambientStrength: new Uniform(0.12),
  diffusion: new Uniform(0.18),
  maxSteps: new Uniform(128),
  maxDistance: new Uniform(50.0),
  surfaceEpsilon: new Uniform(0.0015),
  lightDirection: new Uniform(new Vector3(0.5, 0.8, 0.2).normalize()),
} satisfies Record<string, IUniform<number | Vector2 | Vector3>>;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform float time;
  uniform vec2 resolution;
  uniform vec2 pointer;
  uniform vec3 cameraPos;
  uniform vec3 orbitTarget;
  uniform float hueShift;
  uniform float ambientStrength;
  uniform float diffusion;
  uniform float maxSteps;
  uniform float maxDistance;
  uniform float surfaceEpsilon;
  uniform vec3 lightDirection;

  const float PI = 3.14159265359;

  mat2 rotate(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  float sdSphere(vec3 p, float r) {
    return length(p) - r;
  }

  float sdBox(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
  }

  float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
  }

  float sdPlane(vec3 p, vec3 n, float h) {
    // n must be normalized
    return dot(p, n) + h;
  }

  float smoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
  }

  vec3 repeat(vec3 p, vec3 size) {
    return mod(p + 0.5 * size, size) - 0.5 * size;
  }

  vec2 mapScene(in vec3 p) {
    vec3 displaced = p;
    displaced.y += sin(p.x * 1.3 + time * 0.6) * 0.2;
    displaced.x += sin(p.z * 0.9 - time * 0.4) * 0.1;

    float sphere = sdSphere(displaced, 1.0);

    vec3 torusPos = p - vec3(1.6, 0.0, 0.0);
    torusPos.xz *= rotate(time * 0.25);
    float torus = sdTorus(torusPos, vec2(0.9, 0.24));

    vec3 boxPos = p - vec3(-1.4, 0.2 * sin(time * 0.8), 0.0);
    boxPos.yz *= rotate(time * 0.35);
    float box = sdBox(boxPos, vec3(0.6));

    float floor = sdPlane(p, vec3(0.0, 1.0, 0.0), 1.1 + 0.1 * sin(time));

    float d = sphere;
    float material = 1.0;

    float blend = smoothUnion(d, torus, 0.35);
    if (blend < d) {
      d = blend;
      material = 2.0;
    }

    blend = smoothUnion(d, box, 0.28);
    if (blend < d) {
      d = blend;
      material = 3.0;
    }

    if (floor < d) {
      d = floor;
      material = 4.0;
    }

    return vec2(d, material);
  }

  vec3 estimateNormal(in vec3 p) {
    vec2 e = vec2(1.0, -1.0) * surfaceEpsilon;
    return normalize(
      e.xyy * mapScene(p + e.xyy).x +
      e.yyx * mapScene(p + e.yyx).x +
      e.yxy * mapScene(p + e.yxy).x +
      e.xxx * mapScene(p + e.xxx).x
    );
  }

  float softShadow(in vec3 ro, in vec3 rd) {
    float shadow = 1.0;
    float t = 0.02;
    for (int i = 0; i < 64; i++) {
      float h = mapScene(ro + rd * t).x;
      shadow = min(shadow, 12.0 * h / t);
      t += clamp(h, 0.03, 0.35);
      if (shadow < 0.001 || t > maxDistance) break;
    }
    return clamp(shadow, 0.0, 1.0);
  }

  vec3 palette(float t) {
    vec3 a = vec3(0.55 + hueShift * 0.5, 0.48, 0.50);
    vec3 b = vec3(0.32, 0.28, 0.35);
    vec3 c = vec3(1.0, 0.85, 0.75);
    vec3 d = vec3(0.25, 0.4, 0.55);
    return a + b * cos(6.28318 * (c * t + d));
  }

  vec3 shade(in vec3 pos, in vec3 rd, in vec2 hit) {
    vec3 normal = estimateNormal(pos);
    vec3 lightDir = normalize(lightDirection);
    float diff = max(dot(normal, lightDir), 0.0);
    float shadow = softShadow(pos + normal * surfaceEpsilon * 2.0, lightDir);
    float spec = pow(max(dot(reflect(-lightDir, normal), -rd), 0.0), 32.0);
    float fresnel = pow(1.0 - clamp(dot(-rd, normal), 0.0, 1.0), 3.0);

    vec3 baseColor;
    if (hit.y < 1.5) {
      baseColor = palette(0.1 + sin(time * 0.5) * 0.05);
    } else if (hit.y < 2.5) {
      baseColor = palette(0.45 + pointer.x * 0.15);
    } else if (hit.y < 3.5) {
      baseColor = palette(0.65 + pointer.y * 0.1);
    } else {
      baseColor = mix(vec3(0.18, 0.12, 0.10), vec3(0.05, 0.05, 0.06), clamp(pos.y + 1.2, 0.0, 1.0));
    }

    vec3 color = baseColor * (ambientStrength + diffusion * diff * shadow);
    color += spec * 0.25;
    color += fresnel * 0.15;

    return color;
  }

  vec3 renderPixel(vec2 fragCoord) {
    vec2 uv = (fragCoord / resolution) * 2.0 - 1.0;
    uv.x *= resolution.x / resolution.y;

    vec3 forward = normalize(orbitTarget - cameraPos);
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), forward));
    vec3 up = normalize(cross(forward, right));
    float focalLength = 1.2;
    vec3 rd = normalize(uv.x * right + uv.y * up + focalLength * forward);
    vec3 ro = cameraPos;

    float totalDist = 0.0;
    vec2 hit = vec2(-1.0);

    for (int i = 0; i < 256; i++) {
      if (i >= int(maxSteps)) break;
      vec3 current = ro + rd * totalDist;
      vec2 dist = mapScene(current);
      if (dist.x < surfaceEpsilon || totalDist > maxDistance) {
        hit = vec2(totalDist, dist.y);
        break;
      }
      totalDist += dist.x;
    }

    vec3 sky = vec3(0.02, 0.025, 0.03) + vec3(0.05) * pow(1.0 - clamp(uv.y + 0.5, 0.0, 1.0), 2.0);

    if (hit.x > 0.0 && hit.x < maxDistance) {
      vec3 pos = ro + rd * hit.x;
      vec3 shaded = shade(pos, rd, hit);
      float fog = exp(-hit.x * 0.065);
      return mix(sky, shaded, fog);
    }

    return sky;
  }

  void main() {
    vec3 color = renderPixel(gl_FragCoord.xy);
    gl_FragColor = vec4(color, 1.0);
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

const raymarchFolder = gui.addFolder("Raymarch");
raymarchFolder
  .add(uniforms.orbitStrength, "value", 0.0, 1.0, 0.01)
  .name("Orbit Speed");
raymarchFolder
  .add(uniforms.hueShift, "value", -1.0, 1.0, 0.01)
  .name("Hue Shift");
raymarchFolder
  .add(uniforms.ambientStrength, "value", 0.0, 0.6, 0.01)
  .name("Ambient");
raymarchFolder.add(uniforms.diffusion, "value", 0.0, 0.6, 0.01).name("Diffuse");
raymarchFolder.add(uniforms.maxSteps, "value", 32, 256, 1).name("Max Steps");
raymarchFolder
  .add(uniforms.maxDistance, "value", 10, 150, 1)
  .name("Max Distance");
raymarchFolder
  .add(uniforms.surfaceEpsilon, "value", 0.0005, 0.01, 0.0001)
  .name("Surface Epsilon");
raymarchFolder.close();

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
  const elapsed = clock.getElapsedTime();
  uniforms.time.value = elapsed;

  const orbitSpeed = uniforms.orbitStrength.value;
  const angle = elapsed * (0.4 + orbitSpeed * 1.5);
  const radius = 4.2;
  const cam = uniforms.cameraPos.value;
  cam.set(
    Math.cos(angle) * radius,
    1.2 + Math.sin(elapsed * 0.35) * 0.6,
    Math.sin(angle) * radius
  );

  const target = uniforms.orbitTarget.value;
  target.set(
    (uniforms.pointer.value.x - 0.5) * 1.5,
    0.0,
    (uniforms.pointer.value.y - 0.5) * 1.5
  );

  uniforms.lightDirection.value
    .set(Math.cos(angle * 0.6), 0.8, Math.sin(angle * 0.6))
    .normalize();

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
