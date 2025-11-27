"use client";

import type { Slide } from "@/shared/components/lightbox";
import { OpenLightboxButton } from "@/shared/components/lightbox/open-lightbox-button";
import { Button } from "@/shared/components/ui/button";
import type { GetProductReturn } from "@/modules/products/types/product.types";
import { cn } from "@/shared/utils/cn";
import { getVideoMimeType } from "@/shared/utils/media-utils";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import { ViewTransition } from "react";
import { buildGallery } from "./build-gallery";
import { MediaErrorFallback } from "./media-error-fallback";
import { useGalleryKeyboard } from "./use-gallery-keyboard";
import { useGalleryNavigation } from "./use-gallery-navigation";
import { useGallerySwipe } from "./use-gallery-swipe";
import { useMediaErrors } from "./use-media-errors";

import type { ProductMedia } from "@/shared/types/product";
import { PRODUCT_TEXTS } from "@/shared/constants/product";

// Constantes pour l'optimisation des images
const IMAGE_SIZES = [16, 32, 48, 64, 96, 128, 256, 384] as const;
const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;
const MAX_IMAGE_SIZE = 3840;
const MAIN_IMAGE_QUALITY = 95;
const THUMBNAIL_IMAGE_QUALITY = 85;
const EAGER_LOAD_THUMBNAILS = 6;

interface ProductGalleryProps {
	product: GetProductReturn;
	title: string;
}

