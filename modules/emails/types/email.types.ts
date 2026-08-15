export type EmailResult =
	{ success: true; data: { id: string } } | { success: false; error: unknown };

/**
 * Adresse de livraison telle que le schéma lean la porte sur Order : un nom
 * unique (`customerName`) et les colonnes `shipping*` remplies par Stripe
 * Checkout au webhook. Tous les champs sont nullables — une commande PENDING
 * n'a pas encore d'adresse.
 */
export type ShippingAddress = {
	name: string | null;
	line1: string | null;
	line2?: string | null;
	postalCode: string | null;
	city: string | null;
	country: string | null;
};

/**
 * Ligne de commande vue par les emails — décalque des snapshots OrderItem du
 * schéma lean (`nameSnapshot`, `variantSnapshot`, `unitPriceCents`).
 */
export type OrderItem = {
	name: string;
	/** Ex. « Rose bonbon · 18cm · Acier inoxydable » — null si variante sans axe. */
	variantLabel: string | null;
	quantity: number;
	unitPriceCents: number;
};
