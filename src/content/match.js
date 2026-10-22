export const KEEPSAKES = {
  tea: { label: '那杯奶茶', color: '#ead6bc' },
  flower: { label: '一小束花', color: '#e9d8cf' },
  camera: { label: '旧相机', color: '#d8e2d6' },
  ticket: { label: '双人车票', color: '#e2dec9' },
  goose: { label: '小鹅摆件', color: '#ece6cf' },
  orange: { label: '甜橘子', color: '#f0ddbe' },
  record: { label: '喜欢的唱片', color: '#dcd9e4' },
  cake: { label: '小蛋糕', color: '#ecd7d4' },
  letter: { label: '手写信', color: '#e5decd' },
};

function scene(id, title, subtitle, note, pairs) {
  const items = [];
  const solution = [];
  pairs.forEach(([left, right], depth) => {
    const groups = [[], []];
    [left, right, left, right, right, left].forEach((kind, slot) => {
      const item = { id: `${id}-${depth}-${slot}`, kind, slot, depth };
      items.push(item);
      groups[kind === left ? 0 : 1].push(item.id);
    });
    solution.push(...groups);
  });
  return { id, title, subtitle, note, items, solution, helpLimit: Infinity, undoLimit: Infinity };
}

// Retained only to validate and migrate saves from the original demo.
export const LEGACY_FINAL_SCENE = scene('tomorrow', '', '', '', [['cake', 'letter'], ['goose', 'flower'], ['tea', 'record'], ['ticket', 'cake'], ['letter', 'orange'], ['camera', 'flower']]);

function giftScene() {
  const stacks = [
    ['goose', 'orange', 'ticket', 'ticket', 'record', 'record', 'camera', 'record', 'flower'],
    ['tea', 'ticket', 'camera', 'ticket', 'ticket', 'record', 'camera', 'letter', 'tea'],
    ['flower', 'tea', 'flower', 'cake', 'letter', 'goose', 'cake', 'letter', 'camera'],
    ['camera', 'ticket', 'camera', 'goose', 'orange', 'orange', 'record', 'flower', 'letter'],
    ['orange', 'orange', 'goose', 'letter', 'orange', 'cake', 'flower', 'tea', 'tea'],
    ['goose', 'tea', 'flower', 'cake', 'goose', 'letter', 'cake', 'record', 'cake'],
  ];
  const items = stacks.flatMap((stack, slot) => stack.map((kind, depth) => ({ id: `gift-${depth}-${slot}`, kind, slot, depth })));
  // A verified route with no assistance; matches deliberately cross stack layers.
  const route = [0,5,0,4,4,4,0,0,0,0,0,0,3,3,3,0,2,1,2,2,5,1,1,1,1,2,2,4,2,2,2,2,1,1,3,4,4,3,3,3,3,4,5,1,5,5,3,5,5,5,5,1,4,4];
  const depths = Array(6).fill(0);
  return { id: 'gift-challenge', title: '礼物前的最后一关', subtitle: 'ONE LAST LITTLE CHALLENGE',
    note: '看一眼下层，再决定先收哪一件。', items,
    solution: route.map((slot) => [`gift-${depths[slot]++}-${slot}`]), helpLimit: 1, undoLimit: 2 };
}

export const LEGACY_CHALLENGE_SCENE = giftScene();

function balancedGiftScene() {
  const simplerKinds = { record: 'tea', cake: 'flower', letter: 'camera' };
  const items = LEGACY_CHALLENGE_SCENE.items.filter(({ depth }) => depth < 6)
    .map((item) => ({ ...item, kind: simplerKinds[item.kind] || item.kind }));
  const route = [0,5,0,4,4,4,0,0,0,0,1,1,1,3,4,1,1,3,1,5,2,2,2,2,2,3,2,3,3,3,4,4,5,5,5,5];
  const depths = Array(6).fill(0);
  return { ...LEGACY_CHALLENGE_SCENE, items, helpLimit: 3, undoLimit: 5,
    solution: route.map((slot) => [`gift-${depths[slot]++}-${slot}`]) };
}

// shortcut: curated layers rather than random boards; add a solver before randomizing blockers.
export const SCENES = [
  scene('little-things', '随手收集的小东西', 'LITTLE THINGS, LOVELY DAYS', '有些小东西，舍不得丢掉。', [['tea', 'orange'], ['goose', 'flower'], ['camera', 'ticket']]),
  scene('places', '一起经过的地方', 'SOMEWHERE WITH YOU', '走过的路，都偷偷留在这里。', [['ticket', 'camera'], ['flower', 'tea'], ['record', 'goose'], ['orange', 'ticket'], ['camera', 'flower'], ['tea', 'record']]),
  balancedGiftScene(),
];

export const MATCH_STORAGE_KEY = 'memory-arcade-match-v1';
