import { cn } from "@/shared/utils/cn";
import Image from "next/image";

interface CollectionImage {
	url: string;
	blurDataUrl?: string | null;
	alt?: string | null;
}

interface CollectionImagesGridProps {
	images: CollectionImage[];
	collectionName: string;
	isAboveFold?: boolean;
}

/**
 * Grid adaptatif pour afficher les produits d'une collection
 *
 * S'adapte au nombre d'images disponibles :
 * - 1 image  : Pleine largeur
 * - 2 images : 2 colonnes égales
 * - 3 images : 1 grande + 2 petites
 * - 4 images : Bento Grid (1 grande + 3 petites)
 */
export function CollectionImagesGrid({
	images,
	collectionName,
	isAboveFold = false,
}: CollectionImagesGridProps) {
	const count = images.length;

	// 1 image : pleine largeur
	if (count === 1) {
		return (
			<div className="relative aspect-square overflow-hidden rounded-t-xl bg-muted">
				<CollectionImage
					image={images[0]}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					sizes="(max-width: 640px) 100vw, 50vw"
				/>
			</div>
		);
	}

	// 2 images : 2 colonnes égales
	if (count === 2) {
		return (
			<div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-t-xl">
				{images.map((image, i) => (
					<div key={i} className="relative aspect-square overflow-hidden bg-muted">
						<CollectionImage
							image={image}
							collectionName={collectionName}
							index={i}
							isAboveFold={isAboveFold && i === 0}
							sizes="(max-width: 640px) 50vw, 25vw"
						/>
					</div>
				))}
			</div>
		);
	}

	// 3 images : 1 grande à gauche + 2 petites à droite
	if (count === 3) {
		return (
			<div className="grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-t-xl">
				{/* Grande image - span 2 rows */}
				<div className="relative row-span-2 overflow-hidden bg-muted">
					<CollectionImage
						image={images[0]}
						collectionName={collectionName}
						index={0}
						isAboveFold={isAboveFold}
						sizes="(max-width: 640px) 50vw, 33vw"
					/>
				</div>
				{/* 2 petites images */}
				{[1, 2].map((i) => (
					<div key={i} className="relative aspect-square overflow-hidden bg-muted">
						<CollectionImage
							image={images[i]}
							collectionName={collectionName}
							index={i}
							sizes="(max-width: 640px) 50vw, 25vw"
						/>
					</div>
				))}
			</div>
		);
	}

	// 4+ images : Bento Grid
	return (
		<div
			className={cn(
				"grid gap-0.5 overflow-hidden rounded-t-xl",
				// Mobile : 2x2
				"grid-cols-2 grid-rows-2",
				// Desktop : Bento (1 grande + 3 petites)
				"sm:grid-cols-[2fr_1fr] sm:grid-rows-3",
			)}
		>
			{/* Image principale - span rows */}
			<div
				className={cn(
					"relative overflow-hidden bg-muted",
					"aspect-square",
					"sm:row-span-3 sm:aspect-auto",
				)}
			>
				<CollectionImage
					image={images[0]}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					sizes="(max-width: 640px) 50vw, 33vw"
				/>
			</div>

			{/* 3 petites images à droite */}
			{[1, 2, 3].map((i) => (
				<div
					key={i}
					className={cn(
						"relative aspect-square overflow-hidden bg-muted",
						// Cacher la 4ème sur mobile (grid 2x2)
						i === 3 && "hidden sm:block",
					)}
				>
					<CollectionImage
						image={images[i]}
						collectionName={collectionName}
						index={i}
						sizes="(max-width: 640px) 25vw, 15vw"
					/>
				</div>
			))}
		</div>
	);
}

/** Composant Image réutilisable avec hover effect */
function CollectionImage({
	image,
	collectionName,
	index,
	isAboveFold = false,
	sizes,
}: {
	image: CollectionImage;
	collectionName: string;
	index: number;
	isAboveFold?: boolean;
	sizes: string;
}) {
	return (
		<Image
			src={image.url}
			alt={image.alt || `${collectionName} - Produit ${index + 1}`}
			fill
			className={cn(
				"object-cover",
				"transition-transform duration-300 ease-out",
				"motion-safe:can-hover:group-hover:scale-[1.08]",
			)}
			sizes={sizes}
			priority={isAboveFold}
			loading={isAboveFold ? undefined : "lazy"}
			placeholder={image.blurDataUrl ? "blur" : "empty"}
			blurDataURL={image.blurDataUrl || undefined}
			quality={index === 0 ? 85 : 75}
		/>
	);
}
