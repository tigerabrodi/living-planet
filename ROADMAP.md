# 🧭 The _Sebastian Lague Coding Adventure → One Project_ Roadmap

## 🎯 Goal

You’ll build one continuous thing — a **procedural simulation world** that grows in complexity with every video you watch.
Think of it like your own “tiny universe” built from scratch in **Three.js** — starting as a visual shader test, turning into a living world, and eventually gaining physics, AI, terrain, fluids, and ray tracing.

Each step below tells you:

1. 🎥 which Lague video(s) to watch,
2. 🧱 what to build next into the _same_ project.

---

## 🧩 **Phase 1 – Core Simulation and Visual Foundations**

> Theme: learn rendering, shader logic, and procedural motion

### 🎥 Watch:

- **Ray Marching**
- **Marching Cubes**
- **Compute Shaders**

### 🧱 Build:

- A **Three.js scene** with a shader playground.
- Implement a **signed-distance-field (SDF)** raymarcher in a fragment shader.
- Replace it with a **voxel terrain** using marching cubes (isosurface).
- Integrate a **GPUComputationRenderer** setup — this becomes your “simulation engine.”

🧠 _Goal:_ understand how data moves on the GPU and how 3D shapes emerge from math.

---

## 🌿 **Phase 2 – Procedural Nature**

> Theme: create life and natural environments inside your world

### 🎥 Watch:

- **Boids**
- **Simulating an Ecosystem**
- **Hydraulic Erosion**

### 🧱 Build:

- Add **boid agents** that fly or swim in your world.
- Give them **ecosystem rules** (eat plants, avoid predators, reproduce).
- Add a **terrain heightmap** (procedurally generated with noise).
- Apply **erosion simulation** to shape it dynamically.

🧠 _Goal:_ your world now has geography and simple life — everything reacts over time.

---

## 🌍 **Phase 3 – Planets and Atmospheres**

> Theme: procedural generation at planetary scale

### 🎥 Watch:

- **Solar System**
- **Procedural Moons and Planets**
- **Atmosphere**

### 🧱 Build:

- Wrap your simulation terrain onto a **sphere** (planet mode).
- Add **procedural planet materials** (biomes via noise).
- Implement a **simple atmosphere shader** with light scattering.
- Optional: add a **sun + orbital camera system**.

🧠 _Goal:_ your sandbox evolves into a full-fledged procedural planet with sky and terrain.

---

## 🧠 **Phase 4 – Agents, AI, and Logic**

> Theme: intelligence and behavior in your simulation

### 🎥 Watch:

- **Chess**
- **Ant and Slime Simulations**
- **Terraforming**

### 🧱 Build:

- Add **AI agents** that explore or modify the world.
  e.g., Slime-like agents that follow gradients or modify terrain (terraforming).
- Create simple **pathfinding or cellular automata** logic.
- Visualize agent trails, pheromones, or terrain changes over time.

🧠 _Goal:_ your world now _thinks_ — it has living entities interacting with the environment.

---

## 💧 **Phase 5 – Fluids and Dynamic Matter**

> Theme: add real physics and continuous simulation

### 🎥 Watch:

- **Simulating Fluids**
- **Rendering Fluids**
- **Planetary Fluid Sim**

### 🧱 Build:

- Simulate **2D fluids** over your terrain (for rivers, oceans, rain).
- Expand to **3D volumetric fluids** with particles or grid-based density.
- Integrate with your **terrain erosion** to make water affect land.
- Optionally render water with **refraction & reflection** shaders.

🧠 _Goal:_ your world now has living systems _and_ physical simulation — terrain, water, and motion all connect.

---

## 🌈 **Phase 6 – Rendering and Light**

> Theme: advanced lighting, reflection, and realism

### 🎥 Watch:

- **Ray Tracing**
- **More Ray Tracing**
- **Ray-Tracing Glass and Caustics**
- **Rendering Text**

### 🧱 Build:

- Add **ray-marched reflections** or **screen-space reflections** in Three.js.
- Create **refractive glass-like materials** (use cube maps or refraction shaders).
- Add **text rendering** or **UI overlays** in 3D space.
- Maybe use **caustics approximation** for light interacting with water or glass.

🧠 _Goal:_ your world becomes visually beautiful and technically advanced — real reflections, light effects, readable surfaces.

---

## 🔊 **Phase 7 – Sound and Final Polish**

> Theme: sensory depth and creative output

### 🎥 Watch:

- **Sound (and the Fourier Transform)**

### 🧱 Build:

- Add **audio-reactive elements**: make terrain, particles, or lighting react to sound input.
- Tie it all together into a **“living world demo”** — camera orbiting, transitions, and ambient sound.

🧠 _Goal:_ you’ve now got a procedural, audio-reactive simulation world — emergent, physical, and visually dynamic.

---

## 🚀 Final Project Outcome

By the end:

- You’ll have a **Three.js “Living Planet” simulation**
  → procedural terrain, erosion, fluids, AI agents, ray-traced reflections, sound-reactive shaders.
- Everything evolved step-by-step with each video’s concept layered in.
