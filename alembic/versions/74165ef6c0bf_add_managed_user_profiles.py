"""Add managed user profiles

Revision ID: 74165ef6c0bf
Revises: 4dbc5e8f480e
Create Date: 2026-06-21

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "74165ef6c0bf"
down_revision: Union[str, Sequence[str], None] = "4dbc5e8f480e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("pin_hash", sa.String(), nullable=True))
        batch_op.add_column(
            sa.Column("role", sa.String(), nullable=False, server_default="member")
        )
        batch_op.add_column(sa.Column("managed_by_user_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_users_role", ["role"], unique=False)
        batch_op.create_index(
            "ix_users_managed_by_user_id", ["managed_by_user_id"], unique=False
        )
        batch_op.create_foreign_key(
            "fk_users_managed_by_user_id_users",
            "users",
            ["managed_by_user_id"],
            ["id"],
            ondelete="SET NULL",
        )
        batch_op.create_check_constraint(
            "ck_users_role", "role IN ('owner', 'member', 'child')"
        )
        batch_op.create_check_constraint(
            "ck_child_cannot_allow_adult", "role != 'child' OR allow_adult = 0"
        )

    connection = op.get_bind()
    first_user_id = connection.execute(sa.text("SELECT MIN(id) FROM users")).scalar()
    if first_user_id is not None:
        connection.execute(
            sa.text("UPDATE users SET role = 'owner' WHERE id = :user_id"),
            {"user_id": first_user_id},
        )


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("ck_child_cannot_allow_adult", type_="check")
        batch_op.drop_constraint("ck_users_role", type_="check")
        batch_op.drop_constraint(
            "fk_users_managed_by_user_id_users", type_="foreignkey"
        )
        batch_op.drop_index("ix_users_managed_by_user_id")
        batch_op.drop_index("ix_users_role")
        batch_op.drop_column("managed_by_user_id")
        batch_op.drop_column("role")
        batch_op.drop_column("pin_hash")
