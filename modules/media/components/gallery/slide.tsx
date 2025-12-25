"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { MAIN_IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { GalleryHoverZoom } from "./hover-zoom";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

interface GallerySlideProps {
	media: ProductMedia;
	index: number;
	title: string;
	productType?: string;
	totalImages: number;
	isActive: boolean;
	onOpen: () => void;
}

function VideoLoadingSpinner() {
	return (
		<div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
			<div className="relative">
				<div className="w-10 h-10 border-3 border-primary/20 rounded-full" />
				<div className="absolute inset-0 w-10 h-10 border-3 border-transparent border-t-primary rounded-full animate-spin" />
			</div>
		</div>
	);
}

export function GallerySlide({
	media,
	index,
	title,
	productType,
	totalImages,
	isActive,
	onOpen,
}: GallerySlideProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [isVideoLoading, setIsVideoLoading] = useState(true);

	// Autoplay vidéo quand active
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive) {
			videoRef.current.play().catch(() => {});
		} else {
			videoRef.current.pause();
			videoRef.current.currentTime = 0;
		}
	}, [isActive]);

	// Reset loading state si l'URL change
	useEffect(() => {
		if (media.mediaType === "VIDEO") {
			setIsVideoLoading(true);
		}
	}, [media.url, media.mediaType]);

	if (media.mediaType === "VIDEO") {
		return (
			<div
				className="flex-[0_0_100%] min-w-0 h-full relative cursor-zoom-in"
				onClick={onOpen}
			>
				{isVideoLoading && <VideoLoadingSpinner />}
				<video
					ref={videoRef}
					className={cn(
						"w-full h-full object-cover transition-opacity duration-300",
						isVideoLoading ? "opacity-0" : "opacity-100"
					)}
					muted
					loop
					playsInline
					autoPlay={isActive}
					poster={media.thumbnailUrl || undefined}
					onCanPlay={() => setIsVideoLoading(false)}
					onWaiting={() => setIsVideoLoading(true)}
					onPlaying={() => setIsVideoLoading(false)}
				>
					<source src={media.url} type="video/mp4" />
				</video>
			</div>
		);
	}

	const alt =
		media.alt ||
		PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, index + 1, totalImages, productType);

	return (
		<div className="flex-[0_0_100%] min-w-0 h-full relative">
			{/* Mobile : Image normale sans zoom hover */}
			<div className="sm:hidden w-full h-full cursor-zoom-in" onClick={onOpen}>
				<Image
					src={media.url}
					alt={alt}
					fill
					className="object-cover"
					priority={index === 0}
					loading={index === 0 ? "eager" : "lazy"}
					quality={MAIN_IMAGE_QUALITY}
					sizes="100vw"
					placeholder={media.blurDataUrl ? "blur" : "empty"}
					blurDataURL={media.blurDataUrl}
				/>
			</div>

			{/* Desktop : Zoom hover interactif */}
			<div className="hidden sm:block w-full h-full cursor-zoom-in" onClick={onOpen}>
				<GalleryHoverZoom
					src={media.url}
					alt={alt}
					blurDataUrl={media.blurDataUrl}
					zoomLevel={3}
				/>
			</div>
		</div>
	);
}
