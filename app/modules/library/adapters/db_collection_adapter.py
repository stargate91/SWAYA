from app.core.enums import Provider
from app.modules.metadata.models import MediaCollection


class DbCollectionAdapter:
    def get_or_create_collection_id(self, external_id: str, provider: str = "tmdb") -> int:
        try:
            prov_enum = Provider(provider.lower())
        except ValueError:
            prov_enum = Provider.TMDB

        collection = self.db.query(MediaCollection).filter(
            MediaCollection.provider == prov_enum,
            MediaCollection.external_id == external_id
        ).first()
        if not collection:
            collection = MediaCollection(
                provider=prov_enum,
                external_id=external_id
            )
            self.db.add(collection)
            self.db.flush()
        return collection.id
