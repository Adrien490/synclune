/** Minimal store status for storefront gate */
export interface StoreStatus {
	isClosed: boolean;
	closureMessage: string | null;
	reopensAt: Date | null;
}

/** Result returned by assertStoreOpen() when store is closed */
export interface StoreClosedResult {
	closed: true;
	message: string;
}

/** Full store settings for admin */
export interface StoreSettingsAdmin extends StoreStatus {
	id: string;
	closedAt: Date | null;
	closedBy: string | null;
	updatedAt: Date;
}
