import "server-only";

import { logger } from "@/shared/lib/logger";
import { prisma } from "@/shared/lib/prisma";

let cached: Promise<boolean> | null = null;

async function check(): Promise<boolean> {
	try {
		const result = await prisma.$queryRaw<{ extname: string }[]>`
			SELECT extname::text FROM pg_extension WHERE extname = 'pg_trgm'
		`;
		const available = result.length > 0;
		if (!available) {
			logger.warn("Extension pg_trgm non installée - recherche fuzzy désactivée", {
				service: "pg-trgm-availability",
			});
		}
		return available;
	} catch (error) {
		logger.error("Erreur vérification pg_trgm", error, {
			service: "pg-trgm-availability",
		});
		return false;
	}
}

/**
 * Returns whether the pg_trgm extension is installed in the connected database.
 *
 * Result is cached at module level for the lifetime of the process. Extensions
 * are installed via Prisma migrations and don't change at runtime, so a process
 * restart (deploy, cold start) is enough to pick up changes.
 *
 * Used by fuzzy search call sites to gracefully degrade to ILIKE-only when
 * the extension is unavailable rather than throwing on the `%` / `<%` operators.
 */
export function isPgTrgmAvailable(): Promise<boolean> {
	cached ??= check();
	return cached;
}

/**
 * Reset the cached availability check. Tests only.
 */
export function resetPgTrgmAvailabilityCache(): void {
	cached = null;
}
