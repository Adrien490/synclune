import { Fade } from "@/shared/components/animations";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
import { RatingStars } from "@/shared/components/rating-stars";
import type { ReviewHomepage } from "@/modules/reviews/types/review.types";

/**
 * Citation client mise en exergue en Sacramento (`font-cursive`), guillemets
 * français teintés par l'accent de section (menthe dans Reviews).
 *
 * ⚠️ Sacramento est mono-poids 400 et déjà inclinée : jamais de `font-bold`
 * ni `italic` ici (faux-oblique/faux-gras illisibles sur un script).
 * L'avis reste visible dans la grille en dessous — c'est une mise en scène
 * typographique, pas un contenu exclusif.
 */
export function ReviewsPullQuote({ review }: { review: ReviewHomepage }) {
	const firstName = review.user.name?.split(" ")[0];

	return (
		<Fade
			y={MOTION_CONFIG.section.subtitle.y}
			duration={MOTION_CONFIG.section.subtitle.duration}
			inView
			once
			className="mx-auto mb-10 max-w-2xl text-center sm:mb-14"
		>
			<figure>
				<blockquote className="font-cursive text-foreground/90 text-2xl leading-snug sm:text-3xl lg:text-4xl">
					<span aria-hidden="true" className="text-(--section-accent,var(--primary))">
						«{" "}
					</span>
					{review.content}
					<span aria-hidden="true" className="text-(--section-accent,var(--primary))">
						{" "}
						»
					</span>
				</blockquote>
				<figcaption className="text-muted-foreground mt-3 flex items-center justify-center gap-2 text-sm">
					<RatingStars rating={review.rating} size="sm" />
					{firstName && <span>{firstName}</span>}
				</figcaption>
			</figure>
		</Fade>
	);
}
