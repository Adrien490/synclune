import { Card } from "@/shared/components/ui/card";
import { COLLECTION_IMAGE_SIZES } from "@/modules/collections/constants/image-sizes.constants";
import { crimsonPro } from "@/shared/styles/fonts";
import { cn } from "@/shared/utils/cn";
import { Gem } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface CollectionCardProps {
	slug: string;
	name: string;
	description: string | null;
	imageUrl: string | null;
	blurDataUrl?: string | null;
	showDescription?: boolean;
	index?: number;
	/** Custom sizes pour contextes differents (grid vs carousel) */
	sizes?: string;
	/** Niveau de heading pour hierarchie a11y (defaut: h3) */
	headingLevel?: "h2" | "h3" | "h4";
}

/**
 * Card de collection avec image, titre et description optionnelle
 *
 * OPTIMISATIONS APPLIQUEES:
 * - Composant Card shadcn/ui pour coherence design system
 * - can-hover: pour hover desktop uniquement (evite etats coinces sur mobile)
 * - motion-safe: pour respect prefers-reduced-motion (WCAG 2.3.3)
 * - Blur placeholder pour CLS optimise
 * - Preload above-fold (index < 4)
 * - Schema.org Collection avec wrapper article
 * - Typography Crimson Pro uniformisee
 * - Quality 85 pour images premium
 * - Hover effects harmonises avec ProductCard
 */
export function CollectionCard({
	slug,
	name,
	description,
	imageUrl,
	blurDataUrl,
	showDescription = false,
	index,
	sizes = COLLECTION_IMAGE_SIZES.COLLECTION_CARD,
	headingLevel: HeadingTag = "h3",
}: CollectionCardProps) {
	// Generation ID unique pour aria-labelledby (RSC compatible)
	// Inclut index pour eviter collisions si meme collection affichee 2x
	const titleId = `collection-title-${slug}-${index ?? 0}`;

	// Preload above-fold images (4 premieres)
	const isAboveFold = index !== undefined && index < 4;

	return (
		<article itemScope itemType="https://schema.org/Collection">
			<Link
				href={`/collections/${slug}`}
				className={cn(
					"group block min-w-0",
					"focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-lg",
					"transition-all duration-300 ease-out",
				)}
				aria-labelledby={titleId}
			>
				<Card
					className={cn(
						"collection-card overflow-hidden",
						// Supprimer le padding par defaut de Card (py-6)
						"p-0",
						// Border renforcee (2px comme ProductCard)
						"border-2 border-transparent",
						"motion-safe:can-hover:hover:border-primary/30",
						// Focus-within pour navigation clavier (harmonise avec ProductCard)
						"focus-within:border-primary/30 focus-within:shadow-lg focus-within:shadow-primary/10",
						// Shadow harmonisee avec ProductCard
						"shadow-sm",
						"motion-safe:can-hover:hover:shadow-xl motion-safe:can-hover:hover:shadow-primary/15",
						// Animations hover avec can-hover (desktop uniquement) + motion-safe (WCAG 2.3.3)
						"transition-all duration-300 ease-out",
						"motion-safe:can-hover:hover:-translate-y-1.5 motion-safe:can-hover:hover:scale-[1.01]",
						// Etat active pour feedback tactile
						"motion-safe:active:scale-[0.98] motion-safe:active:translate-y-0",
						// GPU optimization pour animations fluides
						"will-change-transform",
					)}
				>
					{/* SEO: URL de la collection (absolue pour Schema.org) */}
					<meta itemProp="url" content={`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://synclune.fr"}/collections/${slug}`} />

					{/* Image */}
					<div className="collection-card-media relative aspect-square overflow-hidden bg-muted">
						{imageUrl ? (
							<Image
								src={imageUrl}
								alt={`Collection ${name}`}
								fill
								className="object-cover rounded-t-lg transition-transform duration-300 ease-out motion-safe:can-hover:group-hover:scale-[1.08]"
								loading={isAboveFold ? undefined : "lazy"}
								priority={isAboveFold}
								placeholder={blurDataUrl ? "blur" : "empty"}
								blurDataURL={blurDataUrl || undefined}
								quality={85}
								sizes={sizes}
								itemProp="image"
							/>
						) : (
							<div
								className="flex h-full items-center justify-center bg-muted"
								role="img"
								aria-label={`Image non disponible pour la collection ${name}`}
							>
								<Gem className="w-12 h-12 text-primary/40" />
							</div>
						)}
					</div>

					{/* Contenu avec padding responsive */}
					<div className="space-y-2 p-4 sm:p-5 lg:p-6">
						{/* Titre avec Crimson Pro uniformise */}
						<HeadingTag
							id={titleId}
							className={cn(
								crimsonPro.className,
								"line-clamp-2 overflow-hidden text-foreground",
								"text-lg/7 sm:text-xl/7 tracking-tight break-words",
							)}
							itemProp="name"
						>
							{name}
						</HeadingTag>

						{/* Description optionnelle */}
						{showDescription && description && (
							<p
								className="text-sm/6 tracking-normal line-clamp-3 break-words text-foreground/70 transition-colors duration-300 ease-out motion-safe:can-hover:group-hover:text-foreground/90"
								itemProp="description"
							>
								{description}
							</p>
						)}
					</div>
				</Card>
			</Link>
		</article>
	);
}
