/**
 * Utilitaires pour la gestion des notes/ratings
 *
 * Fonctions génériques pour le calcul, formatage et affichage
 * des systèmes de notation (étoiles, notes, etc.)
 */

/**
 * Calcule la note moyenne à partir d'une liste de notes
 *
 * @param ratings - Liste des notes
 * @returns Moyenne arrondie à 2 décimales
 */
export function calculateAverageRating(ratings: number[]): number {
	if (ratings.length === 0) return 0
	const sum = ratings.reduce((acc, rating) => acc + rating, 0)
	return Math.round((sum / ratings.length) * 100) / 100
}

/**
 * Formate une note pour l'affichage
 * Ex: 4.5 → "4,5" (français)
 *
 * @param rating - Note à formater
 * @param locale - Locale pour le formatage (par défaut: fr-FR)
 * @returns Note formatée
 */
export function formatRating(rating: number, locale: string = "fr-FR"): string {
	return rating.toLocaleString(locale, {
		minimumFractionDigits: 1,
		maximumFractionDigits: 1,
	})
}

/**
 * Labels textuels pour les notes (système 1-5)
 */
const RATING_LABELS: Record<number, string> = {
	5: "Excellent",
	4: "Très bien",
	3: "Bien",
	2: "Passable",
	1: "Mauvais",
}

/**
 * Détermine le label textuel pour une note
 *
 * @param rating - Note (1-5)
 * @returns Label descriptif
 */
export function getRatingLabel(rating: number): string {
	return RATING_LABELS[rating] ?? ""
}
