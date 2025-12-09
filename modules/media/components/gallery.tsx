"use client";

import type { Slide } from "yet-another-react-lightbox";
import { OpenLightboxButton } from "@/modules/media/components/open-lightbox-button";
import { Button } from "@/shared/components/ui/button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { cn } from "@/shared/utils/cn";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useState, useEffect } from "react";
import { buildGallery } from "@/modules/media/utils/build-gallery";
import { GalleryErrorBoundary } from "@/modules/media/components/gallery-error-boundary";
import { GalleryMediaRenderer } from "@/modules/media/components/gallery-media-renderer";
import { useGalleryKeyboard } from "@/modules/media/hooks/use-gallery-keyboard";
import { useGalleryNavigation } from "@/modules/media/hooks/use-gallery-navigation";
import { useGallerySwipe } from "@/modules/media/hooks/use-gallery-swipe";
import { useMediaErrors } from "@/modules/media/hooks/use-media-errors";
import {
	MAX_IMAGE_SIZE,
	nextImageUrl,
	IMAGE_SIZES,
	DEVICE_SIZES,
} from "@/modules/media/constants/image-config.constants";

import type { ProductMedia } from "@/modules/media/types/product-media.types";
import { GalleryThumbnailsGrid, GalleryThumbnailsCarousel } from "@/modules/media/components/gallery-thumbnails";
import { MOTION_CONFIG } from "@/shared/components/animations/motion.config";

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
			src: nextImageUrl(media.url, MAX_IMAGE_SIZE),
			alt: media.alt,
			width: MAX_IMAGE_SIZE,
			height: MAX_IMAGE_SIZE,
			srcSet: [...IMAGE_SIZES, ...DEVICE_SIZES]
				.filter((size) => size <= MAX_IMAGE_SIZE)
				.map((size) => ({
					src: nextImageUrl(media.url, size),
					width: size,
					height: size,
				})),
		};
	});

	// Hook: Navigation avec URL sync (optimiste = instantané, pas de loading)
	const {
		optimisticIndex,
		navigateToIndex,
		navigateNext,
		navigatePrev,
	} = useGalleryNavigation({ totalImages: safeImages.length });

	// Hook: Swipe mobile avec feedback visuel
	const { onTouchStart, onTouchMove, onTouchEnd, swipeOffset, isSwiping } = useGallerySwipe({
		onSwipeLeft: navigateNext,
		onSwipeRight: navigatePrev,
		totalImages: safeImages.length,
		currentIndex: optimisticIndex,
	});

	// Hook: Navigation clavier
	useGalleryKeyboard({
		galleryRef,
		currentIndex: optimisticIndex,
		totalImages: safeImages.length,
		onNavigate: navigateToIndex,
	});

	// Hook: Gestion erreurs média avec retry
	const { handleMediaError, hasError, retryMedia } = useMediaErrors();

	// Swipe hint pour mobile - affiché une seule fois
	const [showSwipeHint, setShowSwipeHint] = useState(false);

	useEffect(() => {
		// Ne montrer que sur mobile, avec plusieurs images, et si pas déjà vu
		if (safeImages.length <= 1 || prefersReducedMotion) return;

		const hasSeenHint = localStorage.getItem("gallery-swipe-hint-seen");
		if (!hasSeenHint) {
			// Vérifier si on est sur mobile
			const isMobile = window.matchMedia("(max-width: 1023px)").matches;
			if (isMobile) {
				setShowSwipeHint(true);
				// Masquer après 3 secondes et marquer comme vu
				const timer = setTimeout(() => {
					setShowSwipeHint(false);
					localStorage.setItem("gallery-swipe-hint-seen", "true");
				}, 3000);
				return () => clearTimeout(timer);
			}
		}
	}, [safeImages.length, prefersReducedMotion]);

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
						{safeImages.length > 1 && (
							<div className="hidden lg:flex flex-col gap-2 order-1 max-h-[min(500px,60vh)] overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent pr-1">
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
						)}

						{/* Image principale */}
						<div className="gallery-main relative group order-2 lg:order-2">
						<div
							className={cn(
								"relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl",
								"bg-linear-organic border border-border sm:border-2",
								"shadow-md sm:shadow-lg hover:shadow-lg transition-all duration-300",
								"w-full md:max-w-none",
								current.mediaType === "IMAGE" && "cursor-zoom-in"
							)}
							{...(current.mediaType === "IMAGE" && {
								role: "button",
								tabIndex: 0,
								"aria-label": `Agrandir l'image ${optimisticIndex + 1} : ${current.alt || title}`,
								onClick: () => openLightbox(),
								onKeyDown: (e: React.KeyboardEvent) => {
									if (e.key === "Enter" || e.key === " ") {
										e.preventDefault();
										openLightbox();
									}
								},
							})}
							onTouchStart={onTouchStart}
							onTouchMove={onTouchMove}
							onTouchEnd={onTouchEnd}
						>
							{/* Effet hover subtil */}
							<div className="absolute inset-0 ring-1 ring-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl sm:rounded-3xl" />

							{/* Compteur d'images */}
							{safeImages.length > 1 && (
								<div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20">
									<div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg">
										{optimisticIndex + 1} / {safeImages.length}
									</div>
								</div>
							)}

							{/* Swipe hint - mobile uniquement, affiché une fois */}
							{showSwipeHint && (
								<div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 lg:hidden animate-bounce">
									<div className="bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-2">
										<span className="animate-[swipe-hint_1.5s_ease-in-out_infinite]">👆</span>
										<span>Glisse pour voir plus</span>
									</div>
								</div>
							)}

							{/* Badge zoom (images uniquement) */}
							{current.mediaType === "IMAGE" && (
								<div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
									<div className="bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium shadow-lg flex items-center gap-1.5">
										<ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
										<span className="hidden sm:inline">
											Cliquer pour zoomer
										</span>
									</div>
								</div>
							)}

							{/* Média (Video ou Image) avec transitions fluides et feedback swipe */}
							<AnimatePresence mode="wait">
								<motion.div
									key={current.id}
									initial={prefersReducedMotion ? false : { opacity: 0, scale: MOTION_CONFIG.transform.scaleFrom }}
									animate={{
										opacity: 1,
										scale: 1,
										x: swipeOffset,
									}}
									exit={prefersReducedMotion ? undefined : { opacity: 0, scale: 1.02 }}
									transition={{
										duration: prefersReducedMotion ? 0 : (isSwiping ? 0 : MOTION_CONFIG.duration.collapse),
										ease: MOTION_CONFIG.easing.easeOut,
										x: { duration: prefersReducedMotion ? 0 : (isSwiping ? 0 : MOTION_CONFIG.duration.collapse), ease: MOTION_CONFIG.easing.easeOut }
									}}
									className="absolute inset-0"
									style={{ willChange: isSwiping ? "transform" : "auto" }}
								>
									<GalleryMediaRenderer
										media={current}
										title={title}
										index={optimisticIndex}
										isFirst={optimisticIndex === 0}
										hasError={hasError(current.id)}
										onError={() => handleMediaError(current.id)}
										onRetry={() => retryMedia(current.id)}
									/>
								</motion.div>
							</AnimatePresence>

							{/* Contrôles de navigation - Touch targets 48px sur mobile (WCAG 2.5.5) */}
							{safeImages.length > 1 && (
								<>
									<Button
										variant="secondary"
										size="sm"
										className={cn(
											"absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-10",
											"opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
											"transition-all duration-300",
											"w-12 h-12 sm:w-10 sm:h-10 p-0", // 48px sur mobile
											"hover:scale-105 active:scale-95",
											"shadow-md backdrop-blur-sm" // Meilleure visibilité
										)}
										onClick={handlePrev}
										aria-label="Image précédente"
									>
										<ChevronLeft className="w-5 h-5" />
									</Button>

									<Button
										variant="secondary"
										size="sm"
										className={cn(
											"absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-10",
											"opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
											"transition-all duration-300",
											"w-12 h-12 sm:w-10 sm:h-10 p-0", // 48px sur mobile
											"hover:scale-105 active:scale-95",
											"shadow-md backdrop-blur-sm" // Meilleure visibilité
										)}
										onClick={handleNext}
										aria-label="Image suivante"
									>
										<ChevronRight className="w-5 h-5" />
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
							<div className="flex justify-center gap-1.5 mt-3" role="group" aria-label="Navigation galerie">
								{safeImages.map((_, i) => (
									<button
										key={i}
										type="button"
										onClick={() => navigateToIndex(i)}
										aria-current={i === optimisticIndex ? "true" : undefined}
										aria-label={`Aller à l'image ${i + 1} sur ${safeImages.length}`}
										className={cn(
											"h-2 rounded-full transition-all duration-200",
											i === optimisticIndex
												? "bg-primary w-4"
												: "bg-muted-foreground/30 w-2 hover:bg-muted-foreground/50"
										)}
									/>
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
