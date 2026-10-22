import { FINALE, MEMORIES, REWARDS } from './story.js';

export const DEFAULT_GAME_CONTENT = {
  recipient: '最喜欢的玩家', sender: '送你这份心意的人', title: '藏在日常里的你',
  intro: '把零零散散的小东西，整理成值得收藏的时光。',
  memories: MEMORIES, letter: FINALE.letter, gift: REWARDS.gift,
  voucher: { ...REWARDS.voucher, enabled: true },
};

export function toGameContent(draft, basePath) {
  const asset = path => path.startsWith('data:') ? path : `${basePath}${path}`;
  return {
    recipient: draft.basics.recipient, sender: draft.basics.sender,
    title: draft.basics.title, intro: draft.basics.intro,
    memories: draft.memories.map((memory, index) => ({ ...MEMORIES[index], ...memory, photo: asset(memory.photo) })),
    letter: draft.letter.split(/\n\s*\n/).filter(line => line.trim()),
    gift: { title: draft.gift.title, description: draft.gift.description, image: asset(draft.gift.image),
      imageAlt: draft.gift.imageAlt, redemption: draft.gift.redemption, validity: draft.gift.validity,
      details: [draft.gift.type].filter(Boolean) },
    voucher: { enabled: draft.gift.bonusEnabled, revealTitle: draft.gift.bonusTitle, description: draft.gift.bonusDescription },
  };
}

export async function loadGameContent(signal) {
  const basePath = import.meta.env.BASE_URL;
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`${basePath}api/content`, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
  // Static hosting has no API: retain the bundled demo without suggesting admin saves work there.
  if (response.status === 404 || (response.ok && !response.headers.get('content-type')?.includes('application/json'))) return DEFAULT_GAME_CONTENT;
  if (!response.ok) throw new Error('暂时无法读取这份心意，请稍后重试。');
  const { content } = await response.json();
  if (content === null) return DEFAULT_GAME_CONTENT;
  const { parseDraft, issuesFor } = await import(/* @vite-ignore */ `${basePath}studio-model.js`);
  const draft = parseDraft(JSON.stringify(content));
  if (issuesFor(draft).length) throw new Error('已保存的内容不完整，请联系赠送者检查配置。');
  return toGameContent(draft, basePath);
}
