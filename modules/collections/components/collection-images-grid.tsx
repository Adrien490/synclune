import { cn } from "@/shared/utils/cn";
import type { CollectionImage } from "../types/collection.types";
import {
	COLLECTION_IMAGE_SIZES_CARD,
	COLLECTION_IMAGE_SIZES_COMPACT,
} from "../constants/image-sizes.constants";
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

/**
 * Le bloc média est CARRÉ dans les quatre layouts, et le ratio est porté par le
 * CONTENEUR — pas par les cellules.
 *
 * Dérivé des cellules, il ne l'était pas : deux `aspect-square` côte à côte
 * (layout 2 images) donnaient un bandeau `W × W/2`, deux fois plus plat que les
 * trois autres layouts. Dans une rangée de grille, une collection à deux
 * créations était donc nettement plus courte que ses voisines, et le squelette
 * — qui réservait un carré — décalait la mise en page à l'arrivée des données.
 * Audit CollectionCard 2026-08-04.
 */
const GRID_RATIO = "aspect-square";

interface CollectionImagesGridProps {
	images: CollectionImage[];
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
 *
 * ## Le bento est DÉCORATIF pour les technologies d'assistance
 *
 * Ni `role="group"` ni `alt` porteur : c'est un aperçu, pas un contenu. Avant
 * (audit CollectionCard 2026-08-04), un lecteur d'écran entendait le libellé du
 * groupe puis les quatre `alt` de bijoux **avant même le titre de la carte** —
 * une dizaine d'éléments par carte, vingt cartes sur `/collections`, pour des
 * bijoux qui ne sont pas atteignables depuis la carte. Ils le sont sur la page
 * de la collection, où ils sont cliquables. La carte, elle, s'annonce par son
 * `aria-labelledby`.
 */
export function CollectionImagesGrid({
	images,
	isAboveFold = false,
	isLcpCandidate = false,
	variant = "default",
	framed = false,
	collectionSlug,
}: CollectionImagesGridProps) {
	const count = images.length;

	if (count === 1) {
		return (
			<SingleImageLayout
				image={images[0]!}
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
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
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
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
				isAboveFold={isAboveFold}
				isLcpCandidate={isLcpCandidate}
				variant={variant}
				framed={framed}
				collectionSlug={collectionSlug}
			/>
		);
	}

	return (
		<BentoGridLayout
			images={images}
			isAboveFold={isAboveFold}
			isLcpCandidate={isLcpCandidate}
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
	isAboveFold: boolean;
	isLcpCandidate: boolean;
	variant: CollectionImagesVariant;
	framed: boolean;
	collectionSlug?: string;
}

/** 1 image : pleine largeur */
function SingleImageLayout({
	image,
	isAboveFold,
	isLcpCandidate,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { image: CollectionImage }) {
	const sizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.SINGLE
			: COLLECTION_IMAGE_SIZES_CARD.FULL;

	return (
		<div
			className={cn(
				"bg-muted relative",
				GRID_RATIO,
				framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT,
			)}
		>
			<CollectionImageItem
				image={image}
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
	isAboveFold,
	isLcpCandidate,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { images: CollectionImage[] }) {
	const sizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.TWO_IMAGES
			: COLLECTION_IMAGE_SIZES_CARD.HALF;

	return (
		<div
			className={cn(
				"grid grid-cols-2 gap-0.5",
				GRID_RATIO,
				framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT,
			)}
		>
			{images.map((image, i) => (
				<div key={image.url} className="bg-muted relative overflow-hidden">
					<CollectionImageItem
						image={image}
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
	isAboveFold,
	isLcpCandidate,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { images: CollectionImage[] }) {
	// Grande et petites occupent la même colonne (1/2 du média) — une seule taille.
	const sizes =
		variant === "compact"
			? COLLECTION_IMAGE_SIZES_COMPACT.THREE_IMAGES
			: COLLECTION_IMAGE_SIZES_CARD.HALF;

	return (
		<div
			className={cn(
				"grid grid-cols-2 grid-rows-2 gap-0.5",
				GRID_RATIO,
				framed ? GRID_CHROME_FRAMED : GRID_CHROME_DEFAULT,
			)}
		>
			{/* Grande image - span 2 rows */}
			<div className="bg-muted relative row-span-2 overflow-hidden">
				<CollectionImageItem
					image={images[0]!}
					index={0}
					isAboveFold={isAboveFold}
					isLcpCandidate={isLcpCandidate}
					sizes={sizes}
					staggerIndex={0}
					collectionSlug={collectionSlug}
				/>
			</div>
			{/* 2 petites images — `isAboveFold` propagé comme dans le bento : sur la
			    première rangée de la grille, elles sont visibles au chargement. */}
			{images.slice(1, 3).map((image, i) => (
				<div key={image.url} className="bg-muted relative overflow-hidden">
					<CollectionImageItem
						image={image}
						index={i + 1}
						isAboveFold={isAboveFold}
						sizes={sizes}
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
	isAboveFold,
	isLcpCandidate,
	variant,
	framed,
	collectionSlug,
}: LayoutProps & { images: CollectionImage[] }) {
	const isCompact = variant === "compact";
	const mainSizes = isCompact
		? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_MAIN
		: COLLECTION_IMAGE_SIZES_CARD.BENTO_MAIN;
	const secondarySizes = isCompact
		? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_SECONDARY
		: COLLECTION_IMAGE_SIZES_CARD.BENTO_SECONDARY;
	const hiddenSecondarySizes = isCompact
		? COLLECTION_IMAGE_SIZES_COMPACT.BENTO_SECONDARY
		: COLLECTION_IMAGE_SIZES_CARD.BENTO_SECONDARY_HIDDEN_MOBILE;

	return (
		<div
			className={cn(
				"grid gap-0.5",
				GRID_RATIO,
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
							"bg-muted relative overflow-hidden",
							// Image 4 visible uniquement sur desktop (sm+)
							isImage4 && "hidden sm:block",
						)}
					>
						<CollectionImageItem
							image={image}
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
