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
}

/**
 * Card de collection avec image, titre et description optionnelle
 *
 * ✅ OPTIMISATIONS APPLIQUÉES:
 * - Composant Card shadcn/ui pour cohérence design system
 * - Animations subtiles (différenciation avec ProductCard)
 * - motion-safe: pour respect prefers-reduced-motion (WCAG 2.3.3)
 * - Blur placeholder pour CLS optimisé
 * - Preload above-fold (index < 4)
 * - Schema.org Collection avec url
 * - Typography Crimson Pro uniformisée
 * - Quality 85 pour images premium
 */
export function CollectionCard({
	slug,
	name,
	description,
	imageUrl,
	blurDataUrl,
	showDescription = false,
	index,
}: CollectionCardProps) {
	// Génération ID unique pour aria-labelledby (RSC compatible)
	const titleId = `collection-title-${slug}`;

	// Preload above-fold images (4 premières)
	const isAboveFold = index !== undefined && index < 4;

	return (
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
					"collection-card overflow-hidden gap-4",
					// Supprimer le padding par défaut de Card (py-6)
					"p-0",
					// Border et shadow (plus subtiles que ProductCard)
					"border-transparent motion-safe:hover:border-primary/20",
					"shadow-sm motion-safe:hover:shadow-lg motion-safe:hover:shadow-primary/10",
					// Animations hover avec motion-safe (WCAG 2.3.3)
					"transition-all duration-300 ease-out",
					"motion-safe:hover:-translate-y-1 will-change-transform",
					// État active pour feedback tactile
					"active:scale-[0.98] active:translate-y-0",
				)}
				itemScope
				itemType="https://schema.org/Collection"
			>
				{/* SEO: URL de la collection */}
				<meta itemProp="url" content={`/collections/${slug}`} />

				{/* Image */}
				<div className="collection-card-media relative aspect-square overflow-hidden bg-muted">
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={`Collection ${name} - Synclune bijoux artisanaux`}
							fill
							className="object-cover rounded-t-lg transition-transform duration-500 ease-out motion-safe:group-hover:scale-105"
							loading={isAboveFold ? undefined : "lazy"}
							priority={isAboveFold}
							placeholder={blurDataUrl ? "blur" : "empty"}
							blurDataURL={blurDataUrl || undefined}
							quality={85}
							sizes={COLLECTION_IMAGE_SIZES.COLLECTION_CARD}
							itemProp="image"
						/>
					) : (
						<div
							className="flex h-full items-center justify-center bg-muted"
							role="img"
							aria-label={`Image non disponible pour la collection ${name}`}
						>
							<div className="text-center space-y-3">
								<Gem className="w-12 h-12 text-primary/40 mx-auto" />
								<span
									className="text-sm/6 tracking-normal antialiased text-muted-foreground"
									aria-hidden="true"
								>
									{name}
								</span>
							</div>
						</div>
					)}
				</div>

				{/* Contenu */}
				<div className="space-y-2 min-w-0 overflow-hidden p-4">
					{/* Titre avec Crimson Pro uniformisé */}
					<h3
						id={titleId}
						className={cn(
							crimsonPro.className,
							"line-clamp-2 overflow-hidden text-foreground",
							"text-lg/7 sm:text-xl/7 tracking-tight antialiased break-words",
						)}
						itemProp="name"
					>
						{name}
					</h3>

					{/* Description optionnelle */}
					{showDescription && description && (
						<p
							className="text-sm/6 tracking-normal antialiased line-clamp-3 break-words overflow-hidden text-foreground/70 transition-colors duration-300 ease-out motion-safe:group-hover:text-foreground/90"
							itemProp="description"
						>
							{description}
						</p>
					)}
				</div>
			</Card>
		</Link>
	);
}
