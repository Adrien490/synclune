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
import { PrismaPg } from "@prisma/adapter-pg";

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
	// Prisma 7 requiert un adapter. Sélection par host : un Postgres standard
	// (service container CI, docker local) n'expose pas le proxy WebSocket Neon
	// — @neondatabase/serverless ne peut pas s'y connecter. Neon → PrismaNeon
	// (WSS), sinon PrismaPg (TCP direct).
	// Override aussi `DATABASE_URL` au cas où du code interne le relit.
	const url = getIntegrationDatabaseUrl();
	process.env.DATABASE_URL = url;
	// Le schéma par-worker est passé explicitement à l'adapter : les drivers
	// pg/neon ignorent le search param `?schema=` (convention CLI Prisma).
	const schema = new URL(url).searchParams.get("schema") ?? undefined;
	const adapter = new URL(url).hostname.endsWith(".neon.tech")
		? new PrismaNeon({ connectionString: url }, { schema })
		: new PrismaPg({ connectionString: url }, { schema });
	cached = new PrismaClient({ adapter });
	return cached;
}
