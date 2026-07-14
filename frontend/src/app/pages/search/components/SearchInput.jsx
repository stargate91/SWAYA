import { Search } from '@/ui/icons';
import Input from '@/ui/Input';

export default function SearchInput({ localQuery, setLocalQuery, handleSearchSubmit, t }) {
  return (
    <form onSubmit={handleSearchSubmit} className="search-page-input-form">
      <Input
        type="text"
        className="search-page-input"
        placeholder={t('search.inputPlaceholder', { defaultValue: 'Type query and press Enter...' })}
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        leftElement={
          <button type="submit" className="search-page-input-btn" aria-label="Search">
            <Search size={18} />
          </button>
        }
      />
    </form>
  );
}
