"""Remove content classification from source roots

Revision ID: e7c91b4a2d60
Revises: d32f7a5c91be
Create Date: 2026-06-21
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7c91b4a2d60"
down_revision: Union[str, Sequence[str], None] = "d32f7a5c91be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("libraries", schema=None) as batch_op:
        batch_op.drop_index("ix_libraries_is_adult")
        batch_op.drop_column("is_adult")


def downgrade() -> None:
    with op.batch_alter_table("libraries", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "is_adult",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            )
        )
        batch_op.create_index(
            "ix_libraries_is_adult",
            ["is_adult"],
            unique=False,
        )
