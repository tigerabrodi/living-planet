# 🗺️ Phase 1 Build Plan — Core Simulation & Visual Foundations

> **Context:** You have studied the Phase 1 videos (Ray Marching, Marching Cubes, Compute Shaders) and installed required packages. This plan sequences the coding work so the project evolves smoothly while keeping shader and GPU concepts cohesive.

## ✅ Prerequisites Checklist

- Confirm Vite dev server runs with `npm run dev` so each milestone can be previewed quickly.
- Ensure Three.js and supporting typings are installed (verify `package.json`).
- Create a `notes/` scratchpad (optional) for shader experiments; helps capture insights from the videos while coding.

## 🧩 Step 1 — Establish the Shader Playground Scene

1. **Scaffold the scene setup**
   - Add a dedicated entry point (e.g., `src/main.ts`) that creates the renderer, scene, camera, and resize handling.
   - Instantiate an animation loop that calls `renderer.render(scene, camera)` while tracking elapsed time.
   - _Why:_ Guarantees a stable, observable baseline before shader complexity ramps up.
2. **Create a full-screen quad material**
   - Add an orthographic camera pointing at a single plane that covers clip space (`PlaneGeometry`, `MeshBasicMaterial` placeholder).
   - Wire uniforms for time, resolution, and mouse input to drive shader experiments.
   - _Why:_ Gives a reusable canvas for fragment shaders; we can swap fragment logic without reworking the scene.
3. **Add developer affordances**
   - Enable `stats.js` or simple FPS logging, and hot-reload friendly structure (export a setup function invoked once).
   - _Why:_ Immediate visual feedback is critical while iterating on math-heavy shaders.

## 🌫️ Step 2 — Implement the SDF Raymarcher Fragment Shader

1. **Write foundational GLSL utilities**
   - Add signed distance helpers (`sdSphere`, `sdBox`, etc.) and combine operators (smooth min/max).
   - Encapsulate normal estimation and soft shadow helpers in separate GLSL includes or template strings.
   - _Why:_ Modular SDF functions make future geometry changes easier when swapping to voxel data.
2. **Build the `rayMarch` routine**
   - Compute camera ray directions from UV coordinates; iterate with distance stepping.
   - Return surface hit info (distance, steps, material id) to support lighting and debugging visuals.
   - _Why:_ Establishes the mental model of ray marching and gives a reference output for later regression checks.
3. **Add simple lighting & controls**
   - Implement Lambert lighting + ambient term, optional shadow approximation, and GUI toggles for parameters.
   - _Why:_ Visual richness highlights defects early and makes the upcoming marching-cubes swap easier to validate.

## 🧱 Step 3 — Transition to Marching Cubes Voxel Terrain

1. **Author voxel density field generation**
   - Prototype a CPU noise sampler (Perlin/Simplex) to populate a 3D grid; keep resolution moderate (e.g., 32³) initially.
   - Expose noise parameters (frequency, amplitude, seed) via GUI for iterative shaping.
   - _Why:_ Provides controllable scalar fields that mimic the SDF surface but map cleanly to marching cubes.
2. **Integrate Three.js `MarchingCubes` helper or custom implementation**
   - If using Three.js helper: update the field each frame and render the generated mesh.
   - If custom: implement cube indexing, edge interpolation, and vertex normal calculation.
   - _Why:_ Converts the implicit surface concept into explicit geometry, preparing for GPU compute integration.
3. **Optimize scene structure**
   - Extract marching cubes setup into its own module (e.g., `src/simulation/marchingCubes.ts`).
   - Add debug visualizations (wireframe toggle, bounding grid) to validate topology.
   - _Why:_ Keeps the project modular, making it easier to swap future terrain sources.

## 🧮 Step 4 — Introduce GPUComputationRenderer as Simulation Backbone

1. **Set up the computation renderer**
   - Initialize `GPUComputationRenderer` with textures representing the voxel density field or particle buffers.
   - Port the CPU noise logic into a compute shader to fill the density texture each frame or on demand.
   - _Why:_ Moves the heaviest calculations to the GPU, aligning with later phases that depend on GPU simulations.
2. **Synchronize compute output with marching cubes**
   - Read back (or sample) the compute texture so the marching-cubes step uses GPU-generated densities.
   - Consider double-buffering or ping-pong textures if temporal evolution is needed.
   - _Why:_ Validates the pipeline that future systems (boids, fluids) will reuse.
3. **Expose runtime controls & diagnostics**
   - Add UI toggles to compare CPU vs GPU density sources, adjust iteration counts, and visualize computation textures.
   - Log GPU errors or invalid states for faster debugging.
   - _Why:_ Ensures the compute layer is transparent and debuggable before layering more complexity.

## 🧪 Step 5 — Regression Guards & Knowledge Capture

- Record short screen captures or screenshots after each milestone to document shader behavior.
- Keep a changelog entry or markdown notes describing key learnings (math tricks, shader pitfalls).
- Write lightweight tests if feasible (e.g., sanity checks on generated geometry dimensions in Node).
- _Why:_ Protects hard-earned understanding and makes future refactors safer when Phase 2 systems arrive.

## 📦 Ready-for-Phase-2 Exit Criteria

- The project launches instantly and renders the final marching-cubes terrain driven by GPUComputationRenderer.
- Shader playground remains accessible via a toggle or separate scene for quick experimentation.
- Density computation parameters are tweakable at runtime (GUI or config file).
- Baseline documentation (this plan + notes) is up to date, ensuring smooth handoff into Phase 2.
