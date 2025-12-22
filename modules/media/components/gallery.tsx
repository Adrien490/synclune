"use client";

import { OpenLightboxButton } from "@/modules/media/components/open-lightbox-button";
import { Button } from "@/shared/components/ui/button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn, Hand } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef } from "react";
import { buildGallery } from "@/modules/media/utils/build-gallery";
import { buildEmblaOptions } from "@/modules/media/utils/build-embla-options";
import { buildLightboxSlides } from "@/modules/media/utils/build-lightbox-slides";
import { GalleryErrorBoundary } from "@/modules/media/components/gallery-error-boundary";
import { GalleryMediaRenderer } from "@/modules/media/components/gallery-media-renderer";
import { useGalleryKeyboard } from "@/modules/media/hooks/use-gallery-keyboard";
import { useGalleryNavigation } from "@/modules/media/hooks/use-gallery-navigation";
import { useMediaErrors } from "@/modules/media/hooks/use-media-errors";
import { useEmblaSync } from "@/modules/media/hooks/use-embla-sync";
import { useVideoAutoplay } from "@/modules/media/hooks/use-video-autoplay";
import { usePreloadNextImage } from "@/modules/media/hooks/use-preload-next-image";
import useEmblaCarousel from "embla-carousel-react";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { GalleryThumbnail } from "@/modules/media/components/gallery-thumbnail";
import { markSwipeHintSeen } from "@/modules/media/actions/mark-swipe-hint-seen";
import ScrollFade from "@/shared/components/ui/scroll-fade";

interface GalleryProps {
	product: GetProductReturn;
	title: string;
	hasSeenSwipeHint?: boolean;
}

/**
 * Skeleton de chargement pour la galerie
 */
