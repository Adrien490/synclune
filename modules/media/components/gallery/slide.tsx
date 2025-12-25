"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/shared/utils/cn";
import { useMediaQuery, useReducedMotion } from "@/shared/hooks";
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
	const prefersReduced = useReducedMotion();

	return (
		<div
			className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10"
			role="status"
			aria-label="Chargement de la vidéo"
		>
			<div className="relative">
				<div className="w-10 h-10 border-3 border-primary/20 rounded-full" />
				<div
					className={cn(
						"absolute inset-0 w-10 h-10 border-3 border-transparent border-t-primary rounded-full",
						!prefersReduced && "animate-spin"
					)}
				/>
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
	const prefersReduced = useReducedMotion();

	// Détection desktop pour rendu conditionnel (évite double image dans DOM)
	// Breakpoint sm = 640px (Tailwind default)
	const isDesktop = useMediaQuery("(min-width: 640px)");

	// Autoplay vidéo quand active (respect prefers-reduced-motion)
	useEffect(() => {
		if (!videoRef.current) return;

		if (isActive && !prefersReduced) {
			videoRef.current.play().catch(() => {});
		} else {
			videoRef.current.pause();
			videoRef.current.currentTime = 0;
		}
	}, [isActive, prefersReduced]);

	// Reset loading state si l'URL change
	useEffect(() => {
		if (media.mediaType === "VIDEO") {
			setIsVideoLoading(true);
		}
	}, [media.url, media.mediaType]);

	const transitionClass = prefersReduced ? "" : "transition-opacity duration-300";

	// Vidéo : même rendu mobile/desktop
	if (media.mediaType === "VIDEO") {
		return (
			<div
				className="flex-[0_0_100%] min-w-0 h-full relative cursor-zoom-in"
				onClick={onOpen}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => e.key === "Enter" && onOpen()}
				aria-label="Ouvrir la vidéo en plein écran"
			>
				{isVideoLoading && <VideoLoadingSpinner />}
				<video
					ref={videoRef}
					className={cn(
						"w-full h-full object-cover",
						transitionClass,
						isVideoLoading ? "opacity-0" : "opacity-100"
					)}
					muted
					loop={!prefersReduced}
					playsInline
					autoPlay={isActive && !prefersReduced}
					poster={media.thumbnailUrl || undefined}
					onCanPlay={() => setIsVideoLoading(false)}
					onWaiting={() => setIsVideoLoading(true)}
					onPlaying={() => setIsVideoLoading(false)}
					aria-label={`Vidéo ${title}`}
				>
					<source src={media.url} type="video/mp4" />
				</video>
			</div>
		);
	}

	const alt =
		media.alt ||
		PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, index + 1, totalImages, productType);

	// Image : rendu conditionnel desktop/mobile
	// Desktop → Zoom hover
	// Mobile → Next.js Image (optimisations LCP)
	return (
		<div
			className="flex-[0_0_100%] min-w-0 h-full relative cursor-zoom-in"
			onClick={onOpen}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => e.key === "Enter" && onOpen()}
			aria-label="Ouvrir l'image en plein écran"
		>
			{isDesktop ? (
				// Desktop : Zoom hover
				<GalleryHoverZoom
					src={media.url}
					alt={alt}
					blurDataUrl={media.blurDataUrl}
					zoomLevel={3}
				/>
			) : (
				// Mobile : Next.js Image pour LCP optimal
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
			)}
		</div>
	);
}
