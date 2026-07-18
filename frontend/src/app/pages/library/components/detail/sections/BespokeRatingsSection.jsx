import Card from '@/ui/Card';
import Grid from '@/ui/Grid';
import Tooltip from '@/ui/Tooltip';
import RatingCard from '@/ui/data/RatingCard';

export default function BespokeRatingsSection({ item, t }) {
  const isSceneType = item?.type === 'scene';
  const hasImdb = !isSceneType && item?.rating_imdb != null && Number(item.rating_imdb) > 0;
  const hasTmdb = !isSceneType && item?.rating_tmdb != null && Number(item.rating_tmdb) > 0;
  const hasRotten = !isSceneType && item?.rating_rotten != null && item?.rating_rotten !== '';
  const hasMeta = !isSceneType && item?.rating_meta != null && Number(item.rating_meta) > 0;
  const hasPorndb = item?.rating_porndb != null && Number(item.rating_porndb) > 0;

  // Identify which rating type is already displayed in the main header pill
  let activeHeaderRatingType = null;
  if (hasImdb) {
    activeHeaderRatingType = 'imdb';
  } else if (hasTmdb) {
    activeHeaderRatingType = 'tmdb';
  } else if (hasRotten) {
    activeHeaderRatingType = 'rotten';
  } else if (hasMeta) {
    activeHeaderRatingType = 'meta';
  } else if (hasPorndb) {
    activeHeaderRatingType = 'porndb';
  }

  const ratings = [];
  if (hasImdb && activeHeaderRatingType !== 'imdb') ratings.push({ id: 'imdb', logo: '/rating/imdb.png', alt: 'IMDb', value: `${item.rating_imdb.toFixed(1)}/10` });
  if (hasTmdb && activeHeaderRatingType !== 'tmdb') ratings.push({ id: 'tmdb', logo: '/rating/tmdb.png', alt: 'TMDb', value: `${item.rating_tmdb.toFixed(1)}/10` });
  if (hasRotten && activeHeaderRatingType !== 'rotten') ratings.push({ id: 'rotten', logo: '/rating/rottan_tomatoes.png', alt: 'Rotten Tomatoes', value: item.rating_rotten });
  if (hasMeta && activeHeaderRatingType !== 'meta') ratings.push({ id: 'meta', logo: '/rating/metacritic.png', alt: 'Metacritic', value: `${item.rating_meta}/100` });
  if (hasPorndb && activeHeaderRatingType !== 'porndb') ratings.push({ id: 'porndb', logo: '/rating/theporndb.png', alt: 'ThePornDB', value: `${item.rating_porndb.toFixed(1)}/10` });

  if (ratings.length === 0) return null;

  return (
    <Card
      variant="glass-shaded"
      headerVariant="shaded"
      padding="md"
      title={t('library.details.ratingsSection') || 'Ratings'}
    >
      <Grid variant="auto-fit-xs">
        {ratings.map(rating => (
          <Tooltip key={rating.id} content={rating.alt} side="top" fullWidth>
            <RatingCard
              logoSrc={rating.logo}
              logoAlt={rating.alt}
              value={rating.value}
              size="sm"
              fullWidth
            />
          </Tooltip>
        ))}
      </Grid>
    </Card>
  );
}
