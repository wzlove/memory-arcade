import { createDraft, sampleDraft, parseDraft, issuesFor, escapeHTML as e, CHAPTERS, PROMPTS, SAMPLE_TITLES, SAMPLE_BODIES, LETTER_SAMPLE, DRAFT_KEY } from './studio-model.js';

const $ = (selector) => document.querySelector(selector);
const STEP_NAMES = ['送给谁', '六段回忆', '写一封信', '准备礼物', '检查预览'];
const STEP_NOTES = ['从一个名字开始', '收藏你们的小事', '把心里话留下', '留到最后的惊喜', '再看一遍这份心意'];
const TITLES = ['先告诉我，这份心意送给谁？', '把你们的小事，一件件收进来。', '有些话，留到最后慢慢说。', '最后的惊喜，现在悄悄准备。', '再看一遍，就可以交付这份心意。'];
const SUBTITLES = ['从一个名字开始，把普通的游戏，变成只属于你们的礼物。', '不一定要是大事。六个真实的小瞬间，就能拼成你们的故事。', '对方认真玩到了这里，这一封信，值得用自己的话写。', '一件礼物、一次出发，或一个小小的约定，都可以。', '检查遗漏，预览对方的阅读顺序，再保存到游戏。'];
let draft = createDraft(), step = 0, memory = 0, previewPage = 0, reviewPreview = 0;
let db, saveTimer, toastTimer, photoTarget;
let authenticated = false, publishing = false, editorInitialized = false;
let revision = 0, savedRevision = 0, saving = false, writingPhoto = false;

