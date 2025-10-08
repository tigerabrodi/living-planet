import { createNoise2D } from "simplex-noise";

export interface HeightmapSettings {
  width: number;
  height: number;
  frequency: number;
  amplitude: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  seed: number;
}

export interface HeightmapState {
  settings: HeightmapSettings;
  values: Float32Array;
}

const defaultSettings: HeightmapSettings = {
  width: 256,
  height: 256,
  frequency: 1.2,
  amplitude: 8,
  octaves: 4,
  persistence: 0.5,
  lacunarity: 2,
  seed: 1,
};

const buildNoise = (seed: number) =>
  createNoise2D(() => (Math.sin(seed++ * 12.9898) * 43758.5453) % 1);

export const createHeightmap = (
  overrides: Partial<HeightmapSettings> = {}
): HeightmapState => {
  const settings = {
    ...defaultSettings,
    ...overrides,
  } satisfies HeightmapSettings;
  const values = new Float32Array(settings.width * settings.height);
  return { settings, values };
};

export const regenerateHeightmap = (state: HeightmapState) => {
  const {
    width,
    height,
    frequency,
    amplitude,
    octaves,
    persistence,
    lacunarity,
    seed,
  } = state.settings;

  const noise2D = buildNoise(seed);
  const values = state.values;

  let index = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let amp = amplitude;
      let freq = frequency;
      let value = 0;

      for (let octave = 0; octave < octaves; octave++) {
        const sampleX = (x / width) * freq;
        const sampleY = (y / height) * freq;
        const noiseValue = noise2D(sampleX, sampleY);
        value += noiseValue * amp;
        amp *= persistence;
        freq *= lacunarity;
      }

      values[index++] = value;
    }
  }
};
