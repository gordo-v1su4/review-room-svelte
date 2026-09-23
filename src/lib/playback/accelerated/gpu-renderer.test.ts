/// <reference types="@webgpu/types" />
import { afterEach, expect, test } from 'bun:test';
import { createGpuPreviewRenderer } from './gpu-renderer';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const originals = new Map<string, PropertyDescriptor | undefined>();
function install(name: string, value: unknown) {
  if (!originals.has(name)) originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { configurable: true, value });
}
afterEach(() => {
  for (const [name, descriptor] of originals) {
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  }
  originals.clear();
});

/** Browser boundary fake: resources expose lifetime, queue submission and injected driver failures. */
function gpuPort(options: { holdDevice?: boolean; holdPipeline?: boolean } = {}) {
  const lost = deferred<GPUDeviceLostInfo>();
  const deviceRequested = deferred<void>(), pipelineRequested = deferred<void>();
  const deviceReady = deferred<GPUDevice>(), pipelineReady = deferred<GPURenderPipeline>();
  const resources = { deviceDestroyed: 0, configured: 0, unconfigured: 0, submissions: 0, copied: 0, failCopy: false, textures: [] as { destroyed: number }[] };
  const pipeline = { getBindGroupLayout: () => ({}) } as unknown as GPURenderPipeline;
  const context = {
    configure() { resources.configured++; },
    unconfigure() { resources.unconfigured++; },
    getCurrentTexture: () => ({ createView: () => ({}) }),
  };
  const device = Object.assign(new EventTarget(), {
    lost: lost.promise,
    destroy() { resources.deviceDestroyed++; lost.resolve({ reason: 'destroyed', message: 'Destroyed' } as GPUDeviceLostInfo); },
    createShaderModule: () => ({}),
    createRenderPipelineAsync() { pipelineRequested.resolve(); return options.holdPipeline ? pipelineReady.promise : Promise.resolve(pipeline); },
    createSampler: () => ({}),
    createTexture() {
      const resource = { destroyed: 0 }; resources.textures.push(resource);
      return { destroy() { resource.destroyed++; }, createView: () => ({}) };
    },
    createBindGroup: () => ({}),
    createCommandEncoder: () => ({
      beginRenderPass: () => ({ setPipeline() {}, setBindGroup() {}, draw() {}, end() {} }),
      finish: () => ({}),
    }),
    queue: {
      copyExternalImageToTexture() { if (resources.failCopy) throw new Error('Driver rejected copy'); resources.copied++; },
      submit() { resources.submissions++; },
    },
  });
  install('navigator', { gpu: {
    requestAdapter: async () => ({ requestDevice() { deviceRequested.resolve(); return options.holdDevice ? deviceReady.promise : Promise.resolve(device); } }),
    getPreferredCanvasFormat: () => 'bgra8unorm',
  } });
  install('GPUTextureUsage', { COPY_DST: 2, TEXTURE_BINDING: 4, RENDER_ATTACHMENT: 16 });
  const canvas = { width: 0, height: 0, getContext: (kind: string) => kind === 'webgpu' ? context : null } as unknown as HTMLCanvasElement;
  return { canvas, device, resources, lost, deviceRequested, pipelineRequested,
    resolveDevice: () => deviceReady.resolve(device as unknown as GPUDevice),
    rejectDevice: deviceReady.reject,
    resolvePipeline: () => pipelineReady.resolve(pipeline),
    rejectPipeline: pipelineReady.reject,
  };
}
function frame(width = 640, height = 360) {
  let closed = 0;
  return { bitmap: { width, height, close() { closed++; } } as ImageBitmap, closed: () => closed };
}

test('successful rendering consumes its bitmap and resized frames release the previous texture', async () => {
  const port = gpuPort(), fallback: string[] = [];
  const renderer = await createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason));
  expect(renderer).not.toBeNull();
  const first = frame(), second = frame(320, 180);
  expect(renderer!.render(first.bitmap)).toBe(true);
  expect(first.closed()).toBe(1);
  expect(renderer!.render(second.bitmap)).toBe(true);
  expect(second.closed()).toBe(1);
  expect(port.resources.submissions).toBe(2);
  expect([port.canvas.width, port.canvas.height]).toEqual([320, 180]);
  expect(port.resources.textures.map(texture => texture.destroyed)).toEqual([1, 0]);
  renderer!.dispose();
  expect(port.resources.textures.map(texture => texture.destroyed)).toEqual([1, 1]);
  expect(fallback).toEqual([]);
});

