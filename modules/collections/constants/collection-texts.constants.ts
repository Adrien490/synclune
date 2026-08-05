export const COLLECTION_TEXTS = {
	// `PLACEHOLDER.COMING_SOON` et `PRICING.PRICE_LABEL` sont partis avec la carte
	// « Planche-contact » (redesign carnet 2026-08-05) : plus aucun consommateur.
	PRICING: {
		/** Préfixe « from-price » sur les bandes de collection (convention Baymard). */
		FROM_LABEL: "À partir de",
	},
	/**
	 * Repli de l'eyebrow de la carte planche-contact quand le compteur est absent
	 * (rendu en capitales par CSS).
	 *
	 * ⚠️ Repli, plus PRÉFIXE : « Collection · » a été retiré de la tête de l'eyebrow
	 * le 2026-08-05. Sur `/collections` le mot ne discriminait rien — toutes les
	 * cartes en sont une, la page s'appelle « Les collections » — tout en occupant
	 * la ligne la plus contrainte de la carte (10px, `tracking-widest`, ~135px
	 * utiles à 375px), où la chaîne complète wrappait sur deux lignes alors que le
	 * squelette n'en réserve qu'une. Même arbitrage que le retrait de « · fait
	 * main » sur ProductCard.
	 *
	 * Ne pas le supprimer pour autant : sans repli, un `productCount` indéfini
	 * rendrait un eyebrow VIDE et désalignerait la carte de ~14px de ses voisines.
	 * C'est la raison d'être du repli « Création » de `product-card.tsx`.
	 */
	CARD_EYEBROW_FALLBACK: "Collection",
	/** « créations » (pas « articles ») — vocabulaire atelier, redesign 2026-08-03. */
	PRODUCT_COUNT: (count: number) => `${count} création${count > 1 ? "s" : ""}`,
	/** Signal neutre pour une collection sans produit publié (0 article). */
	PRODUCT_COUNT_EMPTY: "Bientôt",
	/**
	 * Mot d'atelier du chapitre sans photo (« Le carnet des séries », 2026-08-05).
	 * Rendu en Kalam (`font-cursive`, décoratif — `aria-hidden`) dans le
	 * cadre en pointillé qui remplace les tirages : l'ancien `PlaceholderImage`
	 * était le seul état de la surface sans aucun geste artisanal.
	 */
	CHAPTER_EMPTY_NOTE: "encore sur l'établi…",
	/**
	 * Variante du mot d'atelier quand la collection a bien des produits publiés
	 * mais qu'aucun SKU actif ne porte de média IMAGE.
	 *
	 * ⚠️ Sans elle, l'eyebrow annonçait « 12 créations » au-dessus d'un
	 * « encore sur l'établi… » qui le contredisait. La note suit le compteur,
	 * elle ne le contredit pas (cf. `emptyNote` dans `collection-chapter.tsx`).
	 */
	CHAPTER_EMPTY_NOTE_NO_PHOTO: "photos en chemin…",
} as const;
