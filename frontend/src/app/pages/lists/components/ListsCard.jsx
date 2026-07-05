import { useNavigate } from 'react-router-dom';
import { resolveMediaImageUrl } from '@/lib/imageUrls';
import { API_BASE } from '@/lib/backend';
import { Check, Minus } from '@/ui/icons';

export default function ListsCard({
  item,
  sessionMode,
  settings,
  t,
  handleCardClick,
  handleRemoveListItem,
}) {
  const navigate = useNavigate();
  const isScene = item.media_type === 'scene';
  const isAdult = item.is_adult || isScene;
  const shouldBlur = isAdult && sessionMode !== 'nsfw';
  const rawPosterUrl = item.poster_path ? resolveMediaImageUrl(item.poster_path, isScene ? 'backdrop' : 'poster') : null;
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

  return (
    <div
      className={`lists-card ${isScene ? 'lists-card--scene' : 'lists-card--poster'}`}
      onClick={() => handleCardClick(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick(item);
        }
      }}
    >
      <div className={`lists-card__media ${shouldBlur ? 'is-blurred' : ''}`}>
        <button
          className="ui-card-action-btn ui-card-action-btn--danger"
          onClick={(e) => {
            e.stopPropagation();
            handleRemoveListItem(item.id);
          }}
          title={t('lists.remove_from_list') || 'Remove from list'}
        >
          <Minus size={11} strokeWidth={3.5} /> {t('common.remove') || 'Remove'}
        </button>
        {posterUrl ? (
          <img
            src={posterUrl}
            alt={item.title}
            className="lists-card__img"
          />
        ) : (
          <div className="lists-card__placeholder" />
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
        <span className="lists-card__title">{item.title}</span>
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
          ) : item.media_type === 'person' ? (
            (() => {
              const dept = item.known_for_department || (item.is_adult ? 'performer' : 'artist');
              return t(`lists.roles.${dept.toLowerCase()}`) || dept;
            })()
          ) : item.year}
        </span>
      </div>
    </div>
  );
}
