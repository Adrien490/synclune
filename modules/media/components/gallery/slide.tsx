"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowsClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "motion/react";
import { useMediaQuery } from "@/shared/hooks";
import { mediaAtLeast } from "@/shared/constants/breakpoints";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { MAIN_IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";
import {
	GALLERY_ZOOM_LEVEL,
	VIDEO_LOAD_TIMEOUT,
} from "@/modules/media/constants/gallery.constants";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { PRODUCT_TEXTS } from "@/modules/products/constants/product-texts.constants";
import { GalleryHoverZoom, prefetchLightbox } from "@/shared/components/gallery";
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
				<div className="border-primary/20 size-10 rounded-full border-3" />
				<div
					className={cn(
						"border-t-primary absolute inset-0 size-10 rounded-full border-3 border-transparent",
						!prefersReduced && "motion-safe:animate-spin",
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
	const haptic = useHaptic();

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
				<WarningCircleIcon className="text-muted-foreground size-8" aria-hidden="true" />
				<p className="text-muted-foreground text-center text-sm">Impossible de charger la vidéo</p>
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						haptic("light");
						onRetry();
					}}
					className="bg-primary text-primary-foreground can-hover:hover:bg-primary/90 flex min-h-11 touch-manipulation items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
				>
					<ArrowsClockwiseIcon className="size-4" aria-hidden="true" />
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
	const isDesktop = useMediaQuery(mediaAtLeast("md"));

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

	// Pas d'effet de reset sur changement d'URL : le parent inclut `media.url` dans
	// la `key` du slide, React remonte donc le composant (`videoState` frais).

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
			// Surface de clic, PAS un contrôle — même forme que la branche image desktop
			// plus bas. C'était un `role="button" tabIndex={0}` nommé « Ouvrir la vidéo en
			// plein écran » niché dans le tabpanel, qui doublait `GalleryZoomButton` ;
			// celui-ci porte désormais le libellé pour les DEUX types de média. Le div
			// interne n'existait que pour éviter un `<button>` dans un `<button>` quand
			// `VideoErrorFallback` rend le sien : ce risque est parti avec le rôle.
			// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- surface de clic souris/tactile ; le chemin clavier est GalleryZoomButton
			<div
				id={id}
				role="tabpanel"
				className="relative h-full min-w-0 flex-[0_0_100%] cursor-zoom-in"
				style={{ viewTransitionName }}
				onClick={onOpen}
				onPointerDown={prefetchLightbox}
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
			// Surface de clic, PAS un contrôle. C'était un `<button>` nommé « Ouvrir
			// l'image en plein écran », posé sous `GalleryZoomButton` (« Zoomer
			// l'image en plein écran ») et déclenchant le même `onOpen` : deux arrêts
			// au clavier et deux libellés jumeaux pour un seul geste. Le plein écran
			// a désormais un seul contrôle nommé, dans la réserve du carton — et ce
			// panneau redevient le `tabpanel` que les vignettes annoncent déjà via
			// `aria-controls`, ce que le `<button>` n'était pas.
			// Pas de gestionnaire clavier ICI, et c'est le but : le chemin clavier du
			// plein écran est `GalleryZoomButton`, qui porte le libellé et l'arrêt de
			// tabulation. En rajouter un rendrait ce panneau focusable et
			// réintroduirait exactement le doublon qu'on vient de retirer.
			// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events -- surface de clic souris ; le chemin clavier/lecteur d'écran est GalleryZoomButton
			<div
				id={id}
				role="tabpanel"
				className="relative h-full min-w-0 flex-[0_0_100%] cursor-zoom-in"
				style={{ viewTransitionName }}
				onClick={onOpen}
				onPointerDown={prefetchLightbox}
			>
				<GalleryHoverZoom
					src={media.url}
					alt={alt}
					blurDataUrl={media.blurDataUrl}
					zoomLevel={GALLERY_ZOOM_LEVEL}
					preload={index === 0}
					quality={MAIN_IMAGE_QUALITY}
				/>
			</div>
		);
	}

	// Mobile : Pinch-zoom natif (gère son propre onClick via onTap)
	return (
		<div
			id={id}
			role="tabpanel"
			className="relative h-full min-w-0 flex-[0_0_100%]"
			style={{ viewTransitionName }}
			// Au doigt, c'est le SEUL préchauffage possible du chunk lightbox : la loupe,
			// qui préchargeait sur `mouseenter`/`focus`, est `hidden md:flex` — en
			// `display: none`, elle n'émet ni l'un ni l'autre. Le geste commence au
			// `pointerdown`, bien avant que `onTap` ne se décide.
			onPointerDown={prefetchLightbox}
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
