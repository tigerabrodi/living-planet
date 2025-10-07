import { WebGLRenderer, type WebGLRendererParameters } from "three";

export type WebGPURendererLike = WebGLRenderer & { init?: () => Promise<void> };
type WebGPUConstructor = new (
  parameters?: WebGLRendererParameters
) => WebGPURendererLike;

interface WebGPUExports {
  WebGPURenderer: WebGPUConstructor;
}

const loadWebGPURenderer = async (): Promise<WebGPUConstructor | null> => {
  try {
    const module = (await import(
      "three/webgpu"
    )) as unknown as Partial<WebGPUExports>;
    if (module.WebGPURenderer) {
      return module.WebGPURenderer;
    }
  } catch (error) {
    console.warn(
      "WebGPU renderer module unavailable; continuing with WebGL.",
      error
    );
  }
  return null;
};

const navigatorHasGPU = (
  candidate: Navigator
): candidate is Navigator & { gpu: GPU } => "gpu" in candidate;

export const createRenderer = async (
  params: WebGLRendererParameters = { antialias: true, alpha: false }
): Promise<WebGPURendererLike | WebGLRenderer> => {
  if (navigatorHasGPU(window.navigator)) {
    const WebGPURendererCtor = await loadWebGPURenderer();
    if (WebGPURendererCtor) {
      const webgpuRenderer = new WebGPURendererCtor(params);
      if ("isWebGPURenderer" in webgpuRenderer) {
        console.info(
          "WebGPURenderer available but incompatible with ShaderMaterial; falling back to WebGL."
        );
        webgpuRenderer.dispose?.();
      } else {
        await webgpuRenderer?.init?.();
        return webgpuRenderer;
      }
    }
  }

  return new WebGLRenderer(params);
};
