/**
 * Copie du sélecteur de variante du panier — direction « Une pièce à la fois ».
 *
 * ⚠️ Tutoiement, sans exception. L'ancienne version vouvoyait (« Choisissez vos
 * options pour ajouter au panier », « Veuillez sélectionner une couleur ») à trois
 * mètres d'une fiche produit qui dit « Choisis tes options ». Et ces phrases étaient
 * les seules du panneau qui s'adressaient à la cliente : aucune ne lui apprenait quoi
 * que ce soit. Chez une créatrice qui vend des pièces uniques, on peut dire combien
 * de pièces existent.
 */

/** Nombres en toutes lettres jusqu'à dix — au-delà, le chiffre se lit mieux. */
const SPELLED_OUT = [
	"Zéro",
	"Une",
	"Deux",
	"Trois",
	"Quatre",
	"Cinq",
	"Six",
	"Sept",
	"Huit",
	"Neuf",
	"Dix",
] as const;

function spellCount(count: number): string {
	return SPELLED_OUT[count] ?? String(count);
}

export const SKU_SELECTOR_TEXTS = {
	/** Libellé du radiogroup — c'est lui que lisent les lecteurs d'écran. */
	PIECES_GROUP_LABEL: "Choisis ta pièce",

	/**
	 * Description sous le titre. Dérivée du nombre de pièces réellement en vitrine :
	 * c'est la seule phrase du panneau qui dit quelque chose de vrai sur le stock.
	 */
	pieceCount: (count: number): string =>
		count === 1
			? "Une seule pièce existe en ce moment."
			: `${spellCount(count)} pièces existent en ce moment. Prends la tienne.`,

	ALL_SOLD_OUT: "Tout est parti pour le moment.",
	NO_ACTIVE_SKUS: "Ce bijou n'est pas disponible en ce moment.",

	STORE_CLOSED_FALLBACK: "La boutique est fermée en ce moment — tu peux regarder, pas commander.",

	/**
	 * Stock, par pièce. Le mot porte l'information ; le point coloré n'est que
	 * redondance.
	 *
	 * ⚠️ Ces libellés vivent dans une ligne `truncate` d'environ 190 px à 390 px de
	 * viewport (~32 caractères à 12 px). Le suffixe « au panier » peut être rogné
	 * sans dommage — c'est un complément. `ALL_IN_CART`, lui, EST l'information : il
	 * explique pourquoi le bouton est désactivé, et doit tenir en entier.
	 */
	STOCK: {
		SOLD_OUT: "épuisée",
		ALL_IN_CART: "tout est dans ton panier",
		low: (left: number): string => `il n'en reste que ${left}`,
		available: (left: number): string => `${left} disponible${left > 1 ? "s" : ""}`,
		inCartSuffix: (quantity: number): string => ` · ${quantity} au panier`,
	},

	QUANTITY_LEGEND: "Quantité",
	/** ⚠️ Les trois premiers mots sont du contrat E2E — le suffixe de prix peut bouger, eux non. */
	submitLabel: (total: string): string => `Ajouter au panier · ${total}`,
	SUBMIT_PENDING: "Ajout en cours…",
	VIEW_PRODUCT: "Voir la fiche complète",
	viewProductAriaLabel: (title: string): string => `Voir la fiche complète : ${title}`,
} as const;