function notify(message) {
  clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function setSave(message, failed = false) {
  $('#save-state').textContent = message; $('#save-state').classList.toggle('error', failed);
}
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) { reject(new Error('存储不可用')); return; }
    const request = indexedDB.open('memory-arcade-content-studio', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('请关闭其他工作室页面后重试。'));
  });
}
function readStoredDraft() {
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts').objectStore('drafts').get(DRAFT_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function persist() {
  clearTimeout(saveTimer);
  if (saving || revision === savedRevision) return;
  if (!db) { setSave('保存不可用，请导出备份', true); return; }
  const savingRevision = revision;
  saving = true;
  try {
    const snapshot = structuredClone(draft);
    await new Promise((resolve, reject) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put(snapshot, DRAFT_KEY);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    savedRevision = savingRevision;
    setSave('草稿已存到此浏览器');
  } catch { setSave('保存失败，请导出备份', true); }
  finally { saving = false; }
  if (revision > savingRevision) await persist();
}
function changed() {
  revision += 1;
  setSave(db ? '正在保存…' : '保存不可用，请导出备份', !db);
  clearTimeout(saveTimer); saveTimer = setTimeout(persist, 300);
  refreshSummary(); renderPreview();
}
function getValue(path) { return path.split('.').reduce((value, key) => value[key], draft); }
function setValue(path, value) {
  const keys = path.split('.');
  const key = keys.pop();
  keys.reduce((object, part) => object[part], draft)[key] = value;
}
function field(label, path, { placeholder = '', max = 60, type = 'text', rows = 0, optional = false, help = '' } = {}) {
  const value = getValue(path);
  const id = `field-${path.replaceAll('.', '-')}`;
  return `<label class="field" for="${id}"><span class="field-label"><span>${label}${optional ? '' : '<span class="required">*</span>'}</span>${optional ? '<small>选填</small>' : ''}</span>${rows ? `<textarea id="${id}" data-field="${path}" rows="${rows}" maxlength="${max}" placeholder="${e(placeholder)}">${e(value)}</textarea><div class="field-count" data-count="${path}">${value.length} / ${max}</div>` : `<input id="${id}" data-field="${path}" type="${type}" maxlength="${max}" value="${e(value)}" placeholder="${e(placeholder)}">`}${help ? `<p class="field-help">${help}</p>` : ''}</label>`;
}
function heading(number, title, aside = '') {
  return `<div class="section-heading"><span class="index">${number}</span><h2>${title}</h2>${aside ? `<small>${aside}</small>` : ''}</div>`;
}
function choices(values, path) {
  return `<div class="choice-row">${values.map(value => `<button class="choice" data-action="choice" data-path="${path}" data-value="${e(value)}" aria-pressed="${getValue(path) === value}">${e(value)}</button>`).join('')}</div>`;
}
function upload(isGift = false) {
  const item = isGift ? draft.gift : draft.memories[memory];
  const path = isGift ? item.image : item.photo;
  const custom = path.startsWith('data:');
  return `<div class="upload-row"><img class="upload-thumb" src="${e(path)}" alt="${e(isGift ? item.imageAlt : item.alt)}"><div class="upload-info"><button class="button" data-action="photo" data-target="${isGift ? 'gift' : memory}">${custom ? '更换图片' : '选择一张照片'} <span aria-hidden="true">↑</span></button><p>${custom ? '已选择你的图片 · 会随草稿保存' : '还没选好也没关系，先用这张插画。'}<br>JPG / PNG / WebP，单张不超过 3 MB</p>${custom ? `<button class="text-button" data-action="remove-photo" data-target="${isGift ? 'gift' : memory}">恢复默认插画</button>` : ''}</div></div>`;
}
function renderBasics() {
  return `<div class="form-panel">${heading('01', '一份心意的开始', '* 为必填内容')}<div class="form-grid">${field('对方的昵称', 'basics.recipient', { placeholder: '你平时怎么称呼 TA？', max: 40 })}${field('你的署名', 'basics.sender', { placeholder: '信的最后，留下谁的名字？', max: 40 })}</div><div class="field-spacer"><span class="occasion-label">为什么准备这份惊喜？</span>${choices(['生日', '纪念日', '告白', '只是想送给你'], 'basics.occasion')}</div><div class="field-spacer">${field('送出的日子', 'basics.date', { type: 'date', max: 10, optional: true, help: '只作为内容记录，不会自动定时发送。' })}</div><div class="section-divider"></div>${heading('02', '相遇在游戏的第一页')}${field('开场标题', 'basics.title', { placeholder: '例如：藏在日常里的你' })}${field('一句开场白', 'basics.intro', { placeholder: '邀请对方打开这份心意。', max: 180, rows: 2, optional: true })}</div><div class="help-strip"><span aria-hidden="true">✳</span><p><strong>不用急着把所有东西准备好</strong>接下来会陪你收集六段回忆，再写一封信。照片和日期都可以稍后补。</p></div>`;
}
function renderMemories() {
  const item = draft.memories[memory];
  return `<div class="memory-tabs" aria-label="选择回忆">${draft.memories.map((m, i) => `<button class="memory-tab ${m.title.trim() && m.body.trim() ? 'is-done' : ''}" data-action="memory" data-index="${i}" aria-label="编辑回忆 ${i + 1}：${CHAPTERS[i]}" aria-pressed="${i === memory}"><span>${m.title.trim() && m.body.trim() ? '✓' : `0${i + 1}`}</span><small>${CHAPTERS[i]}</small></button>`).join('')}</div><div class="form-panel">${heading(`0${memory + 1}`, CHAPTERS[memory], memory < 2 ? '第一盒解锁' : memory < 4 ? '第二盒解锁' : '礼物关解锁')}<p class="writing-prompt"><span>想一想，那时候</span>${PROMPTS[memory]}</p>${upload()}${field('图片描述', `memories.${memory}.alt`, { max: 180, placeholder: '用一句话描述照片，方便无法看图的人理解。' })}${field('给这一刻起个名字', `memories.${memory}.title`, { placeholder: SAMPLE_TITLES[memory] })}${field('时间或一句时间描述', `memories.${memory}.date`, { max: 40, optional: true, placeholder: '例如：一个普通的星期三' })}${field('当时发生了什么？', `memories.${memory}.body`, { rows: 5, max: 1600, placeholder: '那天我们……\n最记得的一个细节是……\n现在想起来，我想对你说……', help: '写两三句话也很好。具体的小细节，比漂亮的大道理更动人。' })}<div class="memory-actions"><button class="text-button" data-action="memory-example">看看这一段的示例</button><button class="text-button" data-action="memory-next">${memory < 5 ? '下一段回忆 →' : '去写一封信 →'}</button></div></div>`;
}
function renderLetter() {
  return `<div class="form-panel">${heading('03', '写给最喜欢的玩家', '六段回忆之后出现')}<p class="writing-prompt"><span>可以从这里开始</span>如果只留下一句话，你最想让对方知道什么？</p><div class="prompt-buttons"><button data-action="letter-prompt" data-index="0">「原来那些普通的日子……」</button><button data-action="letter-prompt" data-index="1">「有一件事，一直想告诉你……」</button></div><p class="preview-recipient">亲爱的 ${e(draft.basics.recipient || '你')}：</p><div class="letter-paper">${field('想对 TA 说的话', 'letter', { max: 6000, rows: 10, placeholder: '把平时没说出口的话，慢慢写在这里。\n\n可以聊聊过去，也可以说说期待的以后。', help: '用空行分段，右侧会按信件的样子排版。' })}</div><p class="preview-signature">${e(draft.basics.sender || '你的署名')}</p><div class="memory-actions"><button class="text-button" data-action="letter-example">用示例信找找感觉</button><span class="inline-note">示例可以改，真心由你来写。</span></div></div>`;
}
function renderGift() {
  return `<div class="form-panel">${heading('04', '藏在最后的那份礼物', '最后一关通关后揭晓')}<span class="occasion-label">你准备了哪一种心意？</span>${choices(['实物礼物', '一起体验', '一个约定'], 'gift.type')}<div class="field-spacer">${field('礼物名称', 'gift.title', { max: 80, placeholder: ['一起体验', '一个约定'].includes(draft.gift.type) ? '例如：一整天的快乐，由你决定' : '例如：那件你念叨了很久的小礼物' })}</div>${field('揭晓时想说的话', 'gift.description', { rows: 3, max: 1600, placeholder: '为什么想送这份礼物？你希望对方感受到什么？' })}${upload(true)}${field('礼物图片描述', 'gift.imageAlt', { max: 180 })}<div class="section-divider"></div>${field('对方怎样领取？', 'gift.redemption', { max: 600, rows: 2, placeholder: '例如：打开书桌的第二层抽屉。\n或者：来找我，一起约定出发时间。', help: '给对方一个明确的下一步，惊喜才算真正送到。' })}${field('有效期或补充说明', 'gift.validity', { max: 80, optional: true, placeholder: '例如：一直有效' })}<label class="bonus-toggle"><input type="checkbox" data-field="gift.bonusEnabled" ${draft.gift.bonusEnabled ? 'checked' : ''}><span><strong>让小鹅再藏一份彩蛋</strong><small>可选 · 拆完礼物后，摸摸小鹅才会发现。</small></span></label>${draft.gift.bonusEnabled ? `${field('彩蛋名称', 'gift.bonusTitle', { max: 80, placeholder: '今晚的电影，你来选' })}${field('彩蛋说明', 'gift.bonusDescription', { max: 600, rows: 2, placeholder: '零食我准备，电影你决定。' })}` : ''}</div>`;
}
function renderReview() {
  const issues = issuesFor(draft);
  return `<div class="form-panel"><div class="review-summary"><span class="review-symbol">${issues.length ? '…' : '✓'}</span><div><h2>${issues.length ? '还有几处，值得补完整。' : '这份心意，准备好了。'}</h2><p>${issues.length ? `还有 ${issues.length} 项内容待补充，补齐后即可保存到游戏。` : '从第一句问候，到最后一份惊喜，都已经在这里。'}</p></div></div><div class="review-list">${STEP_NAMES.slice(0, 4).map((name, i) => { const count = issues.filter(issue => issue.step === i).length; return `<button class="review-row" data-action="step" data-step="${i}"><strong>0${i + 1}　${name}</strong><span class="${count ? 'needs-work' : ''}">${count ? `${count} 项待补充` : '已准备好'}　→</span></button>`; }).join('')}</div>${issues.length ? `<ul class="missing-list">${issues.map(issue => `<li><button data-action="issue" data-step="${issue.step}" data-memory="${issue.memory ?? ''}">${e(issue.label)} →</button></li>`).join('')}</ul>` : '<p class="inline-note">建议再预览一次，确认昵称、照片和礼物领取方式都正确。</p>'}<div class="export-note"><strong>确认后，保存这份心意到游戏</strong><p>「保存到游戏」会更新所有玩家打开游戏时读取的内容。草稿自动保存仅用于本地续写，不会改变游戏；导出的 JSON 仍可用于备份。</p></div><div class="review-actions"><button class="button" data-action="preview">从头预览整份心意 ↗</button><button class="button" data-action="export">导出草稿备份 ↓</button><button class="text-button" data-action="load-published">载入游戏当前内容</button></div></div>`;
}
function refreshSummary() {
  const issues = issuesFor(draft);
  const done = Array.from({ length: 4 }, (_, i) => !issues.some(issue => issue.step === i));
  $('#steps').innerHTML = STEP_NAMES.map((name, i) => `<button class="step-button ${done[i] ? 'is-done' : ''}" data-action="step" data-step="${i}" ${i === step ? 'aria-current="step"' : ''}><span class="step-number">${done[i] ? '✓' : `0${i + 1}`}</span><span><strong>${name}</strong><small>${STEP_NOTES[i]}</small></span></button>`).join('');
  const count = done.filter(Boolean).length;
  $('#completion').textContent = `${count} / 4`;
  $('#progress').style.width = `${count * 25}%`;
  $('#draft-name').textContent = draft.basics.recipient ? `给 ${draft.basics.recipient} 的心意` : '未命名的心意';
  $('#next').innerHTML = step === 4 ? `保存到游戏 <span aria-hidden="true">✓</span>` : `下一步：${STEP_NAMES[step + 1]} <span aria-hidden="true">→</span>`;
}
function renderEditor() {
  $('#page-title').textContent = TITLES[step];
  $('#page-subtitle').textContent = SUBTITLES[step];
  $('#step-kicker').textContent = `MAKE SOMETHING PERSONAL · 0${step + 1} / 05`;
  $('#editor').innerHTML = [renderBasics, renderMemories, renderLetter, renderGift, renderReview][step]();
  $('#back').hidden = step === 0;
  refreshSummary(); renderPreview();
}
function go(nextStep, nextMemory) {
  step = nextStep;
  if (nextMemory !== undefined) memory = nextMemory;
  renderEditor();
  $('#editor').focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'instant' });
}
function previewMarkup(page) {
  const b = draft.basics, gift = draft.gift;
  const brand = '<div class="preview-brand"><span>✳</span> 拾光小盒</div>';
  if (page === 0) return `${brand}<p class="eyebrow">A LITTLE GAME, JUST FOR YOU</p><p class="preview-recipient">给 ${e(b.recipient || '最喜欢的你')}</p><h2>${e(b.title || '你的开场标题')}</h2><p class="preview-intro">${e(b.intro || '把想说的话，藏进一个小小的游戏。')}</p><img class="preview-art cover-art" src="content/memory-02.svg" alt="一束花的插画"><span class="preview-cta">打开第一个盒子 →</span><p class="preview-bottom">不计时 · 不着急 · 随时可以回来</p>`;
  if (page >= 1 && page <= 6) {
    const i = page - 1, m = draft.memories[i];
    return `${brand}<p class="eyebrow">MEMORY 0${page} / 06 · ${CHAPTERS[i]}</p><img class="preview-art" src="${e(m.photo)}" alt="${e(m.alt)}"><p class="preview-date">${e(m.date || '属于你们的某一天')}</p><h2>${e(m.title || '这一刻的名字')}</h2><div class="preview-body ${m.body ? '' : 'empty-copy'}">${e(m.body || '这里会出现你写下的故事。\n不用很长，只要是你们的，就很好。')}</div><span class="preview-cta">收好这一页回忆</span>`;
  }
  if (page === 7) return `${brand}<p class="eyebrow">SIX MEMORIES. ONE LITTLE LETTER.</p><h2>这些小事，我都记得。</h2><div class="preview-letter"><p>亲爱的 ${e(b.recipient || '你')}：</p>${draft.letter ? draft.letter.split(/\n\s*\n/).map(line => `<p>${e(line)}</p>`).join('') : '<p class="empty-copy">这里会出现你写给对方的信。<br>一段回忆，一句感谢，再加上一个想一起完成的以后。</p>'}</div><p class="preview-signature">${e(b.sender || '你的署名')}</p><span class="preview-cta">还有一件，想交给你</span>`;
  return `${brand}<p class="eyebrow">A LITTLE SOMETHING FOR YOU</p><h2>这份小心意，送给你。</h2><img class="preview-art" src="${e(gift.image)}" alt="${e(gift.imageAlt)}"><h2>${e(gift.title || '最后的惊喜')}</h2><p class="preview-body">${e(gift.description || '你准备的礼物，会在这里揭晓。')}</p><div class="preview-redemption"><strong>这样领取这份心意</strong>${e(gift.redemption || '在左侧告诉对方，接下来怎么找到礼物。')}${gift.validity ? `<p class="preview-bottom">${e(gift.validity)}</p>` : ''}</div>${gift.bonusEnabled ? `<div class="preview-bonus"><strong>小鹅还藏着：${e(gift.bonusTitle || '一份小彩蛋')}</strong><p>${e(gift.bonusDescription)}</p></div>` : ''}`;
}
function renderPreview() {
  const page = [0, memory + 1, 7, 8, reviewPreview][step];
  $('#live-preview').innerHTML = (step === 4 ? `<div class="review-tabs" aria-label="预览内容">${['开场', '回忆', '信件', '礼物'].map((name, i) => `<button data-action="review-preview" data-page="${[0, 1, 7, 8][i]}" aria-pressed="${reviewPreview === [0, 1, 7, 8][i]}">${name}</button>`).join('')}</div>` : '') + previewMarkup(page);
}
function renderFullPreview() {
  $('#full-preview').innerHTML = previewMarkup(previewPage);
  $('#preview-page').textContent = `${previewPage + 1} / 9`;
  $('#preview-prev').disabled = previewPage === 0;
  $('#preview-next').textContent = previewPage === 8 ? '看完啦 ✓' : '下一页 →';
  $('#preview-dialog').scrollTop = 0;
}
function confirmReplace(title, copy) {
  return new Promise(resolve => {
    const dialog = $('#confirm-dialog');
    if (dialog.open) { resolve(false); return; }
    $('#confirm-title').textContent = title;
    $('#confirm-copy').textContent = copy;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true });
    dialog.showModal();
  });
}
function downloadDraft() {
  try {
    parseDraft(JSON.stringify(draft));
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'memory-arcade-draft.json';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    notify('已发起下载，JSON 包含文字与所选图片；导出不会修改游戏内容。');
  } catch (error) { notify(`无法导出：${error.message}`); }
}

