import type { Camera, Scene, Vector2, WebGLRenderer } from "three";

export interface RenderContext {
  renderer: WebGLRenderer;
  delta: number;
  elapsed: number;
  pointer: Vector2;
}

export interface SceneModule {
  name: string;
  scene: Scene;
  camera: Camera;
  render(context: RenderContext): void;
  resize?(width: number, height: number): void;
  onActivate?(): void;
  onDeactivate?(): void;
  dispose?(): void;
}
