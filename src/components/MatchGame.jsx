import { useEffect, useReducer, useRef, useState } from 'react';
import { KEEPSAKES, MATCH_STORAGE_KEY, SCENES } from '../content/match.js';
import { FINALE, MEMORIES, REWARDS } from '../content/story.js';
import { createMatchGame, exposedItems, matchReducer, restoreMatchGame } from '../game/MatchGame.js';
import { AudioManager } from '../game/AudioManager.js';
import { MemoryMoment } from './MemoryMoment.jsx';
import { KeepsakeArt, MatchIcon } from './KeepsakeArt.jsx';

function loadGame() {
  try { return restoreMatchGame(localStorage.getItem(MATCH_STORAGE_KEY)); }
  catch { return createMatchGame(); }
}

function Modal({ title, open, onClose, children, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className={`keepsake-modal ${className}`} aria-label={title}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="keepsake-modal-inner">
      <button className="keepsake-close" onClick={onClose} aria-label="关闭"><MatchIcon name="close" /></button>
      {children}
    </div>
  </dialog>;
}

function Collection({ game, onMemory, compact = false }) {
  return <div className={`keepsake-collection ${compact ? 'is-compact' : ''}`}>
    <div className="collection-heading"><span>回忆收藏夹</span><small>{game.memories.length} / 6</small></div>
    <p className="collection-description">整理一点，想起一点。</p>
    <div className="collection-pages">
      {MEMORIES.map((memory, index) => {
        const found = game.memories.includes(index);
        return <button key={memory.id} className={`collection-page ${found ? 'is-found' : ''}`}
          disabled={!found} onClick={() => onMemory(index)} aria-label={found ? `重温：${memory.title}` : `回忆 ${index + 1}，尚未发现`}>
          <span className="collection-index">0{index + 1}</span>
          <span>{found ? memory.title : ['一件小事', '一点心动', '一段旅程', '一个意外', '一些日常', '一个以后'][index]}</span>
          <MatchIcon name={found ? 'heart' : 'lock'} size={14} />
        </button>;
      })}
    </div>
    <div className="collection-bottom"><span className="tiny-flower">✳</span> 每一件，都有它的故事。</div>
  </div>;
}

function Ending({ game, onGift, onCollection, onRestart, onChallenge }) {
  const [bonus, setBonus] = useState(false);
  const gift = game.phase === 'gift';
  return <section className={`keepsake-ending ${gift ? 'gift-open' : ''}`} aria-label={gift ? '惊喜礼物' : '写给你的信'}>
    <span className="ending-stamp">WITH LOVE<br />FOR YOU</span>
    <p className="keepsake-eyebrow">{gift ? 'A LITTLE SOMETHING FOR YOU' : 'SIX MEMORIES. ONE LITTLE LETTER.'}</p>
    <div className="ending-illustration"><KeepsakeArt kind={gift ? 'flower' : 'letter'} /></div>
    <h2>{gift ? '这份小心意，送给你。' : '这些小事，我都记得。'}</h2>
    {!gift ? <>
      <div className="keepsake-letter">{FINALE.letter.map((line) => <p key={line}>{line}</p>)}</div>
      <p className="letter-signature">给我最喜欢的玩家 <MatchIcon name="heart" size={15} /></p>
      <button className="keepsake-primary" onClick={onGift}>还有一件，想交给你 <MatchIcon name="arrow" /></button>
    </> : <>
      <p className="gift-description">{REWARDS.gift.description}</p>
      <div className="keepsake-gift-ticket"><span>A LITTLE GIFT FOR YOU</span><img src={REWARDS.gift.image} alt={REWARDS.gift.imageAlt} /><h3>{REWARDS.gift.title}</h3><small>{REWARDS.gift.details.join(' · ')}</small></div>
      <button className="goose-bonus" onClick={() => setBonus(true)} aria-label="摸摸小鹅，发现额外彩蛋"><KeepsakeArt kind="goose" /><span>{bonus ? '被你发现啦！' : '小鹅好像还藏着什么…'}</span></button>
      {bonus && <div className="bonus-voucher" role="status"><strong>{REWARDS.voucher.revealTitle}</strong><p>{REWARDS.voucher.description}</p></div>}
      <div className="ending-actions"><button className="keepsake-primary" onClick={onCollection}>再看看我们的回忆 <MatchIcon name="heart" size={17} /></button><button className="keepsake-text-button" onClick={onChallenge}>再挑战一次礼物关</button><button className="keepsake-text-button" onClick={onRestart}>重新整理三个盒子</button></div>
    </>}
  </section>;
}

export default function MatchGame() {
  const [game, dispatch] = useReducer(matchReducer, undefined, loadGame);
  const [menu, setMenu] = useState(null);
  const [memory, setMemory] = useState(null);
  const [muted, setMuted] = useState(true);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [feedback, setFeedback] = useState('');
  const audio = useRef(null);
  const messageTimer = useRef(null);
  const scene = SCENES[game.stage];
  const challenge = game.stage === 2;
  const helpLeft = scene.helpLimit - game.helpUsed;
  const undoLeft = scene.undoLimit - game.undoUsed;
  const exposed = exposedItems(game);
  const full = game.tray.length >= 7;
  const ending = ['letter', 'gift'].includes(game.phase);
  const activeMemory = game.pending[0] ?? memory;
  const modalOpen = activeMemory !== null || menu !== null;
  const progress = game.cleared / (scene.items.length / 3) * 100;

  useEffect(() => {
    audio.current = new AudioManager();
    return () => { audio.current?.destroy(); window.clearTimeout(messageTimer.current); };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(game)); }
    catch { setStorageAvailable(false); }
  }, [game]);

  function message(text) {
    window.clearTimeout(messageTimer.current);
    setFeedback(text);
    messageTimer.current = window.setTimeout(() => setFeedback(''), 2400);
  }

  function act(type, extra = {}) {
    const action = { type, ...extra };
    const next = matchReducer(game, action);
    if (next === game) return;
    if (!muted) {
      audio.current?.init();
      audio.current?.play(next.pending.length > game.pending.length ? 'memory' : type === 'gift' ? 'celebrate' : next.cleared > game.cleared ? 'coin' : 'bump');
    }
    if (next.cleared > game.cleared) message(type === 'help' ? '帮你收好了一组，慢慢来。' : '又收好了一点小美好。');
    else if (type === 'undo') message('退回一步也没关系。');
    else setFeedback('');
    dispatch(action);
  }

  function closeModal() {
    if (game.pending.length) act('dismiss');
    else { setMenu(null); setMemory(null); }
  }

  function toggleSound() {
    audio.current.muted = !muted;
    if (muted) { audio.current.init(); audio.current.play('memory'); }
    else audio.current.stop();
    setMuted(!muted);
  }

  return <div className="keepsake-app">
    <header className="keepsake-header">
      <a className="keepsake-brand" href={import.meta.env.BASE_URL} aria-label="拾光小盒首页"><span className="brand-flower">✳</span><span>拾光小盒<small>THE LITTLE MEMORY BOX</small></span></a>
      <div className="header-tools"><span className="made-for-you">一点小心意，慢慢拆开。</span><button className="keepsake-icon-button" onClick={toggleSound} aria-label={muted ? '开启声音' : '关闭声音'} aria-pressed={!muted}><MatchIcon name={muted ? 'mute' : 'sound'} /></button><button className="keepsake-icon-button" onClick={() => setMenu('help')} aria-label="玩法说明"><MatchIcon name="help" /></button></div>
    </header>

    <main className="keepsake-main">
      <div className="keepsake-intro"><p className="keepsake-eyebrow"><span /> A LITTLE GAME, JUST FOR YOU <span /></p><h1>藏在日常里的<span>你<svg viewBox="0 0 80 10" aria-hidden="true"><path d="M3 7Q36 0 77 5" /></svg></span></h1><p>把零零散散的小东西，整理成值得收藏的时光。</p></div>

      {ending ? <Ending game={game} onGift={() => act('gift')} onCollection={() => setMenu('collection')} onRestart={() => setMenu('restart')} onChallenge={() => act('challenge')} /> : <div className="keepsake-workspace">
        <aside className="keepsake-left">
          <div className="desk-polaroid"><div className="polaroid-scene"><span className="polaroid-sun" /><KeepsakeArt kind="goose" /><KeepsakeArt kind="flower" /></div><p>小日子，也闪闪发光。</p><span className="paper-tape" /></div>
          <div className="desk-note"><span>给正在整理的你</span><p>不用赶时间，<br />那些小美好，<br />都在等你发现。</p><svg viewBox="0 0 80 40" aria-hidden="true"><path d="M7 5q46-4 50 24m-10-3 10 6 5-12" /></svg></div>
          <div className="box-itinerary">{SCENES.map((item, index) => <div key={item.id} className={game.stage === index ? 'is-current' : game.stage > index ? 'is-finished' : ''}><span>{game.stage > index ? <MatchIcon name="check" size={12} /> : `0${index + 1}`}</span><p>{['日常的小美好', '一起走过的路', '留给以后的事'][index]}</p></div>)}</div>
        </aside>

        <section className="keepsake-game" aria-label="回忆三消游戏">
          <div className="box-heading"><div><p>BOX 0{game.stage + 1} <span>/ 03</span></p><h2>{scene.title}</h2></div><span className="box-label">{challenge ? '挑 战 解 锁' : '慢 慢 收 藏'}</span></div>
          {challenge && <div className="gift-challenge-note"><MatchIcon name="lock" size={16} /><div><strong>收好最后 {scene.items.length / 3 - game.cleared} 组，就能拆礼物</strong><span>{scene.items.length} 件 · {new Set(scene.items.map(({ kind }) => kind)).size} 种小物 · 每次挑战限 {scene.helpLimit} 次辅助、{scene.undoLimit} 次撤回</span></div></div>}
          <div className="box-progress"><span style={{ width: `${progress}%` }} /></div>
          <div className={`keepsake-board ${challenge ? 'challenge-board' : ''}`} data-stage={game.stage}>
            <div className="board-caption"><span>✧</span> {scene.note} <span>✧</span></div>
            <div className={`keepsake-pile ${game.phase === 'ready' ? 'is-waiting' : ''}`} inert={game.phase !== 'playing' || full || modalOpen}>
              {Array.from({ length: 6 }, (_, slot) => <div className={`keepsake-stack stack-${slot}`} key={`${game.stage}-${slot}`}>
                {scene.items.filter((item) => item.slot === slot && game.remaining.includes(item.id)).reverse().map((item) => {
                  const accessible = exposed.some(({ id }) => id === item.id);
                  const next = accessible && challenge ? scene.items.find((other) => other.slot === slot && other.depth > item.depth && game.remaining.includes(other.id)) : null;
                  const stackOffset = scene.items.filter((other) => other.slot === slot && other.depth < item.depth && game.remaining.includes(other.id)).length;
                  return <button key={item.id} className={`keepsake-piece ${accessible ? 'is-exposed' : 'is-covered'}`} disabled={!accessible}
                    data-piece={item.id} aria-label={`收起${KEEPSAKES[item.kind].label}${next ? `，下一层是${KEEPSAKES[next.kind].label}` : ''}`} onClick={() => act('pick', { id: item.id })}
                    style={{ '--piece-color': KEEPSAKES[item.kind].color, '--turn': `${((slot * 7 + item.depth * 3) % 13) - 6}deg`, '--offset': `${Math.min(stackOffset, 3) * 6}px`, zIndex: 10 - item.depth }}>
                    <KeepsakeArt kind={item.kind} /><span>{KEEPSAKES[item.kind].label}</span>
                    {next && <span className="next-keepsake">下层 · {KEEPSAKES[next.kind].label}</span>}
                  </button>;
                })}
              </div>)}
            </div>
            {game.phase === 'ready' && <div className="box-welcome"><span className="welcome-label">一份可以玩的心意</span><h3>帮我整理一下？</h3><p>找到三件一样的小物，看看里面藏着什么。</p><button className="keepsake-primary" onClick={() => act('start')}>打开第一个盒子 <MatchIcon name="arrow" size={18} /></button><small>不计时 · 不着急 · 随时可以回来</small></div>}
            {game.phase === 'complete' && !game.pending.length && <div className="box-complete"><KeepsakeArt kind={game.stage === 2 ? 'letter' : 'flower'} /><p className="keepsake-eyebrow">NICELY TUCKED AWAY</p><h3>{game.stage === 2 ? '咦，盒底还有一封信。' : '这一盒，收好啦。'}</h3><p>{game.stage === 2 ? '原来这些零碎，都是写给你的。' : '两段回忆，已经悄悄放进收藏夹。'}</p><button className="keepsake-primary" onClick={() => act('next')}>{game.stage === 2 ? '拆开这封信' : '打开下一个盒子'} <MatchIcon name="arrow" size={17} /></button></div>}
          </div>

          <div className={`keepsake-tray-area ${full ? 'tray-is-full' : ''}`}>
            <div className="tray-heading"><span>{full ? (helpLeft <= 0 && undoLeft <= 0 ? '槽位已满，重试这一关再来挑战' : '槽位已满，试试撤回或帮我配一组') : '暂存小物'}</span><small>{game.tray.length} / 7</small></div>
            <div className="keepsake-tray" aria-label={`收纳槽，已使用 ${game.tray.length} 格，共 7 格`}>
              {Array.from({ length: 7 }, (_, index) => {
                const item = scene.items.find(({ id }) => id === game.tray[index]);
                return <div className={`tray-slot ${item ? 'is-filled' : ''}`} key={item?.id || `empty-${index}`}>{item ? <><KeepsakeArt kind={item.kind} /><span className="sr-only">{KEEPSAKES[item.kind].label}</span></> : <span>·</span>}</div>;
              })}
            </div>
            <p className="tray-tip" role="status" aria-live="polite">{feedback || (full ? '没有关系，已找到的回忆都会留下。' : '点击小物放进来，三个相同就能收好。')}</p>
          </div>
          <div className="keepsake-actions"><button disabled={game.phase !== 'playing' || !game.history.length || undoLeft <= 0} onClick={() => act('undo')}><MatchIcon name="undo" size={18} />撤回一步{challenge && ` (${undoLeft})`}</button><button className="help-match" disabled={game.phase !== 'playing' || helpLeft <= 0} onClick={() => act('help')}><MatchIcon name="spark" size={18} />帮我配一组{challenge && ` (${helpLeft})`}</button><button disabled={game.phase !== 'playing'} onClick={() => setMenu('retry')} aria-label="重新整理当前盒子"><MatchIcon name="reset" size={18} /></button></div>
        </section>

        <aside className="keepsake-right"><Collection game={game} onMemory={setMemory} /><div className="little-promise"><MatchIcon name="heart" size={19} /><p>有些惊喜，<br />藏在最后一点点。</p><span>KEEP A LITTLE CURIOSITY</span></div></aside>
      </div>}

      <footer className="keepsake-footer"><span><i />{storageAvailable ? '时光已悄悄保存，下次可以接着玩。' : '浏览器无法保存进度，请在关闭页面前完成游戏。'}</span><span>MADE OF LITTLE THINGS <MatchIcon name="heart" size={12} /></span></footer>
    </main>

    <Modal title={activeMemory !== null ? MEMORIES[activeMemory].title : '回忆小盒'} open={modalOpen} onClose={closeModal} className={activeMemory !== null ? 'memory-dialog' : ''}>
      {activeMemory !== null ? <MemoryMoment memoryId={MEMORIES[activeMemory].id} memoryNumber={activeMemory + 1} memoryCount={6} onContinue={closeModal} continueLabel="继续整理" /> : menu === 'collection' ? <Collection game={game} onMemory={setMemory} compact /> : menu === 'help' ? <div className="keepsake-help"><p className="keepsake-eyebrow">A SMALL GUIDE</p><h2>把小美好，三个三个收好。</h2><div className="help-example">{[0,1,2].map((n) => <KeepsakeArt key={n} kind="tea" />)}<span>✧</span></div><ol><li>点击最上层的小物，把它放进下方的七格收纳槽。</li><li>三个相同的小物自动消除，露出藏在下面的东西。</li><li>前两盒可随时撤回、配组。礼物关每次挑战限 3 次辅助、5 次撤回。</li><li>礼物关需要全部消除才能拆礼物；卡住可以重试本关，回忆会保留。</li></ol><p className="help-note">这里不计时，也没有需要付费的道具。已发现的回忆会一直保留。</p><button className="keepsake-primary" onClick={closeModal}>知道啦，慢慢来 <MatchIcon name="heart" size={16} /></button></div> : ['restart', 'retry'].includes(menu) ? <div className="keepsake-confirm"><KeepsakeArt kind="letter" /><h2>{menu === 'restart' ? '从第一个盒子重新开始？' : '重新整理这一盒？'}</h2><p>{menu === 'restart' ? '会清空三个盒子的进度和已收藏的回忆。' : (challenge ? '重新挑战会恢复 3 次辅助和 5 次撤回，已经发现的回忆会保留。' : '只重置当前盒子，已经发现的回忆会保留。')}</p><div><button className="keepsake-text-button" onClick={closeModal}>先留着</button><button className="keepsake-primary" onClick={() => { act(menu); setMenu(null); }}>{menu === 'restart' ? '重新开始' : '重新整理'}</button></div></div> : null}
    </Modal>
  </div>;
}
