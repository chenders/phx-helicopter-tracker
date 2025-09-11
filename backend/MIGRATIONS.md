# Database Migrations Guide

This project uses **Alembic** for database schema versioning and migrations. All database schema changes should be made through migrations to ensure consistency across environments.

## Setup

Alembic has been configured with:
- Configuration file: `alembic.ini`
- Migration scripts: `alembic/versions/`
- Environment config: `alembic/env.py`

## Common Commands

### Check current migration status
```bash
alembic current
```

### Create a new migration

#### Auto-generate from model changes
```bash
# Make changes to models in app/models/
# Then auto-generate migration
alembic revision --autogenerate -m "Description of changes"
```

#### Create empty migration for manual changes
```bash
alembic revision -m "Description of changes"
```

### Apply migrations

#### Upgrade to latest
```bash
alembic upgrade head
```

#### Upgrade to specific revision
```bash
alembic upgrade <revision_id>
```

#### Upgrade one step
```bash
alembic upgrade +1
```

### Downgrade migrations

#### Downgrade one step
```bash
alembic downgrade -1
```

#### Downgrade to specific revision
```bash
alembic downgrade <revision_id>
```

#### Downgrade to beginning
```bash
alembic downgrade base
```

### View migration history
```bash
alembic history
```

### Show SQL without applying
```bash
# Show upgrade SQL
alembic upgrade head --sql

# Show downgrade SQL
alembic downgrade -1 --sql
```

## Workflow for Database Changes

1. **Make model changes** in `app/models/`
   ```python
   # Example: Add a new column to Aircraft model
   class Aircraft(Base):
       __tablename__ = "aircraft"
       # ... existing fields ...
       new_field = Column(String(100))  # New field
   ```

2. **Generate migration**
   ```bash
   alembic revision --autogenerate -m "Add new_field to aircraft table"
   ```

3. **Review the generated migration**
   - Check file in `alembic/versions/`
   - Ensure upgrade() and downgrade() are correct
   - Add any custom SQL if needed

4. **Test migration**
   ```bash
   # Apply migration
   alembic upgrade head
   
   # Test your application
   
   # If issues, rollback
   alembic downgrade -1
   ```

5. **Commit migration file**
   ```bash
   git add alembic/versions/*.py
   git commit -m "Add migration for new_field"
   ```

## Docker Integration

When using Docker, run migrations inside the container:

```bash
# Run migrations in backend container
docker exec phx-pd-helicopter-tracker-backend-1 alembic upgrade head

# Check current revision
docker exec phx-pd-helicopter-tracker-backend-1 alembic current
```

## Production Deployment

For production deployments:

1. **Backup database first**
   ```bash
   pg_dump -h localhost -p 5433 -U postgres -d phoenix_helicopters > backup_$(date +%Y%m%d).sql
   ```

2. **Test migrations on staging**
   ```bash
   alembic upgrade head --sql  # Review SQL first
   alembic upgrade head         # Apply migrations
   ```

3. **Apply to production**
   ```bash
   alembic upgrade head
   ```

## Troubleshooting

### Migration conflicts
If you have conflicting migrations from different branches:
```bash
# Check current state
alembic current

# Show history
alembic history

# Merge migrations manually, then:
alembic merge -m "Merge migrations" <rev1> <rev2>
```

### Out of sync database
If database is out of sync with migrations:
```bash
# Mark database as at specific revision without running migrations
alembic stamp <revision_id>

# Or stamp as latest
alembic stamp head
```

### Failed migration
If a migration fails partway:
```bash
# Check current state
alembic current

# Manually fix database if needed
psql -h localhost -p 5433 -U postgres -d phoenix_helicopters

# Then stamp to correct revision
alembic stamp <revision_id>
```

## Initial Setup Notes

The initial migration was created from the existing database schema:
- Migration ID: `e9e85a9bf3fd`
- Created: 2025-09-10
- Description: "Initial migration with existing schema"

This migration captures the current state of all tables and indexes. The database has been stamped with this migration, so future changes should be made through new migrations.

## Best Practices

1. **Always review auto-generated migrations** - Alembic may not capture everything correctly
2. **Test migrations locally first** - Use a copy of production data if possible
3. **Include both upgrade and downgrade** - Ensure migrations are reversible
4. **Use descriptive messages** - Make it clear what each migration does
5. **Small, focused migrations** - One logical change per migration
6. **Never edit applied migrations** - Create new migrations to fix issues
7. **Backup before major changes** - Especially for destructive operations

## Environment Variables

Alembic uses the database URL from `alembic.ini`:
```ini
sqlalchemy.url = postgresql://postgres:postgres@localhost:5433/phoenix_helicopters
```

For different environments, you can override this:
```bash
# Using environment variable
DATABASE_URL=postgresql://user:pass@host/db alembic upgrade head
```

## Related Files

- `alembic.ini` - Alembic configuration
- `alembic/env.py` - Environment configuration
- `alembic/versions/` - Migration files
- `app/models/` - SQLAlchemy models
- `init.sql` - Reference SQL schema (for documentation)
