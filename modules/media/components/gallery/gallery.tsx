"use client";

import { useState, useEffect, Suspense, useRef, useEffectEvent } from "react";
import { useSearchParams } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";

import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "@/shared/hooks";
import Image from "next/image";
import { Skeleton, SkeletonGroup } from "@/shared/components/ui/skeleton";

import dynamic from "next/dynamic";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = dynamic(
	() => import("@/modules/media/components/media-lightbox"),
	{ ssr: false }
);
import { useLightbox } from "@/shared/hooks";
import { usePrefetchImages } from "@/modules/media/hooks/use-image-prefetch";
import { usePrefetchVideos } from "@/modules/media/hooks/use-video-prefetch";
import { buildGallery } from "@/modules/media/services/gallery-builder.service";
import { buildLightboxSlides } from "@/modules/media/services/lightbox-builder.service";
import { PREFETCH_RANGE_SLOW, PREFETCH_RANGE_FAST } from "@/modules/media/constants/gallery.constants";
import { galleryParamsSchema } from "@/modules/media/schemas/gallery-params.schema";
import { GalleryCounter } from "@/shared/components/gallery/counter";
import { GalleryNavigation } from "@/shared/components/gallery/navigation";
import { GalleryZoomButton } from "@/shared/components/gallery/zoom-button";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import { GalleryThumbnail } from "./thumbnail";
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

// Constantes pour le nombre max de thumbnails visibles (Baymard UX)
const MAX_VISIBLE_THUMBNAILS_DESKTOP = 6;
const MAX_VISIBLE_THUMBNAILS_MOBILE = 5;

// Composant réutilisable pour éviter duplication desktop/mobile
interface GalleryThumbnailListProps {
	images: ProductMedia[];
	current: number;
	thumbnailErrors: Set<string>;
	title: string;
	onScrollTo: (index: number) => void;
	onError: (mediaId: string) => void;
	onOpenLightbox: () => void;
	variant: "desktop" | "mobile";
}

function GalleryThumbnailList({
	images,
	current,
	thumbnailErrors,
	title,
	onScrollTo,
	onError,
	onOpenLightbox,
	variant,
}: GalleryThumbnailListProps) {
	const isDesktop = variant === "desktop";
	const maxVisible = isDesktop ? MAX_VISIBLE_THUMBNAILS_DESKTOP : MAX_VISIBLE_THUMBNAILS_MOBILE;
	const totalImages = images.length;
	const hasMoreImages = totalImages > maxVisible;
	const visibleImages = hasMoreImages ? images.slice(0, maxVisible - 1) : images;
	const remainingCount = hasMoreImages ? totalImages - (maxVisible - 1) : 0;
	const lastVisibleMedia = hasMoreImages ? images[maxVisible - 1] : null;

	return (
		<div className={isDesktop ? "hidden md:block order-1" : "md:hidden order-3 mt-3"}>
			<div
				className={isDesktop ? "flex flex-col gap-2" : "flex flex-wrap gap-2"}
				role="tablist"
				aria-label="Vignettes"
			>
				{visibleImages.map((media, index) => (
					<GalleryThumbnail
						key={media.id}
						media={media}
						index={index}
						isActive={index === current}
						hasError={thumbnailErrors.has(media.id)}
						title={title}
						onClick={() => onScrollTo(index)}
						onError={() => onError(media.id)}
						className={isDesktop ? "hover:shadow-sm" : "w-14 h-14"}
						isLCPCandidate={index === 0}
					/>
				))}
				{/* Badge "+X photos" sur la dernière thumbnail quand images tronquées (Baymard UX) */}
				{hasMoreImages && lastVisibleMedia && (
					<button
						type="button"
						onClick={onOpenLightbox}
						className={cn(
							"relative overflow-hidden rounded-xl aspect-square",
							"border-2 border-border hover:border-primary/50",
							"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none",
							"transition-all duration-200 active:scale-95",
							isDesktop ? "w-full hover:shadow-sm" : "w-14 h-14"
						)}
						aria-label={`Voir ${remainingCount} photos supplémentaires`}
					>
						{/* Image de fond floutée */}
						<Image
							src={lastVisibleMedia.mediaType === "VIDEO" ? (lastVisibleMedia.thumbnailUrl || "") : lastVisibleMedia.url}
							alt=""
							fill
							className="object-cover blur-[2px] brightness-50"
							sizes="80px"
							quality={30}
							loading="lazy"
						/>
						{/* Overlay avec compteur */}
						<div className="absolute inset-0 flex items-center justify-center bg-black/40">
							<span className="text-white font-semibold text-sm">
								+{remainingCount}
							</span>
						</div>
					</button>
				)}
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

	// Type de produit pour les ALT descriptifs
	const productType = product.type?.label;

	// Extraire et valider les params URL pour les variants
	const rawParams = {
		color: searchParams.get("color") || undefined,
		material: searchParams.get("material") || undefined,
		size: searchParams.get("size") || undefined,
	};
	const validatedParams = galleryParamsSchema.safeParse(rawParams);
	const { color: colorSlug, material: materialSlug, size } = validatedParams.success
		? validatedParams.data
		: { color: undefined, material: undefined, size: undefined };

	// Construire la liste d'images selon les variants
	const images: ProductMedia[] = buildGallery({
		product,
		selectedVariants: { colorSlug, materialSlug, size },
	});

	const slides = buildLightboxSlides(images, prefersReduced);

	// Connection-aware prefetch range avec fallback intelligent
	// Safari/Firefox ne supportent pas navigator.connection
	// Fallback: mobile viewport sans connection API = traiter comme connexion modérée
	const getEffectivePrefetchRange = (): number => {
		const connection = typeof navigator !== "undefined"
			? (navigator as Navigator & { connection?: { effectiveType?: string } }).connection?.effectiveType
			: undefined;

		// Si connection API disponible, l'utiliser
		if (connection) {
			return connection === "slow-2g" || connection === "2g"
				? PREFETCH_RANGE_SLOW
				: PREFETCH_RANGE_FAST;
		}

		// Fallback: mobile sans connection API = prudent (Safari iOS ~25% trafic FR)
		if (typeof window !== "undefined" && window.innerWidth < 768) {
			return PREFETCH_RANGE_SLOW;
		}

		return PREFETCH_RANGE_FAST;
	};
	const prefetchRange = getEffectivePrefetchRange();

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
						"grid gap-3 md:gap-4",
						images.length > 1 ? "grid-cols-1 md:grid-cols-[60px_1fr] lg:grid-cols-[80px_1fr]" : "grid-cols-1"
					)}
				>
					{/* Thumbnails verticales - Desktop */}
					{images.length > 1 && (
						<GalleryThumbnailList
							images={images}
							current={current}
							thumbnailErrors={thumbnailErrors}
							title={title}
							onScrollTo={scrollTo}
							onError={handleThumbnailError}
							onOpenLightbox={open}
							variant="desktop"
						/>
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

					{/* Thumbnails horizontales - Mobile */}
					{images.length > 1 && (
						<GalleryThumbnailList
							images={images}
							current={current}
							thumbnailErrors={thumbnailErrors}
							title={title}
							onScrollTo={scrollTo}
							onError={handleThumbnailError}
							onOpenLightbox={open}
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
