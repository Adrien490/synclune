import { COLLECTION_IMAGE_QUALITY } from "@/modules/collections/constants/image-sizes.constants";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import type { CollectionImage } from "../types/collection.types";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

/** Delais progressifs pour effet de vague au hover (40/60/100ms) */
const STAGGER_DELAYS = ["delay-0", "delay-[40ms]", "delay-[60ms]", "delay-[100ms]"] as const;

/** Quality reduite pour images secondaires */
const SECONDARY_IMAGE_QUALITY = IMAGE_QUALITY.THUMBNAIL;

interface CollectionImageItemProps {
	image: CollectionImage;
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
 * - Tap feedback: scale-down + brightness — ⚠️ mega-menu UNIQUEMENT, cf. le
 *   commentaire sur les classes `active:` plus bas
 *
 * OPTIMISATIONS:
 * - Priority loading pour above-fold
 * - Blur placeholder si disponible
 * - Quality differenciee (`STANDARD` pour la principale, `THUMBNAIL` pour les
 *   secondaires — cf. `IMAGE_QUALITY`, ne pas recopier les valeurs ici : le
 *   commentaire annonçait « 85 / 75 » quand elles valaient déjà 80 / 65)
 *
 * ⚠️ `alt=""` est un CHOIX, pas un oubli : la vignette est un aperçu décoratif
 * d'une carte dont le nom accessible est porté par son titre. Cf. le JSDoc de
 * `CollectionImagesGrid` pour le raisonnement complet (audit 2026-08-04).
 */
export function CollectionImageItem({
	image,
	index,
	isAboveFold = false,
	isLcpCandidate = false,
	sizes,
	staggerIndex = 0,
	collectionSlug,
}: CollectionImageItemProps) {
	const delayClass = STAGGER_DELAYS[staggerIndex % STAGGER_DELAYS.length];

	// `preload` + fetchPriority=high : PAIRE indissociable reservee a l'image LCP
	// (1re carte, image principale). `fetchPriority` seul n'emet aucun
	// <link rel="preload"> ; `preload` seul precharge en priorite BASSE (Next 16
	// passe fetchPriority verbatim, il ne le derive pas de preload).
	const isHighPriority = isAboveFold && isLcpCandidate && index === 0;

	return (
		<Image
			src={image.url}
			alt=""
			fill
			className={cn(
				"object-cover",
				// `motion-safe:` sur la TRANSITION comme sur les transforms : le tap
				// feedback ci-dessous n'était pas gaté et restait animé sous
				// `prefers-reduced-motion` (parité ProductCard, WCAG 2.3.3).
				"ease-out motion-safe:transition-transform motion-safe:duration-300",
				delayClass,
				// Desktop: hover zoom avec stagger
				"motion-safe:can-hover:group-hover:scale-[1.08]",
				// Tap feedback — ⚠️ INERTE sur `CollectionCard`, et c'est structurel :
				// `:active` ne se pose que sur la cible du tap et ses ANCÊTRES. Là-bas la
				// cible est le `::after` du lien étiré (z-10), qui vit dans la légende ;
				// les images sont un sous-arbre FRÈRE, donc rien ne s'active. Ces classes
				// ne servent que dans le mega-menu (`mega-menu-collections.tsx`), où la
				// grille est rendue DANS le `NavigationMenuLink` — d'où leur maintien.
				// Le commentaire précédent invoquait une « cohérence ProductCard » qui
				// n'existe pas : ProductCard n'a aucun tap feedback sur ses images.
				"active:brightness-95 active:saturate-110 motion-safe:active:scale-[0.97]",
			)}
			style={
				collectionSlug && index === 0
					? { viewTransitionName: `collection-${collectionSlug}` }
					: undefined
			}
			sizes={sizes}
			preload={isHighPriority}
			loading={isAboveFold ? "eager" : "lazy"}
			fetchPriority={isHighPriority ? "high" : "auto"}
			placeholder={image.blurDataUrl ? "blur" : "empty"}
			blurDataURL={image.blurDataUrl ?? undefined}
			quality={index === 0 ? COLLECTION_IMAGE_QUALITY : SECONDARY_IMAGE_QUALITY}
		/>
	);
}
