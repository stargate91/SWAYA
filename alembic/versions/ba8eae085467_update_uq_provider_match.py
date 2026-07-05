"""update_uq_provider_match

Revision ID: ba8eae085467
Revises: e7c91b4a2d60
Create Date: 2026-06-21 19:52:29.095720

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'ba8eae085467'
down_revision: Union[str, Sequence[str], None] = 'e7c91b4a2d60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('metadata_matches', schema=None) as batch_op:
        batch_op.drop_constraint('uq_provider_match', type_='unique')
        batch_op.create_unique_constraint('uq_provider_match', ['media_item_id', 'provider', 'external_id', 'media_type'])


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('metadata_matches', schema=None) as batch_op:
        batch_op.drop_constraint('uq_provider_match', type_='unique')
        batch_op.create_unique_constraint('uq_provider_match', ['provider', 'external_id', 'media_type'])


    # ### end Alembic commands ###
