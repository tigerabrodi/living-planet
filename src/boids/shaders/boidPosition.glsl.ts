export const boidPositionShader = /* glsl */ `
#include <common>

uniform float delta;
uniform vec3 boundsMin;
uniform vec3 boundsMax;

vec3 readPosition(vec2 uv) {
  return texture2D(texturePosition, uv).xyz;
}

vec3 readVelocity(vec2 uv) {
  return texture2D(textureVelocity, uv).xyz;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec3 position = readPosition(uv);
  vec3 velocity = readVelocity(uv);

  position += velocity * delta;

  if (position.x < boundsMin.x) position.x = boundsMax.x;
  if (position.y < boundsMin.y) position.y = boundsMax.y;
  if (position.z < boundsMin.z) position.z = boundsMax.z;
  if (position.x > boundsMax.x) position.x = boundsMin.x;
  if (position.y > boundsMax.y) position.y = boundsMin.y;
  if (position.z > boundsMax.z) position.z = boundsMin.z;

  gl_FragColor = vec4(position, 1.0);
}
`;
