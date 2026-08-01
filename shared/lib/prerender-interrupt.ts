import { PHASE_PRODUCTION_BUILD } from "next/constants";

/**
 * Détecte les rejets « fin de prerender » émis par Next (cacheComponents/PPR).
 *
 * Pendant la génération statique, une source dynamique (`headers()`, `cookies()`)
 * ou une lecture `"use cache"` encore en vol à la clôture du shell est avortée :
 * le rendu en cours est jeté, et l'attente rejette avec un signal de contrôle —
 * pas un incident. Trois formes observées :
 *
 * - `digest: "HANGING_PROMISE_REJECTION"` — `headers()`/`cookies()` rejettent à la
 *   clôture du prerender (`HangingPromiseRejectionError`, `next/dist/server/dynamic-rendering-utils`) ;
 * - `digest: "NEXT_PRERENDER_INTERRUPTED"` — accès dynamique qui interrompt un
 *   prerender (`next/dist/server/app-render/dynamic-rendering`) ;
 * - `Error: Connection closed.` SANS digest — une lecture `"use cache"` avortée à la
 *   clôture : l'entrée transite par un flux Flight (react-server-dom) que Next ferme,
 *   et le client Flight rejette avec ce message nu. Gaté sur `NEXT_PHASE` build :
 *   à l'exécution, le même message peut venir d'un vrai incident réseau/DB et doit
 *   rester loggé.
 *
 * Un appelant qui reconnaît ce signal peut rendre son repli SANS le logger : le
 * résultat du rendu est de toute façon abandonné. Ne JAMAIS utiliser ce prédicat
 * pour mettre le repli en cache — le repli appartient au wrapper, hors du scope
 * `"use cache"` (cf. `get-products.ts` / `get-collections.ts`).
 */
export function isPrerenderInterrupt(e: unknown): boolean {
	if (typeof e !== "object" || e === null) return false;

	const digest = (e as { digest?: unknown }).digest;
	if (digest === "HANGING_PROMISE_REJECTION" || digest === "NEXT_PRERENDER_INTERRUPTED") {
		return true;
	}

	if (e instanceof Error) {
		if (e.message === "Connection closed." && process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
			return true;
		}
		// Même récursion sur `cause` que `unstable_rethrow` de Next.
		if (e.cause !== undefined && e.cause !== e) {
			return isPrerenderInterrupt(e.cause);
		}
	}

	return false;
}
