import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Minus } from '@/ui/icons';
import { getProfileImagePath, getTvPosterImagePath, getPosterImagePath } from '@/lib/imageUrls';
import { isTvLikeMediaType, isSceneMediaType, isPersonMediaType } from '@/lib/mediaTypes';
import { useLibraryModeStore } from '@/stores/useLibraryModeStore';
import { useSettingsQuery } from '@/queries';
import { API_BASE } from '@/lib/backend';

export const TagPosterCard = memo(({
  item,
  t,
  resolvePosterUrl,
  emptyIcon: EmptyIcon,
  onClick,
  onRemove,
}) => {
  const navigate = useNavigate();
  const sessionMode = useLibraryModeStore((state) => state.sessionMode);
  const { data: settings } = useSettingsQuery();

  const isScene = isSceneMediaType(item.type);
  const isPerson = isPersonMediaType(item.type);
  const isAdult = item.is_adult || (isScene && !item.is_home_video);
  const shouldBlur = isAdult && sessionMode !== 'nsfw';

  const rawPosterUrl = isPerson
    ? resolvePosterUrl(getProfileImagePath(item))
    : resolvePosterUrl(
        isScene
          ? (item.backdrop_path || item.poster_path)
          : (isTvLikeMediaType(item.type) ? getTvPosterImagePath(item) : getPosterImagePath(item))
      );

  const posterUrl = (shouldBlur && rawPosterUrl)
    ? `${API_BASE}/api/v1/media/image-proxy?url=${encodeURIComponent(rawPosterUrl)}&blur=true`
    : rawPosterUrl;

  const displayDate = item.release_date ? item.release_date.substring(0, 10) : item.year;
  const genderPref = settings?.adult_gender_preference;
  const allPeople = item.people || [];
  const filteredPeople = genderPref && genderPref !== 'all'
    ? allPeople.filter(p => {
        if (genderPref === 'female') return p.gender === 1;
        if (genderPref === 'male') return p.gender === 2;
        return true;
      })
    : allPeople;
  const performers = filteredPeople.slice(0, 4);

  const removeButton = onRemove ? (
    <button
      type="button"
      className="ui-card-action-btn ui-card-action-btn--danger"
      title={t('common.remove') || 'Remove'}
      aria-label={t('common.remove') || 'Remove'}
      onClick={(e) => {
        e.stopPropagation();
        onRemove(item);
      }}
    >
      <Minus size={11} strokeWidth={3.5} /> {t('common.remove') || 'Remove'}
    </button>
  ) : null;

  return (
    <div
      className={`lists-card ${isScene ? 'lists-card--scene' : 'lists-card--poster'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className={`lists-card__media ${shouldBlur ? 'is-blurred' : ''}`}>
        {removeButton}
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title || item.name}
            className="lists-card__img"
          />
        ) : (
          <div className="lists-card__placeholder">
            {EmptyIcon && <EmptyIcon size={32} className="lists-card__placeholder-icon" />}
          </div>
        )}
        {shouldBlur && (
          <div className="recommend-card-blur-overlay">
            <span className="settings-badge settings-badge--danger">
              {t('common.adult_badge', { defaultValue: '18+' })}
            </span>
          </div>
        )}
      </div>
      <div className="lists-card__info">
        <span className="lists-card__title">{item.title || item.name}</span>
        <span className="lists-card__subtitle">
          {isScene ? (
            <div className="library-scene-card__subtitle-inner">
              <span className="library-scene-card__performers">
                {performers.map((p, idx) => (
                  <span key={p.id}>
                    {idx > 0 && ', '}
                    <span
                      role="button"
                      tabIndex={0}
                      className="library-scene-card__performer-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          navigate(`/library/people/${p.id}`, { state: { allowAdult: true } });
                        }
                      }}
                    >
                      {p.name}
                    </span>
                  </span>
                ))}
              </span>
              {displayDate && <span className="library-scene-card__date">{displayDate}</span>}
            </div>
          ) : isPerson ? (
            (() => {
              const dept = item.known_for_department || (item.is_adult ? 'performer' : 'artist');
              return t(`lists.roles.${dept.toLowerCase()}`) || dept;
            })()
          ) : item.year}
        </span>
      </div>
    </div>
  );
});

TagPosterCard.displayName = 'TagPosterCard';
