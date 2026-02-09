import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_SIZES, PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { ProductPrice } from "./product-price";
import { Badge } from "@/shared/components/ui/badge";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { AddToCartCardButton } from "@/modules/cart/components/add-to-cart-card-button";
import type { Product } from "@/modules/products/types/product.types";
import { getProductCardData } from "@/modules/products/services/product-display.service";
import type { ComponentProps, ReactNode } from "react";

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
 * Badge positionne en haut a gauche de la carte avec role status.
 * Utilise par les badges stock (rupture, urgence) et promotion.
 */
function CardBadge({
	ariaLabel,
	variant,
	className,
	children,
}: {
	ariaLabel: string;
	variant: ComponentProps<typeof Badge>["variant"];
	className?: string;
	children: ReactNode;
}) {
	return (
		<Badge
			role="status"
			aria-label={ariaLabel}
			variant={variant}
			className={cn("absolute top-2.5 left-2.5 z-20 rounded-full shadow-md", className)}
		>
			{children}
		</Badge>
	);
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Server component optimise pour les Core Web Vitals avec:
 * - Preload des images above-fold (index < 4)
 * - Support responsive
 * - Animations respectant prefers-reduced-motion (WCAG 2.3.3)
 * - WishlistButton et AddToCartCardButton comme client islands
 *
 * Note: Schema.org JSON-LD est genere sur la page produit detaillee uniquement
 * (pas de microdata dans les grilles pour eviter la redondance)
 *
 * z-index stack (documented):
 * - z-10: Link overlay (clickable image)
 * - z-20: Badges (stock, promo)
 * - z-30: Interactive buttons (wishlist, add to cart)
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

	// Single-pass O(n) extraction of all display data from SKUs
	const { defaultSku, price, compareAtPrice, stockInfo, primaryImage, secondaryImage, colors } =
		getProductCardData(product);

	const { status: stockStatus, message: stockMessage, totalInventory: inventory } = stockInfo;

	// Unique ID for aria-labelledby (combines sectionId + product.id to avoid collisions)
	const titleId = sectionId
		? `product-title-${sectionId}-${product.id}`
		: `product-title-${product.id}`;

	// Urgency badge for low stock (scarcity signal for conversion)
	const showUrgencyBadge = stockStatus === "low_stock";

	// Discount percentage for promo badge
	const hasDiscount = compareAtPrice !== null && compareAtPrice > price && price > 0;
	const discountPercent = hasDiscount
		? Math.round((1 - price / compareAtPrice) * 100)
		: 0;

	// Stock badges take priority over promo badge (same position)
	const showPromoBadge = hasDiscount && stockStatus !== "out_of_stock" && !showUrgencyBadge;

	const productUrl = `/creations/${slug}`;

	const isAboveFold = index !== undefined && index < 4;

	return (
		<article
			aria-labelledby={titleId}
			className={cn(
				"product-card grid relative overflow-hidden bg-card rounded-lg group border-2 border-transparent gap-4",
				"transition-transform duration-300 ease-out",
				// Disable transforms for motion-reduce, keep color transitions (WCAG 2.3.3)
				"motion-reduce:transition-colors",
				"shadow-sm",
				"can-hover:hover:border-primary/40",
				"can-hover:hover:shadow-[0_8px_30px_-8px_oklch(0.85_0.12_350/0.35),0_4px_15px_-5px_oklch(0.82_0.10_300/0.25)]",
				// Lift effect on hover (scale + translateY)
				"motion-safe:can-hover:hover:scale-[1.02]",
				// Focus state for keyboard navigation
				"focus-within:border-primary/40 focus-within:shadow-lg focus-within:shadow-primary/15",
				"can-hover:group-hover:will-change-transform"
			)}
		>
			{/* Image container with interactive buttons */}
			{/* bg-muted acts as CSS-only fallback if image fails to load */}
			<div className="product-card-media relative aspect-square sm:aspect-4/5 overflow-hidden bg-muted rounded-lg">

				{/* Status badges — stock badges take priority over promo (same position) */}
				{stockStatus === "out_of_stock" && (
					<CardBadge
						ariaLabel={`${stockMessage} pour ${title}`}
						variant="secondary"
						className="backdrop-blur-sm bg-foreground/80 text-background border-0"
					>
						{stockMessage}
					</CardBadge>
				)}
				{showUrgencyBadge && (
					<CardBadge
						ariaLabel={`Stock limite pour ${title} : plus que ${inventory} exemplaire${inventory > 1 ? "s" : ""} disponible${inventory > 1 ? "s" : ""}`}
						variant="warning"
					>
						{stockMessage}
					</CardBadge>
				)}
				{showPromoBadge && (
					<CardBadge
						ariaLabel={`Promotion : ${discountPercent}% de reduction sur ${title}`}
						variant="destructive"
					>
						-{discountPercent}%
					</CardBadge>
				)}

				{/* Wishlist button (client island) */}
				<WishlistButton
					productId={product.id}
					isInWishlist={isInWishlist}
					productTitle={title}
					className="absolute top-2.5 right-2.5 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity duration-200"
				/>

				{/* Primary image — crossfades to secondary on hover, or zooms if no secondary */}
				<Image
					src={primaryImage.url}
					alt={primaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
					fill
					className={cn(
						"object-cover rounded-lg",
						"transition-[transform,opacity] duration-300 ease-out",
						secondaryImage
							? "motion-safe:can-hover:group-hover:opacity-0"
							: "motion-safe:can-hover:group-hover:scale-[1.08]"
					)}
					placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
					blurDataURL={primaryImage.blurDataUrl ?? undefined}
					preload={isAboveFold}
					loading={isAboveFold ? undefined : "lazy"}
					fetchPriority={isAboveFold ? "high" : undefined}
					sizes={IMAGE_SIZES.PRODUCT_CARD}
				/>

				{/* Secondary image — appears on hover for a different angle (desktop only) */}
				{secondaryImage && (
					<Image
						src={secondaryImage.url}
						alt={secondaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
						fill
						className="object-cover rounded-lg opacity-0 transition-opacity duration-300 ease-out can-hover:group-hover:opacity-100"
						loading="lazy"
						sizes={IMAGE_SIZES.PRODUCT_CARD}
					/>
				)}

				{/* Decorative link overlay for clickable image area (excluded from a11y tree) */}
				<Link
					href={productUrl}
					className="absolute inset-0 z-10"
					tabIndex={-1}
					aria-hidden="true"
				/>

				{/* Add to cart button - Desktop (client island) */}
				{defaultSku && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						skuId={defaultSku.id}
						productTitle={title}
						product={product}
						className="hidden sm:block"
					/>
				)}
			</div>

			{/* Card content */}
			<div className="flex flex-col gap-2.5 sm:gap-3 relative px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5 overflow-hidden">
				{/* Clickable title with truncation for grid alignment */}
				<Link
					href={productUrl}
					title={title}
					className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm"
				>
					<h3
						id={titleId}
						className="font-sans text-foreground text-base sm:text-lg tracking-normal line-clamp-1 sm:line-clamp-2"
					>
						{title}
					</h3>
				</Link>

				{/* Color swatches — individual links to product page with ?color= */}
				{colors.length > 1 && (
					<div
						className="flex items-center gap-1.5"
						aria-label={`${colors.length} couleurs disponibles pour ${title}`}
						role="group"
					>
						{colors.slice(0, 5).map((color) => (
							<Link
								key={color.slug}
								href={`${productUrl}?color=${color.slug}`}
								className={cn(
									"size-4 sm:size-5 rounded-full border border-foreground/15 shrink-0",
									"transition-transform duration-150 motion-safe:can-hover:hover:scale-110",
									"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
									!color.inStock && "opacity-40"
								)}
								style={{ backgroundColor: color.hex }}
								title={color.name}
								aria-label={`${title} en ${color.name}`}
							/>
						))}
						{colors.length > 5 && (
							<Link
								href={productUrl}
								className="text-xs text-muted-foreground"
							>
								+{colors.length - 5}
							</Link>
						)}
					</div>
				)}

				{/* Prix */}
				<ProductPrice price={price} compareAtPrice={compareAtPrice} />

				{/* Add to cart button - Mobile full-width (client island) */}
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
