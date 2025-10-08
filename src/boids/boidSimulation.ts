import {
  DataTexture,
  FloatType,
  RGBAFormat,
  Vector3,
  WebGLRenderer,
} from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { boidPositionShader } from "./shaders/boidPosition.glsl";
import { boidVelocityShader } from "./shaders/boidSimulation.glsl";

export interface BoidSettings {
  population: number;
  perceptionRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  maxSpeed: number;
  maxForce: number;
  boundsMin: Vector3;
  boundsMax: Vector3;
}

export interface BoidState {
  settings: BoidSettings;
  compute: GPUComputationRenderer;
  velocityVariable: ReturnType<GPUComputationRenderer["addVariable"]>;
  positionVariable: ReturnType<GPUComputationRenderer["addVariable"]>;
  width: number;
  height: number;
  count: number;
}

const defaultSettings: BoidSettings = {
  population: 256,
  perceptionRadius: 4,
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.0,
  maxSpeed: 6,
  maxForce: 0.08,
  boundsMin: new Vector3(-20, 2, -20),
  boundsMax: new Vector3(20, 18, 20),
};

const packBoids = (count: number, boundsMin: Vector3, boundsMax: Vector3) => {
  const width = Math.ceil(Math.sqrt(count));
  const height = width;
  const tex = new DataTexture(
    new Float32Array(width * height * 4),
    width,
    height,
    RGBAFormat,
    FloatType
  );
  tex.needsUpdate = true;
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    tex.image.data[offset + 0] =
      boundsMin.x + Math.random() * (boundsMax.x - boundsMin.x);
    tex.image.data[offset + 1] =
      boundsMin.y + Math.random() * (boundsMax.y - boundsMin.y);
    tex.image.data[offset + 2] =
      boundsMin.z + Math.random() * (boundsMax.z - boundsMin.z);
    tex.image.data[offset + 3] = 1;
  }
  return { tex, width, height };
};

const createVelocityTexture = (
  width: number,
  height: number,
  maxSpeed: number
) => {
  const tex = new DataTexture(
    new Float32Array(width * height * 4),
    width,
    height,
    RGBAFormat,
    FloatType
  );
  tex.needsUpdate = true;
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4;
    const theta = Math.random() * Math.PI * 2.0;
    const phi = Math.acos(2.0 * Math.random() - 1.0);
    const speed = Math.random() * maxSpeed;
    tex.image.data[offset + 0] = speed * Math.sin(phi) * Math.cos(theta);
    tex.image.data[offset + 1] = speed * Math.cos(phi);
    tex.image.data[offset + 2] = speed * Math.sin(phi) * Math.sin(theta);
    tex.image.data[offset + 3] = 1;
  }
  return tex;
};

export const createBoidCompute = (
  renderer: WebGLRenderer,
  overrides: Partial<BoidSettings> = {}
): BoidState => {
  const settings = { ...defaultSettings, ...overrides };
  const count = settings.population;
  const {
    tex: posTexture,
    width,
    height,
  } = packBoids(count, settings.boundsMin, settings.boundsMax);
  const velocityTexture = createVelocityTexture(
    width,
    height,
    settings.maxSpeed
  );

  const compute = new GPUComputationRenderer(width, height, renderer);
  const velocityVariable = compute.addVariable(
    "textureVelocity",
    boidVelocityShader,
    velocityTexture
  );
  const positionVariable = compute.addVariable(
    "texturePosition",
    boidPositionShader,
    posTexture
  );

  compute.setVariableDependencies(velocityVariable, [
    velocityVariable,
    positionVariable,
  ]);
  compute.setVariableDependencies(positionVariable, [
    velocityVariable,
    positionVariable,
  ]);

  velocityVariable.material.uniforms = {
    texturePosition: { value: null },
    textureVelocity: { value: null },
    delta: { value: 0 },
    maxSpeed: { value: settings.maxSpeed },
    maxForce: { value: settings.maxForce },
    perceptionRadius: { value: settings.perceptionRadius },
    separationWeight: { value: settings.separationWeight },
    alignmentWeight: { value: settings.alignmentWeight },
    cohesionWeight: { value: settings.cohesionWeight },
    boundsMin: { value: settings.boundsMin },
    boundsMax: { value: settings.boundsMax },
  };

  positionVariable.material.uniforms = {
    texturePosition: { value: null },
    textureVelocity: { value: null },
    delta: { value: 0 },
    boundsMin: { value: settings.boundsMin },
    boundsMax: { value: settings.boundsMax },
  };

  const error = compute.init();
  if (error) {
    throw new Error(error);
  }

  return {
    settings,
    compute,
    velocityVariable,
    positionVariable,
    width,
    height,
    count,
  };
};

export const updateBoids = (state: BoidState, delta: number) => {
  state.velocityVariable.material.uniforms.delta.value = delta;
  state.positionVariable.material.uniforms.delta.value = delta;
  state.compute.compute();
};

export const updateBoidUniforms = (state: BoidState) => {
  const uniforms = state.velocityVariable.material.uniforms;
  uniforms.maxSpeed.value = state.settings.maxSpeed;
  uniforms.maxForce.value = state.settings.maxForce;
  uniforms.perceptionRadius.value = state.settings.perceptionRadius;
  uniforms.separationWeight.value = state.settings.separationWeight;
  uniforms.alignmentWeight.value = state.settings.alignmentWeight;
  uniforms.cohesionWeight.value = state.settings.cohesionWeight;
};

export const disposeBoidState = (state: BoidState) => {
  state.compute.dispose();
};
