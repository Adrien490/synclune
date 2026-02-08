import { cn } from "@/shared/utils/cn";
import type { CollectionImage } from "../types/collection.types";
import { COLLECTION_IMAGE_SIZES_COMPACT } from "../constants/image-sizes.constants";
import { CollectionImageItem } from "./collection-image-item";

type CollectionImagesVariant = "default" | "compact";

interface CollectionImagesGridProps {
	images: CollectionImage[];
	collectionName: string;
	isAboveFold?: boolean;
	variant?: CollectionImagesVariant;
}

/**
 * Grid adaptatif pour afficher les produits d'une collection
 *
 * S'adapte au nombre d'images disponibles :
 * - 1 image  : Pleine largeur
 * - 2 images : 2 colonnes egales
 * - 3 images : 1 grande + 2 petites
 * - 4+ images : Bento Grid (1 grande + 3 petites)
 */
export function CollectionImagesGrid({
	images,
	collectionName,
	isAboveFold = false,
	variant = "default",
}: CollectionImagesGridProps) {
	const count = images.length;
	const ariaLabel = `Aperçu de ${count} produit${count > 1 ? "s" : ""} de la collection ${collectionName}`;

	if (count === 1) {
		return (
			<SingleImageLayout
				image={images[0]}
				collectionName={collectionName}
				isAboveFold={isAboveFold}
				ariaLabel={ariaLabel}
				variant={variant}
			/>
		);
	}

	if (count === 2) {
		return (
			<TwoImagesLayout
				images={images}
				collectionName={collectionName}
				isAboveFold={isAboveFold}
				ariaLabel={ariaLabel}
				variant={variant}
			/>
		);
	}

	if (count === 3) {
		return (
			<ThreeImagesLayout
				images={images}
				collectionName={collectionName}
				isAboveFold={isAboveFold}
				ariaLabel={ariaLabel}
				variant={variant}
			/>
		);
	}

	return (
		<BentoGridLayout
			images={images}
			collectionName={collectionName}
			isAboveFold={isAboveFold}
			ariaLabel={ariaLabel}
			variant={variant}
		/>
	);
}

// ============================================================================
// LAYOUTS
// ============================================================================

interface LayoutProps {
	collectionName: string;
	isAboveFold: boolean;
	ariaLabel: string;
	variant: CollectionImagesVariant;
}

/** 1 image : pleine largeur */
function SingleImageLayout({
	image,
	collectionName,
	isAboveFold,
	ariaLabel,
	variant,
}: LayoutProps & { image: CollectionImage }) {
	const sizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.SINGLE
		: "(max-width: 374px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className="relative aspect-square overflow-hidden rounded-t-lg bg-muted"
		>
			<CollectionImageItem
				image={image}
				collectionName={collectionName}
				index={0}
				isAboveFold={isAboveFold}
				sizes={sizes}
				staggerIndex={0}
			/>
		</div>
	);
}

/** 2 images : 2 colonnes egales */
function TwoImagesLayout({
	images,
	collectionName,
	isAboveFold,
	ariaLabel,
	variant,
}: LayoutProps & { images: CollectionImage[] }) {
	const sizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.TWO_IMAGES
		: "(max-width: 640px) 50vw, 25vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-t-lg"
		>
			{images.map((image, i) => (
				<div key={`${collectionName}-${i}`} className="relative aspect-square overflow-hidden bg-muted">
					<CollectionImageItem
						image={image}
						collectionName={collectionName}
						index={i}
						isAboveFold={isAboveFold && i === 0}
						sizes={sizes}
						staggerIndex={i}
					/>
				</div>
			))}
		</div>
	);
}

/** 3 images : 1 grande a gauche + 2 petites a droite */
function ThreeImagesLayout({
	images,
	collectionName,
	isAboveFold,
	ariaLabel,
	variant,
}: LayoutProps & { images: CollectionImage[] }) {
	const mainSizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.THREE_IMAGES
		: "(max-width: 640px) 50vw, 33vw";
	const secondarySizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.THREE_IMAGES
		: "(max-width: 640px) 50vw, 25vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className="grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-t-lg"
		>
			{/* Grande image - span 2 rows */}
			<div className="relative row-span-2 overflow-hidden bg-muted">
				<CollectionImageItem
					image={images[0]}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					sizes={mainSizes}
					staggerIndex={0}
				/>
			</div>
			{/* 2 petites images */}
			{images.slice(1, 3).map((image, i) => (
				<div key={`${collectionName}-${i + 1}`} className="relative aspect-square overflow-hidden bg-muted">
					<CollectionImageItem
						image={image}
						collectionName={collectionName}
						index={i + 1}
						sizes={secondarySizes}
						staggerIndex={i + 1}
					/>
				</div>
			))}
		</div>
	);
}

/** 4+ images : Bento Grid (1 grande + 3 petites) */
function BentoGridLayout({
	images,
	collectionName,
	isAboveFold,
	ariaLabel,
	variant,
}: LayoutProps & { images: CollectionImage[] }) {
	const mainSizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_MAIN
		: "(max-width: 640px) 50vw, 33vw";
	const secondarySizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_SECONDARY
		: "(max-width: 640px) 25vw, 15vw";
	const hiddenSecondarySizes = variant === "compact"
		? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_SECONDARY
		: "(max-width: 640px) 0px, 15vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn(
				"grid gap-0.5 overflow-hidden rounded-t-lg",
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
				<CollectionImageItem
					image={images[0]}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					sizes={mainSizes}
					staggerIndex={0}
				/>
			</div>

			{/* 3 petites images a droite (2 sur mobile, 3 sur desktop) */}
			{images.slice(1, 4).map((image, i) => {
				const actualIndex = i + 1;
				const isImage4 = actualIndex === 3;
				const isSecondaryAboveFold = isAboveFold && !isImage4;

				return (
					<div
						key={`${collectionName}-${actualIndex}`}
						className={cn(
							"relative aspect-square overflow-hidden bg-muted",
							// Image 4 visible uniquement sur desktop (sm+)
							isImage4 && "hidden sm:block",
						)}
					>
						<CollectionImageItem
							image={image}
							collectionName={collectionName}
							index={actualIndex}
							isAboveFold={isSecondaryAboveFold}
							sizes={isImage4 ? hiddenSecondarySizes : secondarySizes}
							staggerIndex={actualIndex}
						/>
					</div>
				);
			})}
		</div>
	);
}
