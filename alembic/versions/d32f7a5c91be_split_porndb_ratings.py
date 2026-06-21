"""Split PornDB media and performer ratings

Revision ID: d32f7a5c91be
Revises: b818a0a67d31
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d32f7a5c91be"
down_revision: Union[str, Sequence[str], None] = "b818a0a67d31"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("people", schema=None) as batch_op:
        batch_op.add_column(sa.Column("rating_porndb", sa.Float(), nullable=True))
        batch_op.create_index("ix_people_rating_porndb", ["rating_porndb"], unique=False)

    with op.batch_alter_table("metadata_matches", schema=None) as batch_op:
        batch_op.drop_column("rating")


def downgrade() -> None:
    with op.batch_alter_table("metadata_matches", schema=None) as batch_op:
        batch_op.add_column(sa.Column("rating", sa.Float(), nullable=True))

    op.execute(
        sa.text(
            "UPDATE metadata_matches "
            "SET rating = rating_porndb "
            "WHERE provider = 'PORNDB' AND rating_porndb IS NOT NULL"
        )
    )

    with op.batch_alter_table("people", schema=None) as batch_op:
        batch_op.drop_index("ix_people_rating_porndb")
        batch_op.drop_column("rating_porndb")