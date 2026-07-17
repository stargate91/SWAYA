import { useMediaDetailContext } from '../MediaDetailContext';
import Stack from '@/ui/Stack';
import Grid from '@/ui/Grid';
import Text from '@/ui/Text';
import PersonCard from '@/ui/PersonCard';

import { API_BASE } from '@/lib/backend';
import { resolveMediaImageUrl } from '@/lib/imageUrls';

export default function CastPanel() {
  const { state, t, navigate } = useMediaDetailContext();
  const {
    item,
    settings
  } = state;

  const isAdult = item.is_adult;
  const genderPref = settings?.adult_gender_preference; // 'all', 'female', 'male'

  const filterPeople = (list) => {
    if (!list) return [];
    if (!isAdult || !genderPref || genderPref === 'all') return list;
    return list.filter(person => {
      if (genderPref === 'female') return person.gender === 1;
      if (genderPref === 'male') return person.gender === 2;
      return true;
    });
  };

  const filteredDirectors = filterPeople(item.directors);
  const filteredWriters = filterPeople(item.writers);
  const filteredCast = filterPeople(item.cast);
  const resolvePersonAvatarUrl = (path) => resolveMediaImageUrl(path, 'person', API_BASE);

  return (
    <Stack gap="xl">
      {filteredDirectors && filteredDirectors.length > 0 && (
        <Stack gap="md">
          <Text as="h4" variant="caption" uppercase color="muted">
            {t('library.details.directors') || 'Directors / Creators'}
          </Text>
          <Grid variant="actor-picker" gap="md">
            {filteredDirectors.map(director => (
              <PersonCard
                key={director.id}
                name={director.name}
                role={t(`library.people.roles.${String(director.job || 'director').toLowerCase()}`, director.job || 'Director')}
                avatarUrl={director.profile_path ? resolvePersonAvatarUrl(director.profile_path) : undefined}
                onClick={() => navigate(`/library/people/${director.id}`, { state: { allowAdult: true } })}
              />
            ))}
          </Grid>
        </Stack>
      )}

      {filteredWriters && filteredWriters.length > 0 && (
        <Stack gap="md">
          <Text as="h4" variant="caption" uppercase color="muted">
            {t('library.details.writers') || 'Writers / Creators'}
          </Text>
          <Grid variant="actor-picker" gap="md">
            {filteredWriters.map(writer => (
              <PersonCard
                key={writer.id}
                name={writer.name}
                role={t(`library.people.roles.${String(writer.job || 'writer').toLowerCase()}`, writer.job || 'Writer')}
                avatarUrl={writer.profile_path ? resolvePersonAvatarUrl(writer.profile_path) : undefined}
                onClick={() => navigate(`/library/people/${writer.id}`, { state: { allowAdult: true } })}
              />
            ))}
          </Grid>
        </Stack>
      )}

      {filteredCast && filteredCast.length > 0 && (
        <Stack gap="md">
          <Text as="h4" variant="caption" uppercase color="muted">
            {t('library.details.actors') || 'Actors'}
          </Text>
          <Grid variant="actor-picker" gap="md">
            {filteredCast.map(actor => (
              <PersonCard
                key={actor.id}
                name={actor.name}
                role={actor.character || t('library.people.roles.actor') || 'Actor'}
                avatarUrl={actor.profile_path ? resolvePersonAvatarUrl(actor.profile_path) : undefined}
                isActor={true}
                onClick={() => navigate(`/library/people/${actor.id}`, { state: { allowAdult: true } })}
              />
            ))}
          </Grid>
        </Stack>
      )}
    </Stack>
  );
}
