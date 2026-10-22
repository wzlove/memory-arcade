import { describe, expect, it } from 'vitest';
import { createDraft, sampleDraft, issuesFor, parseDraft, escapeHTML } from '../../public/studio-model.js';

describe('content studio drafts', () => {
  it('keeps six stable memory IDs and points missing content to its editor', () => {
    const draft = createDraft();
    expect(new Set(draft.memories.map(m => m.id)).size).toBe(6);
    expect(issuesFor(draft)).toContainEqual({ label: '回忆 6：写下故事', step: 1, memory: 5 });
    expect(issuesFor(sampleDraft())).toEqual([]);
  });
  it('round-trips a portable draft, including an embedded image', () => {
    const draft = sampleDraft();
    draft.memories[0].photo = 'data:image/png;base64,aGVsbG8=';
    expect(parseDraft(JSON.stringify(draft))).toEqual(draft);
  });
  it('rejects unknown formats, missing memories, wrong IDs and malformed field types', () => {
    for (const mutate of [d => d.version = 2, d => d.memories.pop(), d => d.memories.reverse(), d => d.basics.recipient = {}, d => d.gift.bonusEnabled = 'true', d => d.letter = 'a'.repeat(6001)]) {
      const draft = sampleDraft(); mutate(draft);
      expect(() => parseDraft(JSON.stringify(draft))).toThrow();
    }
    expect(() => parseDraft('{')).toThrow();
  });
  it('rejects remote, script and SVG image URLs before rendering imported data', () => {
    for (const image of ['https://example.com/tracker.png', 'javascript:alert(1)', 'data:image/svg+xml;base64,PHN2Zz4=', 'content/../../private']) {
      const draft = sampleDraft(); draft.gift.image = image;
      expect(() => parseDraft(JSON.stringify(draft))).toThrow();
    }
  });
  it('checks optional bonus fields only when enabled', () => {
    const draft = sampleDraft();
    draft.gift.bonusTitle = ''; draft.gift.bonusDescription = '';
    expect(issuesFor(draft)).toHaveLength(2);
    draft.gift.bonusEnabled = false;
    expect(issuesFor(draft)).toEqual([]);
  });
  it('escapes user text in HTML and discards unexpected imported fields', () => {
    expect(escapeHTML('<img src=x onerror="bad()">&')).toBe('&lt;img src=x onerror=&quot;bad()&quot;&gt;&amp;');
    const draft = sampleDraft(); draft.basics.secret = 'drop';
    expect(parseDraft(JSON.stringify(draft)).basics.secret).toBeUndefined();
  });
});
