import { Search } from '@/ui/icons';
import Input from '@/ui/Input';
import IconButton from '@/ui/IconButton';

export default function SearchInput({ localQuery, setLocalQuery, handleSearchSubmit, t }) {
  return (
    <form onSubmit={handleSearchSubmit} className="u-w-full">
      <Input
        type="text"
        className="search-page-input"
        placeholder={t('search.inputPlaceholder', { defaultValue: 'Type query and press Enter...' })}
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        leftElement={
          <IconButton type="submit" variant="ghost" size="xs" label="Search">
            <Search size={18} />
          </IconButton>
        }
      />
    </form>
  );
}
