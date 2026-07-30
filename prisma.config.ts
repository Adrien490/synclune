import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	datasource: {
		// For migrations, use DATABASE_URL_UNPOOLED (direct Neon endpoint) to avoid PgBouncer DDL issues:
		// DATABASE_URL=<unpooled_url> pnpm prisma migrate deploy
		url: env("DATABASE_URL"),

		// `prisma migrate dev` needs a throwaway database to replay the whole history
		// into (the "shadow database") before diffing. Against a Neon pooled endpoint it
		// cannot create one and fails with P3006 — which is why `migrate dev` has been
		// unusable in this repo, and why migrations were written by hand via
		// `db execute` + `migrate resolve --applied`. That workaround marks a migration
		// as applied WITHOUT checking it reproduces the schema: it is the documented root
		// cause of the 143-migration history that could not be replayed and had to be
		// baselined into `0_init` (audit 2026-07-26).
		//
		// Point SHADOW_DATABASE_URL at a dedicated empty Neon database (or branch) —
		// never at a database holding real data: Prisma DROPs and recreates its schema on
		// every run. Optional: unset, `migrate dev` keeps failing as before and
		// `migrate deploy` / `migrate resolve` are unaffected.
		//
		// ⚠️ Spread conditionnel, PAS `env("SHADOW_DATABASE_URL")` : `env()` est STRICT et
		// lève `PrismaConfigEnvError: Cannot resolve environment variable` quand la
		// variable est absente. Comme ce fichier est chargé par TOUTES les commandes
		// Prisma, un `env()` ici casse `prisma generate` — donc `pnpm build` — sur toute
		// machine et tout CI qui ne définissent pas cette variable optionnelle.
		...(process.env.SHADOW_DATABASE_URL
			? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
			: {}),
	},
});
