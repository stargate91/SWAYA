import { useState } from 'react';
import PropTypes from 'prop-types';
import { useSettingsQuery } from '../../../queries/settingsQueries';
import {
  useRecommendationsQuery,
  useAddToWatchlistMutation,
  useRemoveFromWatchlistMutation,
} from '../../../queries/dashboardQueries';
import {
  RecommendationCarousel,
  useRecommendationActions,
  useWatchlistHandler,
} from './recommendationsShared';
import api from '../../../lib/api';
import './RecommendationsWidget.css';

import { useLibraryModeStore } from '../../../stores/useLibraryModeStore';

export default function RecentlyActivePeopleWidget({ T }) {
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings = {} } = useSettingsQuery();
  const includeAdult = settings?.include_adult && sessionMode === 'nsfw';
  const language = settings?.ui_language || settings?.primary_metadata_language;

  const { data: recommendations, isLoading } = useRecommendationsQuery(language, includeAdult);
  const watchlistIdsFromQuery = recommendations?.watchlist_item_ids;

  const addToWatchlistMutation = useAddToWatchlistMutation();
  const removeFromWatchlistMutation = useRemoveFromWatchlistMutation();

  const { actualWatchlistIds, handleWatchlist } = useWatchlistHandler(
    watchlistIdsFromQuery,
    addToWatchlistMutation,
    removeFromWatchlistMutation
  );

  const { handleCardClick } = useRecommendationActions();

  const [recentlyActivePeople, setRecentlyActivePeople] = useState([]);
  const [recentlyActivePage, setRecentlyActivePage] = useState(1);
  const [hasMorePeople, setHasMorePeople] = useState(true);
  const [isLoadingMorePeople, setIsLoadingMorePeople] = useState(false);

  const [prevRecommendations, setPrevRecommendations] = useState(null);

  if (recommendations && recommendations !== prevRecommendations) {
    const isFirstLoad = !prevRecommendations;
    const firstPersonChanged = recommendations?.recently_activated_people?.[0]?.id !== prevRecommendations?.recently_activated_people?.[0]?.id;

    setPrevRecommendations(recommendations);

    setRecentlyActivePeople((prev) => {
      if (isFirstLoad || firstPersonChanged) {
        setRecentlyActivePage(1);
        setHasMorePeople((recommendations.recently_activated_people || []).length === 20);
        return recommendations.recently_activated_people || [];
      }
      const freshMap = new Map((recommendations.recently_activated_people || []).map(p => [p.id, p]));
      return prev.map(p => freshMap.has(p.id) ? { ...p, ...freshMap.get(p.id) } : p);
    });
  }

  const handleLoadMorePeople = async () => {
    if (isLoadingMorePeople || !hasMorePeople) return;
    setIsLoadingMorePeople(true);
    const nextPage = recentlyActivePage + 1;
    try {
      const data = await api.recommendations.getRecentlyActivatedPeople(nextPage, 20, includeAdult, language);
      if (data && data.length > 0) {
        setRecentlyActivePeople((prev) => [...prev, ...data]);
        setRecentlyActivePage(nextPage);
        setHasMorePeople(data.length === 20);
      } else {
        setHasMorePeople(false);
      }
    } catch (err) {
      console.error('Failed to load more people:', err);
    } finally {
      setIsLoadingMorePeople(false);
    }
  };

  const filteredPeople = recentlyActivePeople.filter((p) => {
    if (sessionMode === 'sfw') {
      const isAdult = p.is_adult || p.adult || p.known_for_department?.toLowerCase() === 'performer';
      return !isAdult;
    }
    return true;
  });

  if (isLoading || !filteredPeople?.length) {
    return null;
  }

  return (
    <RecommendationCarousel
      title={T(includeAdult ? 'dashboard.recommendations.recently_activated_people_adult' : 'dashboard.recommendations.recently_activated_people') || (includeAdult ? 'Recently Followed Adult Stars' : 'Recently Tracked People')}
      items={filteredPeople.map(p => ({
        ...p,
        media_type: 'person'
      }))}
      watchlistIds={actualWatchlistIds}
      onWatchlist={handleWatchlist}
      onCardClick={handleCardClick}
      T={T}
      onLoadMore={handleLoadMorePeople}
      hasMore={hasMorePeople}
      isLoadingMore={isLoadingMorePeople}
    />
  );
}

RecentlyActivePeopleWidget.propTypes = {
  T: PropTypes.func.isRequired,
  language: PropTypes.string,
};
