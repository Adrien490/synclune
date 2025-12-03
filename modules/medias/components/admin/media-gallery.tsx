"use client";

import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Expand, Loader2, MoreVertical, Play, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { GalleryErrorBoundary } from "@/modules/medias/components/gallery-error-boundary";
import ProductLightbox from "@/modules/medias/components/product-lightbox";
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "./delete-gallery-media-alert-dialog";
import type { Slide } from "yet-another-react-lightbox";

export interface GalleryMedia {
	url: string;
	altText?: string;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl?: string | null;
}

interface MediaGalleryProps {
	images: GalleryMedia[];
	onRemove: (index: number) => void;
	/**
	 * Si true, ne supprime pas via UTAPI immédiatement.
	 * Utilisé pour le mode édition où la suppression est différée.
	 */
	skipUtapiDelete?: boolean;
	/** URLs des vidéos dont la miniature est en cours de génération */
	generatingThumbnails?: Set<string>;
}

export function MediaGallery({
	images,
	onRemove,
	skipUtapiDelete,
	generatingThumbnails,
}: MediaGalleryProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const shouldReduceMotion = useReducedMotion();

	// État de chargement des images
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// État du lightbox
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// Préparer les slides pour le lightbox
	const slides: Slide[] = useMemo(
		() =>
			images.map((media) => {
				if (media.mediaType === "VIDEO") {
					return {
						type: "video" as const,
						sources: [{ src: media.url, type: "video/mp4" }],
						poster: media.thumbnailUrl || undefined,
					};
				}
				return {
					src: media.url,
					alt: media.altText || "Image du produit",
				};
			}),
		[images]
	);

	// Marquer une image comme chargée
	const handleImageLoaded = useCallback((url: string) => {
		setLoadedImages((prev) => new Set(prev).add(url));
	}, []);

	// Ouvrir le lightbox
	const openLightbox = useCallback((index: number) => {
		setLightboxIndex(index);
		setLightboxOpen(true);
	}, []);

	return (
		<>
			<div
				className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full"
				role="list"
				aria-label="Galerie de médias du produit"
			>
			<AnimatePresence mode="popLayout">
				{images.map((media, index) => {
					const isVideo = media.mediaType === "VIDEO";
					const isGeneratingThumbnail =
						isVideo && generatingThumbnails?.has(media.url);
					const isImageLoaded = loadedImages.has(media.url);
					const isPrimary = index === 0;

					const handleOpenDeleteDialog = () => {
						deleteDialog.open({
							index,
							url: media.url,
							skipUtapiDelete,
							onRemove: () => onRemove(index),
						});
					};

					return (
						<motion.div
							key={media.url}
							initial={
								shouldReduceMotion
									? { opacity: 1 }
									: { opacity: 0, scale: 0.8 }
							}
							animate={{ opacity: 1, scale: 1 }}
							exit={
								shouldReduceMotion
									? { opacity: 0 }
									: { opacity: 0, scale: 0.8 }
							}
							transition={
								shouldReduceMotion
									? { duration: 0 }
									: { delay: index * 0.05 }
							}
							tabIndex={0}
							onKeyDown={(e) => {
								if (e.key === "Delete" || e.key === "Backspace") {
									e.preventDefault();
									handleOpenDeleteDialog();
								}
							}}
							role="listitem"
							aria-label={`${isVideo ? "Vidéo" : "Image"} ${index + 1}${isPrimary ? " (principale)" : ""}`}
							className={cn(
								"group relative aspect-square rounded-lg overflow-hidden border-2 shrink-0",
								"motion-safe:transition-all motion-safe:duration-200",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
								"motion-safe:hover:scale-[1.02]",
								"border-border hover:border-primary/50",
								isPrimary && "ring-2 ring-amber-500/50 border-amber-500/50"
							)}
						>
							{/* Skeleton/Loading state */}
							{!isImageLoaded && !isVideo && (
								<div className="absolute inset-0 bg-muted motion-safe:animate-pulse z-10" />
							)}

							<div className="relative w-full h-full bg-muted">
								{isVideo ? (
									<div className="relative w-full h-full">
										{media.thumbnailUrl ? (
											<Image
												src={media.thumbnailUrl}
												alt={media.altText || `Miniature vidéo ${index + 1}`}
												fill
												className="object-cover"
												sizes="25vw"
												quality={80}
												loading="lazy"
												decoding="async"
												onLoad={() => handleImageLoaded(media.url)}
											/>
										) : (
											<video
												src={media.url}
												className="w-full h-full object-cover"
												loop
												muted
												playsInline
												preload="none"
												onMouseEnter={(e) => {
													if (e.currentTarget.readyState === 0) {
														e.currentTarget.load();
													}
													void e.currentTarget.play();
												}}
												onMouseLeave={(e) => {
													e.currentTarget.pause();
													e.currentTarget.currentTime = 0;
												}}
												aria-label={media.altText || `Aperçu vidéo ${index + 1}`}
											>
												Votre navigateur ne supporte pas la lecture de vidéos.
											</video>
										)}
										<div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 motion-safe:transition-opacity">
											<div className="bg-black/70 rounded-full p-3 shadow-xl">
												<Play className="w-6 h-6 text-white" fill="white" />
											</div>
										</div>
										{isGeneratingThumbnail && (
											<div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
												<Loader2 className="h-8 w-8 text-white motion-safe:animate-spin" />
											</div>
										)}
									</div>
								) : (
									<Image
										src={media.url}
										alt={media.altText || `Galerie ${index + 1}`}
										fill
										className={cn(
											"object-cover motion-safe:transition-opacity",
											isImageLoaded ? "opacity-100" : "opacity-0"
										)}
										sizes="25vw"
										quality={80}
										loading={index > 0 ? "lazy" : undefined}
										decoding="async"
										onLoad={() => handleImageLoaded(media.url)}
									/>
								)}
							</div>

							{/* Actions Desktop - Overlay au hover */}
							<div
								className={cn(
									"absolute inset-0 bg-black/60 items-center justify-center gap-2",
									"motion-safe:transition-opacity",
									"hidden sm:flex",
									"opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
								)}
							>
								<Button
									type="button"
									variant="secondary"
									size="icon"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										openLightbox(index);
									}}
									className="h-9 w-9 rounded-full"
									aria-label={`Agrandir le média ${index + 1}`}
								>
									<Expand className="h-4 w-4" />
								</Button>
								<Button
									type="button"
									variant="destructive"
									size="icon"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										handleOpenDeleteDialog();
									}}
									className="h-9 w-9 rounded-full"
									aria-label={`Supprimer le média ${index + 1}`}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>

							{/* Actions Mobile - DropdownMenu */}
							<div className="absolute top-1 right-1 z-20 sm:hidden">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="secondary"
											size="icon"
											className="h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 border-0"
											aria-label={`Actions pour le média ${index + 1}`}
										>
											<MoreVertical className="h-4 w-4 text-white" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="min-w-[160px]">
										<DropdownMenuItem
											onClick={() => openLightbox(index)}
											className="gap-2 py-2.5"
										>
											<Expand className="h-4 w-4" />
											Agrandir
										</DropdownMenuItem>
										<DropdownMenuSeparator />
										<DropdownMenuItem
											variant="destructive"
											onClick={handleOpenDeleteDialog}
											className="gap-2 py-2.5"
										>
											<Trash2 className="h-4 w-4" />
											Supprimer
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>

							{/* Badge principal */}
							{isPrimary && (
								<div className="absolute top-1 left-1 z-10 pointer-events-none sm:top-2 sm:left-2">
									<div className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
										<Star className="w-3 h-3" />
										<span className="hidden sm:inline">Principal</span>
									</div>
								</div>
							)}
						</motion.div>
					);
				})}
			</AnimatePresence>
			</div>

			{/* Ligxhtbox */}
			<ProductLightbox
				open={lightboxOpen}
				close={() => setLightboxOpen(false)}
				slides={slides}
				index={lightboxIndex}
				onIndexChange={setLightboxIndex}
			/>
		</>
	);
}

// Export pour rétrocompatibilité (à supprimer après migration complète)
export { MediaGallery as ImageGallery };
export type { GalleryMedia as GalleryImage };

// Wrapper avec ErrorBoundary pour une utilisation simplifiée
export function MediaGalleryWithErrorBoundary(props: MediaGalleryProps) {
	return (
		<GalleryErrorBoundary>
			<MediaGallery {...props} />
		</GalleryErrorBoundary>
	);
}
