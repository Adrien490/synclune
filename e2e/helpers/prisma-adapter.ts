import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Adapter Prisma choisi PAR HOST — SSOT pour les utilitaires e2e.
 *
 * ⚠️ `@neondatabase/serverless` parle au proxy WebSocket de Neon. Un Postgres
 * standard (service container de la CI, docker local) ne l'expose pas : la
 * connexion échoue sur un `ErrorEvent { type: 'error' }` opaque, sans message
 * ni code exploitable. C'est cette erreur qui a fait tomber ~50 tests admin en
 * CI le 2026-08-16 — tous ceux qui créent leurs fixtures via `getE2ePrisma()`.
 *
 * La règle existait déjà dans `test/integration/prisma-client.ts` mais avait
 * été recopiée à la main ailleurs, donc oubliée ici et dans le teardown. Elle
 * vit désormais à un seul endroit pour les helpers e2e ; les deux autres
 * porteurs (`shared/lib/prisma.ts`, `prisma/seed.ts`) ne peuvent pas importer
 * ce module — l'un est `server-only`, l'autre tourne hors du bundle Next — et
 * gardent leur copie, signalée en commentaire.
 *
 * En production comme sur Neon, `*.neon.tech` → `PrismaNeon` : rien ne change.
 */
export function createPrismaAdapter(connectionString: string) {
	let isNeon = true;
	try {
		isNeon = new URL(connectionString).hostname.endsWith(".neon.tech");
	} catch {
		// URL malformée : on garde le comportement historique plutôt que de
		// basculer silencieusement de driver sur une valeur incomprise.
		isNeon = true;
	}
	return isNeon ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
}
