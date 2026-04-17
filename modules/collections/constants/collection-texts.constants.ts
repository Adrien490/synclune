export const COLLECTION_TEXTS = {
	PLACEHOLDER: {
		COMING_SOON: "Bientôt disponible",
	},
	PRICING: {
		PRICE_LABEL: "Prix : ",
	},
	PRODUCT_COUNT: (count: number) => `${count} article${count > 1 ? "s" : ""}`,
} as const;