export function ProductGallery({ product, title }: ProductGalleryProps) {
	const galleryRef = useRef<HTMLDivElement>(null);
	const searchParams = useSearchParams();

	// Calcul dynamique des images selon les variants sélectionnés
	const images: ProductMedia[] = useMemo(() => {
		return buildGallery({
			product,
			selectedVariants: {
				colorSlug: searchParams.get("color") || undefined,
				materialSlug: searchParams.get("material") || undefined,
				size: searchParams.get("size") || undefined,
			},
		});
	}, [product, searchParams]);

	// Sécurité additionnelle: garantir que images n'est jamais undefined
	const safeImages = images || [];

	// Conversion des images en slides pour la lightbox
	// Filtrer uniquement les images (exclure les vidéos)
	// Génère les URLs Next.js optimisées pour le plugin Zoom
	const lightboxSlides: Slide[] = useMemo(() => {
		function nextImageUrl(src: string, size: number) {
			return `/_next/image?url=${encodeURIComponent(src)}&w=${size}&q=75`;
		}

		return safeImages
			.filter((img) => img.mediaType === "IMAGE")
			.map((img) => {
				return {
					src: nextImageUrl(img.url, MAX_IMAGE_SIZE),
					alt: img.alt,
					width: MAX_IMAGE_SIZE,
					height: MAX_IMAGE_SIZE,
					srcSet: [...IMAGE_SIZES, ...DEVICE_SIZES]
						.filter((size) => size <= MAX_IMAGE_SIZE)
						.map((size) => ({
							src: nextImageUrl(img.url, size),
							width: size,
							height: size,
						})),
				};
			});
	}, [safeImages]);

	// Hook: Navigation avec URL sync (optimiste = instantané, pas de loading)
	const {
		optimisticIndex,
		navigateToIndex,
		navigateNext,
		navigatePrev,
	} = useGalleryNavigation({ totalImages: safeImages.length });

	// Hook: Swipe mobile
	const { onTouchStart, onTouchMove, onTouchEnd } = useGallerySwipe({
		onSwipeLeft: navigateNext,
		onSwipeRight: navigatePrev,
	});

	// Hook: Navigation clavier
	useGalleryKeyboard({
		galleryRef,
		currentIndex: optimisticIndex,
		totalImages: safeImages.length,
		onNavigate: navigateToIndex,
	});

	// Hook: Gestion erreurs média
	const { handleMediaError, hasError } = useMediaErrors();

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

	return (
		<OpenLightboxButton slides={lightboxSlides} index={optimisticIndex}>
			{({ openLightbox }) => (
				<div
					className="product-gallery space-y-3 sm:space-y-4 w-full"
					ref={galleryRef}
					role="region"
					aria-label={`Galerie d'images pour ${title}`}
					aria-describedby="gallery-instructions"
					tabIndex={0}
				>
					{/* Annonce dynamique pour lecteurs d'écran */}
					<div className="sr-only" aria-live="polite" aria-atomic="true">
						Image {optimisticIndex + 1} sur {safeImages.length}
						{current.alt ? ` : ${current.alt}` : ""}
					</div>

					{/* Image principale */}
					<div className="gallery-main relative group">
						<div
							className={cn(
								"relative aspect-square overflow-hidden rounded-2xl sm:rounded-3xl",
								"bg-linear-organic border border-border sm:border-2",
								"shadow-md sm:shadow-lg hover:shadow-lg transition-all duration-300",
								"w-full max-w-[min(90vw,24rem)] sm:max-w-sm md:max-w-none mx-auto",
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

							{/* Média (Video ou Image) */}
							{current.mediaType === "VIDEO" ? (
								<div className="relative w-full h-full">
									{hasError(current.id) ? (
										<MediaErrorFallback type="video" />
									) : (
										<>
											<video
												className="w-full h-full object-cover"
												controls
												loop
												muted
												playsInline
												preload="metadata"
												aria-label={
													current.alt ||
													`${title} - Vidéo ${optimisticIndex + 1}`
												}
												onError={() => handleMediaError(current.id)}
											>
												<source
													src={current.url}
													type={getVideoMimeType(current.url)}
												/>
												Votre navigateur ne supporte pas la lecture de vidéos.
											</video>
											<div className="absolute top-4 right-4 pointer-events-none z-10">
												<div className="bg-blue-600 text-white text-sm font-bold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2">
													<svg
														className="w-4 h-4"
														fill="currentColor"
														viewBox="0 0 16 16"
													>
														<path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2zm13 2.383-4.708 2.825L15 11.105V5.383zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741zM1 11.105l4.708-2.897L1 5.383v5.722z" />
													</svg>
													<span>VIDEO</span>
												</div>
											</div>
										</>
									)}
								</div>
							) : hasError(current.id) ? (
								<MediaErrorFallback type="image" />
							) : optimisticIndex === 0 ? (
								<ViewTransition name={`product-image-${product.slug}`}>
									<Image
										src={current.url}
										alt={current.alt || PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, optimisticIndex + 1)}
										fill
										className="object-cover"
										priority={optimisticIndex <= 1}
										quality={MAIN_IMAGE_QUALITY}
										sizes="(max-width: 768px) 100vw, 60vw"
										onError={() => handleMediaError(current.id)}
									/>
								</ViewTransition>
							) : (
								<Image
									src={current.url}
									alt={current.alt || PRODUCT_TEXTS.IMAGES.GALLERY_MAIN_ALT(title, optimisticIndex + 1)}
									fill
									className="object-cover"
									priority={optimisticIndex <= 1}
									quality={MAIN_IMAGE_QUALITY}
									sizes="(max-width: 768px) 100vw, 60vw"
									onError={() => handleMediaError(current.id)}
								/>
							)}

							{/* Contrôles de navigation */}
							{safeImages.length > 1 && (
								<>
									<Button
										variant="secondary"
										size="sm"
										className={cn(
											"absolute left-1 sm:left-4 top-1/2 -translate-y-1/2 z-10",
											"opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
											"transition-all duration-300",
											"w-11 h-11 sm:w-10 sm:h-10 p-0",
											"hover:scale-105 active:scale-95"
										)}
										onClick={(e) => {
											e.stopPropagation();
											navigatePrev();
										}}
										aria-label="Image précédente"
									>
										<ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
									</Button>

									<Button
										variant="secondary"
										size="sm"
										className={cn(
											"absolute right-1 sm:right-4 top-1/2 -translate-y-1/2 z-10",
											"opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
											"transition-all duration-300",
											"w-11 h-11 sm:w-10 sm:h-10 p-0",
											"hover:scale-105 active:scale-95"
										)}
										onClick={(e) => {
											e.stopPropagation();
											navigateNext();
										}}
										aria-label="Image suivante"
									>
										<ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
									</Button>
								</>
							)}
						</div>
					</div>

					{/* Grille de miniatures */}
					{safeImages.length > 1 && (
						<div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
							<div className="gallery-thumbnails w-full">
								<div className="grid grid-cols-4 xs:grid-cols-5 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
									{safeImages.map((image, index) => {
										const isActive = index === optimisticIndex;
										const imageHasError = hasError(image.id);

										return (
											<button
												key={image.id}
												onClick={() => navigateToIndex(index)}
												className={cn(
													"group relative aspect-square overflow-hidden rounded-xl",
													"w-full h-auto",
													"border border-border sm:border-2 transition-all duration-200",
													isActive
														? "border-primary shadow-sm sm:shadow-md"
														: "hover:border-primary/50"
												)}
												aria-label={`Voir photo ${index + 1}${
													isActive ? " (sélectionnée)" : ""
												}`}
												aria-current={isActive}
											>
												{/* Image miniature */}
												<div className="relative w-full h-full overflow-hidden rounded-xl">
													{imageHasError ? (
														<MediaErrorFallback type="image" size="small" />
													) : image.mediaType === "VIDEO" ? (
														<div className="relative w-full h-full bg-linear-organic">
															<video
																className="w-full h-full object-cover"
																muted
																playsInline
																preload="none"
																aria-label={
																	image.alt ||
																	`${title} - Miniature vidéo ${index + 1}`
																}
																onError={() => handleMediaError(image.id)}
															>
																<source
																	src={image.url}
																	type={getVideoMimeType(image.url)}
																/>
																Votre navigateur ne supporte pas la lecture de
																vidéos.
															</video>
															<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
																<div className="bg-blue-600 rounded-full p-1.5 sm:p-2 shadow-lg">
																	<svg
																		className="w-3 h-3 sm:w-4 sm:h-4 text-white"
																		fill="currentColor"
																		viewBox="0 0 16 16"
																	>
																		<path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" />
																	</svg>
																</div>
															</div>
														</div>
													) : (
														<Image
															src={image.url}
															alt={
																image.alt || PRODUCT_TEXTS.IMAGES.GALLERY_THUMBNAIL_ALT(title, index + 1)
															}
															fill
															className="object-cover"
															sizes="(max-width: 480px) 33vw, (max-width: 640px) 25vw, (max-width: 768px) 20vw, 16vw"
															quality={THUMBNAIL_IMAGE_QUALITY}
															loading={index < EAGER_LOAD_THUMBNAILS ? "eager" : "lazy"}
															onError={() => handleMediaError(image.id)}
														/>
													)}
												</div>

												{/* Overlay sélection */}
												{isActive && (
													<div className="absolute inset-0 bg-primary/10 rounded-xl" />
												)}

												{/* Indicateur de position active */}
												{isActive && (
													<div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full shadow-sm" />
												)}
											</button>
										);
									})}
								</div>
							</div>
						</div>
					)}

					{/* Instructions pour la navigation clavier (masquées visuellement) */}
					{safeImages.length > 1 && (
						<div id="gallery-instructions" className="sr-only">
							Utilisez les flèches gauche et droite pour naviguer entre les
							images. Appuyez sur Début pour aller à la première image ou Fin
							pour la dernière.
						</div>
					)}
				</div>
			)}
		</OpenLightboxButton>
	);
}
