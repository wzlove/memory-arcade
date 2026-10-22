import { LEGACY_CHALLENGE_SCENE, LEGACY_FINAL_SCENE, SCENES } from '../content/match.js';

function board(stage) {
  return { stage, remaining: SCENES[stage].items.map(({ id }) => id), tray: [], cleared: 0, history: [], helpUsed: 0, undoUsed: 0 };
}

export function createMatchGame() {
  return { version: 3, ...board(0), phase: 'ready', memories: [], pending: [] };
}

export function exposedItems(state) {
  const remaining = SCENES[state.stage].items.filter(({ id }) => state.remaining.includes(id));
  return remaining.filter((item) => !remaining.some((above) => above.slot === item.slot && above.depth < item.depth));
}

function checkpoint(state) {
  return { remaining: state.remaining, tray: state.tray, cleared: state.cleared };
}

function settle(state) {
  const total = SCENES[state.stage].items.length / 3;
  const memories = [...state.memories];
  const pending = [...state.pending];
  [total / 2, total].forEach((threshold, index) => {
    const memory = state.stage * 2 + index;
    if (state.cleared >= threshold && !memories.includes(memory)) {
      memories.push(memory);
      pending.push(memory);
    }
  });
  return { ...state, memories, pending, phase: state.remaining.length === 0 && state.tray.length === 0 ? 'complete' : 'playing' };
}

export function matchReducer(state, action) {
  if (action.type === 'restart') return createMatchGame();
  if (action.type === 'start' && state.phase === 'ready') return { ...state, phase: 'playing' };
  if (action.type === 'dismiss' && state.pending.length) return { ...state, pending: state.pending.slice(1) };
  if (state.pending.length) return state;
  if (action.type === 'next' && state.phase === 'complete') {
    return state.stage === SCENES.length - 1
      ? { ...state, phase: 'letter', history: [] }
      : { ...state, ...board(state.stage + 1), phase: 'playing' };
  }
  if (action.type === 'gift' && state.phase === 'letter') return { ...state, phase: 'gift' };
  if (action.type === 'challenge' && ['letter', 'gift'].includes(state.phase)) {
    return { ...state, ...board(2), phase: 'playing', pending: [] };
  }
  if (state.phase !== 'playing') return state;
  if (action.type === 'retry') return { ...state, ...board(state.stage) };
  if (action.type === 'undo' && state.history.length) {
    if (state.undoUsed >= SCENES[state.stage].undoLimit) return state;
    return { ...state, ...state.history.at(-1), history: state.history.slice(0, -1), undoUsed: state.undoUsed + 1 };
  }
  const items = SCENES[state.stage].items;
  const kindOf = (id) => items.find((item) => item.id === id)?.kind;
  if (action.type === 'pick') {
    if (state.tray.length >= 7 || !exposedItems(state).some(({ id }) => id === action.id)) return state;
    let tray = [...state.tray, action.id];
    const kind = kindOf(action.id);
    const matched = tray.filter((id) => kindOf(id) === kind).length === 3;
    if (matched) tray = tray.filter((id) => kindOf(id) !== kind);
    // Keep matching keepsakes together without changing their board identities.
    tray.sort((a, b) => kindOf(a).localeCompare(kindOf(b)));
    return settle({ ...state, remaining: state.remaining.filter((id) => id !== action.id), tray,
      cleared: state.cleared + Number(matched), history: [...state.history, checkpoint(state)] });
  }
  if (action.type === 'help') {
    if (state.helpUsed >= SCENES[state.stage].helpLimit) return state;
    const available = [...state.tray, ...state.remaining];
    const kind = kindOf(available[0]);
    const group = available.filter((id) => kindOf(id) === kind).slice(0, 3);
    if (group.length !== 3) return state;
    return settle({ ...state, remaining: state.remaining.filter((id) => !group.includes(id)),
      tray: state.tray.filter((id) => !group.includes(id)), cleared: state.cleared + 1,
      history: [...state.history, checkpoint(state)], helpUsed: state.helpUsed + 1 });
  }
  return state;
}

