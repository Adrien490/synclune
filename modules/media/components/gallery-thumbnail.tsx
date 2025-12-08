"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { VideoPlayBadge } from "@/modules/media/components/video-play-badge";
import {
	THUMBNAIL_IMAGE_QUALITY,
	EAGER_LOAD_THUMBNAILS,
} from "@/modules/media/constants/image-config.constants";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import { memo } from "react";

interface GalleryThumbnailProps {
	media: ProductMedia;
	index: number;
	isActive: boolean;
	hasError: boolean;
	title: string;
	onClick: () => void;
	onError: () => void;
	className?: string;
	/** Élément LCP potentiel - recevra fetchPriority="high" (R1/R2) */
	isLCPCandidate?: boolean;
}

/**
 * Composant thumbnail réutilisable pour la galerie produit
 * Gère les images et vidéos avec fallback d'erreur
 * Mémorisé pour éviter les re-renders inutiles
 *
 * @perf R1/R2 - fetchPriority="high" pour le candidat LCP améliore le temps de chargement initial
 */
function GalleryThumbnailComponent({
	media,
	index,
	isActive,
	hasError,
	title,
	onClick,
	onError,
	className,
	isLCPCandidate = false,
}: GalleryThumbnailProps) {
	return (
		<button
			onClick={onClick}
			className={cn(
				"group relative aspect-square overflow-hidden rounded-xl w-full",
				"border-2 transition-all duration-200",
				isActive
					? "border-primary shadow-md ring-2 ring-primary/20"
					: "border-border hover:border-primary/50",
				className
			)}
			aria-label={`Voir photo ${index + 1}${isActive ? " (sélectionnée)" : ""}`}
			aria-current={isActive ? "true" : undefined}
		>
			{hasError ? (
				<MediaErrorFallback type="image" size="small" />
			) : media.mediaType === "VIDEO" ? (
				<ThumbnailVideoContent
					media={media}
					index={index}
					title={title}
					onError={onError}
					isLCPCandidate={isLCPCandidate}
				/>
			) : (
				<Image
					src={media.url}
					alt={media.alt || PRODUCT_TEXTS.IMAGES.GALLERY_THUMBNAIL_ALT(title, index + 1)}
					fill
					className="object-cover"
					sizes="80px"
					quality={THUMBNAIL_IMAGE_QUALITY}
					loading={index < EAGER_LOAD_THUMBNAILS ? "eager" : "lazy"}
					// R1/R2 - fetchPriority pour améliorer LCP
					fetchPriority={isLCPCandidate ? "high" : "auto"}
					placeholder={media.blurDataUrl ? "blur" : "empty"}
					blurDataURL={media.blurDataUrl}
					onError={onError}
				/>
			)}
		</button>
	);
}

interface ThumbnailVideoContentProps {
	media: ProductMedia;
	index: number;
	title: string;
	onError: () => void;
	/** Élément LCP potentiel - recevra fetchPriority="high" */
	isLCPCandidate?: boolean;
}

/**
 * Contenu vidéo pour les thumbnails (avec miniature ou player)
 * Mémorisé pour éviter les re-renders coûteux (élément vidéo)
 *
 * @perf R1/R2 - fetchPriority="high" pour le candidat LCP
 */
const ThumbnailVideoContent = memo(function ThumbnailVideoContent({
	media,
	index,
	title,
	onError,
	isLCPCandidate = false,
}: ThumbnailVideoContentProps) {
	// Priorité: thumbnailSmallUrl (160px optimisé) > thumbnailUrl (480px) > fallback vidéo
	const thumbnailSrc = media.thumbnailSmallUrl || media.thumbnailUrl;

	return (
		<div className="relative w-full h-full bg-linear-organic">
			{thumbnailSrc ? (
				<Image
					src={thumbnailSrc}
					alt={media.alt || `${title} - Miniature vidéo ${index + 1}`}
					fill
					className="object-cover"
					sizes="80px"
					quality={THUMBNAIL_IMAGE_QUALITY}
					loading={index < EAGER_LOAD_THUMBNAILS ? "eager" : "lazy"}
					// R1/R2 - fetchPriority pour améliorer LCP
					fetchPriority={isLCPCandidate ? "high" : "auto"}
					placeholder={media.blurDataUrl ? "blur" : "empty"}
					blurDataURL={media.blurDataUrl}
					onError={onError}
				/>
			) : (
				// Placeholder quand aucune miniature n'est disponible
				<div
					className="w-full h-full flex items-center justify-center bg-muted"
					aria-label={media.alt || `${title} - Vidéo ${index + 1}`}
				/>
			)}
			<VideoPlayBadge />
		</div>
	);
});

// Export mémorisé pour éviter re-renders inutiles lors de la navigation
export const GalleryThumbnail = memo(GalleryThumbnailComponent);
