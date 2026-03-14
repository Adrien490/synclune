import { getStoreStatus } from "../data/get-store-status";
import type { StoreClosedResult } from "../types/store-settings.types";

/** Returns null if store is open, or closure info if closed. Used in payment guards. */
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
