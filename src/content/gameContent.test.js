import { describe, it, expect, afterEach, vi } from 'vitest';
import { sampleDraft } from '../../public/studio-model.js';
import { toGameContent, DEFAULT_GAME_CONTENT, loadGameContent } from './gameContent.js';

afterEach(() => vi.unstubAllGlobals());

describe('published game content', () => {
  it('maps all editor fields into the game without losing gift instructions', () => {
    const draft = sampleDraft();
    draft.basics.title = '专属于你的生日';
    const content = toGameContent(draft, '/memory-arcade/');
    expect(content.recipient).toBe(draft.basics.recipient);
    expect(content.sender).toBe(draft.basics.sender);
    expect(content.title).toBe(draft.basics.title);
    expect(content.memories[0].photo).toBe('/memory-arcade/content/memory-01.svg');
    expect(content.memories.map(m => m.id)).toEqual(draft.memories.map(m => m.id));
    expect(content.letter).toHaveLength(3);
    expect(content.gift.redemption).toBe(draft.gift.redemption);
    expect(content.gift.validity).toBe(draft.gift.validity);
    expect(content.voucher.enabled).toBe(true);
  });
  it('preserves embedded images and respects disabled optional bonus', () => {
    const draft = sampleDraft();
    draft.memories[0].photo = 'data:image/png;base64,aGVsbG8=';
    draft.gift.bonusEnabled = false;
    const content = toGameContent(draft, '/');
    expect(content.memories[0].photo).toBe(draft.memories[0].photo);
    expect(content.voucher.enabled).toBe(false);
  });
  it('retains the original story when no shared content is configured', () => {
    expect(DEFAULT_GAME_CONTENT.memories).toHaveLength(6);
    expect(DEFAULT_GAME_CONTENT.letter.length).toBeGreaterThan(0);
    expect(DEFAULT_GAME_CONTENT.gift.title).toBeTruthy();
  });
  it('uses the demo on a static host or an unconfigured content service', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('<html>static fallback</html>', { headers: { 'Content-Type': 'text/html' } }))
      .mockResolvedValueOnce(Response.json({ content: null }));
    vi.stubGlobal('fetch', fetch);
    for (let i = 0; i < 3; i++) expect(await loadGameContent()).toBe(DEFAULT_GAME_CONTENT);
    expect(fetch).toHaveBeenCalledWith('/api/content', { cache: 'no-store', signal: expect.any(AbortSignal) });
  });
  it('does not replace a failed personalized request with a different story', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response('', { status: 500 })).mockRejectedValueOnce(new Error('offline')));
    await expect(loadGameContent()).rejects.toThrow('暂时无法读取');
    await expect(loadGameContent()).rejects.toThrow('offline');
  });
});
