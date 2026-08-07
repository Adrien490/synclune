import { unstable_rethrow } from "next/navigation";
import { prisma } from "@/shared/lib/prisma";
import { logger } from "@/shared/lib/logger";

import { STORE_SETTINGS_SINGLETON_ID, cacheStoreStatus } from "../constants/cache";
import type { StoreStatus } from "../types/store-settings.types";

const OPEN: StoreStatus = { isClosed: false, closureMessage: null, reopensAt: null };

/** Get store open/closed status for storefront gate. Fail-open: never block by accident. */
export async function getStoreStatus(): Promise<StoreStatus> {
	let cached: StoreStatus;
	try {
		cached = await fetchStoreStatus();
	} catch (err) {
		unstable_rethrow(err);
		// Fail open : si la base est indisponible, on ne bloque pas la boutique.
		//
		// ⚠️ Ce repli vit ICI, HORS du scope `"use cache"` (CACHE-DEGRADED-VALUE-001).
		// Il était DANS le corps caché jusqu'au 2026-08-07 : une panne DB d'une seconde
		// figeait « boutique ouverte » pour toute la fenêtre du profil `checkout`
		// (5 min) — exactement l'état contre lequel ce fetcher a choisi ce profil, et
		// une boutique fermée qui rouvre seule pendant 5 min laisse passer des
		// commandes. Hors cache, le repli ne vaut que pour la requête en cours.
		logger.error("Failed to fetch store status", err, {
			service: "getStoreStatus",
		});
		return OPEN;
	}

	// Read-time reopening OUTSIDE cache: if reopensAt has passed, treat the store
	// as open. Since Lot 1 (SIMPLIFICATION.md, 2026-08-03) this is the ONLY
	// mechanism — the `reopen-store` cron that used to flip the DB row was removed
	// as redundant ; the stale row is harmless and cleared at the next manual
	// close/reopen. Date.now() can NOT live inside the "use cache" body — it would
	// be frozen at cache-write time and never re-evaluate.
	if (cached.isClosed && cached.reopensAt && cached.reopensAt.getTime() <= Date.now()) {
		return OPEN;
	}

	return cached;
}

async function fetchStoreStatus(): Promise<StoreStatus> {
	"use cache";
	cacheStoreStatus();

	// ⚠️ AUCUN try/catch dans ce scope : le repli fail-open appartient au wrapper.
	const settings = await prisma.storeSettings.findUnique({
		where: { id: STORE_SETTINGS_SINGLETON_ID },
		select: {
			isClosed: true,
			closureMessage: true,
			reopensAt: true,
		},
	});

	// Singleton absent = boutique jamais configurée : ouverte. Ce n'est pas une
	// valeur dégradée (aucune erreur), la mettre en cache est correct.
	return settings ?? OPEN;
}
