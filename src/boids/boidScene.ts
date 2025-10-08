import type { GUI } from "lil-gui";
import {
  PerspectiveCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SceneModule } from "../sceneModule";
import { createBoidMesh } from "./boidRenderer";
import {
  createBoidCompute,
  disposeBoidState,
  updateBoidUniforms,
  updateBoids,
} from "./boidSimulation";

interface BoidSceneOptions {
  gui: GUI;
  canvas: HTMLCanvasElement;
  pointer: Vector2;
  renderer: WebGLRenderer;
}

export const createBoidScene = ({
  gui,
  canvas,
  renderer,
}: BoidSceneOptions): SceneModule => {
  const scene = new Scene();

  const boidState = createBoidCompute(renderer);
  const textureSize = new Vector2(boidState.width, boidState.height);
  const boidMesh = createBoidMesh(textureSize);
  scene.add(boidMesh);

  const camera = new PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    400
  );
  camera.position.set(0, 25, 40);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.target.set(0, 10, 0);

  const material = boidMesh.material as ShaderMaterial;

  const params = {
    perceptionRadius: boidState.settings.perceptionRadius,
    separationWeight: boidState.settings.separationWeight,
    alignmentWeight: boidState.settings.alignmentWeight,
    cohesionWeight: boidState.settings.cohesionWeight,
    maxSpeed: boidState.settings.maxSpeed,
    maxForce: boidState.settings.maxForce,
  };

  const folder = gui.addFolder("Boids");
  folder
    .add(params, "perceptionRadius", 1, 10, 0.5)
    .onChange((value: number) => {
      boidState.settings.perceptionRadius = value;
      updateBoidUniforms(boidState);
    });
  folder
    .add(params, "separationWeight", 0, 3, 0.1)
    .onChange((value: number) => {
      boidState.settings.separationWeight = value;
      updateBoidUniforms(boidState);
    });
  folder.add(params, "alignmentWeight", 0, 3, 0.1).onChange((value: number) => {
    boidState.settings.alignmentWeight = value;
    updateBoidUniforms(boidState);
  });
  folder.add(params, "cohesionWeight", 0, 3, 0.1).onChange((value: number) => {
    boidState.settings.cohesionWeight = value;
    updateBoidUniforms(boidState);
  });
  folder.add(params, "maxSpeed", 1, 15, 0.5).onChange((value: number) => {
    boidState.settings.maxSpeed = value;
    updateBoidUniforms(boidState);
  });
  folder.add(params, "maxForce", 0.01, 0.5, 0.01).onChange((value: number) => {
    boidState.settings.maxForce = value;
    updateBoidUniforms(boidState);
  });
  folder.open();

  return {
    name: "Boids",
    scene,
    camera,
    render: ({
      delta,
      renderer: mainRenderer,
    }: {
      delta: number;
      renderer: WebGLRenderer;
    }) => {
      updateBoids(boidState, delta);
      const positionTarget = boidState.compute.getCurrentRenderTarget(
        boidState.positionVariable
      );
      const velocityTarget = boidState.compute.getCurrentRenderTarget(
        boidState.velocityVariable
      );
      material.uniforms.texturePosition.value = positionTarget.texture;
      material.uniforms.textureVelocity.value = velocityTarget.texture;
      controls.update();
      mainRenderer.render(scene, camera);
    },
    resize: (width: number, height: number) => {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    },
    dispose: () => {
      disposeBoidState(boidState);
      folder.destroy();
    },
  };
};
