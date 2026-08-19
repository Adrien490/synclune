import {
	CARD_SURFACE_FOCUS,
	CARD_SURFACE_HOVER,
	CARD_SURFACE_POLAROID,
} from "@/shared/components/card-surface.constants";
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
import { buildVariantUrl } from "@/modules/products/utils/build-variant-url";
import { productViewTransitionName } from "@/modules/products/utils/product-view-transition";
import { PAGE_FADE_TRANSITION_TYPES } from "@/shared/constants/view-transitions";
import type { ComponentProps, ReactNode } from "react";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

interface ProductCardProps {
	product: ProductCarouselItem;
	/**
	 * Index dans la liste (eager loading + fetchPriority above-fold, et sens
	 * de l'inclinaison au survol : une carte sur deux penche à droite).
	 * Omis, la carte est traitée comme d'index 0 SAUF pour le preload LCP
	 * (`index === 0` strict) : image en `eager`, inclinaison de carte paire.
	 * Toute grille doit le passer — l'omission n'a de sens que hors liste.
	 */
	index?: number;
	/** Indique si le produit est dans la wishlist */
	isInWishlist?: boolean;
	/** Identifiant de section pour des IDs uniques (ex: "bestsellers", "latest") */
	sectionId?: string;
	/** Disable above-fold preload (for cards inside Suspense boundaries) */
	disablePreload?: boolean;
}

