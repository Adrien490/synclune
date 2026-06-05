import {
	ORDERS_AVAILABLE,
	ORDERS_PAUSED_SHORT_MESSAGE,
} from "@/shared/constants/orders-availability";
import { getStoreStatus } from "../data/get-store-status";
import type { StoreClosedResult } from "../types/store-settings.types";

/**
 * Returns null if orders can be placed, or closure info otherwise. Used as the
 * server-side gate for every purchase path (add-to-cart, cart update, discount,
 * checkout, payment).
 *
 * Deux états bloquants distincts :
 * - `ORDERS_AVAILABLE === false` : pré-lancement, commandes en pause mais
 *   boutique navigable (cf. `shared/constants/orders-availability.ts`).
 * - `StoreSettings.isClosed` : fermeture totale décidée en admin (la boutique
 *   est remplacée par un écran de fermeture dans le layout).
 */
export async function assertStoreOpen(): Promise<StoreClosedResult | null> {
	// Pré-lancement : commandes pas encore ouvertes (court-circuite tout achat).
	if (!ORDERS_AVAILABLE) {
		return {
			closed: true,
			message: ORDERS_PAUSED_SHORT_MESSAGE,
		};
	}

	const status = await getStoreStatus();

	if (!status.isClosed) {
		return null;
	}

	return {
		closed: true,
		message: status.closureMessage ?? "La boutique est temporairement fermée.",
	};
}
