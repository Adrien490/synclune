import { cn } from "@/shared/utils/cn";
import type { CollectionImage } from "../types/collection.types";
import { COLLECTION_IMAGE_SIZES_COMPACT } from "../constants/image-sizes.constants";
import { CollectionImageItem } from "./collection-image-item";

type CollectionImagesVariant = "default" | "compact";

/**
 * Chrome du conteneur, dans les deux modes d'insertion de la grille :
 * - soudé (défaut) : coins arrondis en haut seulement, la grille est collée au
 *   bloc texte de la carte (mega-menu, historique).
 * - framed : la grille est un tirage inséré dans le cadre planche-contact de
 *   CollectionCard (marge blanche autour), petits coins sur les 4 angles.
 */
const GRID_CHROME_DEFAULT = "overflow-hidden rounded-t-lg lg:rounded-t-xl";
const GRID_CHROME_FRAMED = "overflow-hidden rounded-sm";

interface CollectionImagesGridProps {
	images: CollectionImage[];
	collectionName: string;
	isAboveFold?: boolean;
	/** LCP candidate (1re carte) — seule l'image principale recoit fetchPriority=high. */
	isLcpCandidate?: boolean;
	variant?: CollectionImagesVariant;
	/** Grille insérée dans le cadre planche-contact (coins `rounded-sm` aux 4 angles). */
	framed?: boolean;
	/** Collection slug — forwarded to the first image as view-transition-name key. */
	collectionSlug?: string;
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
	isLcpCandidate = false,
	variant = "default",
	framed = false,
	collectionSlug,
}: CollectionImagesGridProps) {
	const count = images.length;
	const ariaLabel = `Aperçu de ${count} produit${count > 1 ? "s" : ""} de la collection ${collectionName}`;

	if (count === 1) {
		return (
			<SingleImageLayout
				image={images[0]!}
				collectionName={collectionName}
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
				ariaLabel={ariaLabel}
				variant={variant}
				framed={framed}
				collectionSlug={collectionSlug}
			/>
		);
	}

	if (count === 2) {
		return (
			<TwoImagesLayout
				images={images}
				collectionName={collectionName}
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
				ariaLabel={ariaLabel}
				variant={variant}
				framed={framed}
				collectionSlug={collectionSlug}
			/>
		);
	}

	if (count === 3) {
		return (
			<ThreeImagesLayout
				images={images}
				collectionName={collectionName}
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
				ariaLabel={ariaLabel}
				variant={variant}
				framed={framed}
				collectionSlug={collectionSlug}
			/>
		);
	}

	return (
		<BentoGridLayout
			images={images}
			collectionName={collectionName}
			isAboveFold={isAboveFold}
			isLcpCandidate={isLcpCandidate}
			ariaLabel={ariaLabel}
			variant={variant}
			framed={framed}
			collectionSlug={collectionSlug}
		/>
	);
}

// ============================================================================
// LAYOUTS
// ============================================================================

interface LayoutProps {
	collectionName: string;
	isAboveFold: boolean;
	isLcpCandidate: boolean;
	ariaLabel: string;
	variant: CollectionImagesVariant;
	framed: boolean;
	collectionSlug?: string;
}

/** 1 image : pleine largeur */
function SingleImageLayout({
	image,
	collectionName,
	isAboveFold,
	isLcpCandidate,
	ariaLabel,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { image: CollectionImage }) {
	const sizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.SINGLE
			: "(max-width: 374px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn(
				"bg-muted relative aspect-square",
				framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT,
			)}
		>
			<CollectionImageItem
				image={image}
				collectionName={collectionName}
				index={0}
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
				sizes={sizes}
				staggerIndex={0}
				collectionSlug={collectionSlug}
			/>
		</div>
	);
}

/** 2 images : 2 colonnes egales */
function TwoImagesLayout({
	images,
	collectionName,
	isAboveFold,
	isLcpCandidate,
	ariaLabel,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { images: CollectionImage[] }) {
	const sizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.TWO_IMAGES
			: "(max-width: 640px) 50vw, 25vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn("grid grid-cols-2 gap-0.5", framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT)}
		>
			{images.map((image, i) => (
				<div key={image.url} className="bg-muted relative aspect-square overflow-hidden">
					<CollectionImageItem
						image={image}
						collectionName={collectionName}
						index={i}
						isAboveFold={isAboveFold && i === 0}
						isLcpCandidate={isLcpCandidate && i === 0}
						sizes={sizes}
						staggerIndex={i}
						collectionSlug={collectionSlug}
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
	isLcpCandidate,
	ariaLabel,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { images: CollectionImage[] }) {
	const mainSizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.THREE_IMAGES
			: "(max-width: 640px) 50vw, 33vw";
	const secondarySizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.THREE_IMAGES
			: "(max-width: 640px) 50vw, 25vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn(
				"grid grid-cols-2 grid-rows-2 gap-0.5",
				framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT,
			)}
		>
			{/* Grande image - span 2 rows */}
			<div className="bg-muted relative row-span-2 overflow-hidden">
				<CollectionImageItem
					image={images[0]!}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					isLcpCandidate={isLcpCandidate}
					sizes={mainSizes}
					staggerIndex={0}
					collectionSlug={collectionSlug}
				/>
			</div>
			{/* 2 petites images */}
			{images.slice(1, 3).map((image, i) => (
				<div key={image.url} className="bg-muted relative aspect-square overflow-hidden">
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
	isLcpCandidate,
	ariaLabel,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { images: CollectionImage[] }) {
	const mainSizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_MAIN
			: "(max-width: 640px) 50vw, 33vw";
	const secondarySizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_SECONDARY
			: "(max-width: 640px) 25vw, 15vw";
	const hiddenSecondarySizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_SECONDARY
			: "(max-width: 640px) 0px, 15vw";

	return (
		<div
			role="group"
			aria-label={ariaLabel}
			className={cn(
				"grid gap-0.5",
				framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT,
				// Mobile : 2x2
				"grid-cols-2 grid-rows-2",
				// Desktop : Bento (1 grande + 3 petites)
				"sm:grid-cols-[2fr_1fr] sm:grid-rows-3",
			)}
		>
			{/* Image principale - span rows */}
			<div className={cn("bg-muted relative overflow-hidden", "row-span-2 sm:row-span-3")}>
				<CollectionImageItem
					image={images[0]!}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					isLcpCandidate={isLcpCandidate}
					sizes={mainSizes}
					staggerIndex={0}
					collectionSlug={collectionSlug}
				/>
			</div>

			{/* 3 petites images a droite (2 sur mobile, 3 sur desktop) */}
			{images.slice(1, 4).map((image, i) => {
				const actualIndex = i + 1;
				const isImage4 = actualIndex === 3;
				const isSecondaryAboveFold = isAboveFold && !isImage4;

				return (
					<div
						key={`${image.url}-${i}`}
						className={cn(
							"bg-muted relative aspect-square overflow-hidden",
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
