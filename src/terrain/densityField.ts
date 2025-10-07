import { createNoise4D } from "simplex-noise";
import { DataTexture, Vector3, WebGLRenderer } from "three";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import { densityComputeShader } from "./shaders/densityCompute.glsl";

export interface DensityFieldSettings {
  size: number;
  frequency: number;
  amplitude: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  ridgeSharpness: number;
  timeScale: number;
}

export type DensityFieldMode = "terrain" | "sphere";

interface DensityFieldGPUState {
  compute: GPUComputationRenderer;
  variable: ReturnType<GPUComputationRenderer["addVariable"]>;
  texture: DataTexture;
  uniforms: {
    time: { value: number };
    frequency: { value: number };
    amplitude: { value: number };
    persistence: { value: number };
    lacunarity: { value: number };
    ridgeSharpness: { value: number };
    timeScale: { value: number };
    octaves: { value: number };
    size: { value: number };
    mode: { value: number };
  };
  width: number;
  height: number;
  buffer: Float32Array;
}

const defaultSettings: DensityFieldSettings = {
  size: 48,
  frequency: 0.1,
  amplitude: 1.0,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2.0,
  ridgeSharpness: 0.6,
  timeScale: 0.35,
};

export interface DensityFieldState {
  settings: DensityFieldSettings;
  values: Float32Array;
  size: number;
  mode: DensityFieldMode;
  gpu?: DensityFieldGPUState;
  gpuUnavailable?: boolean;
}

const noise4D = createNoise4D();
const scratch = new Vector3();

const fbm = (
  x: number,
  y: number,
  z: number,
  settings: DensityFieldSettings,
  time: number
) => {
  let amplitude = settings.amplitude;
  let frequency = settings.frequency;
  let value = 0;

  for (let i = 0; i < settings.octaves; i++) {
    const noise = noise4D(
      x * frequency,
      y * frequency,
      z * frequency,
      time * settings.timeScale
    );
    value += noise * amplitude;
    amplitude *= settings.persistence;
    frequency *= settings.lacunarity;
  }

  return value;
};

const ridge = (value: number, sharpness: number) => {
  const r = Math.max(0, 1.0 - Math.abs(value));
  return Math.pow(r, sharpness);
};

export const createDensityField = (
  settings: Partial<DensityFieldSettings> = {},
  mode: DensityFieldMode = "terrain"
): DensityFieldState => {
  const merged = { ...defaultSettings, ...settings };
  const size = merged.size;
  return {
    settings: merged,
    values: new Float32Array(size * size * size),
    size,
    mode,
  };
};

export const initDensityFieldGPU = (
  state: DensityFieldState,
  renderer: WebGLRenderer
) => {
  if (state.gpu || state.gpuUnavailable) {
    return;
  }

  const size = state.size;
  const width = size;
  const height = size * size;

  try {
    const compute = new GPUComputationRenderer(width, height, renderer);
    const texture = compute.createTexture();
    const data = texture.image.data as Float32Array;

    for (let i = 0; i < state.values.length; i++) {
      data[i * 4] = state.values[i];
    }

    const variable = compute.addVariable(
      "textureDensity",
      densityComputeShader,
      texture
    );

    const rawUniforms = {
      time: { value: 0 },
      frequency: { value: state.settings.frequency },
      amplitude: { value: state.settings.amplitude },
      persistence: { value: state.settings.persistence },
      lacunarity: { value: state.settings.lacunarity },
      ridgeSharpness: { value: state.settings.ridgeSharpness },
      timeScale: { value: state.settings.timeScale },
      octaves: { value: state.settings.octaves },
      size: { value: state.size },
      mode: { value: state.mode === "sphere" ? 0 : 1 },
    };

    variable.material.uniforms = rawUniforms as Record<
      string,
      { value: number }
    >;
    compute.setVariableDependencies(variable, [variable]);

    const error = compute.init();
    if (error) {
      console.warn("GPUComputationRenderer init failed", error);
      state.gpuUnavailable = true;
      return;
    }

    state.gpu = {
      compute,
      variable,
      texture,
      uniforms: rawUniforms as DensityFieldGPUState["uniforms"],
      width,
      height,
      buffer: new Float32Array(width * height * 4),
    };
  } catch (error) {
    console.warn("Failed to initialize GPU density field", error);
    state.gpuUnavailable = true;
  }
};

export const updateDensityField = (
  state: DensityFieldState,
  elapsed: number,
  mode: DensityFieldMode = state.mode,
  renderer?: WebGLRenderer
): void => {
  state.mode = mode;

  const useGPU = renderer && !state.gpuUnavailable;
  if (useGPU) {
    let gpuState = state.gpu;
    if (!gpuState) {
      initDensityFieldGPU(state, renderer!);
      gpuState = state.gpu;
      if (!gpuState) {
        state.gpuUnavailable = true;
      }
    }

    if (gpuState && renderer) {
      const uniforms = gpuState.uniforms;
      uniforms.time.value = elapsed;
      uniforms.frequency.value = state.settings.frequency;
      uniforms.amplitude.value = state.settings.amplitude;
      uniforms.persistence.value = state.settings.persistence;
      uniforms.lacunarity.value = state.settings.lacunarity;
      uniforms.ridgeSharpness.value = state.settings.ridgeSharpness;
      uniforms.timeScale.value = state.settings.timeScale;
      uniforms.octaves.value = state.settings.octaves;
      uniforms.size.value = state.size;
      uniforms.mode.value = mode === "sphere" ? 0 : 1;

      const compute = gpuState.compute;
      const variable = gpuState.variable;
      const width = gpuState.width;
      const height = gpuState.height;
      const buffer = gpuState.buffer;

      compute.compute();

      renderer.readRenderTargetPixels(
        compute.getCurrentRenderTarget(variable),
        0,
        0,
        width,
        height,
        buffer
      );

      const values = state.values;
      const total = values.length;
      for (let i = 0; i < total; i++) {
        values[i] = buffer[i * 4];
      }
      return;
    }
  }

  const { size, values, settings } = state;
  const half = size / 2;

  let index = 0;
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        scratch.set((x - half) / size, (y - half) / size, (z - half) / size);

        if (mode === "sphere") {
          const radius = 0.35;
          values[index++] = scratch.length() - radius;
        } else {
          const base = fbm(scratch.x, scratch.y, scratch.z, settings, elapsed);
          const ridged = ridge(base, settings.ridgeSharpness);

          const gradient = -scratch.y * 1.2;
          values[index++] = ridged + gradient;
        }
      }
    }
  }
};

export const indexOf = (
  state: DensityFieldState,
  x: number,
  y: number,
  z: number
) => x + state.size * (y + state.size * z);
