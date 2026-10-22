import { contentAsset } from './assets.js';

// Shared story content; new-game headings and signature live in MatchGame.jsx.
// These assets ship to every visitor, even when the source repository is private.
export const PROJECT = Object.freeze({
  title: '拾光冒险',
  subtitle: 'MEMORY ARCADE',
  mark: 'MA',
  edition: 'COMMUNITY EDITION',
  eyebrow: 'PLAYABLE MEMORY ALBUM',
  sinceLabel: 'YOUR STORY',
  since: '20XX.MM.DD',
  introLeft: 'YOU',
  introMiddle: '遇见',
  introRight: 'ME',
  stageLabel: 'MEMORY ARCADE · STAGE 01',
  footer: '一本还没写完的回忆相册，等待玩家继续探索。',
  footerCode: 'MEMORY ARCHIVE · ROLL 01',
});

export const MEMORIES = Object.freeze([
  {
    id: 'first-page', chapter: '01 / 故事开始', date: 'A DAY TO REMEMBER',
    title: '说好只喝一口的',
    body: '那天下午，你说只尝一口我的奶茶。后来整杯都到了你手里。奇怪的是，我记住的不是没喝到的奶茶，是你得逞时笑起来的样子。',
    photo: contentAsset('memory-01.svg'), alt: '两杯奶茶的手绘回忆插画', accent: 'rose',
  },
  {
    id: 'small-things', chapter: '02 / 闪光小事', date: 'THE LITTLE THINGS',
    title: '一朵花就很开心',
    body: '路过花店时，你停下来看了好久。那天没有节日，也没有特别的理由。只是觉得，普通的星期三，也可以送你一朵花。',
    photo: contentAsset('memory-02.svg'), alt: '普通日子里的一束花', accent: 'gold',
  },
  {
    id: 'blue-hour', chapter: '03 / 蓝色时刻', date: 'TAKE YOUR TIME',
    title: '坐到终点的那班车',
    body: '我们聊得太投入，错过了原本要下的站。于是干脆坐到终点，在一个不认识的地方吃了晚饭。车票还在，路线已经不重要了。',
    photo: contentAsset('memory-03.svg'), alt: '一起出行的车票插画', accent: 'ocean',
  },
  {
    id: 'unexpected', chapter: '04 / 计划之外', date: 'A HAPPY ACCIDENT',
    title: '拍糊了，也舍不得删',
    body: '本来想拍一张认真的合照，你忽然笑了，我的手也跟着抖了一下。那张照片没有对上焦，却是那一天我最喜欢的一张。',
    photo: contentAsset('memory-04.svg'), alt: '相机与花的回忆插画', accent: 'gold',
  },
  {
    id: 'ordinary-days', chapter: '05 / 普通日子', date: 'EVERY LITTLE DAY',
    title: '什么都没做的周末',
    body: '一人一边的沙发，听了很多遍的歌，分着吃的橘子。我们没有去很远的地方，却一起度过了一个很好的下午。',
    photo: contentAsset('memory-05.svg'), alt: '唱片和橘子的周末插画', accent: 'rose',
  },
  {
    id: 'next-level', chapter: '06 / 下一关', date: 'TO BE CONTINUED',
    title: '下一页，留给我们',
    body: '盒子快整理完了，但还有好多想一起去的地方，想一起尝的味道，想一起度过的普通日子。下一页，等我们慢慢写。',
    photo: contentAsset('memory-06.svg'), alt: '信件和蛋糕的未来插画', accent: 'green',
  },
]);

export const FINALE = Object.freeze({
  illustration: contentAsset('finale.svg'),
  illustrationAlt: '两位像素玩家的占位插画',
  kicker: 'TO MY FAVORITE PLAYER',
  title: '终点不是结束，是新的开始。',
  letter: [
    '整理这些小东西的时候，我才发现，原来好多普通的日子，都因为有你，变得舍不得忘记。',
    '半杯奶茶，一张车票，一张没拍好的照片。它们看起来没有什么特别，却刚好装得下我们一起走过的时光。',
    '所以做了这个小小的游戏，想把这些日子再交到你手里。还有一份小礼物，和一些想和你一起完成的以后。',
  ],
  prompt: '最后，我想认真地问你：',
  question: '愿意和我一起\n开启下一关吗？',
  cue: '答案由你决定。',
  acceptLabel: '一起出发',
  players: 'PLAYER 1 ♥ PLAYER 2',
  acceptedText: '新的故事，从今天继续。',
});

export const REWARDS = Object.freeze({
  voucher: {
    code: 'NO. YOUR-STORY-01',
    title: '隐藏代金券',
    revealTitle: '今晚的电影，你来选',
    description: '小鹅替你保管了一张电影任选券。零食我准备，电影你决定，一起把今晚过得慢一点。',
  },
  gift: {
    label: 'HIDDEN REWARD',
    title: '一整天的快乐，由你决定',
    description: '留出一天，不赶路，不看时间。一起吃饭、散步，做那些一直说「下次一起」的小事。',
    image: contentAsset('reward.svg'),
    imageAlt: '系着蝴蝶结的惊喜礼盒',
    details: ['FOR MY FAVORITE PERSON', '有效期：一直有效'],
  },
});

export function getMemory(id) {
  return MEMORIES.find((memory) => memory.id === id);
}
