/**
 * Cache tags du module invoices. Les factures étant construites depuis Order,
 * elles partagent le cache invalidation pattern via `getOrderInvalidationTags`.
 *
 * Pour l'instant aucun "use cache" n'est appliqué sur le rendu (chaque
 * téléchargement reconstruit le PDF depuis l'archive UploadThing). Si on
 * cache le `buildInvoiceData` au runtime à l'avenir, utiliser les tags ici.
 */
export const INVOICE_CACHE_TAGS = {
	BY_ORDER: (orderId: string) => `invoice-${orderId}`,
	LIST: "invoices-list",
} as const;
