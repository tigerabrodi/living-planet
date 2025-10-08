import { GUI } from "lil-gui";
import Stats from "stats.js";
import { Clock, Vector2 } from "three";

import { createBoidScene } from "./boids/boidScene";
import { createRaymarchScene } from "./playground/raymarchScene";
import {
  createRenderer,
  type WebGPURendererLike,
} from "./renderers/createRenderer";
import type { SceneModule } from "./sceneModule";
import { createMarchingCubesScene } from "./terrain/marchingCubesScene";

interface AppOptions {
  container: HTMLElement;
}

export const bootstrapApp = async ({ container }: AppOptions) => {
  const pointer = new Vector2();

  const stats = new Stats();
  stats.showPanel(0);
  stats.dom.classList.add("stats-panel");
  container.append(stats.dom);

  const gui = new GUI({ title: "Controls" });
  gui.domElement.classList.add("gui-panel");

  const canvas = document.createElement("canvas");
  container.append(canvas);

  const renderer = (await createRenderer({
    antialias: true,
    alpha: false,
  })) as WebGPURendererLike;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.domElement.classList.add("app-canvas");
  canvas.replaceWith(renderer.domElement);

  const raymarchModule = createRaymarchScene({ gui, pointer });
  const marchingModule = createMarchingCubesScene({
    gui,
    canvas: renderer.domElement,
    pointer,
  });
  const boidModule = createBoidScene({
    gui,
    canvas: renderer.domElement,
    pointer,
    renderer,
  });

  const modules: Record<string, SceneModule> = {
    raymarch: raymarchModule,
    marching: marchingModule,
    boids: boidModule,
  };

  let activeModule: SceneModule = raymarchModule;

  const clock = new Clock();

  const resize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    activeModule.resize?.(width, height);
  };

  const pointerMove = (event: PointerEvent) => {
    pointer.set(
      event.clientX / window.innerWidth,
      1 - event.clientY / window.innerHeight
    );
  };

  const render = () => {
    stats.begin();
    const delta = clock.getDelta();
    const elapsed = clock.elapsedTime;
    activeModule.render({ renderer, delta, elapsed, pointer });
    stats.end();
  };

  renderer.setAnimationLoop(render);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", pointerMove);
  resize();

  const modeFolder = gui.addFolder("Mode");
  const state = {
    mode: "raymarch",
  } as { mode: "raymarch" | "marching" | "boids" };
  modeFolder
    .add(state, "mode", {
      Raymarch: "raymarch",
      Marching: "marching",
      Boids: "boids",
    })
    .name("Render Mode")
    .onChange((mode: "raymarch" | "marching" | "boids") => {
      activeModule.onDeactivate?.();
      activeModule = modules[mode];
      activeModule.onActivate?.();
      resize();
    });
  modeFolder.open();

  const dispose = () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener("resize", resize);
    window.removeEventListener("pointermove", pointerMove);
    gui.destroy();
    stats.dom.remove();
    Object.values(modules).forEach((module) => module.dispose?.());
    renderer.dispose();
  };

  return { dispose };
};
