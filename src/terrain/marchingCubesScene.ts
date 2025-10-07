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

const chunkSize = 32;
const isoLevel = 0;

const densityField = new Float32Array(chunkSize * chunkSize * chunkSize);
const voxelVertices: number[] = [];
const voxelNormals: number[] = [];

const indexOf = (x: number, y: number, z: number) =>
  x + chunkSize * (y + chunkSize * z);

const sampleNoise = (x: number, y: number, z: number, t: number) => {
  const scale = 0.12;
  return (
    Math.sin(x * scale + t * 0.3) +
    Math.sin(y * scale * 0.8 + t * 0.2) +
    Math.sin(z * scale * 1.2 + t * 0.4)
  );
};

const updateDensityField = (t: number) => {
  let index = 0;
  for (let z = 0; z < chunkSize; z++) {
    for (let y = 0; y < chunkSize; y++) {
      for (let x = 0; x < chunkSize; x++) {
        const nx = (x / chunkSize - 0.5) * 20;
        const ny = (y / chunkSize - 0.3) * 20;
        const nz = (z / chunkSize - 0.5) * 20;
        const height = sampleNoise(nx, ny, nz, t);
        densityField[index++] = height - ny * 0.6;
      }
    }
  }
};

const interpolate = (
  out: Vector3,
  p1: Vector3,
  p2: Vector3,
  val1: number,
  val2: number
) => {
  if (Math.abs(isoLevel - val1) < 1e-6) return out.copy(p1);
  if (Math.abs(isoLevel - val2) < 1e-6) return out.copy(p2);
  if (Math.abs(val1 - val2) < 1e-6) return out.copy(p1);
  const mu = (isoLevel - val1) / (val2 - val1);
  return out.copy(p1).lerp(p2, mu);
};

const generateMesh = (geometry: BufferGeometry) => {
  voxelVertices.length = 0;
  voxelNormals.length = 0;

  const cubeVerts = Array.from({ length: 8 }, () => new Vector3());
  const edgeVerts = Array.from({ length: 12 }, () => new Vector3());

  for (let z = 0; z < chunkSize - 1; z++) {
    for (let y = 0; y < chunkSize - 1; y++) {
      for (let x = 0; x < chunkSize - 1; x++) {
        let cubeIndex = 0;
        const values = new Array<number>(8);

        for (let i = 0; i < 8; i++) {
          const vx = x + ((i & 1) === 1 ? 1 : 0);
          const vy = y + ((i & 2) === 2 ? 1 : 0);
          const vz = z + ((i & 4) === 4 ? 1 : 0);
          cubeVerts[i].set(vx, vy, vz);
          const value = densityField[indexOf(vx, vy, vz)];
          values[i] = value;
          if (value < isoLevel) cubeIndex |= 1 << i;
        }

        const edges = edgeTable[cubeIndex];
        if (edges === 0) continue;

        if (edges & 1)
          interpolate(
            edgeVerts[0],
            cubeVerts[0],
            cubeVerts[1],
            values[0],
            values[1]
          );
        if (edges & 2)
          interpolate(
            edgeVerts[1],
            cubeVerts[1],
            cubeVerts[2],
            values[1],
            values[2]
          );
        if (edges & 4)
          interpolate(
            edgeVerts[2],
            cubeVerts[2],
            cubeVerts[3],
            values[2],
            values[3]
          );
        if (edges & 8)
          interpolate(
            edgeVerts[3],
            cubeVerts[3],
            cubeVerts[0],
            values[3],
            values[0]
          );
        if (edges & 16)
          interpolate(
            edgeVerts[4],
            cubeVerts[4],
            cubeVerts[5],
            values[4],
            values[5]
          );
        if (edges & 32)
          interpolate(
            edgeVerts[5],
            cubeVerts[5],
            cubeVerts[6],
            values[5],
            values[6]
          );
        if (edges & 64)
          interpolate(
            edgeVerts[6],
            cubeVerts[6],
            cubeVerts[7],
            values[6],
            values[7]
          );
        if (edges & 128)
          interpolate(
            edgeVerts[7],
            cubeVerts[7],
            cubeVerts[4],
            values[7],
            values[4]
          );
        if (edges & 256)
          interpolate(
            edgeVerts[8],
            cubeVerts[0],
            cubeVerts[4],
            values[0],
            values[4]
          );
        if (edges & 512)
          interpolate(
            edgeVerts[9],
            cubeVerts[1],
            cubeVerts[5],
            values[1],
            values[5]
          );
        if (edges & 1024)
          interpolate(
            edgeVerts[10],
            cubeVerts[2],
            cubeVerts[6],
            values[2],
            values[6]
          );
        if (edges & 2048)
          interpolate(
            edgeVerts[11],
            cubeVerts[3],
            cubeVerts[7],
            values[3],
            values[7]
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

  const scene = new Scene();
  scene.background = new Color("#181920");

  const geometry = new BufferGeometry();
  const material = new MeshStandardMaterial({
    color: new Color("#88a0ff"),
    wireframe: false,
    flatShading: true,
    metalness: 0.1,
    roughness: 0.8,
  });

  const mesh = new Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    200
  );
  camera.position.set(0, 20, 30);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 0, 0);

  const dirLight = new DirectionalLight("#ffffff", 2.5);
  dirLight.position.set(20, 30, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  const ambient = new AmbientLight("#406080", 0.35);
  scene.add(ambient);

  const params = {
    wireframe: material.wireframe,
    amplitude: 0.6,
    speed: 1.0,
  };

  const folder = gui.addFolder("Marching");
  folder
    .add(params, "wireframe")
    .name("Wireframe")
    .onChange((value: boolean) => {
      material.wireframe = value;
      material.needsUpdate = true;
    });
  folder.add(material, "metalness", 0, 1, 0.01).name("Metalness");
  folder.add(material, "roughness", 0, 1, 0.01).name("Roughness");
  folder.close();

  const render = ({ renderer, elapsed }: RenderContext) => {
    updateDensityField(elapsed);
    generateMesh(geometry);
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
