import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import {
	IMAGE_SIZES,
	PRODUCT_TEXTS,
	MAX_COLOR_SWATCHES,
	ABOVE_FOLD_THRESHOLD,
} from "@/modules/products/constants/product-texts.constants";
import { ProductPrice } from "./product-price";
import { Badge } from "@/shared/components/ui/badge";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { AddToCartCardButton } from "@/modules/cart/components/add-to-cart-card-button";
import { StarIcon } from "@/shared/components/icons/star-icon";
import type { Product } from "@/modules/products/types/product.types";
import { getProductCardData } from "@/modules/products/services/product-display.service";
import type { ComponentProps, ReactNode } from "react";
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
			className="relative z-30 m-0 flex list-none items-center gap-1.5 p-0"
			aria-label={`${colors.length} couleurs disponibles pour ${title}`}
		>
			{colors.slice(0, MAX_COLOR_SWATCHES).map((color) => (
				<li key={color.slug}>
					<Link
						href={`${productUrl}?color=${color.slug}`}
						className={cn(
							"border-foreground/15 relative block size-7 shrink-0 rounded-full border sm:size-8",
							"motion-safe:can-hover:hover:scale-110 motion-safe:can-hover:hover:-translate-y-0.5 transition-transform duration-150",
							"focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
							"after:absolute after:-inset-2 after:rounded-full after:content-['']",
							!color.inStock && "opacity-50",
						)}
						style={{ backgroundColor: color.hex }}
						aria-label={`${title} en ${color.name}${!color.inStock ? " - indisponible" : ""}`}
					>
						{!color.inStock && (
							<span
								aria-hidden="true"
								className="absolute inset-0 flex items-center justify-center"
							>
								<span className="bg-foreground block h-[3px] w-[130%] rotate-[-45deg] rounded-full shadow-[0_0_0_1.5px_white]" />
							</span>
						)}
					</Link>
				</li>
			))}
			{colors.length > MAX_COLOR_SWATCHES && (
				<li>
					<Link
						href={productUrl}
						className="text-muted-foreground relative z-30 flex min-h-11 min-w-11 items-center justify-center text-xs"
						aria-label={`Voir les ${colors.length} couleurs disponibles pour ${title}`}
					>
						+{colors.length - MAX_COLOR_SWATCHES}
					</Link>
				</li>
			)}
		</ul>
	);
}

/**
 * Compact star rating display for product cards (server component compatible).
 * Uses StarIcon directly to avoid the "use client" dependency of RatingStars.
 */
