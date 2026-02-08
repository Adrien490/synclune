import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_SIZES, PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { ProductPrice } from "./product-price";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { AddToCartCardButton } from "@/modules/cart/components/add-to-cart-card-button";
import type { Product } from "@/modules/products/types/product.types";
import { getProductCardData } from "@/modules/products/services/product-display.service";

interface ProductCardProps {
	product: Product;
	/** Index dans la liste (pour priority images above-fold) */
	index?: number;
	/** Indique si le produit est dans la wishlist */
	isInWishlist?: boolean;
	/** Identifiant de section pour des IDs uniques (ex: "bestsellers", "latest") */
	sectionId?: string;
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Server component optimisé pour les Core Web Vitals avec:
 * - Preload des images above-fold (index < 4)
 * - Support responsive
 * - Animations respectant prefers-reduced-motion (WCAG 2.3.3)
 * - WishlistButton et AddToCartCardButton comme client islands
 *
 * Note: Schema.org JSON-LD est généré sur la page produit détaillée uniquement
 * (pas de microdata dans les grilles pour éviter la redondance)
 *
 * @example
 * ```tsx
 * <ProductCard product={product} index={0} />
 * ```
 */
export function ProductCard({
	product,
	index,
	isInWishlist = false,
	sectionId,
}: ProductCardProps) {
	const { slug, title, type } = product;
	const productType = type?.label;

	// Extraction optimisée en une seule passe O(n) au lieu de 5 appels séparés
	const { defaultSku, price, compareAtPrice, stockInfo, primaryImage, colors } =
		getProductCardData(product);

	const { status: stockStatus, message: stockMessage, totalInventory: inventory } = stockInfo;

	// Génération ID unique pour aria-labelledby (combine sectionId + product.id)
	const titleId = sectionId
		? `product-title-${sectionId}-${product.id}`
		: `product-title-${product.id}`;

	// Badge urgency (stock bas mais pas rupture) - utilise le status low_stock du service
	const showUrgencyBadge = stockStatus === "low_stock";

	const productUrl = `/creations/${slug}`;

	return (
		<article
			aria-labelledby={titleId}
			className={cn(
				"product-card grid relative overflow-hidden bg-card rounded-lg group border-2 border-transparent gap-4",
				"transition-transform duration-300 ease-out",
				// Motion-reduce: desactiver transforms, garder transitions couleurs (WCAG 2.3.3)
				"motion-reduce:transition-colors",
				// Glow pastel + shadow enrichi
				"shadow-sm",
				"can-hover:hover:border-primary/40",
				"can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
				// Lift effect 2D (scale + translateY)
				"motion-safe:can-hover:hover:-translate-y-2 motion-safe:can-hover:hover:scale-[1.02]",
				// Focus state
				"focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
				"can-hover:group-hover:will-change-transform"
			)}
		>
			{/* Conteneur image avec boutons interactifs */}
			<div className="product-card-media relative aspect-square sm:aspect-4/5 overflow-hidden bg-muted rounded-lg">

				{/* Badge rupture de stock */}
				{stockStatus === "out_of_stock" && (
					<div
						role="status"
						aria-label={`${stockMessage} pour ${title}`}
						className="absolute top-2.5 left-2.5 bg-foreground/80 text-background px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-md backdrop-blur-sm"
					>
						{stockMessage}
					</div>
				)}
				{/* Badge urgency - Stock bas mais disponible */}
				{showUrgencyBadge && (
					<div
						role="status"
						aria-label={`Stock limité pour ${title} : plus que ${inventory} exemplaire${inventory > 1 ? "s" : ""} disponible${inventory > 1 ? "s" : ""}`}
						className="absolute top-2.5 left-2.5 bg-amber-800 text-white px-2.5 py-1 rounded-full text-xs font-medium z-20 shadow-md"
					>
						{stockMessage}
					</div>
				)}

				{/* Bouton wishlist (client island) */}
				<WishlistButton
					productId={product.id}
					isInWishlist={isInWishlist}
					productTitle={title}
					className="absolute top-2.5 right-2.5 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity duration-200"
				/>

				<Image
					src={primaryImage.url}
					alt={primaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
					fill
					className={cn(
						"object-cover rounded-lg",
						"transition-transform duration-300 ease-out",
						"motion-safe:can-hover:group-hover:scale-[1.08]"
					)}
					placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
					blurDataURL={primaryImage.blurDataUrl ?? undefined}
					preload={index !== undefined && index < 4}
					loading={index !== undefined && index < 4 ? undefined : "lazy"}
					fetchPriority={index !== undefined && index < 4 ? "high" : undefined}
					sizes={IMAGE_SIZES.PRODUCT_CARD}
				/>

				{/* Link overlay pour rendre l'image cliquable (décoratif, exclu de l'accessibilité) */}
				<Link
					href={productUrl}
					className="absolute inset-0 z-10"
					tabIndex={-1}
					aria-hidden="true"
				/>

				{/* Bouton d'ajout au panier - Desktop (client island) */}
				{defaultSku && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						skuId={defaultSku.id}
						productTitle={title}
						product={product}
						className="hidden sm:block"
					/>
				)}
			</div>

			{/* Contenu de la card */}
			<div className="flex flex-col gap-2.5 sm:gap-3 relative px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5 overflow-hidden">
				{/* Titre cliquable */}
				<Link
					href={productUrl}
					className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm"
				>
					<h3
						id={titleId}
						className="font-sans text-foreground text-base sm:text-lg tracking-normal wrap-break-words"
					>
						{title}
					</h3>
				</Link>

				{/* Indicateur couleurs avec lien */}
				{colors.length > 1 && (
					<div className="text-xs sm:text-sm text-muted-foreground">
						<Link
							href={productUrl}
							className="underline underline-offset-4 hover:text-foreground transition-colors"
							aria-label={`${colors.length} couleurs disponibles pour ${title}`}
						>
							{colors.length} couleurs disponibles
						</Link>
					</div>
				)}

				{/* Prix */}
				<ProductPrice price={price} compareAtPrice={compareAtPrice} />

				{/* Bouton d'ajout au panier - Mobile (client island) */}
				{defaultSku && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						skuId={defaultSku.id}
						productTitle={title}
						product={product}
						variant="mobile-full"
						className="sm:hidden"
					/>
				)}
			</div>
		</article>
	);
}
