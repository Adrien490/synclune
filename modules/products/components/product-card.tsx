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
import { ViewTransition, type ComponentProps, type ReactNode } from "react";
import type { ColorSwatch } from "@/modules/products/types/product-list.types";

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
 * Badge positionne en haut a gauche de la carte.
 * Marque aria-hidden car l'information est transmise via le sr-only span
 * associe a l'article (aria-describedby).
 */
function CardBadge({
	variant,
	className,
	children,
}: {
	variant: ComponentProps<typeof Badge>["variant"];
	className?: string;
	children: ReactNode;
}) {
	return (
		<Badge
			aria-hidden="true"
			variant={variant}
			className={cn("absolute top-2.5 left-2.5 z-20 rounded-full shadow-md", className)}
		>
			{children}
		</Badge>
	);
}

/**
 * Liste de pastilles couleur avec liens vers la page produit filtree par couleur.
 */
function ColorSwatchList({
	colors,
	productUrl,
	title,
}: {
	colors: ColorSwatch[];
	productUrl: string;
	title: string;
}) {
	return (
		<ul
			className="relative z-30 flex items-center gap-1.5 list-none p-0 m-0"
			aria-label={`${colors.length} couleurs disponibles pour ${title}`}
		>
			{colors.slice(0, 5).map((color) => (
				<li key={color.slug}>
					<Link
						href={`${productUrl}?color=${color.slug}`}
						className={cn(
							"relative block size-6 sm:size-7 rounded-full border border-foreground/15 shrink-0",
							"transition-transform duration-150 motion-safe:can-hover:hover:scale-110",
							"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
							"after:absolute after:content-[''] after:-inset-2 after:rounded-full",
							!color.inStock && "opacity-50"
						)}
						style={{ backgroundColor: color.hex }}
						title={color.name}
						aria-label={`${title} en ${color.name}${!color.inStock ? " - indisponible" : ""}`}
					>
						{!color.inStock && (
							<span
								aria-hidden="true"
								className="absolute inset-0 flex items-center justify-center"
							>
								<span className="block w-[130%] h-[3px] bg-foreground rotate-[-45deg] rounded-full shadow-[0_0_0_1.5px_white]" />
							</span>
						)}
					</Link>
				</li>
			))}
			{colors.length > 5 && (
				<li>
					<Link
						href={productUrl}
						className="relative z-30 text-xs text-muted-foreground min-h-11 min-w-11 flex items-center justify-center"
						aria-label={`Voir les ${colors.length} couleurs disponibles pour ${title}`}
					>
						+{colors.length - 5}
					</Link>
				</li>
			)}
		</ul>
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
 * - z-10: Stretched link (title link ::after covers the entire card)
 * - z-20: Badges (stock, promo)
 * - z-30: Interactive buttons (wishlist, add to cart, color swatches)
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

	// Sections that participate in shared element transitions (no collision risk)
	const enableSharedTransition = sectionId === "catalog" || sectionId === "latest" || sectionId === "wishlist";

	// Build sr-only description for screen readers (badges info)
	const badgeDescriptions: string[] = [];
	if (stockStatus === "out_of_stock") {
		badgeDescriptions.push(stockMessage);
	} else if (showUrgencyBadge) {
		badgeDescriptions.push(
			`Stock limité : plus que ${inventory} exemplaire${inventory > 1 ? "s" : ""} disponible${inventory > 1 ? "s" : ""}`
		);
	}
	if (showPromoBadge) {
		badgeDescriptions.push(`Promotion : -${discountPercent}%`);
	}
	const badgeDescId = badgeDescriptions.length > 0
		? sectionId ? `product-badges-${sectionId}-${product.id}` : `product-badges-${product.id}`
		: undefined;

	return (
		<article
			aria-labelledby={titleId}
			aria-describedby={badgeDescId}
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
			{/* sr-only badge descriptions for screen readers */}
			{badgeDescId && (
				<span id={badgeDescId} className="sr-only">
					{badgeDescriptions.join(". ")}
				</span>
			)}

			{/* Image container with interactive buttons */}
			{/* bg-muted acts as CSS-only fallback if image fails to load */}
			<div className="product-card-media relative aspect-3/4 sm:aspect-4/5 overflow-hidden bg-muted rounded-lg">

				{/* Status badges — stock badges take priority over promo (same position) */}
				{stockStatus === "out_of_stock" && (
					<CardBadge
						variant="secondary"
						className="backdrop-blur-sm bg-foreground/80 text-background border-0"
					>
						{stockMessage}
					</CardBadge>
				)}
				{showUrgencyBadge && (
					<CardBadge variant="warning">
						{stockMessage}
					</CardBadge>
				)}
				{showPromoBadge && (
					<CardBadge variant="destructive">
						-{discountPercent}%
					</CardBadge>
				)}

				{/* Wishlist button (client island) */}
				<WishlistButton
					productId={product.id}
					isInWishlist={isInWishlist}
					productTitle={title}
					className="absolute top-2.5 right-2.5 z-30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 sm:has-[:focus-visible]:opacity-100 transition-opacity duration-200"
				/>

				{/* Images only — scoped ViewTransition for precise morph */}
				{(() => {
					const images = (
						<div className="absolute inset-0">
							{/* Primary image — stays visible under secondary on hover, or zooms if no secondary */}
							<Image
								src={primaryImage.url}
								alt={primaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
								fill
								className={cn(
									"object-cover rounded-lg",
									!secondaryImage && "motion-safe:transition-[transform] motion-safe:duration-300 ease-out motion-safe:can-hover:group-hover:scale-[1.08]"
								)}
								placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
								blurDataURL={primaryImage.blurDataUrl ?? undefined}
								priority={isAboveFold}
								loading={isAboveFold ? undefined : "lazy"}
								sizes={IMAGE_SIZES.PRODUCT_CARD}
							/>

							{/* Secondary image — appears on hover for a different angle (desktop only) */}
							{secondaryImage && (
								<Image
									src={secondaryImage.url}
									alt={secondaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
									fill
									className="object-cover rounded-lg opacity-0 motion-safe:transition-opacity motion-safe:duration-300 ease-out can-hover:group-hover:opacity-100"
									loading="lazy"
									sizes={IMAGE_SIZES.PRODUCT_CARD}
								/>
							)}
						</div>
					);

					return enableSharedTransition ? (
						<ViewTransition name={`product-${product.id}`} share="vt-product-image">
							{images}
						</ViewTransition>
					) : (
						images
					);
				})()}

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

			{/* Card content — no position:relative so stretched link ::after reaches the article */}
			<div className="flex flex-col gap-2.5 sm:gap-3 px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5 overflow-hidden">
				{/* Stretched link: title link with ::after covering the entire card */}
				<Link
					href={productUrl}
					title={title}
					className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm after:absolute after:inset-0 after:z-10"
				>
					<h3
						id={titleId}
						className="font-sans text-foreground text-base sm:text-lg tracking-normal"
					>
						{title}
					</h3>
				</Link>

				{/* Color swatches — individual links to product page with ?color= */}
				{colors.length > 1 && (
					<ColorSwatchList
						colors={colors}
						productUrl={productUrl}
						title={title}
					/>
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
						className="relative z-30 sm:hidden"
					/>
				)}
			</div>
		</article>
	);
}
