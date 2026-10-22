import { useEffect, useMemo, useState } from 'react';
import { buildCompletionMail, decodeMailImage, mailSubject, safeMailImage } from '../content/completionMail.js';
import '../completion-mail.css';

async function portableImage(source, signal) {
  const safe = safeMailImage(source, window.location.origin);
  if (!safe) throw new Error('Unsupported image');
  if (safe.startsWith('data:')) return safe;
  const response = await fetch(safe, { signal, credentials: 'same-origin' });
  if (!response.ok) throw new Error('Image unavailable');
  const blob = await response.blob();
  if (!['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp'].includes(blob.type.split(';')[0]) || blob.size > 3 * 1024 * 1024) throw new Error('Unsupported image');
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = objectUrl;
    await decodeMailImage(image, signal);
    const scale = Math.min(1, 960 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally { URL.revokeObjectURL(objectUrl); }
}

export default function CompletionMail({ content, bonusRevealed = false }) {
  const [image, setImage] = useState({ source: null, data: '', failed: false });
  const [notice, setNotice] = useState('');
  const source = content.gift?.image || '';
  const ready = image.source === source;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    if (!source) { setImage({ source, data: '', failed: false }); return () => controller.abort(); }
    const timeout = setTimeout(() => controller.abort(), 8000);
    portableImage(source, controller.signal).then(data => {
      if (active) setImage({ source, data, failed: false });
    }).catch(() => {
      if (active) setImage({ source, data: '', failed: true });
    }).finally(() => clearTimeout(timeout));
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [source]);
  const html = useMemo(() => buildCompletionMail(content, { imageDataUrl: ready ? image.data : '', bonusRevealed }), [content, bonusRevealed, ready, image.data]);

  function download() {
    try {
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'memory-arcade-letter.html';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNotice(image.failed ? '已发起文字版卡片下载；图片暂时无法载入。' : '已发起卡片下载，文字和图片都可以离线保存。');
    } catch { setNotice('暂时无法下载，请重试。你的游戏进度不会受影响。'); }
  }

  return <section className="completion-mail" aria-label="通关邮件预览">
    <div className="completion-mail-heading"><div><p>JUST FOR YOU</p><h3>把这份心意，收进一封信。</h3></div><span>通关纪念</span></div>
    <p className="completion-mail-description">已经为你生成邮件卡片。可以在这里读完，也可以保存下来。</p>
    {/* Avoid overlapping initial srcDoc navigations when the gift image is cached. */}
    {ready ? <iframe className="completion-mail-frame" title={mailSubject(content)} srcDoc={html} sandbox="" /> : <p role="status">正在整理信件和礼物图片…</p>}
    <div className="completion-mail-actions"><button type="button" className="keepsake-primary" disabled={!ready} onClick={download}>{ready ? '下载邮件卡片' : '正在准备卡片…'}</button><span>仅预览与保存，不会自动发送邮件</span></div>
    <p className="completion-mail-status" role="status">{notice || (ready && image.failed ? '礼物图片暂时无法载入，仍可保存文字版卡片。' : '')}</p>
  </section>;
}
