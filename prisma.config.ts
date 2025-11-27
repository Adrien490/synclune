import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "tsx prisma/seed.ts",
	},
	datasource: {
		// Utiliser connexion directe pour les migrations (PgBouncer incompatible avec certaines opérations)
		url: env("POSTGRES_URL_NON_POOLING") || env("DATABASE_URL"),
	},
});
