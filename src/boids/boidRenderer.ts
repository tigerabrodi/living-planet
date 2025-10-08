import {
  BufferGeometry,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  InstancedMesh,
  ShaderMaterial,
  Vector2,
} from "three";
import {
  boidRenderFragment,
  boidRenderVertex,
} from "./shaders/boidRender.glsl";

export const createBoidMesh = (textureSize: Vector2, instanceScale = 0.8) => {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute([0, 0.2, 0, -0.15, -0.2, 0, 0.15, -0.2, 0], 3)
  );

  const instanceCount = textureSize.x * textureSize.y;
  const uvData = new Float32Array(instanceCount * 2);
  let ptr = 0;
  for (let y = 0; y < textureSize.y; y++) {
    for (let x = 0; x < textureSize.x; x++) {
      uvData[ptr++] = x / (textureSize.x - 1);
      uvData[ptr++] = y / (textureSize.y - 1);
    }
  }
  geometry.setAttribute("instanceUV", new InstancedBufferAttribute(uvData, 2));

  const material = new ShaderMaterial({
    vertexShader: boidRenderVertex,
    fragmentShader: boidRenderFragment,
    uniforms: {
      texturePosition: { value: null },
      textureVelocity: { value: null },
      instanceScale: { value: instanceScale },
    },
  });

  const mesh = new InstancedMesh(geometry, material, instanceCount);
  mesh.frustumCulled = false;
  return mesh;
};
