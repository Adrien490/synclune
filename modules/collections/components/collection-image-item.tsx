import { COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import type { CollectionImage } from "../types/collection.types";

/** Delais progressifs pour effet de vague au hover (40/60/100ms) */
const STAGGER_DELAYS = ["delay-0", "delay-[40ms]", "delay-[60ms]", "delay-[100ms]"] as const;

/** Quality reduite pour images secondaires */
const SECONDARY_IMAGE_QUALITY = 75;

interface CollectionImageItemProps {
	image: CollectionImage;
	collectionName: string;
	index: number;
	isAboveFold?: boolean;
	/**
	 * Carte candidate LCP (1re de la liste). Seule l'image principale (index 0) d'une
	 * telle carte recoit fetchPriority=high — evite la concurrence bande passante 4G
	 * quand plusieurs cartes above-fold s'affichent simultanement.
	 */
	isLcpCandidate?: boolean;
	sizes: string;
	staggerIndex?: number;
	/** Collection slug used as view-transition-name key (only applied on index 0). */
	collectionSlug?: string;
}

/**
 * Image de collection avec hover effect et stagger delay
 *
 * MICRO-INTERACTIONS:
 * - Stagger delay: images zooment en cascade au hover du groupe
 * - Tap feedback: scale-down + brightness sur mobile
 *
 * OPTIMISATIONS:
 * - Priority loading pour above-fold
 * - Blur placeholder si disponible
 * - Quality differenciee (85 pour principale, 75 pour secondaires)
 */
export function CollectionImageItem({
	image,
	collectionName,
	index,
	isAboveFold = false,
	isLcpCandidate = false,
	sizes,
	staggerIndex = 0,
	collectionSlug,
}: CollectionImageItemProps) {
	// Alt text: utiliser celui fourni, sinon generer un descriptif contextuel
	const altText = image.alt ?? `Bijou artisanal ${index + 1} de la collection ${collectionName}`;

	const delayClass = STAGGER_DELAYS[staggerIndex % STAGGER_DELAYS.length];

	// fetchPriority=high reserve a l'image LCP (1re carte, image principale).
	const isHighPriority = isAboveFold && isLcpCandidate && index === 0;

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
				// Mobile: tap feedback enrichi (coherence ProductCard)
				"active:scale-[0.97] active:brightness-95 active:saturate-110",
			)}
			style={
				collectionSlug && index === 0
					? { viewTransitionName: `collection-${collectionSlug}` }
					: undefined
			}
			sizes={sizes}
			loading={isAboveFold ? "eager" : "lazy"}
			fetchPriority={isHighPriority ? "high" : "auto"}
			placeholder={image.blurDataUrl ? "blur" : "empty"}
			blurDataURL={image.blurDataUrl ?? undefined}
			quality={index === 0 ? COLLECTION_IMAGE_QUALITY : SECONDARY_IMAGE_QUALITY}
		/>
	);
}
