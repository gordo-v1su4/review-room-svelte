/// <reference types="@webgpu/types" />

export interface GpuPreviewRenderer {
  /** Consumes and closes bitmap, including on failure. Returns whether a GPU submission succeeded. */
  render(bitmap: ImageBitmap): boolean;
  dispose(): void;
}

/** Optional GPU presentation; caller keeps native video visible on unavailable/lost GPU. */
export async function createGpuPreviewRenderer(
  canvas: HTMLCanvasElement,
  onFallback: (reason: string) => void,
  signal?: AbortSignal,
): Promise<GpuPreviewRenderer | null> {
  let device: GPUDevice | undefined;
  let context: GPUCanvasContext | null = null;
  let texture: GPUTexture | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true; signal?.removeEventListener('abort', dispose);
    texture?.destroy(); context?.unconfigure(); device?.destroy();
  };
  const fail = (reason: string) => { if (!disposed) { dispose(); onFallback(reason); } };
  try {
    if (signal?.aborted || !navigator.gpu) return null;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter || signal?.aborted) return null;
    device = await adapter.requestDevice();
    if (signal?.aborted) { dispose(); return null; }
    signal?.addEventListener('abort', dispose, { once: true });
    void device.lost.then(info => fail(`WebGPU device lost: ${info.reason}. Using native playback.`));
    device.addEventListener('uncapturederror', () => fail('WebGPU rendering failed. Using native playback.'));
    const format = navigator.gpu.getPreferredCanvasFormat();
    const shader = device.createShaderModule({ code: `
      struct Vertex { @builtin(position) position: vec4f, @location(0) uv: vec2f }
      @vertex fn vertex(@builtin(vertex_index) index: u32) -> Vertex {
        var positions = array<vec2f, 3>(vec2f(-1., -1.), vec2f(3., -1.), vec2f(-1., 3.));
        let p = positions[index];
        return Vertex(vec4f(p, 0., 1.), vec2f((p.x + 1.) * 0.5, (1. - p.y) * 0.5));
      }
      @group(0) @binding(0) var image: texture_2d<f32>;
      @group(0) @binding(1) var imageSampler: sampler;
      @fragment fn fragment(input: Vertex) -> @location(0) vec4f {
        return textureSample(image, imageSampler, input.uv);
      }
    ` });
    const pipeline = await device.createRenderPipelineAsync({
      layout: 'auto', vertex: { module: shader, entryPoint: 'vertex' },
      fragment: { module: shader, entryPoint: 'fragment', targets: [{ format }] }, primitive: { topology: 'triangle-list' },
    });
    if (disposed) return null;
    context = canvas.getContext('webgpu');
    if (!context) throw new Error('WebGPU canvas unavailable.');
    context.configure({ device, format, alphaMode: 'opaque' });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    let width = 0, height = 0;
    let bindings: GPUBindGroup | undefined;
    return {
      render(bitmap) {
        try {
          if (disposed || !device || !context) return false;
          if (!texture || width !== bitmap.width || height !== bitmap.height) {
            texture?.destroy(); width = bitmap.width; height = bitmap.height;
            canvas.width = width; canvas.height = height;
            texture = device.createTexture({ size: [width, height], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
            bindings = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: texture.createView() }, { binding: 1, resource: sampler }] });
          }
          device.queue.copyExternalImageToTexture({ source: bitmap }, { texture }, [width, height]);
          const commands = device.createCommandEncoder();
          const pass = commands.beginRenderPass({ colorAttachments: [{ view: context.getCurrentTexture().createView(), loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 1 }, storeOp: 'store' }] });
          pass.setPipeline(pipeline); pass.setBindGroup(0, bindings!); pass.draw(3); pass.end();
          device.queue.submit([commands.finish()]);
          return true;
        } catch { fail('WebGPU rendering failed. Using native playback.'); return false; }
        finally { bitmap.close(); }
      },
      dispose,
    };
  } catch (error) {
    fail(error instanceof Error ? error.message : 'WebGPU unavailable.'); return null;
  }
}
