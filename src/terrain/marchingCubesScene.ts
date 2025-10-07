import type { GUI } from "lil-gui";
import {
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { RenderContext, SceneModule } from "../sceneModule";
import { edgeTable, triTable } from "../tables";
import {
  createDensityField,
  indexOf,
  updateDensityField,
  type DensityFieldMode,
  type DensityFieldSettings,
  type DensityFieldState,
} from "./densityField";

interface MarchingParams {
  wireframe: boolean;
  frequency: number;
  amplitude: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  ridgeSharpness: number;
  timeScale: number;
  regenerate: () => void;
  debugShape: DensityFieldMode;
}

const voxelVertices: number[] = [];
const voxelNormals: number[] = [];

const interpolate = (
  out: Vector3,
  p1: Vector3,
  p2: Vector3,
  val1: number,
  val2: number,
  isoLevel: number
) => {
  if (Math.abs(isoLevel - val1) < 1e-6) return out.copy(p1);
  if (Math.abs(isoLevel - val2) < 1e-6) return out.copy(p2);
  if (Math.abs(val1 - val2) < 1e-6) return out.copy(p1);
  const mu = (isoLevel - val1) / (val2 - val1);
  return out.copy(p1).lerp(p2, mu);
};

const generateMesh = (
  state: DensityFieldState,
  isoLevel: number,
  geometry: BufferGeometry
) => {
  voxelVertices.length = 0;
  voxelNormals.length = 0;

  const { size, values } = state;
  const cubeVerts = Array.from({ length: 8 }, () => new Vector3());
  const edgeVerts = Array.from({ length: 12 }, () => new Vector3());

  for (let z = 0; z < size - 1; z++) {
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        let cubeIndex = 0;
        const fieldValues: number[] = new Array(8);

        for (let i = 0; i < 8; i++) {
          const vx = x + ((i & 1) === 1 ? 1 : 0);
          const vy = y + ((i & 2) === 2 ? 1 : 0);
          const vz = z + ((i & 4) === 4 ? 1 : 0);
          cubeVerts[i].set(vx, vy, vz);
          const value = values[indexOf(state, vx, vy, vz)];
          fieldValues[i] = value;
          if (value < isoLevel) cubeIndex |= 1 << i;
        }

        const edges = edgeTable[cubeIndex];
        if (edges === 0) continue;

        if (edges & 1)
          interpolate(
            edgeVerts[0],
            cubeVerts[0],
            cubeVerts[1],
            fieldValues[0],
            fieldValues[1],
            isoLevel
          );
        if (edges & 2)
          interpolate(
            edgeVerts[1],
            cubeVerts[1],
            cubeVerts[2],
            fieldValues[1],
            fieldValues[2],
            isoLevel
          );
        if (edges & 4)
          interpolate(
            edgeVerts[2],
            cubeVerts[2],
            cubeVerts[3],
            fieldValues[2],
            fieldValues[3],
            isoLevel
          );
        if (edges & 8)
          interpolate(
            edgeVerts[3],
            cubeVerts[3],
            cubeVerts[0],
            fieldValues[3],
            fieldValues[0],
            isoLevel
          );
        if (edges & 16)
          interpolate(
            edgeVerts[4],
            cubeVerts[4],
            cubeVerts[5],
            fieldValues[4],
            fieldValues[5],
            isoLevel
          );
        if (edges & 32)
          interpolate(
            edgeVerts[5],
            cubeVerts[5],
            cubeVerts[6],
            fieldValues[5],
            fieldValues[6],
            isoLevel
          );
        if (edges & 64)
          interpolate(
            edgeVerts[6],
            cubeVerts[6],
            cubeVerts[7],
            fieldValues[6],
            fieldValues[7],
            isoLevel
          );
        if (edges & 128)
          interpolate(
            edgeVerts[7],
            cubeVerts[7],
            cubeVerts[4],
            fieldValues[7],
            fieldValues[4],
            isoLevel
          );
        if (edges & 256)
          interpolate(
            edgeVerts[8],
            cubeVerts[0],
            cubeVerts[4],
            fieldValues[0],
            fieldValues[4],
            isoLevel
          );
        if (edges & 512)
          interpolate(
            edgeVerts[9],
            cubeVerts[1],
            cubeVerts[5],
            fieldValues[1],
            fieldValues[5],
            isoLevel
          );
        if (edges & 1024)
          interpolate(
            edgeVerts[10],
            cubeVerts[2],
            cubeVerts[6],
            fieldValues[2],
            fieldValues[6],
            isoLevel
          );
        if (edges & 2048)
          interpolate(
            edgeVerts[11],
            cubeVerts[3],
            cubeVerts[7],
            fieldValues[3],
            fieldValues[7],
            isoLevel
          );

        const tri = triTable[cubeIndex];
        for (let i = 0; tri[i] !== -1; i += 3) {
          const v1 = edgeVerts[tri[i]];
          const v2 = edgeVerts[tri[i + 1]];
          const v3 = edgeVerts[tri[i + 2]];

          const ax = v2.x - v1.x;
          const ay = v2.y - v1.y;
          const az = v2.z - v1.z;
          const bx = v3.x - v1.x;
          const by = v3.y - v1.y;
          const bz = v3.z - v1.z;

          const nx = ay * bz - az * by;
          const ny = az * bx - ax * bz;
          const nz = ax * by - ay * bx;
          const invLen =
            1 / Math.max(Math.sqrt(nx * nx + ny * ny + nz * nz), 1e-6);

          voxelVertices.push(
            v1.x,
            v1.y,
            v1.z,
            v2.x,
            v2.y,
            v2.z,
            v3.x,
            v3.y,
            v3.z
          );
          voxelNormals.push(
            nx * invLen,
            ny * invLen,
            nz * invLen,
            nx * invLen,
            ny * invLen,
            nz * invLen,
            nx * invLen,
            ny * invLen,
            nz * invLen
          );
        }
      }
    }
  }

  if (voxelVertices.length === 0) {
    geometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(0), 3)
    );
    geometry.setAttribute(
      "normal",
      new BufferAttribute(new Float32Array(0), 3)
    );
    geometry.boundingSphere = null;
    geometry.boundingBox = null;
    return;
  }

  for (let i = 0; i < voxelVertices.length; i++) {
    if (!Number.isFinite(voxelVertices[i])) {
      console.warn(
        "Marching cubes produced invalid vertex values; skipping frame."
      );
      geometry.setAttribute(
        "position",
        new BufferAttribute(new Float32Array(0), 3)
      );
      geometry.setAttribute(
        "normal",
        new BufferAttribute(new Float32Array(0), 3)
      );
      geometry.boundingSphere = null;
      geometry.boundingBox = null;
      return;
    }
  }

  geometry.setAttribute(
    "position",
    new BufferAttribute(new Float32Array(voxelVertices), 3)
  );
  geometry.setAttribute(
    "normal",
    new BufferAttribute(new Float32Array(voxelNormals), 3)
  );
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
};

