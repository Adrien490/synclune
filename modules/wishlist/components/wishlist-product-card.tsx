import type { GetWishlistReturn } from '@/modules/wishlist/data/get-wishlist'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { WishlistRemoveButton } from '@/modules/wishlist/components/wishlist-remove-button'
import { FALLBACK_IMAGE_URL } from '@/modules/media/constants/product-fallback-image.constants'
import { cn } from "@/shared/utils/cn"
import Image from "next/image"
import Link from "next/link"
import { ViewTransition } from "react"
import { IMAGE_SIZES, PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants"
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants"
import { ProductPriceCompact } from "@/modules/products/components/product-price"

interface WishlistProductCardProps {
	item: NonNullable<GetWishlistReturn>['items'][number]
}

/**
 * Product Card pour la wishlist - Server Component
 *
 * Pattern:
 * - Card spécialisée pour la wishlist avec affichage du prix à l'ajout
 * - Ajoute WishlistRemoveButton (Client Component)
 * - Affiche price snapshot avec indication si baisse de prix
 * - Source de vérité unique (DB) pour éviter désynchronisations
 */
export function WishlistProductCard({
	item,
}: WishlistProductCardProps) {
	const { sku, priceAtAdd } = item
	const { product, priceInclTax, images, inventory, isActive } = sku

	// Prix snapshot vs prix actuel (pour notifications futures)
	const priceDifference = priceInclTax - priceAtAdd
	const priceDropped = priceDifference < 0
	const priceIncreased = priceDifference > 0

	// Vérifier si le produit est disponible
	const isProductArchived = product.status === 'ARCHIVED'

	// Image primaire
	const primaryImage = images[0]

	// Stock
	const stockStatus = inventory === 0 ? 'out_of_stock' : 'in_stock'
	const stockMessage = inventory === 0 ? 'Rupture de stock' : 'En stock'
	const showUrgencyBadge =
		stockStatus === "in_stock" &&
		typeof inventory === "number" &&
		inventory > 0 &&
		inventory <= STOCK_THRESHOLDS.LOW &&
		!priceDropped &&
		!priceIncreased

	// URL et IDs
	const productUrl = `/creations/${product.slug}`
	const sanitizedSlug = product.slug.replace(/[^a-z0-9-]/gi, "")
	const titleId = `wishlist-product-title-${sanitizedSlug}`

	return (
		<div className="relative group">
			<article
				className={cn(
					"product-card grid relative overflow-hidden bg-card rounded-lg group border-2 border-transparent gap-4",
					"transition-all duration-300 ease-out",
					"shadow-sm motion-safe:hover:border-primary/30 motion-safe:hover:shadow-xl motion-safe:hover:shadow-primary/15",
					"motion-safe:hover:-translate-y-1.5 motion-safe:hover:scale-[1.01] will-change-transform",
					"active:scale-[0.98]"
				)}
				itemScope
				itemType="https://schema.org/Product"
			>
				<Link
					href={productUrl}
					className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm transition-all duration-300 ease-out relative z-10"
					aria-labelledby={titleId}
				>
					<div className="product-card-media relative aspect-4/5 overflow-hidden bg-muted transition-all duration-400 rounded-lg">
						{/* Badge rupture de stock */}
						{stockStatus === "out_of_stock" && (
							<div
								role="status"
								aria-label={stockMessage}
								className="absolute top-2.5 left-2.5 bg-foreground/80 text-background px-2.5 py-1 rounded-full text-xs font-medium z-10 shadow-md backdrop-blur-sm"
							>
								{stockMessage}
							</div>
						)}
						{/* Badge urgency - Stock bas mais disponible */}
						{showUrgencyBadge && (
							<div
								role="status"
								aria-label={`Stock limité : plus que ${inventory} exemplaire${inventory && inventory > 1 ? "s" : ""} disponible${inventory && inventory > 1 ? "s" : ""}`}
								className="absolute top-2.5 left-2.5 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-medium z-10 shadow-md"
							>
								Plus que {inventory} !
							</div>
						)}
						<ViewTransition name={`wishlist-product-image-${product.slug}`} default="vt-product-image" share="vt-product-image">
							<Image
								src={primaryImage?.url || FALLBACK_IMAGE_URL}
								alt={primaryImage?.altText || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(product.title)}
								fill
								className="object-cover rounded-lg transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.08]"
								placeholder={primaryImage?.blurDataUrl ? "blur" : "empty"}
								blurDataURL={primaryImage?.blurDataUrl ?? undefined}
								loading="lazy"
								sizes={IMAGE_SIZES.PRODUCT_CARD}
								itemProp="image"
							/>
						</ViewTransition>
					</div>

					<div className="flex flex-col gap-2 relative p-4">
						<ViewTransition name={`wishlist-product-title-${product.slug}`} default="vt-title">
							<h3
								id={titleId}
								className="line-clamp-2 font-sans text-foreground text-lg break-words"
								itemProp="name"
							>
								{product.title}
							</h3>
						</ViewTransition>

						{stockStatus === "out_of_stock" && (
							<span className="sr-only">{stockMessage}</span>
						)}

						<div
							itemProp="brand"
							itemScope
							itemType="https://schema.org/Brand"
							className="hidden"
						>
							<meta itemProp="name" content="Synclune" />
						</div>

						<div itemProp="offers" itemScope itemType="https://schema.org/Offer">
							<meta itemProp="priceCurrency" content="EUR" />
							<meta itemProp="price" content={(priceInclTax / 100).toString()} />
							<meta
								itemProp="availability"
								content={
									stockStatus === "out_of_stock"
										? "https://schema.org/OutOfStock"
										: "https://schema.org/InStock"
								}
							/>
							<meta itemProp="url" content={productUrl} />
							<ProductPriceCompact price={priceInclTax} />
						</div>
					</div>
				</Link>
			</article>

			{/* Badge baisse de prix (si applicable) - AMÉLIORÉ */}
			{priceDropped && (
				<div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-lg z-10 flex items-center gap-1.5">
					<TrendingDown size={16} strokeWidth={2.5} />
					{/* Calcul en centimes pour éviter erreurs floating point */}
					<span>-{Math.round((Math.abs(priceDifference) * 100) / priceAtAdd)}%</span>
				</div>
			)}

			{/* Badge hausse de prix (si applicable) - NOUVEAU */}
			{priceIncreased && (
				<div className="absolute top-2 left-2 bg-orange-500 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-lg z-10 flex items-center gap-1.5">
					<TrendingUp size={16} strokeWidth={2.5} />
					{/* Calcul en centimes pour éviter erreurs floating point */}
					<span>+{Math.round((priceDifference * 100) / priceAtAdd)}%</span>
				</div>
			)}

			{/* Overlay produit inactif - NOUVEAU */}
			{!isActive && (
				<div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 rounded-lg">
					<div className="bg-yellow-500 text-black px-4 py-2 rounded-md text-sm font-bold shadow-lg">
						Temporairement indisponible
					</div>
				</div>
			)}

			{/* Overlay produit archivé - NOUVEAU */}
			{isProductArchived && (
				<div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg">
					<div className="bg-red-500 text-white px-4 py-2 rounded-md text-sm font-bold shadow-lg">
						Produit archivé
					</div>
				</div>
			)}

			{/* Bouton supprimer (Client Component) */}
			<div className="absolute top-2 right-2 z-10">
				<WishlistRemoveButton
					skuId={sku.id}
					itemId={item.id}
					itemName={product.title}
					/>
			</div>
		</div>
	)
}