/**
 * Badge positionne en haut a gauche de la carte.
 * Marque aria-hidden car l'information est transmise via le sr-only span
 * associe a l'article (aria-describedby).
 *
 * ⚠️ `pointer-events-none` est non négociable : à `z-20` le badge passe AU-DESSUS du lien étiré
 * (`::after` z-10), et la zone média étant `relative` sans `z-index`, elle
 * ne crée pas de contexte d'empilement qui isolerait les deux. Sans cette
 * classe, « Rupture de stock » / « Plus que 3 ! » découpait ~100 × 20 px de zone
 * morte au clic en haut à gauche de la photo — sur l'élément le plus cliqué de
 * la boutique. Le badge est décoratif (`aria-hidden`, doublé du sr-only) : il
 * n'a aucune raison de capter un clic.
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
			className={cn(
				"pointer-events-none absolute top-2 left-2 z-20 rounded-full shadow-md",
				className,
			)}
		>
			{children}
		</Badge>
	);
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Redesign « Atelier » (2026-08-03) : la carte est un tirage polaroid —
 * cadre blanc, photo insérée (ratio 4/5 unifié
 * tous viewports), légende dessous (eyebrow type produit, titre en display
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
 * Surface via CARD_SURFACE_POLAROID (SSOT partagée avec CollectionCard, sans
 * `overflow-hidden` — des cartes sœurs y ancrent encore un ruban qui déborde,
 * cf. EtalCard / HeroEmptyCard) ; c'est la zone média qui clippe. Le ruban de
 * cette carte a été retiré (2026-08-05, densité rose en série sur la grille) ;
 * le trait dessiné reste la primitive partagée SquiggleUnderline.
 *
 * z-index stack (documented):
 * - (aucun) : voile de rupture de stock — peint au-dessus des photos par l'ordre
 *   du DOM, sous tout le reste
 * - z-10: Stretched link (title link ::after covers the entire card)
 * - z-20: Badges (stock) — en `pointer-events-none`, sans quoi ils découpent
 *   une zone morte au clic dans le lien étiré
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
	disablePreload = false,
}: ProductCardProps) {
	const { slug, name: title, type } = product;
	const productType = type?.label;

	// Single-pass O(n) extraction of all display data from VARIANTs
	const { defaultVariant, price, stockInfo, primaryImage, secondaryImage, colors, material } =
		getProductCardData(product);

	const { status: stockStatus, message: stockMessage } = stockInfo;

	// No active VARIANT — produit en catalogue sans variante publiée (état "à venir")
	const noActiveVariant = defaultVariant === null;
	const outOfStockBadgeMessage = noActiveVariant ? PRODUCT_TEXTS.STOCK.COMING_SOON : stockMessage;

	// Unique ID for aria-labelledby (combines sectionId + product.id to avoid collisions)
	const titleId = sectionId
		? `product-title-${sectionId}-${product.id}`
		: `product-title-${product.id}`;

	// Urgency badge for low stock (scarcity signal for conversion)
	const showUrgencyBadge = stockStatus === "low_stock";

	const baseUrl = `/creations/${slug}`;
	// L'URL suit TOUJOURS le VARIANT affiché : quand getPrimaryVariantForList s'écarte du
	// représentant (rang 0 épuisé → « le moins cher en stock », ou couleur préférée),
	// la carte affichait le prix du VARIANT X en liant vers une PDP qui en montre un autre.
	// Le représentant est `variants[0]` (les selects trient par position, id) ; l'URL nue
	// suffit alors, la PDP ouvrant elle-même sur le rang 0.
	const productUrl =
		defaultVariant && defaultVariant.id !== product.variants[0]?.id
			? buildVariantUrl(baseUrl, defaultVariant)
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

	// SSOT partagée avec la première slide de la galerie PDP : l'égalité des
	// deux noms EST le morph carte → détail (invariants documentés sur l'util).
	const viewTransitionName = productViewTransitionName(product.id);

	// Build sr-only description for screen readers (stock badges)
	const badgeDescriptions: string[] = [];
	if (stockStatus === "out_of_stock") {
		badgeDescriptions.push(outOfStockBadgeMessage);
	} else if (showUrgencyBadge && defaultVariant) {
		// Même source que le badge visuel : le stock du VARIANT affiché, pas l'agrégat
		const count = defaultVariant.stock;
		badgeDescriptions.push(
			`Stock limité : plus que ${count} exemplaire${count > 1 ? "s" : ""} disponible${count > 1 ? "s" : ""}`,
		);
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
			{/* sr-only badge descriptions for screen readers */}
			{badgeDescId && (
				<span id={badgeDescId} className="sr-only">
					{badgeDescriptions.join(". ")}
				</span>
			)}

			{/* Photo insérée dans le cadre — ratio 4/5 unifié tous viewports */}
			{/* bg-muted acts as CSS-only fallback if image fails to load */}
			<div className="bg-muted relative aspect-4/5 overflow-hidden rounded-sm">
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

				{/* Wishlist button (client island) — toujours visible, SANS pastille de fond :
				    le contraste sur photo est porté par le double drop-shadow de l'icône
				    (halo blanc + ombre sombre, cf. wishlist-button.tsx), qui est le
				    traitement documenté du composant — le fond faisait doublon. */}
				<WishlistButton
					productId={product.id}
					isInWishlist={isInWishlist}
					productTitle={title}
					className="absolute top-2 right-2 z-30"
				/>

				<div className="absolute inset-0">
					{/* MEDIA-AUDIT-005 : fallback zéro-JS = le conteneur `bg-muted` ci-dessus
					    reste visible si l'URL CDN 404 (pas d'îlot client sur le hot path). */}
					<Image
						src={primaryImage.url}
						alt={primaryImage.alt}
						fill
						className={cn(
							"rounded-sm object-cover",
							!secondaryImage &&
								"motion-safe:can-hover:group-hover:scale-105 ease-out motion-safe:transition-[scale] motion-safe:duration-300",
						)}
						style={{ viewTransitionName }}
						placeholder={primaryImage.blurDataUrl ? "blur" : "empty"}
						blurDataURL={primaryImage.blurDataUrl ?? undefined}
						preload={isLcpCandidate}
						loading={isAboveFold ? "eager" : "lazy"}
						fetchPriority={isLcpCandidate ? "high" : "auto"}
						// Explicite alors que Next résout DÉJÀ le défaut 75 sur 80 via
						// `findClosestQuality` (`qualities: [65, 80]`) : le comportement
						// correct d'aujourd'hui ne tient qu'à cet écart arithmétique. Qu'un
						// palier proche de 75 entre un jour dans `qualities` et le candidat
						// LCP basculerait dessus en silence, en facturant une 3ᵉ variante par
						// source. L'image secondaire déclarait déjà la sienne.
						quality={IMAGE_QUALITY.STANDARD}
						sizes={IMAGE_SIZES.PRODUCT_CARD}
					/>
					{secondaryImage && (
						// ⚠️ `hidden can-hover:block` et NON un simple `opacity-0` : la photo
						// n'est révélée que par `can-hover:group-hover`, donc sur tactile elle
						// est structurellement inatteignable — mais `opacity: 0` n'empêche pas
						// le chargement `lazy`, qui se déclenche à l'intersection du viewport.
						// Chaque carte téléchargeait ainsi une image que l'appareil ne peut pas
						// montrer : ~0,5–0,8 Mo par grille de 12 sur un viewport de 390 px
						// (`45vw` × DPR 3 → variante 640 px), plus une transformation Vercel
						// facturée par source. En `display: none` l'élément n'a pas de boîte,
						// n'intersecte jamais, et n'est jamais requis.
						//
						// Gater le MASQUAGE sur `can-hover:` est ici sans risque — contrairement
						// à une affordance, ce calque est purement décoratif (`aria-hidden`,
						// aucun rôle de focus) : rien à mettre en parité clavier.
						<div className="can-hover:block absolute inset-0 hidden">
							<Image
								src={secondaryImage.url}
								alt=""
								aria-hidden="true"
								fill
								className="can-hover:group-hover:opacity-100 can-hover:group-hover:scale-100 scale-[1.02] rounded-sm object-cover opacity-0 ease-out motion-safe:transition-[opacity,scale] motion-safe:duration-500"
								loading="lazy"
								quality={IMAGE_QUALITY.STANDARD}
								sizes={IMAGE_SIZES.PRODUCT_CARD}
							/>
						</div>
					)}
				</div>

				{/* Rupture de stock : voile de « tirage passé ». Le badge seul est un signal
				    trop faible à la vitesse de scan d'une grille — mais surtout PAS de
				    `grayscale`/`saturate-*` : la couleur est l'argument de ces bijoux, la
				    désaturation serait le contre-pied du brief. Un voile `bg-card` baisse la
				    présence en conservant la teinte.

				    Sans `z-index`, il se peint au-dessus des photos (ordre du DOM) mais reste
				    sous le lien étiré (z-10), les badges (z-20) et la wishlist (z-30) ;
				    `pointer-events-none` garantit qu'il n'intercepte pas le clic. */}
				{stockStatus === "out_of_stock" && (
					<span aria-hidden="true" className="bg-card/45 pointer-events-none absolute inset-0" />
				)}

				{/* Add to cart button - Desktop (client island) : pastille posée sur la photo */}
				{defaultVariant && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						variantId={defaultVariant.id}
						productTitle={title}
						product={product}
						className="hidden sm:block"
					/>
				)}
			</div>

			{/* Légende du polaroid — no position:relative so stretched link ::after reaches the article */}
			<div className="flex flex-col gap-1.5 overflow-hidden px-1.5 pt-2.5 pb-3 sm:px-2 sm:pt-3 sm:pb-4">
				{/* Eyebrow type produit — première question de l'acheteuse dans une grille.
				    « · fait main » a été retiré (2026-08-05) : toute la boutique est faite
				    main, donc dans la grille la mention ne discriminait RIEN tout en occupant
				    la ligne la plus contrainte de la carte (10 px, `tracking-widest`) et en se
				    répétant 12 fois — y compris pour un lecteur d'écran. La promesse est déjà
				    portée une fois, juste au-dessus de la grille, par `catalog-heading.tsx`.
				    Repli « Création » plutôt que rien : le squelette réserve cette ligne
				    (`h-3`), un eyebrow vide désalignerait la carte de ~14 px. */}
				<span className="text-2xs text-muted-foreground font-semibold tracking-widest uppercase">
					{productType ?? "Création"}
				</span>

				{/* Stretched link: title link with ::after covering the entire card.
				    Le trait dessiné sous le titre est l'affordance du lien : il se
				    révèle au survol ET au focus clavier (WCAG 2.4.7). */}
				<Link
					href={productUrl}
					className="focus-ring block w-fit max-w-full after:absolute after:inset-0 after:z-10 focus-visible:rounded-sm"
					// Réclame le fondu de page à la frontière <ViewTransition> du layout
					// (opt-in — cf. `shared/constants/view-transitions.ts`). C'est aussi
					// ce qui RÉVEILLE le morph carte → fiche : les deux
					// `view-transition-name` de `productViewTransitionName()` existaient
					// depuis 2026-08-08, mais rien ne démarrait jamais la transition qui
					// les fait se répondre.
					transitionTypes={PAGE_FADE_TRANSITION_TYPES}
				>
					<span className="relative block">
						<h3
							id={titleId}
							className="font-display text-foreground line-clamp-2 text-base font-normal sm:text-lg"
						>
							{title}
						</h3>
						{/* `w-full` : sans lui le trait garde son défaut `w-20` (80 px fixes),
						    qui déborde dans le vide sous un titre court et n'en souligne que la
						    moitié sous un titre long clampé sur 2 lignes. Correctif appliqué à
						    CollectionCard le 2026-08-04, jamais répercuté ici. */}
						<SquiggleUnderline className="w-full" />
					</span>
				</Link>

				{/* Matière principale du VARIANT affiché (déjà null sans VARIANT actif) */}
				{material && <span className="text-muted-foreground text-xs">{material}</span>}

				{/* Prix — placed before colors for scannability (Baymard guideline).
				    Pas de prix barré/remise : cf. le commentaire Omnibus de ProductPrice. */}
				{!noActiveVariant && <ProductPrice price={price} className="mt-0.5" />}

				{/* Color swatches — individual links to product page with ?color= */}
				{colors.length > 1 && (
					<ProductCardColorSwatches colors={colors} productUrl={productUrl} title={title} />
				)}

				{/* Add to cart button - Mobile full-width (client island).
				    mt-auto : pousse le CTA en bas de la légende (1fr) pour que les
				    boutons d'une même rangée de grille restent alignés */}
				{defaultVariant && stockStatus !== "out_of_stock" && (
					<AddToCartCardButton
						variantId={defaultVariant.id}
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
