"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { VideoPlayBadge } from "@/shared/components/ui/video-play-badge";
import {
	THUMBNAIL_IMAGE_QUALITY,
	EAGER_LOAD_THUMBNAILS,
} from "@/modules/media/constants/image-config.constants";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";
import Image from "next/image";

interface GalleryThumbnailProps {
	media: ProductMedia;
	index: number;
	isActive: boolean;
	hasError: boolean;
	title: string;
	onClick: () => void;
	onError: () => void;
	className?: string;
	isLCPCandidate?: boolean;
}

/**
 * Clickable thumbnail for the product gallery (image or video)
 */
export function GalleryThumbnail({
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
	const prefersReduced = useReducedMotion();
	const isVideo = media.mediaType === "VIDEO";
	const thumbnailSrc = isVideo ? media.thumbnailUrl : media.url;
	const alt = media.alt || `${title} - ${isVideo ? "Vidéo" : "Photo"} ${index + 1}`;

	const transitionClass = prefersReduced ? "" : "transition-all duration-200";

	return (
		<button
			type="button"
			role="tab"
			aria-controls={`gallery-panel-${index}`}
			onClick={onClick}
			className={cn(
				"group relative aspect-square w-full overflow-hidden rounded-xl",
				"border-2",
				transitionClass,
				!prefersReduced && "active:scale-95",
				"focus-visible:ring-primary outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
				isActive
					? "border-primary ring-primary/20 shadow-md ring-2"
					: "border-border hover:border-primary/50",
				className,
			)}
			aria-label={
				hasError
					? `${isVideo ? "Vidéo" : "Photo"} ${index + 1} — erreur de chargement`
					: `Voir ${isVideo ? "vidéo" : "photo"} ${index + 1}${isActive ? " (sélectionnée)" : ""}`
			}
			aria-selected={isActive}
		>
			{hasError ? (
				<MediaErrorFallback type="image" size="small" />
			) : thumbnailSrc ? (
				<>
					<Image
						src={thumbnailSrc}
						alt={alt}
						fill
						className="object-cover"
						sizes="(min-width: 768px) 80px, 56px"
						quality={THUMBNAIL_IMAGE_QUALITY}
						loading={index < EAGER_LOAD_THUMBNAILS ? "eager" : "lazy"}
						fetchPriority={isLCPCandidate ? "high" : "auto"}
						placeholder={media.blurDataUrl ? "blur" : "empty"}
						blurDataURL={media.blurDataUrl}
						onError={onError}
					/>
					{isVideo && <VideoPlayBadge />}
				</>
			) : isVideo ? (
				// Fallback for video without thumbnail
				<div className="bg-muted h-full w-full" role="img" aria-label={alt}>
					<VideoPlayBadge />
				</div>
			) : (
				<div
					className="bg-muted flex h-full w-full items-center justify-center"
					role="img"
					aria-label={alt}
				/>
			)}
		</button>
	);
}
