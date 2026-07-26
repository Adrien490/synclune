// Sélecteur pur extrait de `reviews-pull-quote.tsx` : un fichier de composants
// qui exporte aussi des non-composants casse le Fast Refresh.
import type { ReviewHomepage } from "@/modules/reviews/types/review.types";

/** Bornes de longueur d'une citation « d'un trait » (lisible en grand script). */
const PULL_QUOTE_MIN_LENGTH = 40;
const PULL_QUOTE_MAX_LENGTH = 140;

/**
 * Sélectionne l'avis à mettre en exergue : premier 5 étoiles dont le texte
 * tient d'un trait (40-140 caractères). `getFeaturedReviews` arrive déjà trié
 * rating desc puis date desc. Aucun candidat → null (pré-lancement safe).
 */
export function pickPullQuote(reviews: ReviewHomepage[]): ReviewHomepage | null {
	return (
		reviews.find(
			(r) =>
				r.rating === 5 &&
				r.content.length >= PULL_QUOTE_MIN_LENGTH &&
				r.content.length <= PULL_QUOTE_MAX_LENGTH,
		) ?? null
	);
}
