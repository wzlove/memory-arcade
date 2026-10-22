import { decodeMailImage, mailSubject, safeMailImage } from './completionMail.js';

const WIDTH = 640;
const PAGE_HEIGHT = 1800;
const SERIF = '"Songti SC", STSong, serif';
const SANS = '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' }) : null;

export function wrapMailText(text, width, measure) {
  if (!segmenter) throw new Error('当前浏览器不支持图片排版，请升级浏览器或保存 HTML 卡片。');
  return String(text).split(/\r\n?|\n/).flatMap(paragraph => {
    const lines = [];
    let line = '';
    for (const { segment } of segmenter.segment(paragraph)) {
      if (line && measure(line + segment) > width) { lines.push(line); line = ''; }
      line += segment;
    }
    lines.push(line);
    return lines;
  });
}

export function layoutMailImage(content, { measure, imageSize, bonusRevealed = false }) {
  const pages = [{ items: [], height: 0 }];
  let page = pages[0], y = 42;
  function add(item) {
    if (y + item.height > PAGE_HEIGHT - 48) { page = { items: [], height: 0 }; pages.push(page); y = 42; }
    page.items.push({ ...item, y });
    y += item.height;
    page.height = y + 36;
  }
  function space(height, background) { add({ type: 'space', height, background }); }
  function text(value, { size = 18, lineHeight = 34, color = '#514d40', family = SERIF, background, gap = 0 } = {}) {
    const font = `${size}px ${family}`;
    for (const line of wrapMailText(value, 520, value => measure(value, font))) {
      add({ type: 'text', text: line, font, color, x: 60, height: lineHeight, background });
    }
    if (gap) space(gap, background);
  }
  const recipient = content.recipient || '最喜欢的你';
  const sender = content.sender || '为你准备惊喜的人';
  const gift = content.gift || {};
  text('MEMORY ARCADE · A LETTER FOR YOU', { family: SANS, size: 11, lineHeight: 22, color: '#956950', gap: 16 });
  text(mailSubject(content), { size: 28, lineHeight: 42, gap: 20 });
  for (const [label, value] of [['发件人', sender], ['收件人', recipient], ['主题', content.title || '一份只属于你的惊喜']]) {
    text(`${label}   ${value}`, { family: SANS, size: 14, lineHeight: 25, color: '#83775f' });
  }
  space(24);
  text('三个盒子，全部收好', { family: SANS, size: 12, lineHeight: 24, color: '#65734f', gap: 22 });
  text(`亲爱的 ${recipient}：`, { size: 21, lineHeight: 36, gap: 16 });
  for (const paragraph of content.letter || []) text(paragraph, { gap: 18 });

  const giftStyle = { background: '#f8f0e1' };
  space(20);
  space(20, giftStyle.background);
  text('A LITTLE SOMETHING FOR YOU', { ...giftStyle, family: SANS, size: 11, lineHeight: 24, color: '#92684e', gap: 12 });
  if (imageSize?.width > 0 && imageSize?.height > 0) {
    const scale = Math.min(520 / imageSize.width, 240 / imageSize.height, 1);
    const width = imageSize.width * scale, height = imageSize.height * scale;
    add({ type: 'image', x: (WIDTH - width) / 2, width, height, ...giftStyle });
    space(18, giftStyle.background);
  }
  text(gift.title || '这份小心意，送给你', { ...giftStyle, size: 25, lineHeight: 39, gap: 12 });
  if (gift.description) text(gift.description, { ...giftStyle, size: 17, lineHeight: 30, gap: 18 });
  if (gift.redemption) {
    text('这样领取这份心意', { ...giftStyle, family: SANS, size: 13, lineHeight: 25, color: '#8a664d' });
    text(gift.redemption, { ...giftStyle, size: 16, lineHeight: 28, gap: 14 });
  }
  for (const detail of [gift.validity, ...(gift.details || [])].filter(Boolean)) text(detail, { ...giftStyle, family: SANS, size: 13, lineHeight: 24, color: '#89785e' });
  if (bonusRevealed && content.voucher?.enabled) {
    space(18, giftStyle.background);
    text(`小鹅还替你藏着：${content.voucher.revealTitle}`, { ...giftStyle, size: 18, lineHeight: 30, color: '#65734f' });
    text(content.voucher.description, { ...giftStyle, size: 16, lineHeight: 28 });
  }
  space(20, giftStyle.background);
  space(26);
  text(sender, { size: 19, lineHeight: 32 });
  text('把下一页，也留给我们。', { size: 16, lineHeight: 28, gap: 26 });
  text('一份可以玩的心意 · 拾光小盒', { family: SANS, size: 12, lineHeight: 23, color: '#8b806a' });
  if (content.memories?.length) text(content.memories.map(memory => memory.title).join(' / '), { family: SANS, size: 12, lineHeight: 22, color: '#8b806a' });
  return { width: WIDTH, pages };
}

export async function createMailPngs(content, { imageDataUrl = '', bonusRevealed = false, signal } = {}) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器无法生成图片，请保存 HTML 卡片。');
  let photo, imageMissing = Boolean(content.gift?.image && !imageDataUrl);
  try {
    if (imageDataUrl) {
      try {
        if (!imageDataUrl.startsWith('data:') || !safeMailImage(imageDataUrl, window.location.origin)) throw new Error('Unsupported image');
        photo = new Image(); photo.src = imageDataUrl;
        const timeout = AbortSignal.timeout(8000);
        await decodeMailImage(photo, signal ? AbortSignal.any([signal, timeout]) : timeout);
      } catch { signal?.throwIfAborted(); if (photo) photo.src = ''; photo = null; imageMissing = true; }
    }
    await document.fonts.ready;
    signal?.throwIfAborted();
    const layout = layoutMailImage(content, {
      measure: (value, font) => { context.font = font; return context.measureText(value).width; },
      imageSize: photo && { width: photo.naturalWidth, height: photo.naturalHeight }, bonusRevealed,
    });
    const blobs = [];
    for (const [index, page] of layout.pages.entries()) {
      signal?.throwIfAborted();
      // Keep each 2x image below 4096px per edge; reuse one canvas for long letters.
      canvas.width = layout.width * 2; canvas.height = Math.ceil(page.height * 2);
      context.scale(2, 2);
      context.fillStyle = '#eee9dd'; context.fillRect(0, 0, layout.width, page.height);
      context.fillStyle = '#fffcf4'; context.fillRect(20, 16, 600, page.height - 32);
      context.strokeStyle = '#d8cdb8'; context.strokeRect(20.5, 16.5, 599, page.height - 33);
      context.textBaseline = 'top';
      for (const item of page.items) {
        if (item.background) { context.fillStyle = item.background; context.fillRect(40, item.y, 560, item.height); }
        if (item.type === 'text') { context.font = item.font; context.fillStyle = item.color; context.fillText(item.text, item.x, item.y); }
        if (item.type === 'image') context.drawImage(photo, item.x, item.y, item.width, item.height);
      }
      context.font = `10px ${SANS}`; context.fillStyle = '#8b806a';
      context.fillText(`通关纪念卡 · ${index + 1} / ${layout.pages.length}`, 40, page.height - 30);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('图片生成失败，请重试或保存 HTML 卡片。');
      blobs.push(blob);
    }
    signal?.throwIfAborted();
    return { blobs, imageMissing };
  } finally { canvas.width = 0; canvas.height = 0; if (photo) photo.src = ''; }
}
