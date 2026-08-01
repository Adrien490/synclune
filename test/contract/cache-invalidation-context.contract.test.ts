/**
 * Contrat : quelle API d'invalidation de cache est LÉGALE dans quel contexte.
 *
 * ⚠️ Ce fichier NE MOCKE PAS `next/cache`. C'est tout son intérêt.
 *
 * 247 fichiers de test du repo font `vi.mock("next/cache")` et remplacent
 * `updateTag` par un `vi.fn()` qui ne throw jamais. La suite était donc
 * structurellement aveugle à la contrainte ci-dessous, et trois audits cache
 * successifs (87, 92, 95 — 2026-07-02 → 2026-07-06) l'ont manquée. L'un d'eux a
 * même migré l'intégralité du repo `revalidateTag` → `updateTag` et compté
 * « 0 revalidateTag résiduel » comme un progrès.
 *
 * Ce que Next 16 impose (`node_modules/next/dist/server/web/spec-extension/revalidate.js:53`) :
 *
 *   if (!workStore || workStore.page.endsWith('/route')) { throw ... } // E872
 *
 * Le test porte sur la ROUTE EN COURS D'EXÉCUTION, pas sur le module où l'appel
 * est écrit. Un service `modules/cron/services/*.ts` invoqué depuis
 * `app/api/cron/<job>/route.ts` voit donc `page` finir par `/route` → throw.
 * Symptôme en production : aucune invalidation après un paiement Stripe (tâche
 * `INVALIDATE_CACHE` en FAILED silencieux), et 500 + alerte admin sur les crons.
 *
 * Ce test survit à une montée de version de Next : si Vercel change la règle, il
 * rougit ici plutôt qu'en production.
 *
 * Cf. `shared/lib/cache.ts` — `updateTagsAfterMutation` / `revalidateTagsInBackground`.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { beforeAll, describe, expect, it } from "vitest";
import type * as RevalidateModule from "next/dist/server/web/spec-extension/revalidate.js";
import type * as WorkStorageModule from "next/dist/server/app-render/work-async-storage.external.js";

// Next crée ses AsyncLocalStorage via `globalThis.AsyncLocalStorage`, injecté par
// son bootstrap runtime (absent en contexte Vitest nu). Sans cette ligne, chaque
// accès au store lève `E504 Invariant: AsyncLocalStorage accessed in runtime
// where it is not available` et le test passerait pour de MAUVAISES raisons —
// on croirait vérifier E872 en observant E504.
globalThis.AsyncLocalStorage = AsyncLocalStorage;

let updateTag: typeof RevalidateModule.updateTag;
let revalidateTag: typeof RevalidateModule.revalidateTag;
let workAsyncStorage: typeof WorkStorageModule.workAsyncStorage;

/** Route handler : cron, webhook Stripe, route API, callback `after()`. */
const ROUTE_HANDLER_PAGE = "/api/cron/cleanup-pending-orders/route";
/** Rendu de page / Server Action : `workStore.page` ne finit PAS par `/route`. */
const SERVER_ACTION_PAGE = "/admin/ventes/commandes/[id]";

interface ProbeStore {
	page: string;
	route: string;
	incrementalCache: object;
	cacheLifeProfiles: Record<string, unknown>;
	pendingRevalidatedTags?: Array<{ tag: string; profile?: unknown }>;
}

function makeStore(page: string): ProbeStore {
	// Champs minimaux lus par `revalidate()` : `incrementalCache` (sinon invariant
	// E263) et `page` (le discriminant testé ici).
	return { page, route: page, incrementalCache: {}, cacheLifeProfiles: {} };
}

function runIn(page: string, fn: () => void): ProbeStore {
	const store = makeStore(page);
	// Le type interne du work store Next n'est pas exporté : on n'en fournit que
	// les champs lus par `revalidate()` (`page` + `incrementalCache`).
	workAsyncStorage.run(store as unknown as Parameters<typeof workAsyncStorage.run>[0], fn);
	return store;
}

beforeAll(async () => {
	const revalidateModule = await import("next/dist/server/web/spec-extension/revalidate.js");
	const storageModule = await import("next/dist/server/app-render/work-async-storage.external.js");
	updateTag = revalidateModule.updateTag;
	revalidateTag = revalidateModule.revalidateTag;
	workAsyncStorage = storageModule.workAsyncStorage;
});

describe("Contrat — invalidation de cache selon le contexte d'exécution", () => {
	describe("updateTag", () => {
		it("THROW E872 dans un route handler (cron, webhook, route API)", () => {
			expect(() => runIn(ROUTE_HANDLER_PAGE, () => updateTag("orders-list"))).toThrow(
				/updateTag can only be called from within a Server Action/,
			);
		});

		it("THROW E872 sans work store du tout (code hors rendu Next)", () => {
			expect(() => updateTag("orders-list")).toThrow(
				/updateTag can only be called from within a Server Action/,
			);
		});

		it("passe en contexte Server Action / rendu de page", () => {
			const store = runIn(SERVER_ACTION_PAGE, () => updateTag("orders-list"));

			expect(store.pendingRevalidatedTags).toEqual([{ tag: "orders-list" }]);
		});
	});

	describe("revalidateTag(tag, { expire: 0 })", () => {
		it("passe dans un route handler — c'est le remplaçant légal de updateTag", () => {
			const store = runIn(ROUTE_HANDLER_PAGE, () => revalidateTag("orders-list", { expire: 0 }));

			expect(store.pendingRevalidatedTags).toEqual([
				{ tag: "orders-list", profile: { expire: 0 } },
			]);
		});

		it("passe aussi en Server Action — un service dual-contexte peut donc l'utiliser partout", () => {
			// C'est ce qui autorise `void-invoice` / `issue-credit-note` (appelés à la
			// fois par une action admin et par un webhook/cron) à n'avoir qu'un seul
			// chemin d'invalidation, sans détection de contexte.
			const store = runIn(SERVER_ACTION_PAGE, () => revalidateTag("orders-list", { expire: 0 }));

			expect(store.pendingRevalidatedTags).toEqual([
				{ tag: "orders-list", profile: { expire: 0 } },
			]);
		});

		it("`expire: 0` marque le chemin comme revalidé — expiration immédiate, pas de stale-while-revalidate", () => {
			// Contre-épreuve de la raison pour laquelle on n'utilise PAS le profil
			// built-in "max" : il vaut { stale: 300, revalidate: 30j, expire: 365j },
			// donc l'entrée périmée continuerait d'être servie — inacceptable pour du
			// stock ou un statut de commande.
			const immediate = runIn(ROUTE_HANDLER_PAGE, () =>
				revalidateTag("sku-stock-abc", { expire: 0 }),
			);
			const swr = runIn(ROUTE_HANDLER_PAGE, () => revalidateTag("sku-stock-abc", "max"));

			expect(immediate.pendingRevalidatedTags?.[0]?.profile).toEqual({ expire: 0 });
			expect(swr.pendingRevalidatedTags?.[0]?.profile).toBe("max");
		});
	});
});
