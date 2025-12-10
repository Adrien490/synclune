"use client";

import type { Slide } from "yet-another-react-lightbox";
import { OpenLightboxButton } from "@/modules/media/components/open-lightbox-button";
import { Button } from "@/shared/components/ui/button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { cn } from "@/shared/utils/cn";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { buildGallery } from "@/modules/media/utils/build-gallery";
import { GalleryErrorBoundary } from "@/modules/media/components/gallery-error-boundary";
import { GalleryMediaRenderer } from "@/modules/media/components/gallery-media-renderer";
import { useGalleryKeyboard } from "@/modules/media/hooks/use-gallery-keyboard";
import { useGalleryNavigation } from "@/modules/media/hooks/use-gallery-navigation";
import { useMediaErrors } from "@/modules/media/hooks/use-media-errors";
import useEmblaCarousel from "embla-carousel-react";

type EmblaOptionsType = Parameters<typeof useEmblaCarousel>[0];

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { GalleryThumbnailsGrid, GalleryThumbnailsCarousel } from "@/modules/media/components/gallery-thumbnails";

interface GalleryProps {
	product: GetProductReturn;
	title: string;
}

/**
 * Skeleton de chargement pour la galerie
 */
function GalleryLoadingSkeleton() {
	return (
		<div className="w-full">
			<div className="aspect-square rounded-3xl bg-muted animate-pulse" />
		</div>
	);
}

/**
 * Galerie produit avec Error Boundary et Suspense
 * Wrapper qui capture les erreurs et affiche un fallback gracieux
 */
export function Gallery(props: GalleryProps) {
	return (
		<GalleryErrorBoundary>
			<Suspense fallback={<GalleryLoadingSkeleton />}>
				<GalleryContent {...props} />
			</Suspense>
		</GalleryErrorBoundary>
	);
}

/**
 * Contenu interne de la galerie produit
 * - Support images et vidéos
 * - Navigation clavier, swipe mobile, lightbox
 * - Synchronisation URL
 */
