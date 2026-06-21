"""Add adult performer scene count and PornDB rating

Revision ID: b818a0a67d31
Revises: 74165ef6c0bf
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b818a0a67d31"
down_revision: Union[str, Sequence[str], None] = "74165ef6c0bf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("people", schema=None) as batch_op:
        batch_op.add_column(sa.Column("scene_count", sa.Integer(), nullable=True))
        batch_op.create_index("ix_people_scene_count", ["scene_count"], unique=False)

    with op.batch_alter_table("metadata_matches", schema=None) as batch_op:
        batch_op.add_column(sa.Column("rating_porndb", sa.Float(), nullable=True))
        batch_op.create_index("ix_metadata_matches_rating_porndb", ["rating_porndb"], unique=False)

    op.execute(
        sa.text(
            "UPDATE metadata_matches "
            "SET rating_porndb = rating "
            "WHERE provider = 'PORNDB' AND rating IS NOT NULL"
        )
    )


def downgrade() -> None:
    with op.batch_alter_table("metadata_matches", schema=None) as batch_op:
        batch_op.drop_index("ix_metadata_matches_rating_porndb")
        batch_op.drop_column("rating_porndb")

    with op.batch_alter_table("people", schema=None) as batch_op:
        batch_op.drop_index("ix_people_scene_count")
        batch_op.drop_column("scene_count")
