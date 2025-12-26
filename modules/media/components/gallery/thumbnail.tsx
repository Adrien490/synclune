"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { VideoPlayBadge } from "@/modules/media/components/video-play-badge";
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
 * Thumbnail cliquable pour la galerie produit (image ou vidéo)
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
			onClick={onClick}
			className={cn(
				"group relative overflow-hidden rounded-xl w-full aspect-square",
				"border-2",
				transitionClass,
				!prefersReduced && "active:scale-95",
				"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
				isActive
					? "border-primary shadow-md ring-2 ring-primary/20"
					: "border-border hover:border-primary/50",
				className
			)}
			aria-label={`Voir ${isVideo ? "vidéo" : "photo"} ${index + 1}${isActive ? " (sélectionnée)" : ""}`}
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
						sizes="80px"
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
				// Fallback pour vidéo sans thumbnail
				<div
					className="w-full h-full bg-muted"
					role="img"
					aria-label={alt}
				>
					<VideoPlayBadge />
				</div>
			) : (
				<div
					className="w-full h-full flex items-center justify-center bg-muted"
					role="img"
					aria-label={alt}
				/>
			)}
		</button>
	);
}
