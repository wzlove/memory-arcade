import { describe, expect, it } from 'vitest';
import { SCENES } from '../content/match.js';
import { createMatchGame, matchReducer, exposedItems, restoreMatchGame } from './MatchGame.js';

const act = (state, type, extra = {}) => matchReducer(state, { type, ...extra });
const dismiss = (state) => {
  while (state.pending.length) state = act(state, 'dismiss');
  return state;
};
const finalGame = () => {
  let state = act(createMatchGame(), 'start');
  for (let stage = 0; stage < 2; stage += 1) {
    for (let i = 0; i < SCENES[stage].items.length / 3; i += 1) state = dismiss(act(state, 'help'));
    state = act(state, 'next');
  }
  return state;
};

describe('keepsake matching', () => {
  it('has a playable solution for every curated board and reveals six memories before the gift', () => {
    let state = act(createMatchGame(), 'start');
    for (let stage = 0; stage < SCENES.length; stage += 1) {
      for (const group of SCENES[stage].solution) {
        for (const id of group) {
          expect(exposedItems(state).some((item) => item.id === id)).toBe(true);
          state = act(state, 'pick', { id });
          state = dismiss(state);
        }
        expect(state.tray.length).toBeLessThan(7);
        state = dismiss(state);
      }
      expect(state.phase).toBe('complete');
      expect(state.memories).toHaveLength((stage + 1) * 2);
      state = act(state, 'next');
    }
    expect(state.phase).toBe('letter');
    expect(act(state, 'gift').phase).toBe('gift');
  });

  it('ignores covered pieces, duplicate picks and premature ending actions', () => {
    const state = act(createMatchGame(), 'start');
    const hidden = SCENES[0].items.find((item) => !exposedItems(state).some((top) => top.id === item.id));
    expect(act(state, 'pick', { id: hidden.id })).toBe(state);
    expect(act(state, 'gift')).toBe(state);
    expect(act(state, 'next')).toBe(state);
    const id = exposedItems(state)[0].id;
    const picked = act(state, 'pick', { id });
    expect(act(picked, 'pick', { id })).toBe(picked);
  });

  it('resolves a triple in the seventh slot before blocking input', () => {
    const state = act(createMatchGame(), 'start');
    const [a, b, c] = SCENES[0].solution[0];
    const others = SCENES[0].items.filter((item) => item.kind !== SCENES[0].items.find((item) => item.id === a).kind).slice(0, 4).map((item) => item.id);
    const tray = [a, b, ...others];
    const prepared = { ...state, tray, remaining: state.remaining.filter((id) => !tray.includes(id)) };
    const result = act(prepared, 'pick', { id: c });
    expect(result.tray).toHaveLength(4);
    expect(result.cleared).toBe(1);
  });

  it('undo restores a matched triple without revoking already unlocked memories', () => {
    let state = act(createMatchGame(), 'start');
    for (const group of SCENES[0].solution.slice(0, 3)) {
      for (const id of group) state = act(state, 'pick', { id });
    }
    expect(state.pending).toEqual([0]);
    state = dismiss(state);
    const undone = act(state, 'undo');
    expect(undone.cleared).toBe(2);
    expect(undone.tray).toHaveLength(2);
    expect(undone.memories).toEqual([0]);
    const replay = act(undone, 'pick', { id: SCENES[0].solution[2][2] });
    expect(replay.pending).toEqual([]);
  });

  it('help remains unlimited in the first two boxes', () => {
    let state = act(createMatchGame(), 'start');
    state = act(state, 'pick', { id: exposedItems(state)[0].id });
    for (let stage = 0; stage < 2; stage += 1) {
      for (let i = 0; i < SCENES[stage].items.length / 3; i += 1) state = dismiss(act(state, 'help'));
      expect(state.phase).toBe('complete');
      expect(state.tray).toHaveLength(0);
      expect(state.remaining).toHaveLength(0);
      state = act(state, 'next');
    }
    expect(state.memories).toHaveLength(4);
  });

  it('preserves state and undo through reload, and safely rejects corrupted saves', () => {
    let state = act(createMatchGame(), 'start');
    state = act(state, 'pick', { id: exposedItems(state)[0].id });
    expect(restoreMatchGame(JSON.stringify(state))).toEqual(state);
    for (const value of ['bad json', 'null', '{}', JSON.stringify({ ...state, stage: 99 }), JSON.stringify({ ...state, remaining: ['bad-id'] }), JSON.stringify({ ...state, tray: [state.tray[0], state.tray[0]] }), JSON.stringify({ ...state, phase: 'gift' })]) {
      expect(restoreMatchGame(value)).toEqual(createMatchGame());
    }
  });

  it('retains discovered memories on a current-box retry', () => {
    let state = act(createMatchGame(), 'start');
    for (let i = 0; i < 3; i += 1) state = dismiss(act(state, 'help'));
    state = act(state, 'retry');
    expect(state.remaining).toHaveLength(18);
    expect(state.memories).toEqual([0]);
    expect(state.cleared).toBe(0);
  });

  it('stops picks at a full tray, then allows help and undo without losing objects', () => {
    let state = act(createMatchGame(), 'start');
    for (const [depth, slot] of [[0,0], [0,2], [1,0], [1,2], [2,0], [2,2], [0,1]]) {
      state = act(state, 'pick', { id: `little-things-${depth}-${slot}` });
    }
    expect(state.tray).toHaveLength(7);
    expect(restoreMatchGame(JSON.stringify(state))).toEqual(state);
    expect(act(state, 'pick', { id: exposedItems(state)[0].id })).toBe(state);
    const rescued = act(state, 'help');
    expect(rescued.tray.length).toBeLessThan(7);
    expect(rescued.cleared).toBe(1);
    expect(act(rescued, 'undo')).toEqual({ ...state, helpUsed: 1, undoUsed: 1 });
  });

  it('restores a pending memory before the player continues playing', () => {
    let state = act(createMatchGame(), 'start');
    for (let i = 0; i < 3; i += 1) state = act(state, 'help');
    const restored = restoreMatchGame(JSON.stringify(state));
    expect(restored.pending).toEqual([0]);
    expect(act(restored, 'help')).toBe(restored);
    expect(act(restored, 'pick', { id: exposedItems(restored)[0].id })).toBe(restored);
    expect(act(dismiss(restored), 'help').cleared).toBe(4);
  });

  it('requires planning in the gift box and limits assistance across undo and reload', () => {
    let state = finalGame();
    expect(state.remaining).toHaveLength(36);
    const top = exposedItems(state);
    expect(new Set(top.map(({ kind }) => kind)).size).toBeGreaterThanOrEqual(5);
    expect(SCENES[2].helpLimit).toBe(3);
    expect(SCENES[2].undoLimit).toBe(5);
    expect(new Set(SCENES[2].items.map(({ kind }) => kind)).size).toBe(6);
    for (let i = 0; i < 3; i += 1) state = act(state, 'help');
    expect(state.helpUsed).toBe(3);
    expect(act(state, 'help')).toBe(state);
    state = act(state, 'undo');
    expect(state.helpUsed).toBe(3);
    expect(state.undoUsed).toBe(1);
    state = restoreMatchGame(JSON.stringify(state));
    expect(act(state, 'help')).toBe(state);
    for (let i = 1; i < 5; i += 1) {
      state = act(state, 'pick', { id: exposedItems(state)[0].id });
      state = act(state, 'undo');
    }
    expect(state.undoUsed).toBe(5);
    state = act(state, 'pick', { id: exposedItems(state)[0].id });
    expect(act(state, 'undo')).toBe(state);
    expect(act(state, 'gift')).toBe(state);
    expect(act(state, 'next')).toBe(state);
    const retried = act(state, 'retry');
    expect(retried.remaining).toHaveLength(36);
    expect(retried.helpUsed).toBe(0);
    expect(retried.undoUsed).toBe(0);
    expect(retried.memories).toEqual([0, 1, 2, 3]);
  });

  it('lets a completed player replay only the gift challenge without losing memories', () => {
    let state = finalGame();
    for (const id of SCENES[2].solution.flat()) state = dismiss(act(state, 'pick', { id }));
    state = act(act(state, 'next'), 'gift');
    const replay = act(state, 'challenge');
    expect(replay.phase).toBe('playing');
    expect(replay.stage).toBe(2);
    expect(replay.remaining).toHaveLength(36);
    expect(replay.memories).toHaveLength(6);
    expect(act(replay, 'gift')).toBe(replay);
  });

  it('migrates old saves without erasing memories or relocking already opened gifts', () => {
    const early = { ...act(createMatchGame(), 'start'), version: 1 };
    delete early.helpUsed;
    delete early.undoUsed;
    expect(restoreMatchGame(JSON.stringify(early))).toEqual(act(createMatchGame(), 'start'));
    const oldFinal = { ...early, stage: 2, remaining: Array.from({ length: 36 }, (_, i) => `tomorrow-${Math.floor(i / 6)}-${i % 6}`), memories: [0,1,2,3] };
    const migrated = restoreMatchGame(JSON.stringify(oldFinal));
    expect(migrated.stage).toBe(2);
    expect(migrated.remaining).toHaveLength(36);
    expect(migrated.memories).toEqual([0,1,2,3]);
    const gift = restoreMatchGame(JSON.stringify({ ...oldFinal, phase: 'gift', remaining: [], cleared: 12, memories: [0,1,2,3,4,5] }));
    expect(gift.phase).toBe('gift');
    expect(gift.cleared).toBe(12);
    expect(restoreMatchGame(JSON.stringify(gift))).toEqual(gift);
  });

  it('rejects invalid assistance budgets in saved games', () => {
    const state = finalGame();
    for (const invalid of [{ helpUsed: -1 }, { helpUsed: 4 }, { undoUsed: 6 }, { undoUsed: 0.5 }]) {
      expect(restoreMatchGame(JSON.stringify({ ...state, ...invalid }))).toEqual(createMatchGame());
    }
  });
  it('upgrades the harder final box while preserving memories and completed gifts', () => {
    const old = { ...finalGame(), version: 2, helpUsed: 1, undoUsed: 2,
      remaining: Array.from({ length: 54 }, (_, i) => `gift-${i % 9}-${Math.floor(i / 9)}`), memories: [0,1,2,3,4] };
    const restored = restoreMatchGame(JSON.stringify(old));
    expect(restored.version).toBe(3);
    expect(restored.stage).toBe(2);
    expect(restored.phase).toBe('playing');
    expect(restored.remaining).toHaveLength(36);
    expect(restored.memories).toEqual(old.memories);
    expect(restored.helpUsed).toBe(0);
    expect(restored.undoUsed).toBe(0);
    const completed = restoreMatchGame(JSON.stringify({ ...old, remaining: [], cleared: 18, memories: [0,1,2,3,4,5], phase: 'gift' }));
    expect(completed.phase).toBe('gift');
    expect(completed.cleared).toBe(12);
    expect(restoreMatchGame(JSON.stringify(completed))).toEqual(completed);
  });

});
