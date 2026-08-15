import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { formatEuro } from "@/shared/utils/format-euro";
import Image from "next/image";
import { CartCloseLink } from "./cart-close-link";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

/**
 * Compact cross-sell section for the cart sheet (RSC)
 *
 * Displays 4 recommended products in a horizontal scroll.
 * Uses the same recommendation algorithm as CartRecommendations but
 * renders compact cards optimized for the cart sheet context.
 */
export async function CartSheetRecommendations() {
	const recommendations = await getRelatedProducts({ limit: 4 });

	if (recommendations.length === 0) {
		return null;
	}

	return (
		/* Gouttière `px-6` comme tout le reste du panneau. Cette section était la
		   SEULE en `px-4` : 8 px d'écart sur toute la hauteur, qui la faisaient
		   lire comme une pièce rapportée. */
		<section
			className="shrink-0 border-t py-3"
			aria-labelledby="cart-sheet-recommendations-heading"
		>
			<h3
				id="cart-sheet-recommendations-heading"
				className="text-muted-foreground mb-2 px-6 text-xs font-semibold tracking-wide uppercase"
			>
				Ça irait bien avec
			</h3>
			{/* Plus rien à accorder à la couleur du panneau : `scroll-fade-x` est un
			    `mask-image`, il DISSOUT la rangée au lieu de superposer un dégradé. Le
			    défunt `fadeFromClass` devait, lui, matcher la surface réelle — sinon
			    deux liserés d'une autre couleur apparaissaient sur les bords.
			    L'affordance de défilement reste portée par les cartes elles-mêmes,
			    toutes des liens focusables : le Tab fait défiler la rangée. */}
			<div
				data-slot="scroll-fade-container"
				data-no-edge-swipe=""
				className="scroll-fade-x no-scrollbar w-full overflow-x-auto overflow-y-hidden px-6"
			>
				<div className="flex w-fit min-w-full gap-3 pb-1">
					{recommendations.map((product) => {
						const primaryVariant = product.variants[0];
						const image = product.media[0];
						const price = primaryVariant?.priceCents ?? product.priceCents;
						// Une video sans poster n'est pas decodable par l'optimiseur -> fallback texte
						const thumbSrc = image ? resolveMediaThumbSrc(image) : null;

						return (
							<CartCloseLink
								key={product.id}
								href={`/creations/${product.slug}`}
								className="focus-ring group/reco bg-card flex w-28 shrink-0 flex-col gap-1.5 rounded-md border border-transparent p-1.5 shadow-sm"
								aria-label={`Voir ${product.name} — ${formatEuro(price)}`}
							>
								<div className="bg-muted relative aspect-square w-full overflow-hidden rounded-sm">
									{image && thumbSrc ? (
										<Image
											src={thumbSrc}
											alt={image.alt ?? product.name}
											fill
											sizes="112px"
											quality={IMAGE_QUALITY.THUMBNAIL}
											placeholder="empty"
											className="object-cover transition-transform duration-200 group-hover/reco:scale-105"
										/>
									) : (
										// « Pas d'image », comme la ligne du panier — `N/A` était le seul
										// placeholder non traduit de la surface, sur un site en français
										// uniquement.
										<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
											Pas d&apos;image
										</div>
									)}
								</div>
								<div className="min-w-0">
									<p className="text-foreground line-clamp-1 text-xs font-medium">{product.name}</p>
									<p className="text-muted-foreground text-xs tabular-nums">{formatEuro(price)}</p>
								</div>
							</CartCloseLink>
						);
					})}
				</div>
			</div>
		</section>
	);
}
