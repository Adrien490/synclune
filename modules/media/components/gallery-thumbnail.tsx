"use client";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { MediaErrorFallback } from "@/modules/media/components/media-error-fallback";
import { VideoPlayBadge } from "@/modules/media/components/video-play-badge";
import {
	THUMBNAIL_IMAGE_QUALITY,
	EAGER_LOAD_THUMBNAILS,
} from "@/modules/media/constants/image-config.constants";
import { cn } from "@/shared/utils/cn";
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
	const isVideo = media.mediaType === "VIDEO";
	const thumbnailSrc = isVideo
		? media.thumbnailSmallUrl || media.thumbnailUrl
		: media.url;
	const alt = media.alt || `${title} - ${isVideo ? "Vidéo" : "Photo"} ${index + 1}`;

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"group relative aspect-square overflow-hidden rounded-xl w-full",
				"border-2 transition-all duration-200 active:scale-95",
				isActive
					? "border-primary shadow-md ring-2 ring-primary/20"
					: "border-border hover:border-primary/50",
				className
			)}
			aria-label={`Voir ${isVideo ? "vidéo" : "photo"} ${index + 1}${isActive ? " (sélectionnée)" : ""}`}
			aria-current={isActive ? "true" : undefined}
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
			) : (
				<div
					className="w-full h-full flex items-center justify-center bg-muted"
					aria-label={alt}
				/>
			)}
		</button>
	);
}
