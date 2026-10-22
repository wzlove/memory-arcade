import { useEffect, useState } from 'react';
import MatchGame from './components/MatchGame.jsx';
import PlatformerApp from './PlatformerApp.jsx';
import { loadGameContent } from './content/gameContent.js';

function PersonalizedGame() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    loadGameContent(controller.signal).then(value => { if (!controller.signal.aborted) setContent(value); })
      .catch(reason => { if (!controller.signal.aborted) setError(reason.name === 'TimeoutError' ? '读取超时，请检查网络后重试。' : reason.message || '请联网后重试。'); });
    return () => controller.abort();
  }, [attempt]);
  if (content) return <MatchGame content={content} />;
  return <main className="content-loading"><span aria-hidden="true">✳</span><h1>{error ? '这份心意还没准备好' : '正在打开回忆小盒…'}</h1><p role="status">{error || '稍等一下，故事马上就来。'}</p>{error && <button className="keepsake-primary" onClick={() => setAttempt(value => value + 1)}>重新读取</button>}<a href={`${import.meta.env.BASE_URL}studio.html`}>管理员入口</a></main>;
}

export default function App() {
  return new URLSearchParams(window.location.search).get('mode') === 'platformer'
    ? <PlatformerApp /> : <PersonalizedGame />;
}
