export const densityComputeShader = /* glsl */ `
#include <common>

uniform float time;
uniform float frequency;
uniform float amplitude;
uniform float persistence;
uniform float lacunarity;
uniform float ridgeSharpness;
uniform float timeScale;
uniform int octaves;
uniform int size;
uniform int mode; // 0 sphere, 1 terrain

const int MAX_OCTAVES = 8;

vec3 decodePosition(ivec2 coord) {
  int width = size;
  int plane = size * size;
  int index = coord.x + coord.y * width;

  int z = index / plane;
  int rem = index - z * plane;
  int y = rem / size;
  int x = rem - y * size;

  return vec3(float(x), float(y), float(z));
}

float waveNoise(vec3 p) {
  return sin(p.x) * cos(p.y) * sin(p.z);
}

float fbm(vec3 p, float t) {
  float amp = amplitude;
  float freq = frequency;
  float value = 0.0;
  vec3 offset = vec3(0.73, 0.43, 0.67);

  for (int i = 0; i < MAX_OCTAVES; i++) {
    if (i >= octaves) break;

    vec3 domain = p * freq + float(i) * offset + vec3(t * 0.25, -t * 0.18, t * 0.14);
    float n = waveNoise(domain);
    value += n * amp;
    amp *= persistence;
    freq *= lacunarity;
  }

  return value;
}

float ridge(float v, float sharpness) {
  float r = max(0.0, 1.0 - abs(v));
  return pow(r, sharpness);
}

void main() {
  ivec2 coord = ivec2(gl_FragCoord.xy);
  vec3 grid = decodePosition(coord);
  float sizeF = float(size);
  vec3 pos = grid / sizeF - 0.5;

  float density;

  if (mode == 0) {
    density = length(pos) - 0.35;
  } else {
    float base = fbm(pos, time * timeScale);
    float ridged = ridge(base, ridgeSharpness);
    float gradient = -pos.y * 1.2;
    density = ridged + gradient;
  }

  gl_FragColor = vec4(density, 0.0, 0.0, 1.0);
}
`;
