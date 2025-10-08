export const boidRenderVertex = /* glsl */ `
#include <common>

attribute vec2 instanceUV;

uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;
uniform float instanceScale;

varying float vSpeed;

vec3 readPosition(vec2 uv) {
  return texture2D(texturePosition, uv).xyz;
}

vec3 readVelocity(vec2 uv) {
  return texture2D(textureVelocity, uv).xyz;
}

mat3 buildBasis(vec3 forward) {
  vec3 up = vec3(0.0, 1.0, 0.0);
  if (abs(dot(forward, up)) > 0.99) {
    up = vec3(1.0, 0.0, 0.0);
  }
  vec3 right = normalize(cross(up, forward));
  up = normalize(cross(forward, right));
  return mat3(right, up, forward);
}

void main() {
  vec2 transformedUV = instanceUV;
  vec3 positionSample = readPosition(transformedUV);
  vec3 velocitySample = readVelocity(transformedUV);
  float speed = length(velocitySample);
  vSpeed = speed;

  vec3 forward = speed > 0.0001 ? normalize(velocitySample) : vec3(0.0, 0.0, 1.0);
  mat3 basis = buildBasis(forward);

  vec3 localPosition = position;
  localPosition.z *= instanceScale;
  localPosition.xy *= instanceScale * 0.5;

  vec3 worldPosition = basis * localPosition + positionSample;
  vec4 mvPosition = modelViewMatrix * vec4(worldPosition, 1.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

export const boidRenderFragment = /* glsl */ `
varying float vSpeed;

void main() {
  float intensity = clamp(vSpeed * 0.1, 0.2, 1.0);
  gl_FragColor = vec4(vec3(0.2, 0.6, 1.0) * intensity, 1.0);
}
`;
