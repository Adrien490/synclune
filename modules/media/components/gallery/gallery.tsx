"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useEffectEvent, useRef, useState } from "react";

import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";
import { useReducedMotion } from "@/shared/hooks";
import { cn } from "@/shared/utils/cn";

import {
	PREFETCH_RANGE_FAST,
	PREFETCH_RANGE_SLOW,
} from "@/modules/media/constants/gallery.constants";
import { usePrefetchImages } from "@/modules/media/hooks/use-image-prefetch";
import { usePrefetchVideos } from "@/modules/media/hooks/use-video-prefetch";
import { parseGalleryParams } from "@/modules/media/schemas/gallery-params.schema";
import { buildGallery } from "@/modules/media/services/gallery-builder.service";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { GalleryCounter } from "@/shared/components/gallery/counter";
import { GalleryNavigation } from "@/shared/components/gallery/navigation";
import { GalleryZoomButton } from "@/shared/components/gallery/zoom-button";
import { useLightbox } from "@/shared/hooks";
import dynamic from "next/dynamic";
import { GallerySlide } from "./slide";
import { GalleryThumbnail } from "./thumbnail";

// Lazy loading - lightbox only loaded on open
const MediaLightbox = dynamic(() => import("@/modules/media/components/media-lightbox"), {
	ssr: false,
});

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import type { GetProductReturn } from "@/modules/products/types/product.types";

interface GalleryProps {
	product: GetProductReturn;
	title: string;
}

function GalleryLoadingSkeleton() {
	return (
		<SkeletonGroup label="Chargement de la galerie">
			<div className="w-full">
				<Skeleton className="aspect-3/4 w-full rounded-3xl sm:aspect-4/5" variant="shimmer" />
			</div>
		</SkeletonGroup>
	);
}

// Reusable component to avoid desktop/mobile duplication
interface GalleryThumbnailListProps {
	images: ProductMedia[];
	current: number;
	thumbnailErrors: Set<string>;
	title: string;
	onScrollTo: (index: number) => void;
	onError: (mediaId: string) => void;
	variant: "desktop" | "mobile";
}

function GalleryThumbnailList({
	images,
	current,
	thumbnailErrors,
	title,
	onScrollTo,
	onError,
	variant,
}: GalleryThumbnailListProps) {
	const isDesktop = variant === "desktop";
	const prefersReduced = useReducedMotion();
	const tablistRef = useRef<HTMLDivElement>(null);

	// Scroll active thumbnail into view when current changes
	useEffect(() => {
		const tablist = tablistRef.current;
		if (!tablist) return;

		const activeButton = tablist.querySelectorAll<HTMLButtonElement>('[role="tab"]')[current];
		activeButton?.scrollIntoView({
			block: "nearest",
			inline: "nearest",
			behavior: prefersReduced ? "instant" : "smooth",
		});
	}, [current, prefersReduced]);

	return (
		<div className={isDesktop ? "order-1 hidden md:block" : "order-3 mt-3 md:hidden"}>
			<div
				ref={tablistRef}
				className={isDesktop ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}
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
						onClick={() => onScrollTo(index)}
						onError={() => onError(media.id)}
						className={isDesktop ? "hover:shadow-sm" : "h-14 w-14"}
						isLCPCandidate={index === 0}
					/>
				))}
			</div>
		</div>
	);
}

