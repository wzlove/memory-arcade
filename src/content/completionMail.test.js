import { describe, expect, it } from 'vitest';
import { buildCompletionMail, decodeMailImage, mailSubject, safeMailImage } from './completionMail.js';

const content = {
  recipient: '小满', sender: '阿禾', title: '藏在日常里的你',
  letter: ['普通的日子，因为你变得很特别。', '下一页，我们一起写。'],
  memories: [{ title: '第一杯奶茶' }, { title: '一起坐过的车' }],
  gift: { title: '一起去看海', description: '挑一个晴天就出发。', image: '/content/reward.svg', imageAlt: '礼物插画', redemption: '来找我约定出发时间。', validity: '一直有效', details: ['FOR YOU'] },
  voucher: { enabled: true, revealTitle: '电影任选券', description: '零食我准备。' },
};

describe('completion mail', () => {
  it('stops waiting for a stalled image decode when the image timeout aborts', async () => {
    const controller = new AbortController();
    const image = { src: 'blob:gift', decode: () => new Promise(() => {}) };
    const pending = decodeMailImage(image, controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(image.src).toBe('');
  });
  it('does not start decoding after cancellation or clear a successfully decoded image', async () => {
    const controller = new AbortController();
    let decoded = false;
    const image = { src: 'blob:gift', decode: async () => { decoded = true; } };
    await decodeMailImage(image, controller.signal);
    expect(decoded).toBe(true);
    controller.abort();
    expect(image.src).toBe('blob:gift');
    decoded = false;
    await expect(decodeMailImage(image, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(decoded).toBe(false);
  });
  it('generates a standalone email card with personal content and no sending action', () => {
    const html = buildCompletionMail(content);
    expect(mailSubject(content)).toBe('给小满的一封通关来信');
    for (const text of ['<!doctype html>', '<meta charset="utf-8">', '阿禾', '小满', '普通的日子，因为你变得很特别。', '一起去看海', '来找我约定出发时间。', '一直有效']) expect(html).toContain(text);
    expect(html).not.toMatch(/<script|mailto:|<form|<iframe|src="\/content/i);
  });
  it('escapes names, letter, memories, gift fields and image alt instead of running HTML', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const draft = { ...content, recipient: malicious, sender: malicious, letter: [malicious], memories: [{ title: malicious }], gift: { ...content.gift, title: malicious, description: malicious, redemption: malicious, details: [malicious], imageAlt: malicious } };
    const html = buildCompletionMail(draft, { imageDataUrl: 'data:image/png;base64,aGVsbG8=' });
    expect(html).not.toContain(malicious);
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  });
  it('only embeds portable raster images and ignores unsafe URLs', () => {
    const image = 'data:image/png;base64,aGVsbG8=';
    expect(buildCompletionMail(content, { imageDataUrl: image })).toContain(`src="${image}"`);
    for (const value of ['javascript:alert(1)', 'https://example.com/tracker.png', '/content/reward.svg', 'data:image/svg+xml;base64,PHN2Zz4=']) {
      expect(buildCompletionMail(content, { imageDataUrl: value })).not.toContain('<img');
    }
  });
  it('rejects external image requests but supports local paths and raster uploads', () => {
    expect(safeMailImage('/memory-arcade/content/reward.svg', 'https://example.com')).toBe('/memory-arcade/content/reward.svg');
    expect(safeMailImage('content/reward.svg', 'https://example.com')).toBe('content/reward.svg');
    expect(safeMailImage('data:image/webp;base64,aGVsbG8=', 'https://example.com')).toContain('data:image/webp;');
    for (const value of ['javascript:alert(1)', '//tracker.test/image.png', 'https://tracker.test/image.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'file:///private/photo.png']) {
      expect(safeMailImage(value, 'https://example.com')).toBe('');
    }
  });
  it('keeps the goose surprise hidden until explicitly revealed', () => {
    expect(buildCompletionMail(content)).not.toContain('电影任选券');
    expect(buildCompletionMail(content, { bonusRevealed: true })).toContain('电影任选券');
    expect(buildCompletionMail({ ...content, voucher: { ...content.voucher, enabled: false } }, { bonusRevealed: true })).not.toContain('电影任选券');
  });
  it('supports no optional gift details and uses names instead of invented email addresses', () => {
    const html = buildCompletionMail({ ...content, recipient: '', sender: '', memories: [], gift: { title: '一份礼物', description: '' } });
    expect(html).toContain('最喜欢的你');
    expect(html).toContain('为你准备惊喜的人');
    expect(html).not.toContain('undefined');
    expect(html).not.toContain('null');
  });
});
