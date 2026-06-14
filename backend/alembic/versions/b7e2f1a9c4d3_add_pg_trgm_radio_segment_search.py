"""add pg_trgm + GIN trigram index on radio_segments.text for search

Enables fast, typo-tolerant, indexed search over radio transcription segments
(ILIKE substring + word_similarity fuzzy matching) used by /api/v1/radio/search.

Revision ID: b7e2f1a9c4d3
Revises: f6127cc4f43a
Create Date: 2026-06-14 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7e2f1a9c4d3"
down_revision: Union[str, None] = "f6127cc4f43a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Trigram extension powers ILIKE acceleration + similarity()/word_similarity().
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    # GIN trigram index makes substring (ILIKE '%q%') and fuzzy (q <% text) search
    # index-accelerated instead of a full table scan.
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_radio_segments_text_trgm "
        "ON radio_segments USING gin (text gin_trgm_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_radio_segments_text_trgm")
    # Leave the pg_trgm extension installed; it is cheap and may be used elsewhere.
