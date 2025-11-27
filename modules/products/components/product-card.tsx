import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { IMAGE_SIZES, PRODUCT_TEXTS } from "@/shared/constants/product";
import { ProductPriceCompact } from "./product-price";

/**
 * Props pour le composant ProductCard
 */
interface ProductCardProps {
	slug: string;
	title: string;
	description: string | null;
	price: number;
	stockStatus: "in_stock" | "out_of_stock"; // Système simplifié : en stock ou rupture
	stockMessage: string;
	primaryImage: {
		url: string;
		alt: string | null;
		mediaType: "IMAGE"; // Les médias principaux sont TOUJOURS des images
	}; // IMPORTANT: primaryImage n'est jamais null grâce à getPrimaryImage()
	showDescription?: boolean;
	size?: "sm" | "md" | "lg";
	/** Index dans la liste (pour priority images above-fold) */
	index?: number;
}

/**
 * Carte produit pour l'affichage dans les grilles (catalogue, collections, recherche).
 *
 * @description
 * Composant optimisé pour les Core Web Vitals avec:
 * - Preload des images above-fold (index < 4)
 * - Schema.org Product/Offer complet
 * - Support responsive avec 3 tailles (sm/md/lg)
 * - Animations respectant prefers-reduced-motion (WCAG 2.3.3)
 * - Internationalisation via PRODUCT_TEXTS
 *
 * @example
 * ```tsx
 * <ProductCard
 *   slug="boucles-oreilles-rose"
 *   title="Boucles d'oreilles Rose Éternelle"
 *   description="Bijou artisanal en argent 925"
 *   price={4500}
 *   stockStatus="in_stock"
 *   stockMessage="En stock"
 *   primaryImage={{ url: "/images/...", alt: "...", mediaType: "IMAGE" }}
 *   index={0}
 *   size="md"
 *   showDescription={true}
 * />
 * ```
 *
 * @see {@link ProductPriceCompact} - Sous-composant utilisé pour l'affichage du prix
 */
export function ProductCard({
	slug,
	title,
	description,
	price,
	stockStatus,
	stockMessage,
	primaryImage,
	showDescription = false,
	size = "md",
	index,
}: ProductCardProps) {
	// Génération ID unique pour aria-labelledby (RSC compatible)
	const titleId = `product-title-${slug}`;

	// URL canonique uniquement (stratégie SEO e-commerce recommandée)
	// Toujours pointer vers /creations/[slug] pour consolider les signaux SEO
	const productUrl = `/creations/${slug}`;

	// Label accessible
	const accessibleLabel = title;

	// Configuration responsive selon la taille
	const sizeConfig = {
		sm: {
			container: "gap-2",
			title: "text-sm break-words hyphens-auto",
			description: "text-xs line-clamp-2 leading-relaxed break-words hyphens-auto overflow-hidden",
		},
		md: {
			container: "gap-4",
			title: "text-lg break-words hyphens-auto",
			description: "text-sm line-clamp-3 leading-relaxed break-words hyphens-auto overflow-hidden",
		},
		lg: {
			container: "gap-6",
			title: "text-xl break-words hyphens-auto",
			description: "text-base line-clamp-4 leading-relaxed break-words hyphens-auto overflow-hidden",
		},
	};

	return (
		<article
			className={cn(
				"product-card grid relative overflow-hidden bg-card rounded-lg group border-2 border-transparent",
				// Transition optimisée avec cubic-bezier pour fluidité
				"transition-all duration-400 ease-in-out",
				// Reflet doré subtil au hover uniquement (augmenté à /8 pour meilleure visibilité)
				"before:absolute before:inset-0 before:bg-gradient-to-r before:from-accent/0 before:via-accent/8 before:to-accent/0",
				"before:opacity-0 before:transition-opacity before:duration-500 before:pointer-events-none",
				"motion-safe:hover:before:opacity-100",
				// Border et shadow au hover utilisant les couleurs du thème
				"shadow-sm motion-safe:hover:border-primary/20 motion-safe:hover:shadow-lg motion-safe:hover:shadow-primary/10",
				"motion-safe:hover:-translate-y-1 will-change-transform",
				sizeConfig[size].container
			)}
			itemScope
			itemType="https://schema.org/Product"
		>
			{/* Link unique englobant toute la carte */}
			<Link
				href={productUrl}
				className="block focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm transition-all duration-300 ease-out relative z-10"
				aria-labelledby={titleId}
			>
				{/* Image principale (jamais de vidéo, jamais null grâce à getPrimaryImage()) */}
				<div className="product-card-media relative aspect-4/5 overflow-hidden bg-muted transition-all duration-500">
					{/* Badge rupture de stock */}
					{stockStatus === "out_of_stock" && (
						<div className="absolute top-2 left-2 bg-destructive text-destructive-foreground px-2 py-1 rounded-md text-xs font-medium z-10 shadow-sm">
							{stockMessage}
						</div>
					)}
					<ViewTransition name={`product-image-${slug}`}>
						<Image
							src={primaryImage.url}
							alt={primaryImage.alt || PRODUCT_TEXTS.IMAGES.DEFAULT_ALT(title)}
							fill
							className="object-cover rounded-t-lg transition-all duration-500 ease-out motion-safe:group-hover:scale-110"
							placeholder="empty"
							// Preload pour les 4 premières images (above-fold) - Next.js 16
							preload={index !== undefined && index < 4}
							loading={index !== undefined && index < 4 ? undefined : "lazy"}
							sizes={IMAGE_SIZES.PRODUCT_CARD}
							itemProp="image"
						/>
					</ViewTransition>
				</div>

				{/* Contenu (plus de Link imbriqué) */}
				<div className="flex flex-col gap-2 relative p-4">
					{/* Titre avec hiérarchie tokenisée responsive */}
					<ViewTransition name={`product-title-${slug}`}>
						<h3
							id={titleId}
							className={cn(
								"line-clamp-2 font-sans text-foreground",
								sizeConfig[size].title
							)}
							itemProp="name"
						>
							{title}
						</h3>
					</ViewTransition>

					{/* Information de rupture de stock pour les technologies d'assistance */}
					{stockStatus === "out_of_stock" && (
						<span className="sr-only">{stockMessage}</span>
					)}

					{/* Description : toujours exposée pour SEO (meta si invisible) */}
					{description &&
						(showDescription ? (
							<p
								className={cn(
									"text-foreground/70 transition-colors duration-300 ease-out group-hover:text-foreground/90",
									sizeConfig[size].description
								)}
								itemProp="description"
							>
								{description}
							</p>
						) : (
							<meta itemProp="description" content={description} />
						))}

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
