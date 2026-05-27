import {
	CARD_SURFACE_BASE,
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
} from "@/shared/components/card-surface.constants";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import {
	IMAGE_SIZES,
	PRODUCT_TEXTS,
	ABOVE_FOLD_THRESHOLD,
} from "@/modules/products/constants/product-texts.constants";
import { ProductPrice } from "./product-price";
import { ProductCardColorSwatches } from "./product-card-color-swatches";
import { Badge } from "@/shared/components/ui/badge";
import { WishlistButton } from "@/modules/wishlist/components/wishlist-button";
import { AddToCartCardButton } from "@/modules/cart/components/add-to-cart-card-button";
import { StarIcon } from "@/shared/components/icons/star-icon";
import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { getProductCardData } from "@/modules/products/services/product-display.service";
import { buildSkuUrl } from "@/modules/products/utils/build-sku-url";
import { computeDiscountPercent } from "@/modules/products/utils/compute-discount-percent";
import type { ComponentProps, ReactNode } from "react";

const ratingFormatter = new Intl.NumberFormat("fr-FR", {
	minimumFractionDigits: 1,
	maximumFractionDigits: 1,
});

interface ProductCardProps {
	product: ProductCarouselItem;
	/** Index dans la liste (pour eager loading + fetchPriority above-fold) */
	index?: number;
	/** Indique si le produit est dans la wishlist */
	isInWishlist?: boolean;
	/** Identifiant de section pour des IDs uniques (ex: "bestsellers", "latest") */
	sectionId?: string;
	/** Si true, priorise l'affichage du SKU en promotion */
	preferOnSale?: boolean;
	/** Disable above-fold preload (for cards inside Suspense boundaries) */
	disablePreload?: boolean;
	/**
	 * Opt-in "Nouveau" badge. Set by the calling section (typically
	 * `latest-creations`) — ProductCard does not infer freshness from
	 * `createdAt` because `Date.now()` is not permitted in cached Server
	 * Components (Next 16 Cache Components). Yields to stock/urgency/promo
	 * badges sharing the top-left slot.
	 */
	showNewBadge?: boolean;
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
 * Compact star rating display for product cards (server component compatible).
 * Uses StarIcon directly to avoid the "use client" dependency of RatingStars.
 */
function ProductCardRating({
	averageRating,
	totalCount,
	productId,
	formattedRating,
}: {
	averageRating: number;
	totalCount: number;
	productId: string;
	formattedRating: string;
}) {
	if (totalCount === 0) return null;

	return (
		<div
			className="flex items-center gap-0.5"
			role="img"
			aria-label={`Note : ${formattedRating} sur 5, ${totalCount} avis`}
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
export function ProductCard({
	product,
	index,
	isInWishlist = false,
	sectionId,
	preferOnSale,
	disablePreload = false,
	showNewBadge: showNewBadgeProp = false,
}: ProductCardProps) {
	const { slug, title, type } = product;
	const productType = type?.label;

	// Single-pass O(n) extraction of all display data from SKUs
	const { defaultSku, price, compareAtPrice, stockInfo, primaryImage, secondaryImage, colors } =
		getProductCardData(product, preferOnSale ? { preferOnSale } : undefined);

	const { status: stockStatus, message: stockMessage, totalInventory: inventory } = stockInfo;

	// No active SKU — produit en catalogue sans variante publiée (état "à venir")
	const noActiveSku = defaultSku === null;
	const outOfStockBadgeMessage = noActiveSku ? PRODUCT_TEXTS.STOCK.COMING_SOON : stockMessage;

	// Unique ID for aria-labelledby (combines sectionId + product.id to avoid collisions)
	const titleId = sectionId
		? `product-title-${sectionId}-${product.id}`
		: `product-title-${product.id}`;

	// Urgency badge for low stock (scarcity signal for conversion)
	const showUrgencyBadge = stockStatus === "low_stock";

	// Discount percentage for promo badge
	const discountPercent = computeDiscountPercent(price, compareAtPrice);
	const hasDiscount = discountPercent > 0;

	// Stock badges take priority over promo badge (same position)
	const showPromoBadge =
		hasDiscount && stockStatus !== "out_of_stock" && !showUrgencyBadge && !noActiveSku;

	// "Nouveau" badge — opt-in by the parent section. Yields to stock/urgency/promo
	// badges sharing the top-left slot.
	const showNewBadge =
		showNewBadgeProp &&
		stockStatus !== "out_of_stock" &&
		!showUrgencyBadge &&
		!showPromoBadge &&
		!noActiveSku;

	const baseUrl = `/creations/${slug}`;
	const productUrl =
		preferOnSale && defaultSku && !defaultSku.isDefault
			? buildSkuUrl(baseUrl, defaultSku)
			: baseUrl;

	const isAboveFold = !disablePreload && (index ?? 0) < ABOVE_FOLD_THRESHOLD;
	// LCP candidate: only the very first card of a list emits `<link rel="preload">`.
	// Multiple preload links on a 4G connection would compete for bandwidth.
	const isLcpCandidate = !disablePreload && index === 0;

	// Review stats: hoisted so the rating link can include the score in its aria-label.
	const reviewStats =
		product.reviewStats && product.reviewStats.totalCount > 0 ? product.reviewStats : null;
	const reviewAverage = reviewStats ? Number(reviewStats.averageRating) : 0;
	const formattedRating = reviewStats ? ratingFormatter.format(reviewAverage) : null;

	// Aligned with Gallery PDP for card→detail morph (gallery.tsx:436).
	const productViewTransitionName = `product-${product.id}`;

	// Build sr-only description for screen readers (badges info)
	const badgeDescriptions: string[] = [];
	if (stockStatus === "out_of_stock") {
		badgeDescriptions.push(outOfStockBadgeMessage);
	} else if (showUrgencyBadge) {
		badgeDescriptions.push(
			`Stock limité : plus que ${inventory} exemplaire${inventory > 1 ? "s" : ""} disponible${inventory > 1 ? "s" : ""}`,
		);
	}
	if (showPromoBadge) {
		badgeDescriptions.push(`Promotion : -${discountPercent}%`);
	}
	if (showNewBadge) {
		badgeDescriptions.push("Nouveauté");
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
				CARD_SURFACE_BASE,
				"product-card grid gap-4 rounded-lg sm:rounded-xl",
				CARD_SURFACE_HOVER,
				"motion-safe:can-hover:hover:scale-[1.02]",
				CARD_SURFACE_FOCUS,
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
					"motion-safe:can-hover:group-hover:after:opacity-100 after:absolute after:inset-0 after:z-[5] after:bg-linear-to-t after:from-black/5 after:to-transparent after:opacity-0 motion-safe:after:transition-opacity motion-safe:after:duration-300",
				)}
			>
				{/* Status badges — stock badges take priority over promo */}
				{stockStatus === "out_of_stock" && (
					<CardBadge
						variant="secondary"
						className="bg-foreground/80 text-background border-0 backdrop-blur-sm"
					>
						{outOfStockBadgeMessage}
					</CardBadge>
				)}
				{showUrgencyBadge && <CardBadge variant="warning">{stockMessage}</CardBadge>}
				{showPromoBadge && <CardBadge variant="destructive">-{discountPercent}%</CardBadge>}
				{showNewBadge && <CardBadge variant="default">Nouveau</CardBadge>}

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
						style={{ viewTransitionName: productViewTransitionName }}
						placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
						blurDataURL={primaryImage.blurDataUrl ?? undefined}
						preload={isLcpCandidate}
						loading={isAboveFold ? "eager" : "lazy"}
						fetchPriority={isAboveFold ? "high" : "auto"}
						sizes={IMAGE_SIZES.PRODUCT_CARD}
					/>
					{secondaryImage && (
						<Image
							src={secondaryImage.url}
							alt=""
							fill
							className="can-hover:group-hover:opacity-100 can-hover:group-hover:scale-100 scale-[1.02] rounded-lg object-cover opacity-0 ease-out motion-safe:transition-[opacity,transform] motion-safe:duration-500 sm:rounded-xl"
							loading="lazy"
							quality={70}
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
					className="focus-ring block after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
				>
					<h3 id={titleId} className="text-foreground line-clamp-2 text-base sm:text-lg">
						{title}
					</h3>
				</Link>

				{/* Prix — placed before colors for scannability (Baymard guideline) */}
				{!noActiveSku && <ProductPrice price={price} compareAtPrice={compareAtPrice} />}

				{/* Average rating — lien direct vers la section avis (saute le stretched link via z-30) */}
				{reviewStats && formattedRating && (
					<Link
						href={`${productUrl}#reviews`}
						className="focus-ring relative z-30 inline-flex w-fit rounded-sm"
						aria-label={`Lire les ${reviewStats.totalCount} avis (note moyenne : ${formattedRating} sur 5)`}
					>
						<ProductCardRating
							averageRating={reviewAverage}
							totalCount={reviewStats.totalCount}
							productId={product.id}
							formattedRating={formattedRating}
						/>
					</Link>
				)}

				{/* Color swatches — individual links to product page with ?color= */}
				{colors.length > 1 && (
					<ProductCardColorSwatches colors={colors} productUrl={productUrl} title={title} />
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
