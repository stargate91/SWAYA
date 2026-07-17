import { countEpisodesInNumber } from '../../../utils/detailUtils';
import { useMediaDetailContext } from '../MediaDetailContext';
import SpecCard from '@/ui/SpecCard';
import Grid from '@/ui/Grid';
import Stack from '@/ui/Stack';
import Text from '@/ui/Text';
import BrandCard from '@/ui/BrandCard';
import Divider from '@/ui/Divider';
import { buildTmdbImageUrl, resolveMediaImageUrl, TMDB_IMAGE_SIZES } from '@/lib/imageUrls';

export default function DetailsPanel({ variant: propVariant }) {
  const { state, t, variant: contextVariant } = useMediaDetailContext();
  const variant = propVariant || contextVariant;
  const {
    item,
    isMovie
  } = state;

  const isSceneType = item?.type === 'scene' || item?.media_type === 'scene';
  const formatCurrency = (val) => {
    if (!val) return '';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);
  };

  const hasBoxOffice = isMovie && ((item.budget && item.budget > 0) || (item.revenue && item.revenue > 0));

  const companies = item?.companies || [];
  const networks = item?.networks || [];

  const derivedSeasonCount = countEpisodesInNumber(item?.seasons || []);
  const derivedEpisodeCount = (item?.seasons || []).reduce((acc, s) => {
    if (s && s.episodes) {
      return acc + (s.episodes.length || 0);
    } else {
      return acc + (s.episode_count || 0);
    }
  }, 0);
  const seasonCount = Number(item?.number_of_seasons ?? 0) || derivedSeasonCount;
  const episodeCount = Number(item?.number_of_episodes ?? 0) || derivedEpisodeCount;
  const tvStatus = item?.release_status;

  const gridVariant = variant === 'drawer' ? 'split' : 'specs';

  return (
    <Stack gap="xl">

      {!isMovie && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text as="h4" variant="caption" uppercase color={variant === 'drawer' ? 'faint' : 'muted'}>
              {t('library.details.tvInfo') || 'Tv Info'}
            </Text>
            {variant === 'drawer' && <Divider />}
          </Stack>
          <Grid variant={gridVariant} gap="sm">
            <SpecCard tall label={t('library.details.seasons') || 'Seasons'} value={seasonCount} />
            <SpecCard tall label={t('library.details.episodes') || 'Episodes'} value={episodeCount} />
            {tvStatus && (
              <SpecCard tall span={2} label={t('library.details.status') || 'Status'} value={tvStatus} />
            )}
          </Grid>
        </Stack>
      )}

      {hasBoxOffice && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text as="h4" variant="caption" uppercase color={variant === 'drawer' ? 'faint' : 'muted'}>
              {t('library.details.boxOffice') || 'Box Office'}
            </Text>
            {variant === 'drawer' && <Divider />}
          </Stack>
          <Grid variant="specs" gap="sm">
            {item.budget > 0 && (
              <SpecCard label={t('library.details.budget') || 'Budget'} value={formatCurrency(item.budget)} />
            )}
            {item.revenue > 0 && (
              <SpecCard label={t('library.details.revenue') || 'Revenue'} value={formatCurrency(item.revenue)} />
            )}
            {item.budget > 0 && item.revenue > 0 && (
              <SpecCard
                span={2}
                label={t('library.details.profit') || 'Profit'}
                value={formatCurrency(item.revenue - item.budget)}
                status={(item.revenue - item.budget) >= 0 ? 'success' : 'danger'}
              />
            )}
          </Grid>
        </Stack>
      )}

      {companies.length > 0 && !isSceneType && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text as="h4" variant="caption" uppercase color={variant === 'drawer' ? 'faint' : 'muted'}>
              {item.is_adult ? (t('library.details.studio') || 'Studio') : (t('library.details.productionCompanies') || 'Production Companies')}
            </Text>
            {variant === 'drawer' && <Divider />}
          </Stack>
          <Grid variant="split" gap="md">
            {companies.map((it, idx) => {
              const logoUrl = it.logo_path
                ? (it.logo_path.startsWith('http') || it.logo_path.startsWith('/media/') || it.logo_path.startsWith('data/'))
                  ? resolveMediaImageUrl(it.logo_path, 'logo')
                  : buildTmdbImageUrl(it.logo_path, TMDB_IMAGE_SIZES.posterThumb)
                : null;
              return (
                <BrandCard
                  key={idx}
                  name={it.name}
                  logoUrl={logoUrl}
                />
              );
            })}
          </Grid>
        </Stack>
      )}

      {networks.length > 0 && !isSceneType && (
        <Stack gap="md">
          <Stack gap="xs">
            <Text as="h4" variant="caption" uppercase color={variant === 'drawer' ? 'faint' : 'muted'}>
              {item.is_adult ? (t('library.details.network') || 'Network') : (t('library.details.platformsNetworks') || 'Platforms & Networks')}
            </Text>
            {variant === 'drawer' && <Divider />}
          </Stack>
          <Grid variant="split" gap="md">
            {networks.map((it, idx) => {
              const logoUrl = it.logo_path
                ? (it.logo_path.startsWith('http') || it.logo_path.startsWith('/media/') || it.logo_path.startsWith('data/'))
                  ? resolveMediaImageUrl(it.logo_path, 'logo')
                  : buildTmdbImageUrl(it.logo_path, TMDB_IMAGE_SIZES.posterThumb)
                : null;
              return (
                <BrandCard
                  key={idx}
                  name={it.name}
                  logoUrl={logoUrl}
                />
              );
            })}
          </Grid>
        </Stack>
      )}
    </Stack>
  );
}
