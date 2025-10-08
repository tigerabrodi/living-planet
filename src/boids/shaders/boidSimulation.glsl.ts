export const boidVelocityShader = /* glsl */ `
#include <common>

uniform float delta;
uniform float maxSpeed;
uniform float maxForce;
uniform float perceptionRadius;
uniform float separationWeight;
uniform float alignmentWeight;
uniform float cohesionWeight;
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

  vec3 separation = vec3(0.0);
  vec3 alignment = vec3(0.0);
  vec3 cohesion = vec3(0.0);
  float sampleCount = 0.0;

  // sample a small neighborhood around the current uv
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      vec2 offset = vec2(float(x), float(y)) / resolution.xy;
      vec2 neighborUv = uv + offset;
      if (neighborUv.x < 0.0 || neighborUv.x > 1.0 || neighborUv.y < 0.0 || neighborUv.y > 1.0) {
        continue;
      }

      vec3 neighborPos = readPosition(neighborUv);
      vec3 neighborVel = readVelocity(neighborUv);
      vec3 diff = neighborPos - position;
      float distance = length(diff);

      if (distance > 0.0 && distance < perceptionRadius) {
        separation -= diff / (distance * distance);
        alignment += neighborVel;
        cohesion += neighborPos;
        sampleCount += 1.0;
      }
    }
  }

  if (sampleCount > 0.0) {
    separation /= sampleCount;
    alignment = alignment / sampleCount;
    cohesion = cohesion / sampleCount - position;
  }

  vec3 acceleration = vec3(0.0);
  acceleration += separation * separationWeight;
  acceleration += (normalize(alignment + 1e-5) * maxSpeed - velocity) * alignmentWeight;
  acceleration += cohesion * cohesionWeight;

  acceleration = clamp(acceleration, -maxForce, maxForce);

  velocity += acceleration * delta;
  float speed = length(velocity);
  if (speed > maxSpeed) {
    velocity = normalize(velocity) * maxSpeed;
  }

  gl_FragColor = vec4(velocity, 1.0);
}
`;
