import { ProductCard } from '@/modules/products/components/product-card'
import type { GetWishlistReturn } from '@/modules/wishlist/data/get-wishlist'
import { formatEuro } from "@/shared/utils/format-euro"
import { TrendingDown, TrendingUp } from 'lucide-react'
import { WishlistRemoveButton } from '@/modules/wishlist/components/wishlist-remove-button'
import { FALLBACK_IMAGE_URL } from '@/modules/medias/constants/product-fallback-image'

interface WishlistProductCardProps {
	item: NonNullable<GetWishlistReturn>['items'][number]
}

/**
 * Product Card pour la wishlist - Server Component
 *
 * Pattern:
 * - Réutilise ProductCard existant
 * - Ajoute WishlistRemoveButton (Client Component)
 * - Affiche price snapshot avec indication si baisse de prix
 * - Source de vérité unique (DB) pour éviter désynchronisations
 */
export function WishlistProductCard({
	item,
}: WishlistProductCardProps) {
	const { sku, priceAtAdd } = item
	const { product, priceInclTax, images, inventory, color, isActive } = sku

	// Prix snapshot vs prix actuel (pour notifications futures)
	const priceDifference = priceInclTax - priceAtAdd
	const priceDropped = priceDifference < 0
	const priceIncreased = priceDifference > 0

	// Vérifier si le produit est disponible
	const isProductActive = isActive && product.status === 'PUBLIC'
	const isProductArchived = product.status === 'ARCHIVED'

	// Image primaire
	const primaryImage = images[0]

	// Stock total (système simplifié : en stock ou rupture)
	const stockStatus = inventory === 0 ? 'out_of_stock' : 'in_stock'
	const stockMessage = inventory === 0 ? 'Rupture de stock' : 'En stock'

	return (
		<div className="relative group">
			<ProductCard
				slug={product.slug}
				title={product.title}
				description={null}
				price={priceInclTax}
				stockStatus={stockStatus}
				stockMessage={stockMessage}
				primaryImage={{
					url: primaryImage?.url || FALLBACK_IMAGE_URL,
					alt: primaryImage?.altText ?? null,
					mediaType: 'IMAGE' as const,
				}}
				showDescription={false}
				size="md"
			/>

			{/* Badge baisse de prix (si applicable) - AMÉLIORÉ */}
			{priceDropped && (
				<div className="absolute top-2 left-2 bg-green-600 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-lg z-10 flex items-center gap-1.5">
					<TrendingDown size={16} strokeWidth={2.5} />
					<span>-{Math.round((Math.abs(priceDifference) / priceAtAdd) * 100)}%</span>
				</div>
			)}

			{/* Badge hausse de prix (si applicable) - NOUVEAU */}
			{priceIncreased && (
				<div className="absolute top-2 left-2 bg-orange-500 text-white px-3 py-1.5 rounded-md text-sm font-bold shadow-lg z-10 flex items-center gap-1.5">
					<TrendingUp size={16} strokeWidth={2.5} />
					<span>+{Math.round((priceDifference / priceAtAdd) * 100)}%</span>
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
