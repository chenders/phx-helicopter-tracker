-- Read-only Postgres role for the Postgres MCP server (crystaldba/postgres-mcp).
--
-- WHY: the MCP lets an agent introspect the schema and run EXPLAIN/health queries to
-- catch missing-index / N+1 / bad-plan bugs. This project's flight/position/radio data is
-- IRREPLACEABLE lawsuit evidence, so the MCP connects as a role that can ONLY SELECT —
-- defense-in-depth on top of the server's `--access-mode=restricted`. Even if restricted
-- mode were bypassed, this role cannot INSERT/UPDATE/DELETE/DROP anything.
--
-- RUN AGAINST THE LOCAL/DEV DATABASE ONLY — never production. The DB must be up. Example:
--   docker compose up -d db
--   docker compose exec -T db psql -U postgres -d phoenix_helicopters \
--       -v mcp_pw="'REPLACE_WITH_THE_PASSWORD_IN_YOUR_LOCAL_MCP_CONFIG'" \
--       -f - < scripts/setup_mcp_readonly_role.sql
-- (the password value must be wrapped in single quotes inside the double quotes, as shown)
--
-- The matching connection string lives in your LOCAL Claude MCP config (not committed):
--   postgresql://mcp_readonly:<password>@localhost:5433/phoenix_helicopters

\set ON_ERROR_STOP on

-- Create the role only if it doesn't already exist (\gexec runs the generated statement).
SELECT 'CREATE ROLE mcp_readonly LOGIN'
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mcp_readonly')\gexec

-- Set/refresh the password (works whether the role was just created or already existed).
ALTER ROLE mcp_readonly LOGIN PASSWORD :'mcp_pw';

-- Grant read-only access. No INSERT/UPDATE/DELETE/TRUNCATE/CREATE is ever granted.
GRANT CONNECT ON DATABASE phoenix_helicopters TO mcp_readonly;
GRANT USAGE  ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
-- Future tables created later are readable too, without re-granting.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
-- Belt-and-suspenders: make sure the role cannot create objects in public.
REVOKE CREATE ON SCHEMA public FROM mcp_readonly;

-- Verify (should show rolcanlogin=t, rolsuper=f, rolcreatedb=f, rolcreaterole=f):
SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin
FROM pg_roles WHERE rolname = 'mcp_readonly';
