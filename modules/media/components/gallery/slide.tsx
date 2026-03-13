"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { useMediaQuery } from "@/shared/hooks";
import { MAIN_IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import {
	GALLERY_ZOOM_LEVEL,
	VIDEO_LOAD_TIMEOUT,
} from "@/modules/media/constants/gallery.constants";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { GalleryHoverZoom } from "@/shared/components/gallery/hover-zoom";
import { GalleryPinchZoom } from "./pinch-zoom";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

interface GallerySlideProps {
	media: ProductMedia;
	index: number;
	title: string;
	productType?: string;
	totalImages: number;
	isActive: boolean;
	onOpen: () => void;
	id?: string;
	viewTransitionName?: string;
}

function VideoLoadingSpinner() {
	const prefersReduced = useReducedMotion();

	return (
		<div
			className="bg-muted/50 absolute inset-0 z-10 flex items-center justify-center"
			role="status"
			aria-label="Chargement de la vidéo"
		>
			<div className="relative">
				<div className="border-primary/20 h-10 w-10 rounded-full border-3" />
				<div
					className={cn(
						"border-t-primary absolute inset-0 h-10 w-10 rounded-full border-3 border-transparent",
						!prefersReduced && "animate-spin",
					)}
				/>
			</div>
		</div>
	);
}

interface VideoErrorFallbackProps {
	onRetry: () => void;
	poster?: string;
}

function VideoErrorFallback({ onRetry, poster }: VideoErrorFallbackProps) {
	return (
		<div
			className="bg-muted/80 absolute inset-0 z-10 flex flex-col items-center justify-center"
			style={
				poster
					? {
							backgroundImage: `url(${poster})`,
							backgroundSize: "cover",
							backgroundPosition: "center",
						}
					: undefined
			}
		>
			<div className="bg-background/90 flex flex-col items-center gap-3 rounded-xl p-4 shadow-lg backdrop-blur-sm">
				<AlertCircle className="text-muted-foreground h-8 w-8" aria-hidden="true" />
				<p className="text-muted-foreground text-center text-sm">Impossible de charger la vidéo</p>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onRetry();
					}}
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
				>
					<RefreshCw className="h-4 w-4" aria-hidden="true" />
					Réessayer
				</button>
			</div>
		</div>
	);
}

type VideoState = "loading" | "ready" | "error";

export function GallerySlide({
	media,
	index,
	title,
	productType,
	totalImages,
	isActive,
	onOpen,
	id,
	viewTransitionName,
}: GallerySlideProps) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const [videoState, setVideoState] = useState<VideoState>("loading");
	const prefersReduced = useReducedMotion();

	// Détection desktop pour rendu conditionnel (évite double image dans DOM)
	// Breakpoint md = 768px (cohérent avec la grille thumbnails)
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// Autoplay vidéo quand active (respect prefers-reduced-motion)
	useEffect(() => {
		if (!videoRef.current || videoState === "error") return;

		if (isActive && !prefersReduced) {
			videoRef.current.play().catch((err) => {
				if (process.env.NODE_ENV === "development") {
					console.warn("[Gallery] Video autoplay blocked:", err.message);
				}
			});
		} else {
			videoRef.current.pause();
		}
	}, [isActive, prefersReduced, videoState, media.url]);

	// Reset state si l'URL change
	useEffect(() => {
		if (media.mediaType === "VIDEO") {
			setVideoState("loading");
		}
	}, [media.url, media.mediaType]);

	// Timeout pour éviter spinner infini
	useEffect(() => {
		if (media.mediaType !== "VIDEO" || videoState !== "loading") return;

		const timeout = setTimeout(() => {
			setVideoState("error");
		}, VIDEO_LOAD_TIMEOUT);

		return () => clearTimeout(timeout);
	}, [media.mediaType, media.url, videoState]);

	const handleRetry = () => {
		setVideoState("loading");
		if (videoRef.current) {
			videoRef.current.load();
		}
	};

	const transitionClass = prefersReduced ? "" : "transition-opacity duration-300";

	// Vidéo : même rendu mobile/desktop
	if (media.mediaType === "VIDEO") {
		return (
			<div id={id} role="tabpanel" style={{ viewTransitionName }}>
				<button
					type="button"
					className="relative h-full min-w-0 flex-[0_0_100%] cursor-zoom-in appearance-none border-0 bg-transparent p-0 text-left"
					onClick={onOpen}
					aria-label="Ouvrir la vidéo en plein écran"
				>
					{videoState === "loading" && <VideoLoadingSpinner />}
					{videoState === "error" && (
						<VideoErrorFallback onRetry={handleRetry} poster={media.thumbnailUrl ?? undefined} />
					)}
					<video
						ref={videoRef}
						preload="metadata"
						className={cn(
							"h-full w-full object-cover",
							transitionClass,
							videoState !== "ready" ? "opacity-0" : "opacity-100",
						)}
						muted
						loop={!prefersReduced}
						playsInline
						autoPlay={isActive && !prefersReduced}
						poster={media.thumbnailUrl ?? undefined}
						onCanPlay={() => {
							if (videoRef.current && videoRef.current.readyState >= 3) {
								setVideoState("ready");
							}
						}}
						onPlaying={() => setVideoState("ready")}
						onError={() => setVideoState("error")}
						aria-label={`Vidéo ${title}`}
						aria-describedby={`video-desc-${index}`}
					>
						<source src={media.url} type={getVideoMimeType(media.url)} />
						{/* Track vide pour satisfaire WCAG - vidéos produits sans audio */}
						<track kind="captions" srcLang="fr" label="Français" default />
					</video>
					<span id={`video-desc-${index}`} className="sr-only">
						Vidéo de démonstration du produit sans audio
					</span>
				</button>
			</div>
		);
	}

	const alt =
		media.alt || PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, index + 1, totalImages, productType);

	// Image : rendu conditionnel desktop/mobile
	// Desktop → Zoom hover
	// Mobile → Pinch-zoom natif
	if (isDesktop) {
		return (
			<button
				type="button"
				id={id}
				className="relative h-full min-w-0 flex-[0_0_100%] cursor-zoom-in appearance-none border-0 bg-transparent p-0 text-left"
				style={{ viewTransitionName }}
				onClick={onOpen}
				aria-label="Ouvrir l'image en plein écran"
			>
				<GalleryHoverZoom
					src={media.url}
					alt={alt}
					blurDataUrl={media.blurDataUrl}
					zoomLevel={GALLERY_ZOOM_LEVEL}
					preload={index === 0}
					quality={MAIN_IMAGE_QUALITY}
				/>
			</button>
		);
	}

	// Mobile : Pinch-zoom natif (gère son propre onClick via onTap)
	return (
		<div
			id={id}
			role="tabpanel"
			className="relative h-full min-w-0 flex-[0_0_100%]"
			style={{ viewTransitionName }}
		>
			<GalleryPinchZoom
				src={media.url}
				alt={alt}
				blurDataUrl={media.blurDataUrl}
				isActive={isActive}
				onTap={onOpen}
				preload={index === 0}
			/>
		</div>
	);
}
