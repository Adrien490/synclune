export const COLLECTION_TEXTS = {
	PLACEHOLDER: {
		COMING_SOON: "Bientôt disponible",
	},
	PRICING: {
		PRICE_LABEL: "Prix : ",
		/** Préfixe « from-price » sur les cartes collection (convention Baymard). */
		FROM_LABEL: "À partir de",
	},
	PRODUCT_COUNT: (count: number) => `${count} article${count > 1 ? "s" : ""}`,
	/** Signal neutre pour une collection sans produit publié (0 article). */
	PRODUCT_COUNT_EMPTY: "Bientôt",
} as const;
