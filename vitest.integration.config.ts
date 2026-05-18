/**
 * Vitest config pour la suite d'integration tests (DB réelle Postgres).
 *
 * Séparée de `vitest.config.ts` pour ne pas alourdir `pnpm test` (rapide) avec
 * des specs nécessitant une connexion DB. Lancée explicitement via
 * `pnpm test:integration`.
 *
 * Pré-requis : `INTEGRATION_DATABASE_URL` exporté (pointant sur une DB Postgres
 * dédiée — JAMAIS la prod). Le setup `test/integration/setup.ts` skip toute la
 * suite avec un warning si la variable est absente.
 *
 * Schéma isolé par worker : `?schema=synclune_test_${VITEST_WORKER_ID}` permet
 * le run parallèle sans conflit. Truncate-all entre chaque test.
 */
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	resolve: {
		alias: {
			"@": resolve(__dirname, "."),
			"server-only": resolve(__dirname, "shared/lib/__mocks__/server-only.ts"),
		},
	},
	test: {
		pool: "forks", // fork-isolated workers — chaque worker a sa propre connexion Prisma + schema dédié
		include: ["**/*.integration.test.ts"],
		exclude: ["node_modules", ".next", ".claude/worktrees/**"],
		environment: "node",
		setupFiles: ["./test/integration/setup.ts"],
		testTimeout: 30_000, // DB ops + transactions peuvent être lentes
		hookTimeout: 60_000, // prisma db push initial peut prendre ~30s
		sequence: { concurrent: false }, // sérialise pour éviter contention sur les locks FOR UPDATE
	},
});
