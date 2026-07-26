import { AnimatedNumber } from "@/shared/components/animations/animated-number";
import { Fade } from "@/shared/components/animations";
import { getPublicCollectionCount } from "@/modules/collections/data/get-public-collection-count";
import { getPublicProductCount } from "@/modules/products/data/get-public-product-count";

/**
 * Seuil d'affichage : en dessous, les chiffres desserviraient la marque
 * (catalogue jeune / pré-lancement) — la bande se masque entièrement.
 */
export const ATELIER_STATS_MIN_PRODUCTS = 4;

/**
 * Bande de chiffres de l'atelier — payoff après la timeline du process créatif.
 *
 * Rendu via le pattern « slot » (prop ReactNode de page.tsx à travers
 * AtelierSection `"use cache"` reference) : les counts vivent au profil
 * `catalog` de leurs data functions, sans figer la section 7 jours.
 * AnimatedNumber gère useInView + reduced-motion (valeur finale directe).
 */
export async function AtelierStats() {
	const [productCount, collectionCount] = await Promise.all([
		getPublicProductCount(),
		getPublicCollectionCount(),
	]);

	if (productCount < ATELIER_STATS_MIN_PRODUCTS) return null;

	return (
		<Fade inView once y={20} className="mt-12 sm:mt-16">
			<dl className="flex flex-wrap items-start justify-center gap-x-10 gap-y-8 sm:gap-x-16">
				<div className="text-center">
					<dt className="sr-only">Nombre de créations uniques</dt>
					<dd>
						<span className="font-display block text-3xl font-medium sm:text-4xl">
							<AnimatedNumber value={productCount} />
						</span>
						<span className="text-muted-foreground mt-1 block text-sm" aria-hidden="true">
							créations uniques
						</span>
					</dd>
				</div>

				{collectionCount > 0 && (
					<div className="text-center">
						<dt className="sr-only">Nombre de collections</dt>
						<dd>
							<span className="font-display block text-3xl font-medium sm:text-4xl">
								<AnimatedNumber value={collectionCount} />
							</span>
							<span className="text-muted-foreground mt-1 block text-sm" aria-hidden="true">
								{collectionCount > 1 ? "collections" : "collection"}
							</span>
						</dd>
					</div>
				)}

				<div className="text-center">
					<dt className="sr-only">Part de créations faites main</dt>
					<dd>
						{/* « % » statique hors AnimatedNumber : une fonction `formatter` ne peut pas
						    traverser la frontière server→client (RSC serialization). */}
						<span className="font-display block text-3xl font-medium sm:text-4xl">
							<AnimatedNumber value={100} />
							&nbsp;%
						</span>
						<span className="text-muted-foreground mt-1 block text-sm" aria-hidden="true">
							faits main à Nantes
						</span>
					</dd>
				</div>
			</dl>
		</Fade>
	);
}
