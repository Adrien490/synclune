import { getStoreStatus } from "../data/get-store-status";
import type { StoreClosedResult } from "../types/store-settings.types";

/**
 * Returns null if orders can be placed, or closure info otherwise. Used as the
 * server-side gate for every purchase path (add-to-cart, cart update, discount,
 * checkout, payment).
 *
 * Gate unique : `StoreSettings.isClosed` (fermeture totale décidée en admin —
 * la boutique est remplacée par un écran de fermeture dans le layout).
 */
export async function assertStoreOpen(): Promise<StoreClosedResult | null> {
	const status = await getStoreStatus();

	if (!status.isClosed) {
		return null;
	}

	return {
		closed: true,
		message: status.closureMessage ?? "La boutique est temporairement fermée.",
	};
}