function GalleryLoadingSkeleton() {
	return (
		<div className="w-full">
			<div className="aspect-square sm:aspect-[4/5] rounded-3xl bg-muted animate-pulse" />
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
function GalleryContent({ product, title, hasSeenSwipeHint = false }: GalleryProps) {
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

	// Conversion des médias en slides pour la lightbox
	const lightboxSlides = buildLightboxSlides(safeImages, prefersReducedMotion);

	// Hook: Navigation avec URL sync (optimiste = instantané, pas de loading)
	const {
		optimisticIndex,
		navigateToIndex,
		navigateNext,
		navigatePrev,
	} = useGalleryNavigation({ totalImages: safeImages.length });

	// Hook: Embla Carousel pour le swipe fluide natif
	const emblaOptions = buildEmblaOptions(safeImages.length, prefersReducedMotion);
	const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions);

	// Sync bidirectionnelle Embla ↔ URL
	useEmblaSync(emblaApi, optimisticIndex, navigateToIndex);

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
	useVideoAutoplay(emblaContainerRef, optimisticIndex, prefersReducedMotion);

	// Preload de l'image suivante
	usePreloadNextImage(safeImages, optimisticIndex);

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
				<div className="relative aspect-square sm:aspect-[4/5] rounded-3xl bg-linear-card p-8 flex items-center justify-center overflow-hidden">
					<div className="absolute inset-0 bg-linear-organic opacity-10 animate-pulse rounded-3xl" />
					<div className="text-center space-y-3 z-10 relative">
						<span className="text-4xl animate-bounce">✨</span>
						<p className="text-sm font-medium text-primary">
							Photos en préparation
						</p>
						<p className="text-sm leading-normal text-muted-foreground">
							Un peu de patience !
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
					className="product-gallery w-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg transition-all duration-300 group-has-[[data-pending]]/product-details:blur-[1px] group-has-[[data-pending]]/product-details:scale-[0.99] group-has-[[data-pending]]/product-details:pointer-events-none"
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
						{safeImages.length > 1 && (
							<div className="hidden lg:block order-1">
								<ScrollFade
									axis="vertical"
									className="max-h-[min(520px,70vh)]"
									hideScrollbar={false}
								>
									<div className="flex flex-col gap-2 pr-1">
										{safeImages.map((media, index) => (
											<GalleryThumbnail
												key={media.id}
												media={media}
												index={index}
												isActive={index === optimisticIndex}
												hasError={hasError(media.id)}
												title={title}
												onClick={() => navigateToIndex(index)}
												onError={() => handleMediaError(media.id)}
												className="shrink-0 h-auto hover:shadow-sm"
												isLCPCandidate={index === 0}
											/>
										))}
									</div>
								</ScrollFade>
							</div>
						)}

						{/* Image principale avec Embla Carousel */}
						<div className="gallery-main relative group order-2 lg:order-2">
						<div
							className={cn(
								"relative aspect-square sm:aspect-[4/5] overflow-hidden rounded-2xl sm:rounded-3xl",
								"bg-linear-organic border-0 sm:border-2 sm:border-border",
								"shadow-md sm:shadow-lg hover:shadow-lg transition-all duration-300",
								"w-full md:max-w-none"
							)}
						>
							{/* Effet hover subtil */}
							<div className="absolute inset-0 ring-1 ring-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl sm:rounded-3xl z-10" />

							{/* Compteur d'images - Visible sur mobile et desktop */}
							{safeImages.length > 1 && (
								<div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
									<div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg">
										{optimisticIndex + 1} / {safeImages.length}
									</div>
								</div>
							)}

							{/* Bouton zoom (images uniquement) - Desktop uniquement */}
							{current.mediaType === "IMAGE" && (
								<button
									type="button"
									onClick={openLightbox}
									className="hidden sm:flex absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full text-sm font-medium shadow-lg items-center gap-1.5 hover:bg-black/80 active:scale-95 transition-all sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60"
									aria-label="Zoomer l'image en plein ecran"
								>
									<ZoomIn className="w-4 h-4" />
									<span>Zoomer</span>
								</button>
							)}

							{/* Dots indicator - Mobile uniquement, en bas centre */}
							{safeImages.length > 1 && (
								<div
									className="sm:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1.5 pointer-events-none"
									role="tablist"
									aria-label="Navigation galerie"
								>
									{safeImages.map((_, i) => (
										<button
											key={i}
											type="button"
											role="tab"
											onClick={(e) => {
												e.stopPropagation();
												navigateToIndex(i);
											}}
											aria-selected={i === optimisticIndex}
											aria-label={`Image ${i + 1} sur ${safeImages.length}`}
											className="size-11 flex items-center justify-center touch-manipulation pointer-events-auto"
										>
											<span
												className={cn(
													"rounded-full transition-all duration-300",
													i === optimisticIndex
														? "bg-white w-2.5 h-2.5 shadow-[0_0_6px_1px] shadow-white/50"
														: "bg-white/40 w-2 h-2 hover:bg-white/60"
												)}
											/>
										</button>
									))}
								</div>
							)}

							{/* Indicateur de swipe - Mobile uniquement, première visite seulement */}
							{/* 4.5s total = ~3s visible (15%-85% de l'animation) */}
							{safeImages.length > 1 && optimisticIndex === 0 && !prefersReducedMotion && !hasSeenSwipeHint && (
								<button
									type="button"
									className="sm:hidden absolute bottom-14 left-1/2 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full animate-[gallery-swipe-hint_4.5s_ease-in-out_forwards] pointer-events-none"
									aria-hidden="true"
									onClick={() => markSwipeHintSeen()}
									onAnimationEnd={() => markSwipeHintSeen()}
								>
									<Hand className="w-3.5 h-3.5 animate-[swipe-hand_0.8s_ease-in-out_infinite]" />
									<span>Glisser pour voir plus</span>
								</button>
							)}

							{/* Embla Carousel - Glissement fluide natif */}
							<div
								className="absolute inset-0 overflow-hidden touch-pan-x"
								ref={emblaRef}
							>
								<div className="flex h-full" ref={emblaContainerRef}>
									{safeImages.map((media, index) => (
										<div
											key={media.id}
											role="group"
											aria-roledescription="slide"
											tabIndex={index === optimisticIndex ? 0 : -1}
											data-slide-index={index}
											className="flex-[0_0_100%] h-full min-w-0 relative cursor-zoom-in"
											aria-hidden={index !== optimisticIndex}
											aria-label={`Zoomer ${media.alt || title}`}
											onClick={openLightbox}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													openLightbox();
												}
											}}
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
											// Visibilité : caché mobile, visible desktop au hover
											"hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100",
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
											// Visibilité : caché mobile, visible desktop au hover
											"hidden sm:flex sm:opacity-0 sm:group-hover:opacity-100",
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
