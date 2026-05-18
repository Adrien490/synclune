/**
 * UI Copy - Single Source of Truth (SSOT) pour la terminologie storefront.
 *
 * Centralise les termes canoniques pour garantir la cohérence éditoriale
 * entre composants (nav, empty states, toasts, error pages, footer).
 *
 * Voix de marque : 1ʳᵉ personne, ton artisanal premium, intime.
 * Cf. BRAND.tagline = « Créations uniques faites avec amour ».
 */
export const UI_COPY = {
	product: {
		plural: "Les créations",
		singular: "Création",
		discover: "Découvrir les créations",
	},
	cart: {
		label: "Mon panier",
		add: "Ajouter au panier",
		empty: "Votre panier est vide",
	},
	wishlist: {
		label: "Mes favoris",
		empty: "Votre liste de favoris est vide",
	},
	checkout: {
		cta: "Passer commande",
		page: "Finaliser ma commande",
	},
	auth: {
		signIn: "Se connecter",
		signUp: "Créer un compte",
		signOut: "Se déconnecter",
	},
	errors: {
		generic: "Une erreur est survenue. Merci de réessayer.",
		network: "Connexion perdue. Vérifiez votre réseau.",
		notFound: "Cette page n'existe pas ou plus.",
		retry: "Réessayer",
		backHome: "Retour à l'accueil",
	},
	empty: {
		search: "Aucun résultat. Essayez d'autres mots-clés ou parcourez les collections.",
		searchWithQuery: (query: string) =>
			`Aucun résultat pour « ${query} ». Essayez d'autres mots-clés ou parcourez les collections.`,
	},
} as const;
