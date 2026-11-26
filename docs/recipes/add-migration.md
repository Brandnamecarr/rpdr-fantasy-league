# Recipe: Change the Database Schema

> Prisma migrations. Source of truth: `prisma/schema.prisma` and `prisma/migrations/`. Production applies migrations automatically on container start (`entrypoint.sh` → `prisma migrate deploy`).

1. Edit `prisma/schema.prisma`. Match the existing conventions:
   - `camelCase` fields.
   - `@default` values on new columns, so existing rows stay valid.
   - Indexes on lookup columns such as `@@index([franchise, season])`.
   - `@@unique` where code relies on there being only one row.
2. Create the migration against your **local** database (with `DATABASE_URL` in `.env`):
   ```bash
   ./prisma/doPrismaMigration.sh <snake_case_name>   # = prisma migrate dev --name X && prisma generate
   ```
   On Windows, use `prisma\doPrismaMigration.bat`.
3. Read the generated `prisma/migrations/<timestamp>_<name>/migration.sql`. Look for `DROP` statements and for `NOT NULL` columns without a default; either would break production data.
4. Commit `schema.prisma` and the new migration folder together. Never edit a migration that has already been applied.
5. If the change affects a shape the web uses, update `rpdr-fantasy-web/src/components/utilities/types.ts` too (see [../contracts.md](../contracts.md)).
6. If you add a table, update `src/services/admin.service.ts` in **two** places: `TABLE_REGISTRY`, so the table appears in the admin Database tab, and `buildDatabaseDump()`/`restoreDatabaseFromDump()`, so backups include it. They're separate hardcoded lists.
7. Update [../data-model.md](../data-model.md) if the change adds a concept or a new kind of join.
