import {
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
	CARD_SURFACE_POLAROID,
} from "@/shared/components/card-surface.constants";
import { MaskingTape } from "@/shared/components/masking-tape";
import { SquiggleUnderline } from "@/shared/components/squiggle-underline";
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
import type { ProductCarouselItem } from "@/modules/products/types/product.types";
import { getProductCardData } from "@/modules/products/services/product-display.service";
import { buildSkuUrl } from "@/modules/products/utils/build-sku-url";
import { computeDiscountPercent } from "@/modules/products/utils/compute-discount-percent";
import type { ComponentProps, ReactNode } from "react";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface ProductCardProps {
	product: ProductCarouselItem;
	/**
	 * Index dans la liste (eager loading + fetchPriority above-fold, et sens
	 * de l'inclinaison au survol : une carte sur deux penche à droite)
	 */
	index?: number;
	/** Indique si le produit est dans la wishlist */
	isInWishlist?: boolean;
	/** Identifiant de section pour des IDs uniques (ex: "bestsellers", "latest") */
	sectionId?: string;
	/** Si true, priorise l'affichage du SKU en promotion */
	preferOnSale?: boolean;
	/** Disable above-fold preload (for cards inside Suspense boundaries) */
	disablePreload?: boolean;
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
			className={cn("absolute top-2 left-2 z-20 rounded-full shadow-md", className)}
		>
			{children}
		</Badge>
	);
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Redesign « Atelier » (2026-08-03) : la carte est un tirage polaroid épinglé —
 * cadre blanc avec ruban de masking tape rose, photo insérée (ratio 4/5 unifié
 * tous viewports), légende dessous (eyebrow type produit, titre en Fraunces
 * souligné d'un trait dessiné à la main au survol/focus, matière, prix avec
 * remise inline). Au survol la carte s'incline légèrement (sens alterné par
 * index) ; le CTA panier desktop est une pastille posée sur la photo.
 *
 * Server component optimise pour les Core Web Vitals avec:
 * - Preload des images above-fold (index < ABOVE_FOLD_THRESHOLD)
 * - Support responsive
 * - Animations respectant prefers-reduced-motion (WCAG 2.3.3)
 * - WishlistButton et AddToCartCardButton comme client islands
 *
 * Note: Schema.org JSON-LD est genere sur la page produit detaillee uniquement
 * (pas de microdata dans les grilles pour eviter la redondance)
 *
 * Surface via CARD_SURFACE_POLAROID (SSOT partagée avec CollectionCard,
 * sans `overflow-hidden` : le tape déborde du cadre, c'est la zone média qui
 * clippe). Tape et trait dessiné sont les primitives partagées MaskingTape /
 * SquiggleUnderline.
 *
 * z-index stack (documented):
 * - z-10: Stretched link (title link ::after covers the entire card)
 * - z-20: Badges (stock) + tape décoratif (pointer-events-none)
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
}: ProductCardProps) {
	const { slug, title, type } = product;
	const productType = type?.label;

	// Single-pass O(n) extraction of all display data from SKUs
	const {
		defaultSku,
		price,
		compareAtPrice,
		stockInfo,
		primaryImage,
		secondaryImage,
		colors,
		material,
	} = getProductCardData(product, preferOnSale ? { preferOnSale } : undefined);

	const { status: stockStatus, message: stockMessage } = stockInfo;

	// No active SKU — produit en catalogue sans variante publiée (état "à venir")
	const noActiveSku = defaultSku === null;
	const outOfStockBadgeMessage = noActiveSku ? PRODUCT_TEXTS.STOCK.COMING_SOON : stockMessage;

	// Unique ID for aria-labelledby (combines sectionId + product.id to avoid collisions)
	const titleId = sectionId
		? `product-title-${sectionId}-${product.id}`
		: `product-title-${product.id}`;

	// Urgency badge for low stock (scarcity signal for conversion)
	const showUrgencyBadge = stockStatus === "low_stock";

	// Remise inline à côté du prix (plus de badge promo sur l'image : la promo
	// ne dispute plus le slot haut-gauche aux badges de stock)
	const discountPercent = computeDiscountPercent(price, compareAtPrice);
	const showDiscountPill = discountPercent > 0 && !noActiveSku;

	const baseUrl = `/creations/${slug}`;
	const productUrl =
		preferOnSale && defaultSku && !defaultSku.isDefault
			? buildSkuUrl(baseUrl, defaultSku)
			: baseUrl;

	// Above-fold => `loading="eager"` (l'image est décodée sans attendre le scroll),
	// mais SANS priorité réseau : voir isLcpCandidate.
	const isAboveFold = !disablePreload && (index ?? 0) < ABOVE_FOLD_THRESHOLD;
	// LCP candidate: only the very first card of a list emits `<link rel="preload">`.
	// Multiple preload links on a 4G connection would compete for bandwidth.
	//
	// `preload` et `fetchPriority="high"` forment une PAIRE indissociable et sont
	// réservés à cette seule image (parité collection-image-item) :
	// - `preload` seul => lien de préchargement en priorité basse (Next 16 ne dérive
	//   pas fetchPriority, cf. get-img-props : il est passé verbatim) ;
	// - `fetchPriority="high"` sur les 4 cartes above-fold => 4 images se disputent
	//   la bande passante 4G et retardent celle qui EST le LCP.
	const isLcpCandidate = !disablePreload && index === 0;

	// Aligned with Gallery PDP for card→detail morph (gallery.tsx:436).
	const productViewTransitionName = `product-${product.id}`;

	// Build sr-only description for screen readers (badges + promo info)
	const badgeDescriptions: string[] = [];
	if (stockStatus === "out_of_stock") {
		badgeDescriptions.push(outOfStockBadgeMessage);
	} else if (showUrgencyBadge && defaultSku) {
		// Même source que le badge visuel : le stock du SKU affiché, pas l'agrégat
		const count = defaultSku.inventory;
		badgeDescriptions.push(
			`Stock limité : plus que ${count} exemplaire${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}`,
		);
	}
	if (showDiscountPill) {
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
				// grid-rows-[auto_1fr] : la légende absorbe la hauteur excédentaire quand
				// la rangée est étirée par une carte voisine au titre plus long — combiné
				// au mt-auto du CTA mobile, les boutons restent alignés dans la rangée
				"product-card grid grid-rows-[auto_1fr]",
				CARD_SURFACE_POLAROID,
				CARD_SURFACE_HOVER,
				// Inclinaison + lift au survol, sens alterné une carte sur deux
				"motion-safe:can-hover:hover:-translate-y-1",
				(index ?? 0) % 2 === 0
					? "motion-safe:can-hover:hover:-rotate-1"
					: "motion-safe:can-hover:hover:rotate-1",
				CARD_SURFACE_FOCUS,
			)}
		>
			{/* Masking tape décoratif, centré en haut (silhouette du tirage épinglé) */}
			<MaskingTape className="-top-2 left-1/2 z-20 h-4 w-14 -translate-x-1/2 -rotate-2" />

			{/* sr-only badge descriptions for screen readers */}
			{badgeDescId && (
				<span id={badgeDescId} className="sr-only">
					{badgeDescriptions.join(". ")}
				</span>
			)}

			{/* Photo insérée dans le cadre — ratio 4/5 unifié tous viewports */}
			{/* bg-muted acts as CSS-only fallback if image fails to load */}
			<div className="product-card-media bg-muted relative aspect-4/5 overflow-hidden rounded-sm">
				{/* Status badges — stock badges take priority */}
				{stockStatus === "out_of_stock" && (
					<CardBadge
						variant="secondary"
						className="bg-foreground/80 text-background border-0 backdrop-blur-sm"
					>
						{outOfStockBadgeMessage}
					</CardBadge>
				)}
				{showUrgencyBadge && <CardBadge variant="warning">{stockMessage}</CardBadge>}

				{/* Wishlist button (client island) — toujours visible, pastille blanche
				    pour le contraste sur les photos (plus de reveal au survol) */}
				<WishlistButton
					productId={product.id}
					isInWishlist={isInWishlist}
					productTitle={title}
					className="bg-card/85 absolute top-2 right-2 z-30 rounded-full shadow-sm backdrop-blur-sm"
				/>

				<div className="absolute inset-0">
					{/* MEDIA-AUDIT-005 : fallback zéro-JS = le conteneur `bg-muted` ci-dessus
					    reste visible si l'URL CDN 404 (pas d'îlot client sur le hot path). */}
					<Image
						src={primaryImage.url}
						alt={primaryImage.alt ?? PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title, productType)}
						fill
						className={cn(
							"rounded-sm object-cover",
							!secondaryImage &&
								"motion-safe:can-hover:group-hover:scale-105 ease-out motion-safe:transition-[transform] motion-safe:duration-300",
						)}
						style={{ viewTransitionName: productViewTransitionName }}
						placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
						blurDataURL={primaryImage.blurDataUrl ?? undefined}
						preload={isLcpCandidate}
						loading={isAboveFold ? "eager" : "lazy"}
						fetchPriority={isLcpCandidate ? "high" : "auto"}
						sizes={IMAGE_SIZES.PRODUCT_CARD}
					/>
					{secondaryImage && (
						<Image
							src={secondaryImage.url}
							alt=""
							aria-hidden="true"
							fill
							className="can-hover:group-hover:opacity-100 can-hover:group-hover:scale-100 scale-[1.02] rounded-sm object-cover opacity-0 ease-out motion-safe:transition-[opacity,transform] motion-safe:duration-500"
							loading="lazy"
							quality={IMAGE_QUALITY.STANDARD}
							sizes={IMAGE_SIZES.PRODUCT_CARD}
						/>
					)}
				</div>

				{/* Add to cart button - Desktop (client island) : pastille posée sur la photo */}
				{defaultSku && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						skuId={defaultSku.id}
						productTitle={title}
						product={product}
						className="hidden sm:block"
					/>
				)}
			</div>

			{/* Légende du polaroid — no position:relative so stretched link ::after reaches the article */}
			<div className="flex flex-col gap-1.5 overflow-hidden px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				{/* Eyebrow type produit — première question de l'acheteuse dans une grille */}
				<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
					{productType ? `${productType} · fait main` : "Fait main"}
				</span>

				{/* Stretched link: title link with ::after covering the entire card.
				    Le trait dessiné sous le titre est l'affordance du lien : il se
				    révèle au survol ET au focus clavier (WCAG 2.4.7). */}
				<Link
					href={productUrl}
					className="focus-ring block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
				>
					<span className="relative block">
						<h3
							id={titleId}
							className="font-display text-foreground line-clamp-2 text-base font-normal sm:text-lg"
						>
							{title}
						</h3>
						<SquiggleUnderline />
					</span>
				</Link>

				{/* Matière principale du SKU affiché */}
				{material && !noActiveSku && (
					<span className="text-muted-foreground text-xs">{material}</span>
				)}

				{/* Prix — placed before colors for scannability (Baymard guideline),
				    remise inline recollée au prix */}
				{!noActiveSku && (
					<ProductPrice
						price={price}
						compareAtPrice={compareAtPrice}
						discountPercent={showDiscountPill ? discountPercent : undefined}
						className="mt-0.5"
					/>
				)}

				{/* Color swatches — individual links to product page with ?color= */}
				{colors.length > 1 && (
					<ProductCardColorSwatches colors={colors} productUrl={productUrl} title={title} />
				)}

				{/* Add to cart button - Mobile full-width (client island).
				    mt-auto : pousse le CTA en bas de la légende (1fr) pour que les
				    boutons d'une même rangée de grille restent alignés */}
				{defaultSku && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						skuId={defaultSku.id}
						productTitle={title}
						product={product}
						variant="mobile-full"
						className="relative z-30 mt-auto pt-1 sm:hidden"
					/>
				)}
			</div>
		</article>
	);
}
