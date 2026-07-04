import MovieCollectionHeroSection from './MovieCollectionHeroSection';
import PeopleHeroSection from './PeopleHeroSection';

export default function EntityDetailHeroSection(props) {
  if (props.isPeople) {
    return <PeopleHeroSection {...props} />;
  }
  return <MovieCollectionHeroSection {...props} />;
}
