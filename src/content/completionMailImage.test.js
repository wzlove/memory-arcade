import { describe, expect, it } from 'vitest';
import { layoutMailImage, wrapMailText } from './completionMailImage.js';

const measure = text => [...new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }).segment(text)].length * 10;
const content = {
  recipient: '小满', sender: '阿禾', title: '生日快乐', letter: ['一起走过的日子。'],
  gift: { title: '去看海', description: '挑一个晴天。', redemption: '来找我约时间。', validity: '一直有效', details: ['一起体验'] },
  memories: [{ title: '第一杯奶茶' }], voucher: { enabled: true, revealTitle: '电影券', description: '电影你来选。' },
};
const textOf = layout => layout.pages.flatMap(page => page.items).filter(item => item.type === 'text').map(item => item.text).join('');

describe('completion mail image layout', () => {
  it('wraps Chinese and long words without dropping text or splitting emoji', () => {
    const text = '你好👩‍❤️‍👨abcdefgh';
    const lines = wrapMailText(text, 30, measure);
    expect(lines.join('')).toBe(text);
    expect(lines.every(line => measure(line) <= 30)).toBe(true);
    expect(lines.some(line => line.includes('👩‍❤️‍👨'))).toBe(true);
    expect(wrapMailText('第一行\n\n第二行', 100, measure)).toEqual(['第一行', '', '第二行']);
  });
  it('includes the complete letter, gift instructions, signature and memories', () => {
    const layout = layoutMailImage(content, { measure });
    expect(layout.pages).toHaveLength(1);
    for (const value of ['小满', '阿禾', '生日快乐', ...content.letter, '去看海', '来找我约时间。', '一直有效', '第一杯奶茶']) expect(textOf(layout)).toContain(value);
    expect(textOf(layout)).not.toContain('电影券');
    expect(textOf(layoutMailImage(content, { measure, bonusRevealed: true }))).toContain('电影券');
    expect(textOf(layoutMailImage({ ...content, voucher: { ...content.voucher, enabled: false } }, { measure, bonusRevealed: true }))).not.toContain('电影券');
  });
  it('paginates long text and explicit line breaks without clipping the final content', () => {
    const letter = `${'很长的一封信'.repeat(700)}\n${'一行\n'.repeat(100)}`;
    const layout = layoutMailImage({ ...content, letter: [letter] }, { measure });
    expect(layout.pages.length).toBeGreaterThan(1);
    expect(textOf(layout)).toContain('来找我约时间。');
    expect(textOf(layout).split('很长的一封信').length - 1).toBe(700);
    expect(textOf(layout).split('一行').length - 1).toBe(100);
    for (const page of layout.pages) {
      expect(page.height).toBeLessThanOrEqual(1800);
      expect(page.items.every(item => item.y >= 0 && item.y + item.height <= page.height - 30)).toBe(true);
    }
  });
  it('fits gift photos in the image area without changing their aspect ratio', () => {
    for (const [width, height] of [[4000, 1000], [1000, 4000]]) {
      const layout = layoutMailImage(content, { measure, imageSize: { width, height } });
      const image = layout.pages.flatMap(page => page.items).find(item => item.type === 'image');
      expect(image.width / image.height).toBeCloseTo(width / height);
      expect(image.width).toBeLessThanOrEqual(520);
      expect(image.height).toBeLessThanOrEqual(240);
    }
  });
});
