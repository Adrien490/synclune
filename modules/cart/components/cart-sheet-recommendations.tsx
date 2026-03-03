import { getRelatedProducts } from "@/modules/products/data/get-related-products";
import { formatEuro } from "@/shared/utils/format-euro";
import Image from "next/image";
import Link from "next/link";

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
		<section className="shrink-0 border-t px-4 py-3" aria-labelledby="cart-recommendations-heading">
			<h3
				id="cart-recommendations-heading"
				className="mb-2 text-xs font-semibold tracking-wide uppercase"
			>
				Vous pourriez aimer
			</h3>
			<div className="scrollbar-none flex gap-3 overflow-x-auto pb-1" data-vaul-no-drag>
				{recommendations.map((product) => {
					const primarySku = product.skus[0];
					const image = primarySku?.images[0];
					const price = primarySku?.priceInclTax;

					return (
						<Link
							key={product.id}
							href={`/creations/${product.slug}`}
							className="group/reco focus-visible:ring-ring flex w-28 shrink-0 flex-col gap-1.5 rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
							aria-label={`Voir ${product.title}${price != null ? ` — ${formatEuro(price)}` : ""}`}
						>
							<div className="bg-muted relative aspect-square w-full overflow-hidden rounded-lg border">
								{image ? (
									<Image
										src={image.thumbnailUrl ?? image.url}
										alt={image.altText ?? product.title}
										fill
										sizes="112px"
										quality={60}
										className="object-cover transition-transform duration-200 group-hover/reco:scale-105"
									/>
								) : (
									<div className="text-muted-foreground flex h-full w-full items-center justify-center text-xs">
										N/A
									</div>
								)}
							</div>
							<div className="min-w-0">
								<p className="text-foreground line-clamp-1 text-xs font-medium">{product.title}</p>
								{price != null && (
									<p className="text-muted-foreground text-xs tabular-nums">{formatEuro(price)}</p>
								)}
							</div>
						</Link>
					);
				})}
			</div>
		</section>
	);
}
