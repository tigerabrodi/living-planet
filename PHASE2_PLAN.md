# 🌿 Phase 2 Build Plan — Procedural Nature & Ecosystem Logic

> **Context:** Phase 1 delivered the shader playground, SDF raymarcher, marching cubes terrain, and GPU computation backbone. Phase 2 layers life and environment systems on top of that foundation while keeping everything within one evolving Three.js world.

## ✅ Prerequisites Checklist

- Phase 1 exit criteria satisfied (terrain + compute pipeline + documentation).
- Git branch or checkpoint ready; Phase 2 introduces multi-module changes.
- Confirm physics-friendly time step helper available (`Clock` delta or custom fixed step).
- Gather reference notes from Lague’s Boids, Ecosystem, and Hydraulic Erosion videos.

## 🦈 Step 1 — Refine Terrain to Heightmap Baseline

1. **Heightmap data source**
   - Generate 2D noise (Perlin/Simplex) that maps to a heightfield texture/pixel buffer.
   - Store in a dedicated module, exposing both CPU and GPU generation paths.
   - _Why:_ Provides the substrate the agents and erosion logic will interact with.
2. **Mesh + material integration**
   - Convert heightmap into a Three.js `PlaneGeometry` with displaced vertices or reuse marching cubes with 2D density slice.
   - Add basic Lambert/standard material with vertex colors or textures derived from height.
   - _Why:_ Visualizes the terrain state and ensures deformation hooks exist for future erosion.
3. **Inspector & controls**
   - Add GUI controls for noise frequency, amplitude, octaves, seed.
   - Implement debug views (wireframe toggle, top-down orthographic camera).
   - _Why:_ Makes terrain tweaking fast before adding agents and erosion.

## 🐟 Step 2 — Boids Simulation Core

1. **Data structure setup**
   - Define boid state buffer (position, velocity, extra attributes) stored in textures/buffers for GPU updates.
   - Decide on simulation scale (e.g., 256 boids start) and integration method (Euler with clamp on velocity).
   - _Why:_ Structured data is crucial for efficient flock behavior and later ecosystem rules.
2. **Behavior implementation**
   - Implement separation, alignment, cohesion forces with tweakable weights.
   - Add boundary handling (wrap, steer inward, or altitude constraints tied to terrain height).
   - _Why:_ Establishes believable flocking before layering interactions with food/predators.
3. **Rendering & debugging**
   - Render boids as instanced meshes or point sprites linked to the state buffer.
   - Add GUI sliders for behavior weights, radius, speed caps; optional vector field visualization.
   - _Why:_ Gives immediate feedback and aids balancing the flock.

## 🌱 Step 3 — Ecosystem Interactions

1. **Resource & agent roles**
   - Introduce “plant” resources: either static patches on the terrain (texture mask) or procedural spawning over time.
   - Define boid variants (herbivores/carnivores) or states (hungry, resting, reproducing).
   - _Why:_ Adds goal-oriented behavior to the boids and begins the ecosystem loop.
2. **Consumption & reproduction loops**
   - Implement resource depletion when agents feed; regenerate plants over time.
   - Add simple reproduction trigger (energy threshold spawns new boid) and death/respawn conditions.
   - _Why:_ Creates dynamic population changes that respond to resource availability.
3. **Telemetry & balancing tools**
   - Surface population counts, average energy, resource coverage in GUI or overlay text.
   - Enable runtime pausing/single-step to inspect behaviors frame-by-frame.
   - _Why:_ Helps diagnose runaway populations or starvation scenarios quickly.

## 💧 Step 4 — Hydraulic Erosion over Heightmap

1. **Erosion simulation scaffolding**
   - Stand up a GPU compute pipeline immediately (e.g., `GPUComputationRenderer` or custom render targets) to hold water amount, sediment load, and velocity per cell.
   - Provide debug visualization hooks (height, water, sediment) so we can inspect values despite running on GPU.
   - _Why:_ Keeps everything on-GPU from the start while still giving us insight into the evolving field.
2. **Iterative erosion step**
   - Implement rainfall/add-water phase, erosion/deposition rules based on slope, evaporation.
   - Couple terrain adjustments back into the heightmap (modify vertices or displacement texture).
   - _Why:_ Realistic terrain evolution ties the landscape to weather and agents.
3. **Integration with ecosystem**
   - Let resource distribution or agent movement depend on updated terrain height/wetness.
   - Provide controls to run erosion continuously or in bursts, plus reset functionality.
   - _Why:_ Demonstrates feedback loop between terrain physics and ecosystem.

## 🧪 Step 5 — Regression Guards & Documentation

- Record short clips or captures of flocking, feeding, and erosion sequences.
- Document parameter presets (boid weights, erosion rates) that yield interesting behavior.
- Add sanity checks where feasible (e.g., assert boid buffer stays finite, terrain heights remain within range).
- _Why:_ Preserves learned tuning and keeps the rapidly growing simulation verifiable.

## 📦 Ready-for-Phase-3 Exit Criteria

- Terrain heightmap renders with adjustable noise and reacts to erosion simulation.
- Boids flock smoothly, interact with resources, and populations stabilize with reproduction/death loops.
- Ecosystem metrics visible and controllable via GUI; pausing and stepping are available for inspection.
- Documentation (readme/notes) updated with learned best practices and next-step ideas for planetary scale work.
