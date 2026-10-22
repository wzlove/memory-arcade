import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCompletionMail, decodeMailImage, mailSubject, safeMailImage } from '../content/completionMail.js';
import { createMailPngs } from '../content/completionMailImage.js';
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
  const [generating, setGenerating] = useState(false);
  const [pictures, setPictures] = useState([]);
  const [pictureIndex, setPictureIndex] = useState(0);
  const [pictureNotice, setPictureNotice] = useState('');
  const generation = useRef(null);
  const dialog = useRef(null);
  const pictureScroll = useRef(null);
  const generateButton = useRef(null);
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
  useEffect(() => () => generation.current?.abort(), []);
  useEffect(() => {
    if (!pictures.length) return;
    dialog.current.showModal();
    return () => pictures.forEach(url => URL.revokeObjectURL(url));
  }, [pictures]);
  useEffect(() => { if (pictureScroll.current) pictureScroll.current.scrollTop = 0; }, [pictureIndex, pictures]);
  const html = useMemo(() => buildCompletionMail(content, { imageDataUrl: ready ? image.data : '', bonusRevealed }), [content, bonusRevealed, ready, image.data]);

  function saveFile(url, filename) {
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
  }

  function downloadHtml() {
    try {
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      saveFile(url, 'memory-arcade-letter.html');
      setNotice(image.failed ? '已发起 HTML 文字版卡片下载；图片暂时无法载入。' : '已发起 HTML 卡片下载，可以离线保存。');
    } catch { setNotice('暂时无法下载，请重试。你的游戏进度不会受影响。'); }
  }

  async function generatePictures() {
    if (generation.current) return;
    const controller = new AbortController();
    generation.current = controller;
    setGenerating(true); setNotice('正在生成图片…');
    const urls = [];
    try {
      const result = await createMailPngs(content, { imageDataUrl: image.data, bonusRevealed, signal: controller.signal });
      controller.signal.throwIfAborted();
      result.blobs.forEach(blob => urls.push(URL.createObjectURL(blob)));
      setPictureIndex(0);
      setPictureNotice(result.imageMissing ? '礼物图片无法载入，已生成保留全部文字的图片。' : '');
      setPictures(urls);
      setNotice(`已生成 ${urls.length} 张 PNG 图片。`);
    } catch (error) {
      urls.forEach(url => URL.revokeObjectURL(url));
      if (!controller.signal.aborted) setNotice(error.message || '图片生成失败，请重试或保存 HTML 卡片。');
    } finally {
      if (!controller.signal.aborted) setGenerating(false);
      if (generation.current === controller) generation.current = null;
    }
  }

  function closePictures() {
    dialog.current.close();
    setPictures([]);
    generateButton.current?.focus();
  }

  function downloadPicture() {
    try {
      saveFile(pictures[pictureIndex], `memory-arcade-letter${pictures.length > 1 ? `-${pictureIndex + 1}` : ''}.png`);
      setPictureNotice(`已发起第 ${pictureIndex + 1} 张图片下载；也可以尝试长按图片保存。`);
    } catch { setPictureNotice('下载暂时不可用，可以尝试长按图片保存。'); }
  }

  return <section className="completion-mail" aria-label="通关邮件预览">
    <div className="completion-mail-heading"><div><p>JUST FOR YOU</p><h3>把这份心意，收进一封信。</h3></div><span>通关纪念</span></div>
    <p className="completion-mail-description">已经为你生成邮件卡片。可以在这里读完，也可以保存下来。</p>
    {/* Avoid overlapping initial srcDoc navigations when the gift image is cached. */}
    {ready ? <iframe className="completion-mail-frame" title={mailSubject(content)} srcDoc={html} sandbox="" /> : <p role="status">正在整理信件和礼物图片…</p>}
    <div className="completion-mail-actions">
      <button ref={generateButton} type="button" className="keepsake-primary" disabled={!ready || generating} onClick={generatePictures}>{generating ? '正在生成图片…' : ready ? '生成图片' : '正在准备卡片…'}</button>
      <button type="button" className="keepsake-text-button" disabled={!ready} onClick={downloadHtml}>下载 HTML</button>
      <span>仅预览与保存，不会自动发送邮件</span>
    </div>
    <p className="completion-mail-status" role="status">{notice || (ready && image.failed ? '礼物图片暂时无法载入，仍可保存文字版卡片。' : '')}</p>
    <dialog ref={dialog} className="mail-image-dialog" aria-labelledby="mail-image-title" onCancel={event => { event.preventDefault(); closePictures(); }}>
      <div className="mail-image-heading"><h3 id="mail-image-title">把心意存成图片</h3><button type="button" className="keepsake-text-button" onClick={closePictures} autoFocus>关闭</button></div>
      <p className="mail-image-help">下载 PNG 后即可分享；手机上也可以尝试长按图片保存。{pictures.length > 1 && '信件较长，已自动分成多张，请逐张保存。'}</p>
      <div ref={pictureScroll} className="mail-image-scroll">{pictures.length > 0 && <img className="mail-image-preview" src={pictures[pictureIndex]} alt={`给${content.recipient || '最喜欢的你'}的通关邮件卡片，第 ${pictureIndex + 1} 张`} />}</div>
      <div className="mail-image-controls">
        {pictures.length > 1 && <div className="mail-image-pages"><button type="button" className="keepsake-text-button" disabled={pictureIndex === 0} onClick={() => setPictureIndex(index => index - 1)}>上一张</button><span aria-live="polite">{pictureIndex + 1} / {pictures.length}</span><button type="button" className="keepsake-text-button" disabled={pictureIndex === pictures.length - 1} onClick={() => setPictureIndex(index => index + 1)}>下一张</button></div>}
        <button type="button" className="keepsake-primary" onClick={downloadPicture}>{pictures.length > 1 ? `下载第 ${pictureIndex + 1} 张 PNG` : '下载 PNG 图片'}</button>
      </div>
      <p className="completion-mail-status" role="status">{pictureNotice}</p>
    </dialog>
  </section>;
}
