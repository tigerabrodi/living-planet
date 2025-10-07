import { createNoise4D } from "simplex-noise";
import { Vector3 } from "three";

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
  settings: Partial<DensityFieldSettings> = {}
): DensityFieldState => {
  const merged = { ...defaultSettings, ...settings };
  const size = merged.size;
  return {
    settings: merged,
    values: new Float32Array(size * size * size),
    size,
  };
};

export const updateDensityField = (
  state: DensityFieldState,
  elapsed: number
) => {
  const { size, values, settings } = state;
  const half = size / 2;

  let index = 0;
  for (let z = 0; z < size; z++) {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        scratch.set((x - half) / size, (y - half) / size, (z - half) / size);

        const base = fbm(scratch.x, scratch.y, scratch.z, settings, elapsed);
        const ridged = ridge(base, settings.ridgeSharpness);

        const gradient = -scratch.y * 1.2; // Pull density downwards to create "ground" level.
        values[index++] = ridged + gradient;
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
