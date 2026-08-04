export const COLLECTION_TEXTS = {
	PLACEHOLDER: {
		COMING_SOON: "Bientôt disponible",
	},
	PRICING: {
		PRICE_LABEL: "Prix : ",
		/** Préfixe « from-price » sur les cartes collection (convention Baymard). */
		FROM_LABEL: "À partir de",
	},
	/** Préfixe de l'eyebrow de la carte planche-contact (rendu en capitales par CSS). */
	CARD_EYEBROW_PREFIX: "Collection",
	/** « créations » (pas « articles ») — vocabulaire atelier, redesign 2026-08-03. */
	PRODUCT_COUNT: (count: number) => `${count} création${count > 1 ? "s" : ""}`,
	/** Signal neutre pour une collection sans produit publié (0 article). */
	PRODUCT_COUNT_EMPTY: "Bientôt",
} as const;
