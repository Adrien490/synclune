"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MAIN_IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
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

	if (media.mediaType === "VIDEO") {
		return (
			<div
				className="flex-[0_0_100%] min-w-0 h-full relative cursor-zoom-in"
				onClick={onOpen}
			>
				<video
					ref={videoRef}
					className="w-full h-full object-cover"
					muted
					loop
					playsInline
					autoPlay={isActive}
					poster={media.thumbnailUrl || undefined}
				>
					<source src={media.url} type="video/mp4" />
				</video>
			</div>
		);
	}

	return (
		<div
			className="flex-[0_0_100%] min-w-0 h-full relative cursor-zoom-in"
			onClick={onOpen}
		>
			<Image
				src={media.url}
				alt={
					media.alt ||
					PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, index + 1, totalImages, productType)
				}
				fill
				className="object-cover"
				priority={index === 0}
				loading={index === 0 ? "eager" : "lazy"}
				quality={MAIN_IMAGE_QUALITY}
				sizes="(max-width: 768px) 100vw, 50vw"
				placeholder={media.blurDataUrl ? "blur" : "empty"}
				blurDataURL={media.blurDataUrl}
			/>
		</div>
	);
}