export function restoreMatchGame(raw) {
  try {
    const state = JSON.parse(raw);
    if (!state || ![1, 2, 3].includes(state.version) || !Number.isInteger(state.stage) || !SCENES[state.stage]) throw new Error('Invalid version or stage');
    const legacyFinal = state.version < 3 && state.stage === 2;
    const savedScene = legacyFinal ? (state.version === 1 ? LEGACY_FINAL_SCENE : LEGACY_CHALLENGE_SCENE) : SCENES[state.stage];
    const items = savedScene.items;
    const helpUsed = state.version === 1 ? 0 : state.helpUsed;
    const undoUsed = state.version === 1 ? 0 : state.undoUsed;
    if (![helpUsed, undoUsed].every((n) => Number.isSafeInteger(n) && n >= 0)
      || helpUsed > savedScene.helpLimit || undoUsed > savedScene.undoLimit) throw new Error('Invalid assistance');
    const validBoard = (value) => {
      if (!value || !Array.isArray(value.remaining) || !Array.isArray(value.tray) || value.tray.length > 7 || !Number.isInteger(value.cleared)) return false;
      const ids = [...value.remaining, ...value.tray];
      if (new Set(ids).size !== ids.length || ids.some((id) => !items.some((item) => item.id === id))) return false;
      if (value.cleared !== (items.length - ids.length) / 3) return false;
      return [...new Set(items.map(({ kind }) => kind))].every((kind) => {
        const hasKind = (id) => items.find((item) => item.id === id).kind === kind;
        return ids.filter(hasKind).length % 3 === 0 && value.tray.filter(hasKind).length < 3;
      });
    };
    if (!validBoard(state) || !Array.isArray(state.history) || state.history.length > items.length || !state.history.every(validBoard)) throw new Error('Invalid board');
    if (!Array.isArray(state.memories) || new Set(state.memories).size !== state.memories.length || state.memories.some((n) => !Number.isInteger(n) || n < 0 || n > state.stage * 2 + 1)) throw new Error('Invalid memories');
    if (!Array.isArray(state.pending) || new Set(state.pending).size !== state.pending.length || state.pending.some((n) => !state.memories.includes(n) || n < state.stage * 2)) throw new Error('Invalid reveal');
    for (let n = 0; n < state.stage * 2; n += 1) if (!state.memories.includes(n)) throw new Error('Missing chapter');
    if (!['ready', 'playing', 'complete', 'letter', 'gift'].includes(state.phase)) throw new Error('Invalid phase');
    const empty = state.remaining.length + state.tray.length === 0;
    if (['complete', 'letter', 'gift'].includes(state.phase) && (!empty || state.memories.length !== (state.stage + 1) * 2)) throw new Error('Incomplete board');
    if (['letter', 'gift'].includes(state.phase) && (state.stage !== 2 || state.pending.length)) throw new Error('Locked ending');
    if (state.phase === 'playing' && empty) throw new Error('Finished board');
    if (state.phase === 'ready' && (state.stage !== 0 || state.cleared || state.tray.length || state.memories.length || state.history.length)) throw new Error('Invalid intro');
    if (legacyFinal) {
      const finished = ['letter', 'gift'].includes(state.phase);
      return { version: 3, ...board(2), memories: state.memories, pending: [],
        ...(finished ? { remaining: [], cleared: SCENES[2].items.length / 3, phase: state.phase } : { phase: 'playing' }) };
    }
    return { version: 3, stage: state.stage, remaining: state.remaining, tray: state.tray, cleared: state.cleared, helpUsed, undoUsed,
      history: state.history.map(checkpoint), phase: state.phase, memories: state.memories, pending: state.pending };
  } catch {
    return createMatchGame();
  }
}
