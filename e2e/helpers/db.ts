import { PrismaClient } from "../../app/generated/prisma/client";
import { createPrismaAdapter } from "./prisma-adapter";

/**
 * Client Prisma partagé des specs e2e (même pattern que global-teardown).
 *
 * Les specs qui créent des données utilisent des emails `e2e-…@synclune-test.com`
 * (cf. `helpers/test-run.ts`) : le teardown global ramasse ce que le nettoyage
 * in-spec aurait raté (crash, timeout).
 */
let client: PrismaClient | null = null;

export function getE2ePrisma(): PrismaClient {
	if (!client) {
		const databaseUrl = process.env.DATABASE_URL;
		if (!databaseUrl) {
			throw new Error("DATABASE_URL manquant — les specs à données ne peuvent pas tourner.");
		}
		client = new PrismaClient({ adapter: createPrismaAdapter(databaseUrl) });
	}
	return client;
}
