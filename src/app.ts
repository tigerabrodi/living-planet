import { GUI } from "lil-gui";
import Stats from "stats.js";
import { Clock, Vector2 } from "three";

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

  const modules: Record<string, SceneModule> = {
    raymarch: raymarchModule,
    marching: marchingModule,
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
    const elapsed = clock.getElapsedTime();
    const delta = clock.getDelta();
    activeModule.render({ renderer, delta, elapsed, pointer });
    stats.end();
  };

  renderer.setAnimationLoop(render);

  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", pointerMove);
  resize();

  const modeFolder = gui.addFolder("Mode");
  const state = { mode: "raymarch" } as { mode: "raymarch" | "marching" };
  modeFolder
    .add(state, "mode", { Raymarch: "raymarch", Marching: "marching" })
    .name("Render Mode")
    .onChange((mode: "raymarch" | "marching") => {
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
