import { cn } from "@/shared/utils/cn";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";
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
 *
 * MICRO-INTERACTIONS:
 * - Stagger delay: images zooment en cascade au hover
 * - Tap feedback: scale-down + brightness sur mobile
 */
export function CollectionImagesGrid({
	images,
	collectionName,
	isAboveFold = false,
}: CollectionImagesGridProps) {
	const count = images.length;

	// Aria label pour accessibilité
	const ariaLabel = `Aperçu de ${count} produit${count > 1 ? "s" : ""} de la collection ${collectionName}`;

	// 1 image : pleine largeur
	if (count === 1) {
		return (
			<div
				role="group"
				aria-label={ariaLabel}
				className="relative aspect-square overflow-hidden rounded-t-xl bg-muted"
			>
				<CollectionImage
					image={images[0]}
					collectionName={collectionName}
					index={0}
					isAboveFold={isAboveFold}
					sizes="(max-width: 640px) 100vw, 50vw"
					staggerIndex={0}
				/>
			</div>
		);
	}

	// 2 images : 2 colonnes égales
	if (count === 2) {
		return (
			<div
				role="group"
				aria-label={ariaLabel}
				className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-t-xl"
			>
				{images.map((image, i) => (
					<div key={i} className="relative aspect-square overflow-hidden bg-muted">
						<CollectionImage
							image={image}
							collectionName={collectionName}
							index={i}
							isAboveFold={isAboveFold && i === 0}
							sizes="(max-width: 640px) 50vw, 25vw"
							staggerIndex={i}
						/>
					</div>
				))}
			</div>
		);
	}

	// 3 images : 1 grande à gauche + 2 petites à droite
	if (count === 3) {
		return (
			<div
				role="group"
				aria-label={ariaLabel}
				className="grid grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-t-xl"
			>
				{/* Grande image - span 2 rows */}
				<div className="relative row-span-2 overflow-hidden bg-muted">
					<CollectionImage
						image={images[0]}
						collectionName={collectionName}
						index={0}
						isAboveFold={isAboveFold}
						sizes="(max-width: 640px) 50vw, 33vw"
						staggerIndex={0}
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
							staggerIndex={i}
						/>
					</div>
				))}
			</div>
		);
	}

	// 4+ images : Bento Grid
	return (
		<div
			role="group"
			aria-label={ariaLabel}
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
					staggerIndex={0}
				/>
			</div>

			{/* 3 petites images à droite (2 sur mobile, 3 sur desktop) */}
			{[1, 2, 3].map((i) => {
				// Image 4 (index 3) : non rendue sur mobile pour économiser la bande passante
				// Sur desktop : rendue normalement avec loading="lazy"
				const isImage4 = i === 3;
				// Images 2-3 above-fold si la collection est above-fold (améliore LCP)
				const isSecondaryAboveFold = isAboveFold && !isImage4;

				return (
					<div
						key={i}
						className={cn(
							"relative aspect-square overflow-hidden bg-muted",
							// Image 4 visible uniquement sur desktop (sm+)
							isImage4 && "hidden sm:block",
						)}
					>
						{/*
						 * Optimisation perf: images 2-3 chargées sur tous devices
						 * Image 4: hidden + loading="lazy" = pas de chargement sur mobile
						 * (le navigateur ne charge pas les images lazy non visibles)
						 */}
						<CollectionImage
							image={images[i]}
							collectionName={collectionName}
							index={i}
							isAboveFold={isSecondaryAboveFold}
							sizes={isImage4 ? "(max-width: 640px) 0px, 15vw" : "(max-width: 640px) 25vw, 15vw"}
							staggerIndex={i}
						/>
					</div>
				);
			})}
		</div>
	);
}

/** Délais progressifs pour effet de vague au hover - alignés avec MOTION_CONFIG */
const STAGGER_DELAYS = [
	"delay-0",
	`delay-[${MOTION_CONFIG.stagger.fast * 1000}ms]`, // 40ms
	`delay-[${MOTION_CONFIG.stagger.normal * 1000}ms]`, // 60ms
	`delay-[${MOTION_CONFIG.stagger.slow * 1000}ms]`, // 100ms
] as const;

/** Composant Image réutilisable avec hover effect et stagger */
function CollectionImage({
	image,
	collectionName,
	index,
	isAboveFold = false,
	sizes,
	staggerIndex = 0,
}: {
	image: CollectionImage;
	collectionName: string;
	index: number;
	isAboveFold?: boolean;
	sizes: string;
	staggerIndex?: number;
}) {
	// Alt text: utiliser celui fourni, sinon générer un descriptif contextuel
	const altText =
		image.alt ||
		`Bijou artisanal ${index + 1} de la collection ${collectionName}`;

	const delayClass = STAGGER_DELAYS[staggerIndex] || "delay-0";

	return (
		<Image
			src={image.url}
			alt={altText}
			fill
			className={cn(
				"object-cover",
				"transition-transform duration-300 ease-out",
				delayClass,
				// Desktop: hover zoom avec stagger
				"motion-safe:can-hover:group-hover:scale-[1.08]",
				// Mobile: tap feedback enrichi (cohérence ProductCard)
				"active:scale-[0.97] active:brightness-95 active:saturate-110",
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