function ProductCardRating({
	averageRating,
	totalCount,
	productId,
}: {
	averageRating: number;
	totalCount: number;
	productId: string;
}) {
	if (totalCount === 0) return null;

	const formattedRating = averageRating.toFixed(1).replace(".", ",");

	return (
		<div
			className="flex items-center gap-0.5"
			role="meter"
			aria-label={`Note : ${formattedRating} sur 5, ${totalCount} avis`}
			aria-valuenow={averageRating}
			aria-valuemin={0}
			aria-valuemax={5}
			aria-valuetext={`${formattedRating} étoiles sur 5`}
			style={
				{
					"--star-filled": "var(--secondary)",
					"--star-empty": "var(--muted-foreground)",
				} as React.CSSProperties
			}
		>
			{Array.from({ length: 5 }, (_, i) => (
				<StarIcon
					key={`star-${i}`}
					fillPercentage={Math.min(1, Math.max(0, averageRating - i))}
					size="sm"
					gradientId={`card-${productId}-star-${i}`}
				/>
			))}
			<span className="text-muted-foreground ml-0.5 text-xs">({totalCount})</span>
		</div>
	);
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Server component optimise pour les Core Web Vitals avec:
 * - Preload des images above-fold (index < ABOVE_FOLD_THRESHOLD)
 * - Support responsive
 * - Animations respectant prefers-reduced-motion (WCAG 2.3.3)
 * - WishlistButton et AddToCartCardButton comme client islands
 *
 * Note: Schema.org JSON-LD est genere sur la page produit detaillee uniquement
 * (pas de microdata dans les grilles pour eviter la redondance)
 *
 * z-index stack (documented):
 * - z-10: Stretched link (title link ::after covers the entire card)
 * - z-20: Badges (stock, promo, new)
 * - z-30: Interactive buttons (wishlist, add to cart, color swatches)
 *
 * @example
 * ```tsx
 * <ProductCard product={product} index={0} />
 * ```
 */
export function ProductCard({ product, index, isInWishlist = false, sectionId }: ProductCardProps) {
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
	const discountPercent = hasDiscount ? Math.round((1 - price / compareAtPrice) * 100) : 0;

	// Stock badges take priority over promo badge (same position)
	const showPromoBadge = hasDiscount && stockStatus !== "out_of_stock" && !showUrgencyBadge;

	const productUrl = `/creations/${slug}`;

	const isAboveFold = (index ?? 0) < ABOVE_FOLD_THRESHOLD;

	// Build sr-only description for screen readers (badges info)
	const badgeDescriptions: string[] = [];
	if (stockStatus === "out_of_stock") {
		badgeDescriptions.push(stockMessage);
	} else if (showUrgencyBadge) {
		badgeDescriptions.push(
			`Stock limité : plus que ${inventory} exemplaire${inventory > 1 ? "s" : ""} disponible${inventory > 1 ? "s" : ""}`,
		);
	}
	if (showPromoBadge) {
		badgeDescriptions.push(`Promotion : -${discountPercent}%`);
	}
	const badgeDescId =
		badgeDescriptions.length > 0
			? sectionId
				? `product-badges-${sectionId}-${product.id}`
				: `product-badges-${product.id}`
			: undefined;

	return (
		<article
			aria-labelledby={titleId}
			aria-describedby={badgeDescId}
			className={cn(
				"product-card bg-card group relative grid gap-4 overflow-hidden rounded-lg border-2 border-transparent sm:rounded-xl",
				"transition-[transform,border-color,box-shadow] duration-300 ease-out",
				// Disable transforms for motion-reduce, keep color transitions (WCAG 2.3.3)
				"motion-reduce:transition-colors",
				"shadow-sm",
				"can-hover:hover:border-primary/40",
				"can-hover:hover:shadow-[0_8px_30px_-8px_var(--color-glow-pink),0_4px_15px_-5px_var(--color-glow-lavender)]",
				// Lift effect on hover (scale + translateY)
				"motion-safe:can-hover:hover:scale-[1.02]",
				// Focus state for keyboard navigation
				"focus-within:border-primary/40 focus-within:shadow-primary/15 focus-within:shadow-lg",
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
			<div
				className={cn(
					"product-card-media bg-muted relative overflow-hidden rounded-lg sm:rounded-xl",
					"aspect-3/4 sm:aspect-4/5",
					// Gradient overlay on hover
					"motion-safe:can-hover:group-hover:after:opacity-100 after:absolute after:inset-0 after:z-[5] after:bg-linear-to-t after:from-black/5 after:to-transparent after:opacity-0 after:transition-opacity after:duration-300",
				)}
			>
				{/* Status badges — stock badges take priority over promo */}
				{stockStatus === "out_of_stock" && (
					<CardBadge
						variant="secondary"
						className="bg-foreground/80 text-background border-0 backdrop-blur-sm"
					>
						{stockMessage}
					</CardBadge>
				)}
				{showUrgencyBadge && <CardBadge variant="warning">{stockMessage}</CardBadge>}
				{showPromoBadge && <CardBadge variant="destructive">-{discountPercent}%</CardBadge>}

				{/* Wishlist button (client island) */}
				<WishlistButton
					productId={product.id}
					isInWishlist={isInWishlist}
					productTitle={title}
					className="motion-safe:can-hover:sm:group-hover:opacity-100 motion-safe:can-hover:sm:group-hover:scale-100 absolute top-2.5 right-2.5 z-30 scale-90 opacity-100 transition-[opacity,transform] duration-200 sm:scale-90 sm:opacity-0 sm:focus-within:scale-100 sm:focus-within:opacity-100 sm:has-[:focus-visible]:opacity-100"
				/>

				<div className="absolute inset-0">
					<Image
						src={primaryImage.url}
						alt={primaryImage.alt ?? PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
						fill
						className={cn(
							"rounded-lg object-cover sm:rounded-xl",
							!secondaryImage &&
								"motion-safe:can-hover:group-hover:scale-[1.08] ease-out motion-safe:transition-[transform] motion-safe:duration-300",
						)}
						placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
						blurDataURL={primaryImage.blurDataUrl ?? undefined}
						preload={isAboveFold}
						sizes={IMAGE_SIZES.PRODUCT_CARD}
					/>
					{secondaryImage && (
						<Image
							src={secondaryImage.url}
							alt={secondaryImage.alt ?? PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
							fill
							className="can-hover:group-hover:opacity-100 can-hover:group-hover:scale-100 scale-[1.02] rounded-lg object-cover opacity-0 ease-out motion-safe:transition-[opacity,transform] motion-safe:duration-500 sm:rounded-xl"
							loading="lazy"
							sizes={IMAGE_SIZES.PRODUCT_CARD}
						/>
					)}
				</div>

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
			<div className="flex flex-col gap-3 overflow-hidden px-3 pt-1 pb-4 sm:gap-3.5 sm:px-4 sm:pb-5 lg:px-5 lg:pb-6">
				{/* Stretched link: title link with ::after covering the entire card */}
				<Link
					href={productUrl}
					className="focus-visible:outline-ring block after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
				>
					<h3
						id={titleId}
						className={cn("text-foreground font-sans tracking-normal", "text-base sm:text-lg")}
					>
						{title}
					</h3>
				</Link>

				{/* Prix — placed before colors for scannability (Baymard guideline) */}
				<ProductPrice price={price} compareAtPrice={compareAtPrice} />

				{/* Average rating (server-compatible star display) */}
				{product.reviewStats && product.reviewStats.totalCount > 0 && (
					<ProductCardRating
						averageRating={Number(product.reviewStats.averageRating)}
						totalCount={product.reviewStats.totalCount}
						productId={product.id}
					/>
				)}

				{/* Color swatches — individual links to product page with ?color= */}
				{colors.length > 1 && (
					<ColorSwatchList colors={colors} productUrl={productUrl} title={title} />
				)}

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
