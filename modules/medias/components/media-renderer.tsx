"use client";

import type { ProductMedia } from "@/modules/medias/types/product-media.types";
import { MediaErrorFallback } from "@/modules/medias/components/media-error-fallback";
import { MediaTypeBadge } from "@/modules/medias/components/media-type-badge";
import { getVideoMimeType } from "@/modules/medias/utils/media-utils";
import { PRODUCT_TEXTS } from "@/shared/constants/product";
import Image from "next/image";
import { ViewTransition } from "react";
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
 * - Gère les images avec ViewTransition pour la première
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
					poster={media.thumbnailUrl || undefined}
					aria-label={media.alt || `${title} - Vidéo ${index + 1}`}
					onError={onError}
					tabIndex={-1}
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
			placeholder={media.blurDataURL ? "blur" : "empty"}
			blurDataURL={media.blurDataURL}
			onError={onError}
			draggable={false}
		/>
	);

	// Première image avec ViewTransition pour transition fluide entre pages
	if (isFirst) {
		return (
			<ViewTransition name={`product-image-${productSlug}`}>
				{ImageComponent}
			</ViewTransition>
		);
	}

	return ImageComponent;
}

// Export mémorisé pour éviter re-renders inutiles
export const MediaRenderer = memo(MediaRendererComponent);
