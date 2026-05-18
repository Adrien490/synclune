/**
 * Client Prisma dédié aux integration tests. JAMAIS importer
 * `@/shared/lib/prisma` dans une suite `*.integration.test.ts` — utiliser
 * cet helper pour s'assurer qu'on tape sur la DB d'intégration et qu'on
 * n'écrit pas accidentellement en production.
 *
 * Le schema est isolé par worker pour permettre les runs parallèles sans
 * contention sur les locks FOR UPDATE (cf `vitest.integration.config.ts`
 * → `pool: "forks"`).
 */
import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

let cached: PrismaClient | null = null;

export function getIntegrationDatabaseUrl(): string {
	const base = process.env.INTEGRATION_DATABASE_URL;
	if (!base) {
		throw new Error(
			"INTEGRATION_DATABASE_URL is not set. Integration tests require a dedicated Postgres URL.",
		);
	}
	if (base.includes("prod") || base.includes("production")) {
		throw new Error(
			`Refusing to run integration tests against a URL containing 'prod' or 'production': ${base}`,
		);
	}
	const workerId = process.env.VITEST_WORKER_ID ?? "1";
	const url = new URL(base);
	url.searchParams.set("schema", `synclune_test_${workerId}`);
	return url.toString();
}

export function getIntegrationPrismaClient(): PrismaClient {
	if (cached) return cached;
	// Prisma 7 requiert un adapter. On réutilise PrismaNeon (déjà installé pour
	// la prod Neon) qui supporte tout Postgres standard via `connectionString`.
	// Override aussi `DATABASE_URL` au cas où du code interne le relit.
	const url = getIntegrationDatabaseUrl();
	process.env.DATABASE_URL = url;
	cached = new PrismaClient({
		adapter: new PrismaNeon({ connectionString: url }),
	});
	return cached;
}
