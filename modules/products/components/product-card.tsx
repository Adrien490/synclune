import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_SIZES, PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { STOCK_THRESHOLDS } from "@/modules/skus/constants/inventory.constants";
import { ProductPriceCompact } from "./product-price";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { AddToCartCardButton } from "@/modules/cart/components/add-to-cart-card-button";
import { ColorSwatches } from "./color-swatches";
import type { Product } from "@/modules/products/types/product.types";
import {
	getPrimarySkuForList,
	getPrimaryPriceForList,
	getStockInfoForList,
	getPrimaryImageForList,
	getAvailableColorsForList,
} from "@/modules/products/services/product-list-helpers";

interface ProductCardProps {
	product: Product;
	/** Index dans la liste (pour priority images above-fold) */
	index?: number;
	/** Indique si le SKU est dans la wishlist (optionnel, défaut false) */
	isInWishlist?: boolean;
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Composant optimisé pour les Core Web Vitals avec:
 * - Preload des images above-fold (index < 4)
 * - Schema.org Product/Offer complet
 * - Support responsive
 * - Animations respectant prefers-reduced-motion (WCAG 2.3.3)
 * - Internationalisation via PRODUCT_TEXTS
 *
 * @example
 * ```tsx
 * <ProductCard product={product} index={0} />
 * ```
 *
 * @see {@link ProductPriceCompact} - Sous-composant utilisé pour l'affichage du prix
 */
export function ProductCard({
	product,
	index,
	isInWishlist,
}: ProductCardProps) {
	// Déstructuration des données du produit
	const { slug, title } = product;
	const primarySku = getPrimarySkuForList(product);
	const { price } = getPrimaryPriceForList(product);
	const stockInfo = getStockInfoForList(product);
	const primaryImage = getPrimaryImageForList(product);
	const colors = getAvailableColorsForList(product);

	const { status: stockStatus, message: stockMessage, totalInventory: inventory } = stockInfo;

	// Génération ID unique pour aria-labelledby (RSC compatible)
	// Sanitise le slug pour éviter les ID HTML invalides (accents, apostrophes, etc.)
	const sanitizedSlug = slug.replace(/[^a-z0-9-]/gi, "");
	const titleId = `product-title-${sanitizedSlug}`;

	// Déterminer si on affiche le badge urgency (stock bas mais pas rupture)
	const showUrgencyBadge =
		stockStatus === "in_stock" &&
		typeof inventory === "number" &&
		inventory > 0 &&
		inventory <= STOCK_THRESHOLDS.LOW;

	// URL canonique uniquement (stratégie SEO e-commerce recommandée)
	// Toujours pointer vers /creations/[slug] pour consolider les signaux SEO
	const productUrl = `/creations/${slug}`;

	return (
		<article
			className={cn(
				"product-card grid relative overflow-hidden bg-card rounded-lg group border-2 border-transparent gap-4",
				// Transition optimisée avec cubic-bezier pour fluidité
				"transition-all duration-300 ease-out",
				// Border, shadow et scale au hover
				"shadow-sm motion-safe:hover:border-primary/30 motion-safe:hover:shadow-xl motion-safe:hover:shadow-primary/15",
				"motion-safe:hover:-translate-y-1.5 motion-safe:hover:scale-[1.01] will-change-transform"
			)}
			itemScope
			itemType="https://schema.org/Product"
		>
			{/* Conteneur image avec boutons interactifs EN DEHORS du Link */}
			<div className="product-card-media relative aspect-4/5 overflow-hidden bg-muted rounded-lg">
				{/* Link couvrant uniquement l'image */}
				<Link
					href={productUrl}
					className="absolute inset-0 z-10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-lg"
					aria-labelledby={titleId}
					tabIndex={-1}
				>
					<span className="sr-only">Voir {title}</span>
				</Link>

				{/* Badge rupture de stock - Style plus doux */}
				{stockStatus === "out_of_stock" && (
					<div
						role="status"
						aria-label={stockMessage}
						className="absolute top-2.5 left-2.5 bg-foreground/80 text-background px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-md backdrop-blur-sm"
					>
						{stockMessage}
					</div>
				)}
				{/* Badge urgency - Stock bas mais disponible */}
				{showUrgencyBadge && (
					<div
						role="status"
						aria-label={`Stock limité : plus que ${inventory} exemplaire${inventory && inventory > 1 ? "s" : ""} disponible${inventory && inventory > 1 ? "s" : ""}`}
						className="absolute top-2.5 left-2.5 bg-amber-500 text-white px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-md"
					>
						Plus que {inventory} !
					</div>
				)}

				{/* Bouton wishlist - EN DEHORS du Link */}
				{primarySku && (
					<WishlistButton
						skuId={primarySku.id}
						isInWishlist={isInWishlist ?? false}
						productTitle={title}
						className="absolute top-2.5 right-2.5 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
					/>
				)}

					<Image
					src={primaryImage.url}
					alt={primaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title)}
					fill
					className="object-cover rounded-lg transition-transform duration-500 ease-out motion-safe:group-hover:scale-[1.08]"
					placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
					blurDataURL={primaryImage.blurDataUrl}
					// Preload pour les 4 premières images (above-fold) - Next.js 16
					preload={index !== undefined && index < 4}
					loading={index !== undefined && index < 4 ? undefined : "lazy"}
					sizes={IMAGE_SIZES.PRODUCT_CARD}
					itemProp="image"
				/>

				{/* Bouton d'ajout au panier - EN DEHORS du Link */}
				{primarySku && stockStatus === "in_stock" && (
					<AddToCartCardButton
						skuId={primarySku.id}
						productTitle={title}
					/>
				)}
			</div>

			{/* Link pour le contenu texte */}
			<Link
				href={productUrl}
				className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm"
				aria-labelledby={titleId}
			>
				{/* Contenu */}
				<div className="flex flex-col gap-2 sm:gap-3 relative p-4 sm:p-5">
					{/* Titre avec hiérarchie tokenisée responsive */}
					<h3
						id={titleId}
						className="line-clamp-2 font-sans text-foreground text-base sm:text-lg break-words"
						itemProp="name"
					>
						{title}
					</h3>

					{/* Pastilles couleur pour les produits multi-variantes */}
					{colors && colors.length > 1 && (
						<ColorSwatches colors={colors} maxVisible={4} size="xs" />
					)}

					{/* Information de rupture de stock pour les technologies d'assistance */}
					{stockStatus === "out_of_stock" && (
						<span className="sr-only">{stockMessage}</span>
					)}

					{/* Brand Schema.org (Synclune) */}
					<div
						itemProp="brand"
						itemScope
						itemType="https://schema.org/Brand"
						className="hidden"
					>
						<meta itemProp="name" content="Synclune" />
					</div>

					{/* Prix avec composant extrait et données structurées */}
					<div itemProp="offers" itemScope itemType="https://schema.org/Offer">
						<meta itemProp="priceCurrency" content="EUR" />
						<meta itemProp="price" content={(price / 100).toString()} />
						<meta
							itemProp="availability"
							content={
								stockStatus === "out_of_stock"
									? "https://schema.org/OutOfStock"
									: "https://schema.org/InStock"
							}
						/>
						<meta itemProp="url" content={productUrl} />
						{/* ProductPriceCompact avec disableSchemaOrg par défaut (évite duplication) */}
						<ProductPriceCompact price={price} />
					</div>
				</div>
			</Link>
		</article>
	);
}
