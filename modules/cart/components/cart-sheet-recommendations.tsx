import { resolveMediaThumbSrc } from "@/modules/media/utils/media-utils";
import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import ScrollFade from "@/shared/components/scroll-fade";
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
		<section
			className="shrink-0 border-t py-3"
			aria-labelledby="cart-sheet-recommendations-heading"
		>
			<h3
				id="cart-sheet-recommendations-heading"
				className="mb-2 px-4 text-xs font-semibold tracking-wide uppercase"
			>
				Vous pourriez aimer
			</h3>
			<ScrollFade axis="horizontal" className="px-4">
				<div className="flex gap-3 pb-1">
					{recommendations.map((product) => {
						const primarySku = product.skus[0];
						const image = primarySku?.images[0];
						const price = primarySku?.priceInclTax;
						// Une video sans poster n'est pas decodable par l'optimiseur -> fallback texte
						const thumbSrc = image ? resolveMediaThumbSrc(image) : null;

						return (
							<CartCloseLink
								key={product.id}
								href={`/creations/${product.slug}`}
								className="group/reco focus-visible:ring-ring flex w-28 shrink-0 flex-col gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
								aria-label={`Voir ${product.title}${price != null ? ` — ${formatEuro(price)}` : ""}`}
							>
								<div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border">
									{image && thumbSrc ? (
										<Image
											src={thumbSrc}
											alt={image.altText ?? product.title}
											fill
											sizes="112px"
											quality={IMAGE_QUALITY.THUMBNAIL}
											placeholder={image.blurDataUrl ? "blur" : "empty"}
											blurDataURL={image.blurDataUrl ?? undefined}
											className="object-cover transition-transform duration-200 group-hover/reco:scale-105"
										/>
									) : (
										<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
											N/A
										</div>
									)}
								</div>
								<div className="min-w-0">
									<p className="text-foreground line-clamp-1 text-xs font-medium">
										{product.title}
									</p>
									{price != null && (
										<p className="text-muted-foreground text-xs tabular-nums">
											{formatEuro(price)}
										</p>
									)}
								</div>
							</CartCloseLink>
						);
					})}
				</div>
			</ScrollFade>
		</section>
	);
}
