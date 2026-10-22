const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rasterImage = value => typeof value === 'string' && value.length <= 4194400 && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
export const mailSubject = content => `给${content.recipient || '最喜欢的你'}的一封通关来信`;

export async function decodeMailImage(image, signal) {
  if (signal.aborted) throw signal.reason;
  let onAbort;
  const cancelled = new Promise((_, reject) => {
    onAbort = () => { image.src = ''; reject(signal.reason); };
    signal.addEventListener('abort', onAbort, { once: true });
  });
  try { await Promise.race([image.decode(), cancelled]); }
  finally { signal.removeEventListener('abort', onAbort); }
}

export function safeMailImage(value, origin) {
  if (rasterImage(value)) return value;
  if (typeof value !== 'string' || !value || value.length > 2048) return '';
  try {
    const url = new URL(value, `${origin}/`);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === origin && !url.username && !url.password && /\.(?:png|jpe?g|webp|svg)$/i.test(url.pathname) ? value : '';
  } catch { return ''; }
}

export function buildCompletionMail(content, { imageDataUrl = '', bonusRevealed = false } = {}) {
  const recipient = content.recipient || '最喜欢的你';
  const sender = content.sender || '为你准备惊喜的人';
  const gift = content.gift || {};
  const bonus = bonusRevealed && content.voucher?.enabled;
  const image = rasterImage(imageDataUrl) ? `<img class="gift-image" src="${imageDataUrl}" alt="${escape(gift.imageAlt || '惊喜礼物')}">` : '';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(mailSubject(content))}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:18px;background:#eee9dd;color:#514d40;font-family:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;font-size:14px;line-height:1.9}.mail{max-width:600px;margin:auto;background:#fffcf4;border:1px solid #d8cdb8;border-radius:8px;overflow:hidden}.mail-header{padding:23px 26px;background:#f7f1e6;border-bottom:1px solid #e4daca}.mail-brand{font:10px ui-monospace,monospace;letter-spacing:2px;color:#956950;margin:0 0 17px}.mail-subject{font:500 23px/1.55 'Songti SC',STSong,serif;margin:0 0 18px;overflow-wrap:anywhere}.mail-addresses{margin:0;font-size:12px;line-height:2}.mail-addresses div{display:flex;gap:12px}.mail-addresses dt{flex:0 0 40px;color:#8b806a}.mail-addresses dd{margin:0;overflow-wrap:anywhere}.mail-body{padding:28px 26px}.stamp{display:inline-block;padding:3px 10px;border:1px solid #b8c0a4;color:#65734f;font-size:10px;letter-spacing:1px;margin-bottom:20px}.greeting{font:18px/1.8 'Songti SC',STSong,serif;margin:0 0 18px}.letter{font:15px/2.05 'Songti SC',STSong,serif}.letter p,.gift-description,.redemption p,.bonus p{white-space:pre-wrap;overflow-wrap:anywhere}.letter p{margin:0 0 17px}.gift{border:1px solid #d9c8ae;background:#f8f0e1;padding:22px;margin-top:28px;text-align:center}.eyebrow{font:9px ui-monospace,monospace;color:#92684e;letter-spacing:1.5px;margin:0 0 12px}.gift-image{display:block;max-width:100%;max-height:220px;object-fit:contain;margin:12px auto 18px}.gift h2{font:500 22px/1.6 'Songti SC',STSong,serif;margin:0 0 12px;overflow-wrap:anywhere}.gift-description{font-size:13px;margin:0}.redemption{text-align:left;border-top:1px dashed #cfc0a6;margin-top:20px;padding-top:15px}.redemption strong{font-size:11px;color:#8a664d}.redemption p{font-size:13px;margin:7px 0 0}.gift-details{font-size:11px;color:#89785e;overflow-wrap:anywhere;margin:17px 0 0}.bonus{background:#edf0e3;padding:16px;margin-top:18px;text-align:left}.bonus strong{font-size:13px}.bonus p{font-size:12px;margin:7px 0 0}.signature{font:15px/1.8 'Songti SC',STSong,serif;text-align:right;overflow-wrap:anywhere;margin:24px 0 0}.mail-foot{border-top:1px solid #e4daca;padding:16px 26px;font-size:10px;color:#8b806a;text-align:center}.memory-titles{margin:10px 0 0;line-height:1.8;overflow-wrap:anywhere}.mail-note{font-size:10px;text-align:center;color:#8b806a;max-width:600px;margin:13px auto 0}@media(max-width:400px){body{padding:9px}.mail-header,.mail-body{padding:21px 18px}.mail-subject{font-size:21px}.gift{padding:17px}.mail-foot{padding:15px 18px}}@media print{body{padding:0;background:white}.mail{max-width:none;box-shadow:none}.mail-note{display:none}}
</style></head><body><article class="mail" aria-label="通关邮件卡片"><header class="mail-header"><p class="mail-brand">MEMORY ARCADE · A LETTER FOR YOU</p><h1 class="mail-subject">${escape(mailSubject(content))}</h1><dl class="mail-addresses"><div><dt>发件人</dt><dd>${escape(sender)}</dd></div><div><dt>收件人</dt><dd>${escape(recipient)}</dd></div><div><dt>主题</dt><dd>${escape(content.title || '一份只属于你的惊喜')}</dd></div></dl></header><main class="mail-body"><span class="stamp">三个盒子，全部收好</span><p class="greeting">亲爱的 ${escape(recipient)}：</p><div class="letter">${(content.letter || []).map(paragraph => `<p>${escape(paragraph)}</p>`).join('')}</div><section class="gift"><p class="eyebrow">A LITTLE SOMETHING FOR YOU</p>${image}<h2>${escape(gift.title || '这份小心意，送给你')}</h2><p class="gift-description">${escape(gift.description || '')}</p>${gift.redemption ? `<div class="redemption"><strong>这样领取这份心意</strong><p>${escape(gift.redemption)}</p></div>` : ''}${gift.validity ? `<p class="gift-details">${escape(gift.validity)}</p>` : ''}${gift.details?.length ? `<p class="gift-details">${gift.details.map(escape).join(' · ')}</p>` : ''}${bonus ? `<div class="bonus"><strong>小鹅还替你藏着：${escape(content.voucher.revealTitle)}</strong><p>${escape(content.voucher.description)}</p></div>` : ''}</section><p class="signature">${escape(sender)}<br>把下一页，也留给我们。</p></main><footer class="mail-foot">一份可以玩的心意 · 拾光小盒${content.memories?.length ? `<p class="memory-titles">${content.memories.map(memory => escape(memory.title)).join(' / ')}</p>` : ''}</footer></article><p class="mail-note">通关纪念卡 · 这是一份可保存的邮件样式预览，未发送邮件。</p></body></html>`;
}
