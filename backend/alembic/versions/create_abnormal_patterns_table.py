"""Create abnormal_patterns table for detecting sky-writing and misuse

Revision ID: create_abnormal_patterns
Revises: create_flight_discoveries
Create Date: 2025-09-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'create_abnormal_patterns'
down_revision = 'create_flight_discoveries'
branch_labels = None
depends_on = None


def upgrade():
    # Create abnormal_patterns table
    op.create_table('abnormal_patterns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('flight_log_id', sa.Integer(), nullable=False),
        sa.Column('pattern_type', sa.String(length=50), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('detection_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('detected_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('reviewed', sa.String(length=10), server_default='pending', nullable=True),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=100), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('legal_relevance', sa.String(length=20), nullable=True),
        sa.Column('potential_violation', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['flight_log_id'], ['flight_logs.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient querying
    op.create_index('idx_abnormal_patterns_flight_log_id', 'abnormal_patterns', ['flight_log_id'])
    op.create_index('idx_abnormal_patterns_pattern_type', 'abnormal_patterns', ['pattern_type'])
    op.create_index('idx_abnormal_patterns_reviewed', 'abnormal_patterns', ['reviewed'])
    op.create_index('idx_abnormal_patterns_detected_at', 'abnormal_patterns', ['detected_at'])


def downgrade():
    op.drop_index('idx_abnormal_patterns_detected_at', table_name='abnormal_patterns')
    op.drop_index('idx_abnormal_patterns_reviewed', table_name='abnormal_patterns')
    op.drop_index('idx_abnormal_patterns_pattern_type', table_name='abnormal_patterns')
    op.drop_index('idx_abnormal_patterns_flight_log_id', table_name='abnormal_patterns')
    op.drop_table('abnormal_patterns')