export const createMarchingCubesScene = (options: {
  gui: GUI;
  canvas: HTMLCanvasElement;
  pointer: Vector2;
}): SceneModule => {
  const { gui, canvas } = options;

  const densityState = createDensityField({ size: 48 });
  const scene = new Scene();
  scene.background = new Color("#12141a");

  const geometry = new BufferGeometry();
  const material = new MeshStandardMaterial({
    color: new Color("#6ea8ff"),
    flatShading: true,
    metalness: 0.15,
    roughness: 0.85,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.set(
    -densityState.size * 0.5,
    -densityState.size * 0.45,
    -densityState.size * 0.5
  );
  scene.add(mesh);

  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );
  camera.position.set(45, 35, 45);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  const dirLight = new DirectionalLight("#f2f4ff", 2.3);
  dirLight.position.set(30, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.bias = -0.0005;
  scene.add(dirLight);

  const ambient = new AmbientLight("#23324d", 0.5);
  scene.add(ambient);

  const params: MarchingParams = {
    wireframe: material.wireframe,
    frequency: densityState.settings.frequency,
    amplitude: densityState.settings.amplitude,
    octaves: densityState.settings.octaves,
    persistence: densityState.settings.persistence,
    lacunarity: densityState.settings.lacunarity,
    ridgeSharpness: densityState.settings.ridgeSharpness,
    timeScale: densityState.settings.timeScale,
    regenerate: () => regenerate(true),
    debugShape: densityState.mode,
  };

  const folder = gui.addFolder("Marching Terrain");
  folder
    .add(params, "wireframe")
    .name("Wireframe")
    .onChange((value: boolean) => {
      material.wireframe = value;
      material.needsUpdate = true;
    });

  folder
    .add(params, "frequency", 0.02, 0.4, 0.01)
    .name("Frequency")
    .onFinishChange(() => regenerate(true));
  folder
    .add(params, "amplitude", 0.4, 2.0, 0.05)
    .name("Amplitude")
    .onFinishChange(() => regenerate(true));
  folder
    .add(params, "octaves", 1, 6, 1)
    .name("Octaves")
    .onFinishChange(() => regenerate(true));
  folder
    .add(params, "persistence", 0.2, 0.9, 0.05)
    .name("Persistence")
    .onFinishChange(() => regenerate(true));
  folder
    .add(params, "lacunarity", 1.5, 3.5, 0.1)
    .name("Lacunarity")
    .onFinishChange(() => regenerate(true));
  folder
    .add(params, "ridgeSharpness", 0.3, 1.2, 0.05)
    .name("Ridge Sharpness")
    .onFinishChange(() => regenerate(true));
  folder
    .add(params, "timeScale", 0.0, 1.0, 0.05)
    .name("Time Scale")
    .onFinishChange(() => regenerate(false));
  folder
    .add({ sphere: false }, "sphere")
    .name("Debug Sphere")
    .onChange((useSphere: boolean) => {
      params.debugShape = useSphere ? "sphere" : "terrain";
      regenerate(true);
    });
  folder.add(params, "regenerate").name("Rebuild Now");
  folder.close();

  const regenerate = (hard: boolean) => {
    const settings: Partial<DensityFieldSettings> = {
      frequency: params.frequency,
      amplitude: params.amplitude,
      octaves: params.octaves,
      persistence: params.persistence,
      lacunarity: params.lacunarity,
      ridgeSharpness: params.ridgeSharpness,
      timeScale: params.timeScale,
    };

    // If we force a rebuild with different resolution we'd recreate state; for now, just update settings.
    Object.assign(densityState.settings, settings);
    if (hard) {
      updateDensityField(densityState, 0, params.debugShape);
      generateMesh(densityState, 0, geometry);
    }
  };

  regenerate(true);

  const render = ({ renderer, elapsed }: RenderContext) => {
    updateDensityField(densityState, elapsed, params.debugShape);
    generateMesh(densityState, 0, geometry);
    controls.update();
    renderer.render(scene, camera);
  };

  const resize = (width: number, height: number) => {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const dispose = () => {
    geometry.dispose();
    material.dispose();
    controls.dispose();
  };

  return {
    name: "Marching",
    scene,
    camera,
    render,
    resize,
    onDeactivate: () => controls.saveState(),
    onActivate: () => controls.reset(),
    dispose,
  };
};
