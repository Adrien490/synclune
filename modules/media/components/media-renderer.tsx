"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { MediaTypeBadge } from "@/modules/media/components/media-type-badge";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import Image from "next/image";
import { memo } from "react";

// Constantes - quality 85 offre un bon compromis taille/qualité (-50% vs 95)
const MAIN_IMAGE_QUALITY = 85;

interface MediaRendererProps {
	media: ProductMedia;
	productSlug: string;
	title: string;
	index: number;
	isFirst: boolean;
	hasError: boolean;
	onError: () => void;
	onRetry: () => void;
}

/**
 * Composant responsable du rendu des médias (images/vidéos) dans la galerie principale
 * Extrait la logique complexe de rendu conditionnel hors de ProductGallery
 * - Gère les images
 * - Gère les vidéos avec contrôles natifs
 * - Gère les erreurs avec fallback et retry
 */
function MediaRendererComponent({
	media,
	productSlug,
	title,
	index,
	isFirst,
	hasError,
	onError,
	onRetry,
}: MediaRendererProps) {
	// Vidéo
	if (media.mediaType === "VIDEO") {
		if (hasError) {
			return <MediaErrorFallback type="video" onRetry={onRetry} />;
		}

		return (
			<div className="relative w-full h-full">
				<video
					key={media.id}
					className="w-full h-full object-cover"
					autoPlay
					muted
					loop
					playsInline
					controls
					preload="metadata"
					poster={media.thumbnailUrl || media.thumbnailSmallUrl || undefined}
					aria-label={media.alt || `${title} - Vidéo ${index + 1}`}
					onError={onError}
				>
					<source src={media.url} type={getVideoMimeType(media.url)} />
				</video>
				<div className="absolute top-4 right-4 pointer-events-none z-10">
					<MediaTypeBadge type="VIDEO" size="lg" />
				</div>
			</div>
		);
	}

	// Image avec erreur
	if (hasError) {
		return <MediaErrorFallback type="image" onRetry={onRetry} />;
	}

	// Image - composant commun
	const ImageComponent = (
		<Image
			src={media.url}
			alt={media.alt || PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, index + 1)}
			fill
			className="object-cover"
			preload={isFirst}
			quality={MAIN_IMAGE_QUALITY}
			sizes="(max-width: 768px) 100vw, 60vw"
			placeholder={media.blurDataUrl ? "blur" : "empty"}
			blurDataURL={media.blurDataUrl}
			onError={onError}
			draggable={false}
		/>
	);

	return ImageComponent;
}

// Export mémorisé pour éviter re-renders inutiles
export const MediaRenderer = memo(MediaRendererComponent);
