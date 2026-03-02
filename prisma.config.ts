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
	},
});
