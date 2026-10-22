import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMailPngs } from './completionMailImage.js';

const content = { letter: ['写给你的信。'], gift: { title: '一起去看海', description: '挑一个晴天。' } };
const imageDataUrl = 'data:image/png;base64,aGVsbG8=';
let canvas, context, png, decode, images;

beforeEach(() => {
  png = new Blob(['browser PNG output'], { type: 'image/png' });
  context = {
    measureText: text => ({ width: [...text].length * 10 }),
    scale() {}, fillRect() {}, strokeRect() {}, fillText() {}, drawImage: vi.fn(),
  };
  canvas = { width: 300, height: 150, getContext: () => context, toBlob: vi.fn(callback => callback(png)) };
  decode = vi.fn().mockResolvedValue(undefined);
  images = [];
  vi.stubGlobal('document', { createElement: () => canvas, fonts: { ready: Promise.resolve() } });
  vi.stubGlobal('window', { location: { origin: 'https://example.com' } });
  vi.stubGlobal('Image', class {
    constructor() { this.src = ''; this.naturalWidth = 100; this.naturalHeight = 100; images.push(this); }
    decode() { return decode(); }
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('completion mail PNG failures and cancellation', () => {
  it('reports a failed PNG encoding and releases the canvas', async () => {
    canvas.toBlob.mockImplementation(callback => callback(null));
    await expect(createMailPngs(content)).rejects.toThrow('图片生成失败');
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('keeps generating a PNG when the gift image cannot be decoded', async () => {
    decode.mockRejectedValue(new Error('Invalid image'));
    const result = await createMailPngs({ ...content, gift: { ...content.gift, image: imageDataUrl } }, { imageDataUrl });
    expect(result).toEqual({ blobs: [png], imageMissing: true });
    expect(decode).toHaveBeenCalledOnce();
    expect(context.drawImage).not.toHaveBeenCalled();
    expect(images[0].src).toBe('');
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('does not encode an image when generation was already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createMailPngs(content, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(canvas.toBlob).not.toHaveBeenCalled();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it('does not treat cancellation during image decoding as a missing gift image', async () => {
    decode.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const pending = createMailPngs(content, { imageDataUrl, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(canvas.toBlob).not.toHaveBeenCalled();
    expect(images[0].src).toBe('');
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });

  it.each([
    ['single-page', content],
    ['multi-page', { ...content, letter: ['一行\n'.repeat(100)] }],
  ])('does not return completed or partial images after cancellation during %s encoding', async (_, draft) => {
    const controller = new AbortController();
    canvas.toBlob.mockImplementation(callback => queueMicrotask(() => {
      controller.abort();
      callback(png);
    }));
    await expect(createMailPngs(draft, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
    expect(canvas.toBlob).toHaveBeenCalledOnce();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
});