test('device loss releases resources and reports fallback once despite subsequent driver errors', async () => {
  const port = gpuPort(), fallback: string[] = [];
  const renderer = (await createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason)))!;
  renderer.render(frame().bitmap);
  port.lost.resolve({ reason: 'unknown', message: 'GPU reset' } as GPUDeviceLostInfo);
  await Promise.resolve();
  port.device.dispatchEvent(new Event('uncapturederror'));
  expect(fallback).toEqual(['WebGPU device lost: unknown. Using native playback.']);
  expect(port.resources.deviceDestroyed).toBe(1);
  expect(port.resources.unconfigured).toBe(1);
  expect(port.resources.textures[0].destroyed).toBe(1);
  const late = frame();
  expect(renderer.render(late.bitmap)).toBe(false);
  expect(late.closed()).toBe(1);
  expect(port.resources.submissions).toBe(1);
  renderer.dispose();
  expect(port.resources.deviceDestroyed).toBe(1);
});

test('a failed frame closes its bitmap, enters fallback and cannot submit later frames', async () => {
  const port = gpuPort(), fallback: string[] = [];
  const renderer = (await createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason)))!;
  port.resources.failCopy = true;
  const failed = frame();
  expect(renderer.render(failed.bitmap)).toBe(false);
  expect(failed.closed()).toBe(1);
  expect(port.resources.textures[0].destroyed).toBe(1);
  expect(port.resources.deviceDestroyed).toBe(1);
  expect(port.resources.unconfigured).toBe(1);
  port.resources.failCopy = false;
  const late = frame();
  expect(renderer.render(late.bitmap)).toBe(false);
  expect(late.closed()).toBe(1);
  expect(port.resources.submissions).toBe(0);
  await Promise.resolve();
  expect(fallback).toEqual(['WebGPU rendering failed. Using native playback.']);
});

test('an aborted device request ignores a late initialization rejection', async () => {
  const port = gpuPort({ holdDevice: true }), fallback: string[] = [];
  const lifetime = new AbortController();
  const initializing = createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason), lifetime.signal);
  await port.deviceRequested.promise;
  lifetime.abort();
  port.rejectDevice(new Error('Device request failed after navigation'));
  expect(await initializing).toBeNull();
  expect(fallback).toEqual([]);
  expect(port.resources.configured).toBe(0);
  expect(port.resources.deviceDestroyed).toBe(0);
});

test('a device acquired after cancellation is destroyed without configuring the canvas', async () => {
  const port = gpuPort({ holdDevice: true }), fallback: string[] = [];
  const lifetime = new AbortController();
  const initializing = createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason), lifetime.signal);
  await port.deviceRequested.promise;
  lifetime.abort(); port.resolveDevice();
  expect(await initializing).toBeNull();
  expect(port.resources.deviceDestroyed).toBe(1);
  expect(port.resources.configured).toBe(0);
  expect(port.resources.textures).toEqual([]);
  expect(fallback).toEqual([]);
});

test('aborting pipeline compilation destroys its device and ignores late pipeline completion', async () => {
  const port = gpuPort({ holdPipeline: true }), fallback: string[] = [];
  const lifetime = new AbortController();
  const initializing = createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason), lifetime.signal);
  await port.pipelineRequested.promise;
  lifetime.abort();
  expect(port.resources.deviceDestroyed).toBe(1);
  port.resolvePipeline();
  expect(await initializing).toBeNull();
  expect(port.resources.configured).toBe(0);
  expect(fallback).toEqual([]);
});

test('device loss during initialization cleans up and does not report a second pipeline failure', async () => {
  const port = gpuPort({ holdPipeline: true }), fallback: string[] = [];
  const initializing = createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason));
  await port.pipelineRequested.promise;
  port.lost.resolve({ reason: 'unknown', message: 'GPU reset during compilation' } as GPUDeviceLostInfo);
  await Promise.resolve();
  expect(port.resources.deviceDestroyed).toBe(1);
  port.rejectPipeline(new Error('Compilation invalidated by device loss'));
  expect(await initializing).toBeNull();
  expect(port.resources.configured).toBe(0);
  expect(fallback).toEqual(['WebGPU device lost: unknown. Using native playback.']);
});

test('explicit disposal is silent and idempotent and still consumes rejected late frames', async () => {
  const port = gpuPort(), fallback: string[] = [];
  const lifetime = new AbortController();
  const renderer = (await createGpuPreviewRenderer(port.canvas, reason => fallback.push(reason), lifetime.signal))!;
  renderer.render(frame().bitmap);
  renderer.dispose(); renderer.dispose(); lifetime.abort();
  port.device.dispatchEvent(new Event('uncapturederror'));
  await Promise.resolve();
  const late = frame();
  expect(renderer.render(late.bitmap)).toBe(false);
  expect(late.closed()).toBe(1);
  expect(port.resources.submissions).toBe(1);
  expect(port.resources.deviceDestroyed).toBe(1);
  expect(port.resources.unconfigured).toBe(1);
  expect(port.resources.textures[0].destroyed).toBe(1);
  expect(fallback).toEqual([]);
});
