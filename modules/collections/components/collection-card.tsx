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
	showDescription?: boolean;
	size?: "sm" | "md" | "lg";
}

/**
 * Card de collection avec image, titre et description optionnelle
 *
 * ✅ OPTIMISATIONS APPLIQUÉES:
 * - Utilise composant Card shadcn/ui pour cohérence design system
 * - Border hover alignée avec ProductCard
 * - Shadow colorée primary/10 au hover
 * - Lift -translate-y-1 (plus visible)
 * - État active pour feedback tactile
 * - Border-radius cohérent (rounded-lg)
 * - Typography Crimson Pro uniformisée
 * - aria-hidden sur texte fallback redondant
 * - Quality 85 pour images premium
 */
export function CollectionCard({
	slug,
	name,
	description,
	imageUrl,
	showDescription = false,
	size = "md",
}: CollectionCardProps) {
	// Génération ID unique pour aria-labelledby (RSC compatible)
	const titleId = `collection-title-${slug}`;

	// Configuration responsive selon la taille
	const sizeConfig = {
		sm: {
			container: "gap-3",
			title: "text-base/6 sm:text-lg/6 tracking-normal antialiased break-words",
			description: "text-xs/5 tracking-normal antialiased line-clamp-2 break-words overflow-hidden",
			padding: "p-3",
		},
		md: {
			container: "gap-4",
			title: "text-lg/7 sm:text-xl/7 tracking-tight antialiased break-words",
			description: "text-sm/6 tracking-normal antialiased line-clamp-3 break-words overflow-hidden",
			padding: "p-4",
		},
		lg: {
			container: "gap-5",
			title: "text-xl/8 sm:text-2xl/8 tracking-tight antialiased break-words",
			description: "text-base/7 tracking-normal antialiased line-clamp-4 break-words overflow-hidden",
			padding: "p-5",
		},
	};

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
					"collection-card overflow-hidden",
					// Supprimer le padding par défaut de Card (py-6)
					"p-0",
					// Border et shadow cohérents avec ProductCard
					"border-transparent hover:border-primary/20",
					"shadow-sm hover:shadow-lg hover:shadow-primary/10",
					// Animations hover uniformisées
					"transition-all duration-300 ease-out",
					"hover:-translate-y-1 will-change-transform",
					// État active pour feedback tactile
					"active:scale-[0.98] active:translate-y-0",
					sizeConfig[size].container
				)}
				itemScope
				itemType="https://schema.org/Collection"
			>
				{/* Image */}
				<div className="collection-card-media relative aspect-square overflow-hidden bg-muted">
					{imageUrl ? (
						<Image
							src={imageUrl}
							alt={`Collection ${name} - Synclune bijoux artisanaux`}
							fill
							className="object-cover rounded-t-lg transition-transform duration-500 ease-out group-hover:scale-105"
							loading="lazy"
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
				<div className={cn("space-y-2 min-w-0 overflow-hidden", sizeConfig[size].padding)}>
					{/* Titre avec Crimson Pro uniformisé */}
					<h3
						id={titleId}
						className={cn(
							crimsonPro.className,
							"line-clamp-2 overflow-hidden text-foreground",
							sizeConfig[size].title
						)}
						itemProp="name"
					>
						{name}
					</h3>

					{/* Description optionnelle - Hover cohérent avec ProductCard */}
					{showDescription && description && (
						<p
							className={cn(
								sizeConfig[size].description,
								"text-foreground/70 transition-colors duration-300 ease-out group-hover:text-foreground/90"
							)}
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
