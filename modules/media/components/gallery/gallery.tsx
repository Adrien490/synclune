"use client";

import { useState, useEffect, Suspense, useRef, useEffectEvent } from "react";
import { useSearchParams } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";

import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

import dynamic from "next/dynamic";
import { MediaLightboxSkeleton } from "@/shared/components/skeletons/lazy-loading";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = dynamic(
	() => import("@/modules/media/components/media-lightbox"),
	{ ssr: false, loading: () => <MediaLightboxSkeleton /> }
);
import { useLightbox } from "@/modules/media/hooks/use-lightbox";
import { usePrefetchImages } from "@/modules/media/hooks/use-image-prefetch";
import { usePrefetchVideos } from "@/modules/media/hooks/use-video-prefetch";
import { buildGallery } from "@/modules/media/services/gallery-builder.service";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import { PREFETCH_RANGE_SLOW, PREFETCH_RANGE_FAST } from "@/modules/media/constants/gallery.constants";
import { GalleryErrorBoundary } from "./error-boundary";
import { GalleryThumbnail } from "./thumbnail";
import { GalleryCounter } from "./counter";
import { GalleryNavigation } from "./navigation";
import { GalleryZoomButton } from "./zoom-button";
import { GallerySlide } from "./slide";

import type { GetProductReturn } from "@/modules/products/types/product.types";
import type { ProductMedia } from "@/modules/media/types/product-media.types";

interface GalleryProps {
	product: GetProductReturn;
	title: string;
}

function GalleryLoadingSkeleton() {
	return (
		<SkeletonGroup label="Chargement de la galerie">
			<div className="w-full">
				<Skeleton
					className="aspect-3/4 sm:aspect-[4/5] rounded-3xl w-full"
					variant="shimmer"
				/>
			</div>
		</SkeletonGroup>
	);
}

export function Gallery(props: GalleryProps) {
	return (
		<GalleryErrorBoundary>
			<Suspense fallback={<GalleryLoadingSkeleton />}>
				<GalleryContent {...props} />
			</Suspense>
		</GalleryErrorBoundary>
	);
}