export function Gallery(props: GalleryProps) {
	return (
		<ErrorBoundary errorMessage="Impossible de charger la galerie">
			<Suspense fallback={<GalleryLoadingSkeleton />}>
				<GalleryContent {...props} />
			</Suspense>
		</ErrorBoundary>
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

	// Product type for descriptive ALT texts
	const productType = product.type?.label;

	// Extract and validate URL params for variants
	const {
		color: colorSlug,
		material: materialSlug,
		size,
	} = parseGalleryParams({
		color: searchParams.get("color") ?? undefined,
		material: searchParams.get("material") ?? undefined,
		size: searchParams.get("size") ?? undefined,
	});

	// Build image list based on selected variants
	const images: ProductMedia[] = buildGallery({
		product,
		selectedVariants: { colorSlug, materialSlug, size },
	});

	const slides = buildLightboxSlides(images, prefersReduced);

	// Connection-aware prefetch range with intelligent fallback
	// Safari/Firefox don't support navigator.connection
	// Fallback: mobile viewport without connection API = treat as moderate connection
	const getEffectivePrefetchRange = (): number => {
		const connection =
			typeof navigator !== "undefined"
				? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection
						?.effectiveType
				: undefined;

		// Use connection API if available
		if (connection) {
			return connection === "slow-2g" || connection === "2g"
				? PREFETCH_RANGE_SLOW
				: PREFETCH_RANGE_FAST;
		}

		// Fallback: mobile without connection API = conservative (Safari iOS ~25% FR traffic)
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			return PREFETCH_RANGE_SLOW;
		}

		return PREFETCH_RANGE_FAST;
	};
	const prefetchRange = getEffectivePrefetchRange();

	// Smart prefetch of adjacent images (Next.js 16 + React 19)
	// Extract URLs to avoid recreating an array on each render
	const imageUrls = images.map((img) => img.url);

	usePrefetchImages({
		imageUrls,
		currentIndex: current,
		prefetchRange,
		enabled: images.length > 1,
	});

	// Prefetch adjacent video metadata
	usePrefetchVideos({
		medias: images,
		currentIndex: current,
		prefetchRange,
		enabled: images.length > 1,
	});

	// Effect Event to handle onSelect without re-registration
	const onSelect = useEffectEvent(() => {
		if (emblaApi) {
			setCurrent(emblaApi.selectedScrollSnap());
		}
	});

	// Sync index when carousel changes
	useEffect(() => {
		if (!emblaApi) return;

		onSelect();
		emblaApi.on("select", onSelect);

		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi]);

	// Effect Event to handle keyboard navigation without re-registration
	const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
		// Don't capture if focus is in an input/textarea
		if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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

	// Keyboard navigation (WCAG 2.1.1) — scoped to gallery element
	useEffect(() => {
		if (!emblaApi || images.length <= 1) return;
		const el = galleryRef.current;
		if (!el) return;

		el.addEventListener("keydown", onKeyDown);
		return () => el.removeEventListener("keydown", onKeyDown);
	}, [emblaApi, images.length]);

	// Navigation
	const scrollPrev = () => emblaApi?.scrollPrev();
	const scrollNext = () => emblaApi?.scrollNext();
	const scrollTo = (index: number) => emblaApi?.scrollTo(index);

	// Conditional transition classes (composable only: transform, opacity)
	const transitionClass = prefersReduced ? "" : "transition-[transform,opacity] duration-300";

	// Edge case: no images
	if (!images.length) {
		return (
			<div className="gallery-empty">
				<div className="bg-linear-card relative flex aspect-3/4 items-center justify-center overflow-hidden rounded-3xl p-8 sm:aspect-4/5">
					<div
						className={cn(
							"bg-linear-organic absolute inset-0 rounded-3xl opacity-10",
							!prefersReduced && "animate-pulse",
						)}
					/>
					<div className="relative z-10 space-y-3 text-center">
						<span
							className={cn("text-4xl", !prefersReduced && "motion-safe:animate-bounce")}
							aria-hidden="true"
						>
							✨
						</span>
						<p className="text-primary text-sm font-medium">Photos en préparation</p>
						<p className="text-muted-foreground text-sm leading-normal">Un peu de patience !</p>
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
				tabIndex={-1}
				className={cn(
					"outline-none",
					"product-gallery w-full",
					transitionClass,
					"group-has-[[data-pending]]/product-details:blur-[1px]",
					"group-has-[[data-pending]]/product-details:scale-[0.99]",
					"group-has-[[data-pending]]/product-details:pointer-events-none",
				)}
				role="region"
				aria-label={`Galerie photos ${title}`}
				aria-roledescription="carrousel"
			>
				{/* Screen reader announcement (WCAG 4.1.3) */}
				<div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
					Image {current + 1} sur {images.length}
				</div>

				<div
					className={cn(
						"grid gap-3 md:gap-4",
						images.length > 1
							? "grid-cols-1 md:grid-cols-[60px_1fr] lg:grid-cols-[80px_1fr]"
							: "grid-cols-1",
					)}
				>
					{/* Vertical thumbnails - Desktop */}
					{images.length > 1 && (
						<GalleryThumbnailList
							images={images}
							current={current}
							thumbnailErrors={thumbnailErrors}
							title={title}
							onScrollTo={scrollTo}
							onError={handleThumbnailError}
							variant="desktop"
						/>
					)}

					{/* Main image with Embla */}
					<div className="gallery-main group relative order-2">
						<div
							className={cn(
								"relative aspect-3/4 overflow-hidden rounded-2xl sm:aspect-4/5 sm:rounded-3xl",
								"bg-linear-organic sm:border-border border-0 sm:border-2",
								"shadow-md hover:shadow-lg sm:shadow-lg",
								transitionClass,
							)}
						>
							{/* Subtle hover effect */}
							<div
								className={cn(
									"ring-primary/20 pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 ring-1 group-hover:opacity-100 sm:rounded-3xl",
									!prefersReduced && "transition-opacity duration-300",
								)}
							/>

							{/* Image counter */}
							{images.length > 1 && <GalleryCounter current={current} total={images.length} />}

							{/* Zoom button - Desktop only */}
							{currentMedia?.mediaType === "IMAGE" && <GalleryZoomButton onOpen={open} />}

							{/* Embla carousel viewport */}
							<div ref={emblaRef} className="absolute inset-0 overflow-hidden">
								<div className="flex h-full">
									{images.map((media, index) => (
										<GallerySlide
											key={media.id}
											id={`gallery-panel-${index}`}
											media={media}
											index={index}
											title={title}
											productType={productType}
											totalImages={images.length}
											isActive={index === current}
											onOpen={open}
											viewTransitionName={index === 0 ? `product-${product.id}` : undefined}
										/>
									))}
								</div>
							</div>

							{/* Navigation arrows - Desktop only */}
							{images.length > 1 && <GalleryNavigation onPrev={scrollPrev} onNext={scrollNext} />}
						</div>
					</div>

					{/* Horizontal thumbnails - Mobile */}
					{images.length > 1 && (
						<GalleryThumbnailList
							images={images}
							current={current}
							thumbnailErrors={thumbnailErrors}
							title={title}
							onScrollTo={scrollTo}
							onError={handleThumbnailError}
							variant="mobile"
						/>
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