function GalleryContent({ product, title }: GalleryProps) {
	const galleryRef = useRef<HTMLDivElement>(null);
	const searchParams = useSearchParams();
	const prefersReducedMotion = useReducedMotion();

	// Extraire les params URL pour stabiliser les dépendances du useMemo
	// (searchParams retourne un nouvel objet à chaque render)
	const colorSlug = searchParams.get("color") || undefined;
	const materialSlug = searchParams.get("material") || undefined;
	const size = searchParams.get("size") || undefined;

	// Calcul dynamique des images selon les variants sélectionnés
	const safeImages: ProductMedia[] = buildGallery({
		product,
		selectedVariants: { colorSlug, materialSlug, size },
	});

	// Conversion des médias en slides pour la lightbox (images + vidéos)
	// Génère les URLs Next.js optimisées pour les images
	// Utilise le format vidéo natif pour les vidéos
	// Respecte prefers-reduced-motion pour désactiver l'autoplay
	const lightboxSlides: Slide[] = safeImages.map((media) => {
		if (media.mediaType === "VIDEO") {
			return {
				type: "video" as const,
				sources: [
					{
						src: media.url,
						type: getVideoMimeType(media.url),
					},
				],
				poster: media.thumbnailUrl || media.thumbnailSmallUrl || undefined,
				// Désactiver autoplay si l'utilisateur préfère réduire les animations
				autoPlay: !prefersReducedMotion,
				muted: true,
				loop: !prefersReducedMotion,
				playsInline: true,
			};
		}

		return {
			src: media.url,
			alt: media.alt,
		};
	});

	// Hook: Navigation avec URL sync (optimiste = instantané, pas de loading)
	const {
		optimisticIndex,
		navigateToIndex,
		navigateNext,
		navigatePrev,
	} = useGalleryNavigation({ totalImages: safeImages.length });

	// Hook: Embla Carousel pour le swipe fluide natif
	const emblaOptions: EmblaOptionsType = {
		loop: safeImages.length > 1,
		align: "center",
		containScroll: false,
		duration: prefersReducedMotion ? 0 : 25,
		dragFree: false,
		watchSlides: true,
		watchResize: true,
	};

	const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

	// Sync: Embla → URL (quand l'utilisateur swipe)
	useEffect(() => {
		if (!emblaApi) return;

		const onSelect = () => {
			const index = emblaApi.selectedScrollSnap();
			if (index !== optimisticIndex) {
				navigateToIndex(index);
			}
		};

		emblaApi.on("select", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi, optimisticIndex, navigateToIndex]);

	// Sync: URL/Thumbnails/Keyboard → Embla
	useEffect(() => {
		if (!emblaApi) return;
		if (emblaApi.selectedScrollSnap() !== optimisticIndex) {
			emblaApi.scrollTo(optimisticIndex);
		}
	}, [emblaApi, optimisticIndex]);

	// Hook: Navigation clavier
	useGalleryKeyboard({
		galleryRef,
		currentIndex: optimisticIndex,
		totalImages: safeImages.length,
		onNavigate: navigateToIndex,
	});

	// Hook: Gestion erreurs média avec retry
	const { handleMediaError, hasError, retryMedia } = useMediaErrors();

	// Gestion vidéos: pause/play selon la slide active
	const emblaContainerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const container = emblaContainerRef.current;
		if (!container) return;

		const videos = container.querySelectorAll("video");
		videos.forEach((video, index) => {
			if (index === optimisticIndex) {
				video.play().catch(() => {}); // Autoplay peut être bloqué
			} else {
				video.pause();
				video.currentTime = 0;
			}
		});
	}, [optimisticIndex]);

	// Preload de l'image suivante pour améliorer la latence perçue
	useEffect(() => {
		if (safeImages.length <= 1) return;

		const nextIndex = (optimisticIndex + 1) % safeImages.length;
		const nextMedia = safeImages[nextIndex];

		// Ne preload que les images (pas les vidéos)
		if (nextMedia?.mediaType === "IMAGE" && nextMedia.url) {
			const img = new Image();
			img.src = nextMedia.url;
		}
	}, [optimisticIndex, safeImages]);

	// Handlers mémorisés pour les boutons navigation (évite re-renders)
	const handlePrev = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigatePrev();
	};

	const handleNext = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigateNext();
	};

	// Sync lightbox navigation avec URL galerie
	const handleLightboxIndexChange = (index: number) => {
		navigateToIndex(index);
	};

	// Cas limite : aucune image (ne devrait pas arriver grâce à buildGallery())
	if (!safeImages.length) {
		return (
			<div className="gallery-empty">
				<div className="relative aspect-square rounded-3xl bg-linear-card p-8 flex items-center justify-center overflow-hidden">
					<div className="absolute inset-0 bg-linear-organic opacity-10 animate-pulse rounded-3xl" />
					<div className="text-center space-y-3 z-10 relative">
						<span className="text-4xl animate-bounce">✨</span>
						<p className="text-sm font-medium text-primary">
							Photos en préparation
						</p>
						<p className="text-sm leading-normal text-muted-foreground">
							Cette création attend son shooting ✨
						</p>
					</div>
				</div>
			</div>
		);
	}

	const current = safeImages[optimisticIndex];
	// Type guard: current devrait toujours exister grâce aux guards précédentes
	if (!current) return null;

	return (
		<OpenLightboxButton
			slides={lightboxSlides}
			index={optimisticIndex}
			onIndexChange={handleLightboxIndexChange}
		>
			{({ openLightbox }) => (
				<div
					className="product-gallery w-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
					ref={galleryRef}
					role="region"
					aria-label={`Galerie d'images pour ${title}`}
					aria-describedby="gallery-instructions"
					tabIndex={safeImages.length > 1 ? 0 : -1}
				>
					{/* Annonce dynamique pour lecteurs d'écran */}
					<div className="sr-only" aria-live="polite" aria-atomic="true">
						Image {optimisticIndex + 1} sur {safeImages.length}
						{current.alt ? ` : ${current.alt}` : ""}
					</div>

					{/* Layout principal : Thumbnails verticales (desktop) | Image principale */}
					<div className={cn(
						"grid gap-3 lg:gap-4",
						safeImages.length > 1
							? "grid-cols-1 lg:grid-cols-[80px_1fr]"
							: "grid-cols-1"
					)}>
						{/* Thumbnails verticales - Desktop uniquement */}
						{/* Indicateur de scroll avec gradient en bas quand scrollable */}
						{safeImages.length > 1 && (
							<div className="hidden lg:block relative order-1">
								{/* Container scrollable */}
								<div className="flex flex-col gap-2 max-h-[min(500px,60vh)] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pr-1 scroll-fade-y">
									<GalleryThumbnailsGrid
										medias={safeImages}
										currentIndex={optimisticIndex}
										title={title}
										onNavigate={navigateToIndex}
										onError={handleMediaError}
										hasError={hasError}
										thumbnailClassName="shrink-0 h-auto hover:shadow-sm"
									/>
								</div>
								{/* Gradient indiquant plus de contenu en bas (visible si > 5 images) */}
								{safeImages.length > 5 && (
									<div
										className="absolute bottom-0 left-0 right-1 h-8 bg-linear-to-t from-background to-transparent pointer-events-none"
										aria-hidden="true"
									/>
								)}
							</div>
						)}

						{/* Image principale avec Embla Carousel */}
						<div className="gallery-main relative group order-2 lg:order-2">
						<div
							className={cn(
								"relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl",
								"bg-linear-organic border border-border sm:border-2",
								"shadow-md sm:shadow-lg hover:shadow-lg transition-all duration-300",
								"w-full md:max-w-none"
							)}
						>
							{/* Effet hover subtil */}
							<div className="absolute inset-0 ring-1 ring-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl sm:rounded-3xl z-10" />

							{/* Compteur d'images */}
							{safeImages.length > 1 && (
								<div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
									<div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg">
										{optimisticIndex + 1} / {safeImages.length}
									</div>
								</div>
							)}

							{/* Badge zoom (images uniquement) - visible sur mobile, étendu au hover sur desktop */}
							{current.mediaType === "IMAGE" && (
								<div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 transition-opacity duration-300">
									<div className="bg-black/60 backdrop-blur-sm text-white px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg flex items-center gap-1.5 group/zoom">
										<ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
										<span className="hidden sm:max-w-0 sm:group-hover:max-w-[120px] sm:overflow-hidden sm:transition-all sm:duration-300 sm:group-hover/zoom:inline">
											Zoomer
										</span>
									</div>
								</div>
							)}

							{/* Embla Carousel - Glissement fluide natif */}
							<div className="absolute inset-0 overflow-hidden" ref={emblaRef}>
								<div className="flex h-full touch-pan-y" ref={emblaContainerRef}>
									{safeImages.map((media, index) => (
										<div
											key={media.id}
											className={cn(
												"flex-none w-full h-full min-w-0 relative",
												media.mediaType === "IMAGE" && "cursor-zoom-in"
											)}
											aria-hidden={index !== optimisticIndex}
											{...(media.mediaType === "IMAGE" && {
												role: "button",
												tabIndex: index === optimisticIndex ? 0 : -1,
												"aria-label": `Agrandir l'image ${index + 1} : ${media.alt || title}`,
												onClick: () => openLightbox(),
												onKeyDown: (e: React.KeyboardEvent) => {
													if (e.key === "Enter" || e.key === " ") {
														e.preventDefault();
														openLightbox();
													}
												},
											})}
										>
											<GalleryMediaRenderer
												media={media}
												title={title}
												index={index}
												isFirst={index === 0}
												isActive={index === optimisticIndex}
												hasError={hasError(media.id)}
												onError={() => handleMediaError(media.id)}
												onRetry={() => retryMedia(media.id)}
											/>
										</div>
									))}
								</div>
							</div>

							{/* Contrôles de navigation - Touch targets 48px sur mobile (WCAG 2.5.5) */}
							{safeImages.length > 1 && (
								<>
									<Button
										variant="ghost"
										size="icon"
										className={cn(
											// Positionnement
											"absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10",
											// Touch targets responsives (WCAG 2.5.5)
											"size-12 md:size-11",
											// Forme et fond primary
											"rounded-full bg-primary",
											// Ombres
											"shadow-lg hover:shadow-xl",
											// Couleurs
											"text-primary-foreground",
											"hover:bg-primary/90 hover:scale-105 active:scale-95",
											// Visibilité mobile-first
											"opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
											// Transitions fluides
											"transition-all duration-300"
										)}
										onClick={handlePrev}
										aria-label="Image précédente"
									>
										<ChevronLeft className="size-5" />
									</Button>

									<Button
										variant="ghost"
										size="icon"
										className={cn(
											// Positionnement
											"absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10",
											// Touch targets responsives (WCAG 2.5.5)
											"size-12 md:size-11",
											// Forme et fond primary
											"rounded-full bg-primary",
											// Ombres
											"shadow-lg hover:shadow-xl",
											// Couleurs
											"text-primary-foreground",
											"hover:bg-primary/90 hover:scale-105 active:scale-95",
											// Visibilité mobile-first
											"opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
											// Transitions fluides
											"transition-all duration-300"
										)}
										onClick={handleNext}
										aria-label="Image suivante"
									>
										<ChevronRight className="size-5" />
									</Button>
								</>
							)}
						</div>
					</div>
					</div>{/* Fin du grid principal */}

					{/* Miniatures - Mobile uniquement */}
					{safeImages.length > 1 && (
						<div className="lg:hidden mt-4 sm:mt-6">
							{safeImages.length > 6 ? (
								/* Carousel horizontal si plus de 6 images */
								<GalleryThumbnailsCarousel
									medias={safeImages}
									currentIndex={optimisticIndex}
									title={title}
									onNavigate={navigateToIndex}
									onError={handleMediaError}
									hasError={hasError}
									className="w-full"
								/>
							) : (
								/* Grille standard si 6 images ou moins */
								<div className="gallery-thumbnails w-full">
									<div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
										<GalleryThumbnailsGrid
											medias={safeImages}
											currentIndex={optimisticIndex}
											title={title}
											onNavigate={navigateToIndex}
											onError={handleMediaError}
											hasError={hasError}
										/>
									</div>
								</div>
							)}

							{/* Dots indicator - Navigation rapide visuelle */}
							{/* Touch targets 44×44px minimum (WCAG 2.5.5) avec dots visuels 8×8px */}
							<div className="flex justify-center gap-0.5 mt-3" role="group" aria-label="Navigation galerie">
								{safeImages.map((_, i) => (
									<button
										key={i}
										type="button"
										onClick={() => navigateToIndex(i)}
										aria-current={i === optimisticIndex ? "true" : undefined}
										aria-label={`Aller à l'image ${i + 1} sur ${safeImages.length}`}
										className="relative size-11 flex items-center justify-center touch-manipulation"
									>
										<span
											className={cn(
												"h-2 rounded-full transition-all duration-200",
												i === optimisticIndex
													? "bg-primary w-4"
													: "bg-muted-foreground/30 w-2 group-hover:bg-muted-foreground/50"
											)}
										/>
									</button>
								))}
							</div>
						</div>
					)}

					{/* Instructions pour la navigation (masquées visuellement) */}
					{safeImages.length > 1 && (
						<div id="gallery-instructions" className="sr-only">
							Galerie de {safeImages.length} images.
							Sur clavier : utilisez les flèches gauche et droite pour naviguer.
							Appuyez sur Début pour la première image, Fin pour la dernière.
							Sur écran tactile : glissez vers la gauche ou la droite pour changer d'image.
						</div>
					)}
				</div>
			)}
		</OpenLightboxButton>
	);
}
