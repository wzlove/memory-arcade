import MatchGame from './components/MatchGame.jsx';
import PlatformerApp from './PlatformerApp.jsx';

export default function App() {
  return new URLSearchParams(window.location.search).get('mode') === 'platformer'
    ? <PlatformerApp /> : <MatchGame />;
}
