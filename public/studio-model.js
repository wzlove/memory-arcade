export const FORMAT = 'memory-arcade-studio';
export const DRAFT_KEY = 'content-draft';
export const IDS = ['first-page', 'small-things', 'blue-hour', 'unexpected', 'ordinary-days', 'next-level'];
export const CHAPTERS = ['故事开始', '闪光小事', '蓝色时刻', '计划之外', '普通日子', '下一关'];
export const PROMPTS = ['你们第一次一起做了什么？那个场景里，有什么小细节一直记得？', '有没有一件很小的事，让你觉得被认真放在心上？', '一起去过哪里？那天的天气、声音或味道是什么样的？', '有没有一个计划之外的瞬间，现在想起来还会笑？', '一个很普通的周末，你们是怎么一起度过的？', '接下来，最想和对方一起完成哪件小事？'];
export const SAMPLE_TITLES = ['说好只喝一口的', '一朵花就很开心', '坐到终点的那班车', '拍糊了，也舍不得删', '什么都没做的周末', '下一页，留给我们'];
export const SAMPLE_BODIES = ['那天下午，你说只尝一口我的奶茶。后来整杯都到了你手里。我记住的不是没喝到的奶茶，是你得逞时笑起来的样子。', '路过花店时，你停下来看了好久。那天没有节日，只是觉得，普通的星期三，也可以送你一朵花。', '我们聊得太投入，错过了原本要下的站。于是干脆坐到终点，在一个不认识的地方吃了晚饭。', '本来想拍一张认真的合照，你忽然笑了，我的手也跟着抖了一下。那张照片没有对上焦，却是那天我最喜欢的一张。', '一人一边的沙发，听了很多遍的歌，分着吃的橘子。我们没有去很远的地方，却一起度过了一个很好的下午。', '还有好多想一起去的地方，想一起尝的味道，想一起度过的普通日子。下一页，等我们慢慢写。'];
export const LETTER_SAMPLE = '整理这些小东西的时候，我才发现，原来好多普通的日子，都因为有你，变得舍不得忘记。\n\n半杯奶茶，一张车票，一张没拍好的照片。它们看起来没有什么特别，却刚好装得下我们一起走过的时光。\n\n所以做了这个小小的游戏，想把这些日子再交到你手里。还有一份小礼物，和一些想和你一起完成的以后。';
export function createDraft() {
  return { format: FORMAT, version: 1, basics: { recipient: '', sender: '', occasion: '生日', date: '', title: '藏在日常里的你', intro: '把零零散散的小东西，整理成值得收藏的时光。' }, memories: IDS.map((id, i) => ({ id, title: '', date: '', body: '', photo: `content/memory-0${i + 1}.svg`, alt: `${CHAPTERS[i]}的示例插画` })), letter: '', gift: { type: '实物礼物', title: '', description: '', image: 'content/reward.svg', imageAlt: '系着蝴蝶结的惊喜礼盒', redemption: '', validity: '', bonusEnabled: false, bonusTitle: '', bonusDescription: '' } };
}
export function sampleDraft() {
  const draft = createDraft();
  Object.assign(draft.basics, { recipient: '小满', sender: '阿禾', occasion: '生日' });
  draft.memories.forEach((m, i) => Object.assign(m, { title: SAMPLE_TITLES[i], body: SAMPLE_BODIES[i], date: ['初次见面的午后', '一个普通的星期三', '一起出发的那天', '没对上焦的瞬间', '不出门的周末', '未来的每一天'][i] }));
  draft.letter = LETTER_SAMPLE;
  Object.assign(draft.gift, { type: '一起体验', title: '一整天的快乐，由你决定', description: '留出一天，不赶路，不看时间。一起吃饭、散步，做那些一直说「下次一起」的小事。', redemption: '通关后，来找我约定出发的时间。', validity: '一直有效', bonusEnabled: true, bonusTitle: '今晚的电影，你来选', bonusDescription: '零食我准备，电影你决定，一起把今晚过得慢一点。' });
  return draft;
}
export function issuesFor(draft) {
  const issues = [];
  const required = (value, label, step, memory = null) => { if (!value.trim()) issues.push({ label, step, memory }); };
  required(draft.basics.recipient, '填写对方的昵称', 0);
  required(draft.basics.sender, '留下你的署名', 0);
  required(draft.basics.title, '给这份心意起个标题', 0);
  draft.memories.forEach((m, i) => {
    required(m.title, `回忆 ${i + 1}：补充标题`, 1, i);
    required(m.body, `回忆 ${i + 1}：写下故事`, 1, i);
    required(m.alt, `回忆 ${i + 1}：描述图片`, 1, i);
  });
  required(draft.letter, '写一封通关后的信', 2);
  required(draft.gift.title, '填写礼物名称', 3);
  required(draft.gift.description, '写下礼物说明', 3);
  required(draft.gift.redemption, '告诉对方如何领取礼物', 3);
  required(draft.gift.imageAlt, '描述礼物图片', 3);
  if (draft.gift.bonusEnabled) {
    required(draft.gift.bonusTitle, '填写小鹅彩蛋的名称', 3);
    required(draft.gift.bonusDescription, '补充小鹅彩蛋说明', 3);
  }
  return issues;
}
export function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function validImage(value, fallback) {
  return value === fallback || (value.length <= 4194400 && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value));
}
export function parseDraft(raw) {
  if (typeof raw !== 'string' || raw.length > 32 * 1024 * 1024) throw new Error('配置文件过大，请使用本工作室导出的 JSON。');
  let incoming;
  try { incoming = JSON.parse(raw); } catch { throw new Error('无法读取 JSON，请检查文件是否完整。'); }
  if (!incoming || incoming.format !== FORMAT || incoming.version !== 1) throw new Error('这不是支持的拾光小盒草稿（版本 1）。');
  const draft = createDraft();
  const copy = (target, source, limits) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('配置内容缺少必要字段。');
    for (const [key, limit] of Object.entries(limits)) {
      if (typeof source[key] !== 'string' || source[key].length > limit) throw new Error(`字段 ${key} 的类型或长度不正确。`);
      target[key] = source[key];
    }
  };
  copy(draft.basics, incoming.basics, { recipient: 40, sender: 40, occasion: 20, date: 10, title: 60, intro: 180 });
  if (!['生日', '纪念日', '告白', '只是想送给你'].includes(draft.basics.occasion)) throw new Error('不支持的赠送场景。');
  if (draft.basics.date && !/^\d{4}-\d{2}-\d{2}$/.test(draft.basics.date)) throw new Error('日期格式不正确。');
  if (!Array.isArray(incoming.memories) || incoming.memories.length !== 6) throw new Error('请保留完整的六段回忆。');
  incoming.memories.forEach((memory, i) => {
    if (!memory || memory.id !== IDS[i]) throw new Error('回忆顺序或 ID 不正确。');
    copy(draft.memories[i], memory, { title: 60, date: 40, body: 1600, alt: 180 });
    if (typeof memory.photo !== 'string' || !validImage(memory.photo, draft.memories[i].photo)) throw new Error('回忆图片必须为内置插画或内嵌的 JPG、PNG、WebP。');
    draft.memories[i].photo = memory.photo;
  });
  copy(draft, incoming, { letter: 6000 });
  copy(draft.gift, incoming.gift, { type: 20, title: 80, description: 1600, imageAlt: 180, redemption: 600, validity: 80, bonusTitle: 80, bonusDescription: 600 });
  if (!['实物礼物', '一起体验', '一个约定'].includes(draft.gift.type)) throw new Error('不支持的礼物类型。');
  if (typeof incoming.gift.bonusEnabled !== 'boolean' || typeof incoming.gift.image !== 'string' || !validImage(incoming.gift.image, draft.gift.image)) throw new Error('礼物图片或彩蛋配置不正确。');
  draft.gift.bonusEnabled = incoming.gift.bonusEnabled;
  draft.gift.image = incoming.gift.image;
  return draft;
}
