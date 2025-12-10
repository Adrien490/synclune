"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { Spinner } from "@/shared/components/ui/spinner";
import { cn } from "@/shared/utils/cn";
import Image from "next/image";
import { useState } from "react";

// Constantes - quality 85 offre un bon compromis taille/qualité (-50% vs 95)
const MAIN_IMAGE_QUALITY = 85;

interface GalleryMediaRendererProps {
	media: ProductMedia;
	title: string;
	index: number;
	isFirst: boolean;
	isActive?: boolean;
	hasError: boolean;
	onError: () => void;
	onRetry: () => void;
}

/**
 * Composant responsable du rendu des médias (images/vidéos) dans la galerie principale
 * - Gère les images avec priorité pour la première
 * - Gère les vidéos avec contrôles natifs et loader de chargement
 * - Gère les erreurs avec fallback et retry
 */
export function GalleryMediaRenderer({
	media,
	title,
	index,
	isFirst,
	isActive = true,
	hasError,
	onError,
	onRetry,
}: GalleryMediaRendererProps) {
	const [isVideoLoading, setIsVideoLoading] = useState(true);

	// Vidéo
	if (media.mediaType === "VIDEO") {
		if (hasError) {
			return <MediaErrorFallback type="video" onRetry={onRetry} />;
		}

		return (
			<div className="relative w-full h-full">
				{/* Loader vidéo - responsive desktop/mobile */}
				{isVideoLoading && (
					<div
						className={cn(
							"absolute inset-0 z-10 flex flex-col items-center justify-center gap-3",
							"bg-muted/80 backdrop-blur-sm"
						)}
						aria-label="Chargement de la vidéo"
					>
						{/* Spinner responsive: 24px mobile, 32px desktop */}
						<Spinner className="size-6 sm:size-8 text-primary" />
						{/* Label visible sur desktop uniquement */}
						<span className="hidden sm:block text-sm text-muted-foreground font-medium">
							Chargement...
						</span>
					</div>
				)}
				<video
					key={media.id}
					className="w-full h-full object-cover"
					autoPlay={isActive}
					muted
					loop
					playsInline
					preload={isActive ? "metadata" : "none"}
					poster={media.thumbnailUrl || media.thumbnailSmallUrl || undefined}
					aria-label={media.alt || `${title} - Vidéo ${index + 1}`}
					onError={onError}
					onCanPlay={() => setIsVideoLoading(false)}
				>
					<source src={media.url} type={getVideoMimeType(media.url)} />
				</video>
			</div>
		);
	}

	// Image avec erreur
	if (hasError) {
		return <MediaErrorFallback type="image" onRetry={onRetry} />;
	}

	// Image - priority pour la première image active (above-fold)
	// Lazy loading pour les images non actives (Embla rend toutes les slides)
	return (
		<Image
			src={media.url}
			alt={media.alt || PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, index + 1)}
			fill
			className="object-cover"
			priority={isFirst && isActive}
			fetchPriority={isFirst && isActive ? "high" : "auto"}
			loading={isActive ? "eager" : "lazy"}
			quality={MAIN_IMAGE_QUALITY}
			sizes="(max-width: 768px) 100vw, 60vw"
			placeholder={media.blurDataUrl ? "blur" : "empty"}
			blurDataURL={media.blurDataUrl}
			onError={onError}
			draggable={false}
		/>
	);
}
