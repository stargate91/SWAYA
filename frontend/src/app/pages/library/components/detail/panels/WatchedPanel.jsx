import { useMediaDetailContext } from '../MediaDetailContext';
import MovieWatchedStats from './components/MovieWatchedStats';
import TvWatchedStats from './components/TvWatchedStats';

export default function WatchedPanel() {
  const { state } = useMediaDetailContext();
  const { isMovie, isScene } = state;

  return (isMovie || isScene) ? <MovieWatchedStats /> : <TvWatchedStats />;
}