document.addEventListener('input', event => {
  const input = event.target.closest('[data-field]');
  if (!input || !authenticated) return;
  setValue(input.dataset.field, input.type === 'checkbox' ? input.checked : input.value);
  const count = document.querySelector(`[data-count="${input.dataset.field}"]`);
  if (count) count.textContent = `${input.value.length} / ${input.maxLength}`;
  changed();
  if (input.type === 'checkbox') { renderEditor(); document.querySelector('[data-field="gift.bonusEnabled"]').focus(); }
  if (step === 1) {
    document.querySelectorAll('.memory-tab').forEach((tab, i) => {
      const complete = draft.memories[i].title.trim() && draft.memories[i].body.trim();
      tab.classList.toggle('is-done', Boolean(complete));
      tab.querySelector('span').textContent = complete ? '✓' : `0${i + 1}`;
    });
  }
});
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button || !authenticated) return;
  const data = button.dataset;
  switch (data.action) {
    case 'step': go(Number(data.step)); break;
    case 'next': if (step === 4) await publishContent(); else go(step + 1); break;
    case 'export': downloadDraft(); break;
    case 'load-published': await loadPublishedIntoEditor(); break;
    case 'logout': await logout(); break;
    case 'back': go(Math.max(0, step - 1)); break;
    case 'choice': setValue(data.path, data.value); changed(); renderEditor(); break;
    case 'memory': go(1, Number(data.index)); break;
    case 'memory-next': memory < 5 ? go(1, memory + 1) : go(2); break;
    case 'issue': go(Number(data.step), data.memory === '' ? undefined : Number(data.memory)); break;
    case 'review-preview': reviewPreview = Number(data.page); renderPreview(); break;
    case 'preview':
    case 'preview-current': previewPage = data.action === 'preview' ? 0 : [0, memory + 1, 7, 8, reviewPreview][step]; renderFullPreview(); $('#preview-dialog').showModal(); break;
    case 'close-preview': $('#preview-dialog').close(); break;
    case 'preview-prev': previewPage = Math.max(0, previewPage - 1); renderFullPreview(); break;
    case 'preview-next': if (previewPage === 8) $('#preview-dialog').close(); else { previewPage += 1; renderFullPreview(); } break;
    case 'sample':
      if (await confirmReplace('载入一份填写示例？', '这是一组虚构故事，用来体验填写流程。它会替换当前全部草稿；需要保留时，请先到「检查预览」导出。')) {
        draft = sampleDraft(); changed(); renderEditor(); notify('已载入虚构示例，可以把每一处改成你们的故事。');
      }
      break;
    case 'memory-example': {
      const current = draft.memories[memory];
      if ((!current.title.trim() && !current.body.trim()) || await confirmReplace('替换这一段的文字？', '仅替换当前回忆的标题和正文，图片、时间及其他回忆会保留。')) {
        current.title = SAMPLE_TITLES[memory]; current.body = SAMPLE_BODIES[memory]; changed(); renderEditor();
      }
      break;
    }
    case 'letter-example':
      if (!draft.letter.trim() || await confirmReplace('用示例信替换当前文字？', '现有信件会被替换，其他内容不变。')) { draft.letter = LETTER_SAMPLE; changed(); renderEditor(); }
      break;
    case 'letter-prompt': {
      const line = ['原来那些普通的日子，因为有你，变得舍不得忘记。', '有一件事，一直想告诉你：'][Number(data.index)];
      if (draft.letter.length + line.length + 2 > 6000) { notify('信件已达到字数上限，请先精简一些文字。'); break; }
      draft.letter += `${draft.letter ? '\n\n' : ''}${line}`; changed(); renderEditor(); $('[data-field="letter"]').focus(); break;
    }
    case 'photo':
      if (writingPhoto) { notify('图片正在读取，请稍候。'); break; }
      photoTarget = data.target; $('#photo-file').value = ''; $('#photo-file').click(); break;
    case 'remove-photo':
      if (await confirmReplace('恢复默认插画？', '这张已选图片会从草稿中移除。其他内容会保留。')) {
        const defaults = createDraft();
        if (data.target === 'gift') { draft.gift.image = defaults.gift.image; draft.gift.imageAlt = defaults.gift.imageAlt; }
        else { const index = Number(data.target); draft.memories[index].photo = defaults.memories[index].photo; draft.memories[index].alt = defaults.memories[index].alt; }
        changed(); renderEditor();
      }
      break;
    case 'import': $('#import-file').value = ''; $('#import-file').click(); break;
  }
});
$('#photo-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file || !authenticated) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) { notify('请选择不超过 3 MB 的 JPG、PNG 或 WebP 图片。'); return; }
  const target = photoTarget;
  const targetDraft = draft;
  writingPhoto = true;
  try {
    const value = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const img = new Image(); img.src = value; await img.decode();
    if (!authenticated) return;
    if (draft !== targetDraft) { notify('草稿已切换，请重新选择图片。'); return; }
    if (target === 'gift') { draft.gift.image = value; draft.gift.imageAlt = ''; }
    else { draft.memories[Number(target)].photo = value; draft.memories[Number(target)].alt = ''; }
    changed(); renderEditor(); notify('图片已加入草稿，请补一句图片描述。');
  } catch { notify('无法读取这张图片，请换一个文件。'); }
  finally { writingPhoto = false; }
});
$('#import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file || !authenticated) return;
  if (file.size > 32 * 1024 * 1024) { notify('配置文件超过 32 MB，无法导入。'); return; }
  try {
    const incoming = parseDraft(await file.text());
    if (!authenticated) return;
    if (await confirmReplace('导入并替换当前草稿？', '确认后将使用文件中的文字和图片。当前草稿会被替换；还未备份时可以先取消。')) {
      draft = incoming; changed(); go(0); notify('草稿已导入，可以继续编辑。');
    }
  } catch (error) { notify(error.message); }
});
window.addEventListener('beforeunload', event => {
  if (revision > savedRevision || writingPhoto) { event.preventDefault(); event.returnValue = ''; }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

async function requestApi(path, options = {}) {
  let response;
  try {
    response = await fetch(new URL(`api/${path}`, window.location.href), { credentials: 'same-origin', cache: 'no-store', signal: AbortSignal.timeout(15000), ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  } catch (error) { throw new Error(error.name === 'TimeoutError' ? '请求超时，请检查网络后重试。' : '无法连接管理服务，请检查网络后重试。'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('此站点尚未启动管理服务，请使用 Node 服务部署后再登录。');
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== 'admin/session') lockEditor('登录已过期，请重新输入管理员密钥。');
    throw new Error(result.error || '操作失败，请稍后重试。');
  }
  return result;
}
function lockEditor(message = '请输入管理员密钥。') {
  authenticated = false;
  document.body.classList.add('admin-locked');
  $('#auth-message').textContent = message;
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  $('#admin-key').value = '';
}
async function enterEditor() {
  authenticated = true;
  document.body.classList.remove('admin-locked');
  $('#admin-key').value = '';
  if (editorInitialized) { renderEditor(); return; }
  editorInitialized = true;
  $('.workspace').inert = true;
  $('.sidebar').inert = true;
  let stored;
  try {
    db = await openDatabase();
    stored = await readStoredDraft();
    if (stored) draft = parseDraft(JSON.stringify(stored));
    setSave(stored ? '已恢复本地草稿' : '编辑后将自动保存本地草稿');
    db.onversionchange = () => { db.close(); db = null; setSave('存储已更新，请导出备份', true); };
  } catch (error) {
    setSave('草稿读取失败，请保留备份', true);
    notify(error.message || '草稿读取失败，原存档未被清除。');
  }
  if (!stored) {
    try {
      const published = await requestApi('content');
      if (published.content) draft = parseDraft(JSON.stringify(published.content));
    } catch (error) { notify(`游戏内容读取失败：${error.message}`); }
  }
  renderEditor();
  $('.workspace').inert = false;
  $('.sidebar').inert = false;
}
async function publishContent() {
  if (publishing) return;
  const missing = issuesFor(draft);
  if (missing.length) { renderEditor(); notify(`请先补齐 ${missing.length} 项内容，页面已列出需要修改的位置。`); return; }
  if (writingPhoto) { notify('请等待图片读取完成。'); return; }
  if (!await confirmReplace('保存这份心意到游戏？', '将替换所有玩家打开游戏时读取的内容，包括故事、信件和礼物。已打开的游戏刷新后生效，闯关进度不会被清空。')) return;
  publishing = true;
  $('#next').disabled = true;
  $('#publish-status').textContent = '正在保存到游戏…';
  try {
    const snapshot = parseDraft(JSON.stringify(draft));
    await requestApi('content', { method: 'PUT', body: JSON.stringify(snapshot) });
    $('#publish-status').textContent = '已保存到游戏。打开或刷新游戏即可看到新内容。';
    $('#footer-hint').textContent = '已保存到游戏；继续编辑仍需再次保存';
    notify('内容已保存到游戏，玩家刷新后即可看到。');
  } catch (error) { $('#publish-status').textContent = `保存未完成：${error.message}`; notify(error.message); }
  finally { publishing = false; $('#next').disabled = false; }
}
async function loadPublishedIntoEditor() {
  try {
    const result = await requestApi('content');
    if (!result.content) { notify('游戏尚未保存自定义内容，当前使用内置示例。'); return; }
    const incoming = parseDraft(JSON.stringify(result.content));
    if (await confirmReplace('载入游戏当前内容？', '这会替换本地编辑草稿，游戏中的内容不会改变。建议先导出未保存的草稿。')) { draft = incoming; changed(); go(0); }
  } catch (error) { notify(error.message); }
}
async function logout() {
  try { await persist(); await requestApi('admin/session', { method: 'DELETE' }); lockEditor(revision === savedRevision ? '已退出管理，本地草稿已保留。' : '已退出管理。部分编辑尚未存入本地，请重新登录后导出备份。'); }
  catch (error) { notify(`退出未完成：${error.message}`); }
}
$('#admin-login').addEventListener('submit', async event => {
  event.preventDefault();
  $('#login-submit').disabled = true;
  $('#auth-message').textContent = '正在验证…';
  const key = $('#admin-key').value;
  $('#admin-key').value = '';
  try { await requestApi('admin/session', { method: 'POST', body: JSON.stringify({ key }) }); await enterEditor(); }
  catch (error) { $('#auth-message').textContent = error.message; }
  finally { $('#login-submit').disabled = false; }
});
try {
  const session = await requestApi('admin/session');
  if (session.authenticated) await enterEditor();
  else lockEditor();
} catch (error) { lockEditor(error.message); }