function GalleryContent({ product, title }: GalleryProps) {
	const searchParams = useSearchParams();
	const [current, setCurrent] = useState(0);
	const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(new Set());
	const { isOpen, open, close } = useLightbox();
	const prefersReduced = useReducedMotion();
	const galleryRef = useRef<HTMLDivElement>(null);

	const handleThumbnailError = (mediaId: string) => {
		setThumbnailErrors((prev) => new Set(prev).add(mediaId));
	};

	// Embla carousel
	const [emblaRef, emblaApi] = useEmblaCarousel({
		loop: true,
		align: "center",
		dragFree: false,
	});

	// Type de produit pour les ALT descriptifs
	const productType = product.type?.label;

	// Extraire les params URL pour les variants
	const colorSlug = searchParams.get("color") || undefined;
	const materialSlug = searchParams.get("material") || undefined;
	const size = searchParams.get("size") || undefined;

	// Construire la liste d'images selon les variants
	const images: ProductMedia[] = buildGallery({
		product,
		selectedVariants: { colorSlug, materialSlug, size },
	});

	const slides = buildLightboxSlides(images, prefersReduced);

	// Connection-aware prefetch range
	const connection = typeof navigator !== "undefined"
		? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType
		: undefined;
	const prefetchRange = connection === "slow-2g" || connection === "2g" ? PREFETCH_RANGE_SLOW : PREFETCH_RANGE_FAST;

	// Prefetch intelligent des images adjacentes (Next.js 16 + React 19)
	// Extraire les URLs pour éviter de recréer un tableau à chaque render
	const imageUrls = images.map((img) => img.url);

	usePrefetchImages({
		imageUrls,
		currentIndex: current,
		prefetchRange,
		enabled: images.length > 1,
	});

	// Prefetch métadonnées des vidéos adjacentes
	usePrefetchVideos({
		medias: images,
		currentIndex: current,
		prefetchRange,
		enabled: images.length > 1,
	});

	// Effect Event pour gérer onSelect sans re-registration
	const onSelect = useEffectEvent(() => {
		if (emblaApi) {
			setCurrent(emblaApi.selectedScrollSnap());
		}
	});

	// Sync index quand le carousel change
	useEffect(() => {
		if (!emblaApi) return;

		onSelect();
		emblaApi.on("select", onSelect);

		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi, onSelect]);

	// Effect Event pour gérer la navigation clavier sans re-registration
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		// Ne pas capturer si focus dans un input/textarea
		if (
			e.target instanceof HTMLInputElement ||
			e.target instanceof HTMLTextAreaElement
		) {
			return;
		}

		if (!emblaApi) return;

		switch (e.key) {
			case "ArrowLeft":
				e.preventDefault();
				emblaApi.scrollPrev();
				break;
			case "ArrowRight":
				e.preventDefault();
				emblaApi.scrollNext();
				break;
			case "Home":
				e.preventDefault();
				emblaApi.scrollTo(0);
				break;
			case "End":
				e.preventDefault();
				emblaApi.scrollTo(images.length - 1);
				break;
		}
	});

	// Navigation clavier (WCAG 2.1.1)
	useEffect(() => {
		if (!emblaApi || images.length <= 1) return;

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [emblaApi, images.length, onKeyDown]);

	// Navigation
	const scrollPrev = () => emblaApi?.scrollPrev();
	const scrollNext = () => emblaApi?.scrollNext();
	const scrollTo = (index: number) => emblaApi?.scrollTo(index);

	// Classes de transition conditionnelles
	const transitionClass = prefersReduced ? "" : "transition-all duration-300";

	// Cas limite : aucune image
	if (!images.length) {
		return (
			<div className="gallery-empty">
				<div className="relative aspect-3/4 sm:aspect-[4/5] rounded-3xl bg-linear-card p-8 flex items-center justify-center overflow-hidden">
					<div
						className={cn(
							"absolute inset-0 bg-linear-organic opacity-10 rounded-3xl",
							!prefersReduced && "animate-pulse"
						)}
					/>
					<div className="text-center space-y-3 z-10 relative">
						<span
							className={cn("text-4xl", !prefersReduced && "animate-bounce")}
							aria-hidden="true"
						>
							✨
						</span>
						<p className="text-sm font-medium text-primary">Photos en préparation</p>
						<p className="text-sm leading-normal text-muted-foreground">
							Un peu de patience !
						</p>
					</div>
				</div>
			</div>
		);
	}

	const currentMedia = images[current];

	return (
		<>
			<div
				ref={galleryRef}
				className={cn(
					"product-gallery w-full",
					transitionClass,
					"group-has-[[data-pending]]/product-details:blur-[1px]",
					"group-has-[[data-pending]]/product-details:scale-[0.99]",
					"group-has-[[data-pending]]/product-details:pointer-events-none"
				)}
				role="region"
				aria-label={`Galerie photos ${title}`}
				aria-roledescription="carrousel"
			>
				{/* Annonce pour lecteurs d'écran (WCAG 4.1.3) */}
				<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
					Image {current + 1} sur {images.length}
				</div>

				<div
					className={cn(
						"grid gap-3 lg:gap-4",
						images.length > 1 ? "grid-cols-1 lg:grid-cols-[80px_1fr]" : "grid-cols-1"
					)}
				>
					{/* Thumbnails verticales - Desktop uniquement */}
					{images.length > 1 && (
						<div className="hidden lg:block order-1">
							<div className="flex flex-col gap-2" role="tablist" aria-label="Vignettes">
								{images.map((media, index) => (
									<GalleryThumbnail
										key={media.id}
										media={media}
										index={index}
										isActive={index === current}
										hasError={thumbnailErrors.has(media.id)}
										title={title}
										onClick={() => scrollTo(index)}
										onError={() => handleThumbnailError(media.id)}
										className="hover:shadow-sm"
										isLCPCandidate={index === 0}
									/>
								))}
							</div>
						</div>
					)}

					{/* Image principale avec Embla */}
					<div className="gallery-main relative group order-2">
						<div
							className={cn(
								"relative aspect-3/4 sm:aspect-[4/5] overflow-hidden rounded-2xl sm:rounded-3xl",
								"bg-linear-organic border-0 sm:border-2 sm:border-border",
								"shadow-md sm:shadow-lg hover:shadow-lg",
								transitionClass
							)}
						>
							{/* Effet hover subtil */}
							<div
								className={cn(
									"absolute inset-0 ring-1 ring-primary/20 opacity-0 group-hover:opacity-100 pointer-events-none rounded-2xl sm:rounded-3xl z-10",
									!prefersReduced && "transition-opacity duration-300"
								)}
							/>

							{/* Compteur d'images */}
							{images.length > 1 && (
								<GalleryCounter current={current} total={images.length} />
							)}

							{/* Bouton zoom - Desktop uniquement */}
							{currentMedia?.mediaType === "IMAGE" && (
								<GalleryZoomButton onOpen={open} />
							)}


							{/* Embla viewport */}
							<div ref={emblaRef} className="absolute inset-0 overflow-hidden">
								<div className="flex h-full">
									{images.map((media, index) => (
										<GallerySlide
											key={media.id}
											media={media}
											index={index}
											title={title}
											productType={productType}
											totalImages={images.length}
											isActive={index === current}
											onOpen={open}
										/>
									))}
								</div>
							</div>

							{/* Flèches navigation - Desktop uniquement */}
							{images.length > 1 && (
								<GalleryNavigation onPrev={scrollPrev} onNext={scrollNext} />
							)}
						</div>
					</div>

					{/* Vignettes horizontales - Mobile uniquement */}
					{images.length > 1 && (
						<div className="lg:hidden order-3 mt-3">
							<div
								className="flex flex-wrap gap-2"
								role="tablist"
								aria-label="Vignettes"
							>
								{images.map((media, index) => (
									<GalleryThumbnail
										key={media.id}
										media={media}
										index={index}
										isActive={index === current}
										hasError={thumbnailErrors.has(media.id)}
										title={title}
										onClick={() => scrollTo(index)}
										onError={() => handleThumbnailError(media.id)}
										className="w-14 h-14"
										isLCPCandidate={index === 0}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			<MediaLightbox
				open={isOpen}
				close={close}
				slides={slides}
				index={current}
				onIndexChange={(index) => scrollTo(index)}
			/>
		</>
	);
}
