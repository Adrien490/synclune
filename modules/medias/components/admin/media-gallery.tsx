"use client";

import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	Expand,
	Loader2,
	MoreVertical,
	Play,
	Star,
	Trash2,
	X,
} from "lucide-react";
import Image from "next/image";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { GalleryErrorBoundary } from "@/modules/medias/components/gallery-error-boundary";
import { MediaTypeBadge } from "@/modules/medias/components/media-type-badge";
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
	 * Callback pour supprimer plusieurs médias à la fois
	 */
	onRemoveMultiple?: (indices: number[]) => void;
	/**
	 * Si true, ne supprime pas via UTAPI immédiatement.
	 * Utilisé pour le mode édition où la suppression est différée.
	 */
	skipUtapiDelete?: boolean;
	/** URLs des vidéos dont la miniature est en cours de génération */
	generatingThumbnails?: Set<string>;
	/**
	 * Active le mode sélection multiple
	 * @default false
	 */
	enableSelection?: boolean;
}

/** Extrait le format depuis l'URL */
function getMediaFormat(url: string): string {
	const extension = url.split(".").pop()?.split("?")[0]?.toUpperCase();
	return extension || "INCONNU";
}

/** Formate la taille de fichier de manière lisible */
function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} o`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function MediaGallery({
	images,
	onRemove,
	onRemoveMultiple,
	skipUtapiDelete,
	generatingThumbnails,
	enableSelection = false,
}: MediaGalleryProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const shouldReduceMotion = useReducedMotion();
	const containerRef = useRef<HTMLDivElement>(null);

	// État du lightbox
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// État de sélection multiple
	const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
		new Set()
	);
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);

	// État de chargement des images
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

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

	// Sélection toggle
	const toggleSelection = useCallback((index: number) => {
		setSelectedIndices((prev) => {
			const next = new Set(prev);
			if (next.has(index)) {
				next.delete(index);
			} else {
				next.add(index);
			}
			return next;
		});
	}, []);

	// Tout sélectionner / désélectionner
	const selectAll = useCallback(() => {
		if (selectedIndices.size === images.length) {
			setSelectedIndices(new Set());
		} else {
			setSelectedIndices(new Set(images.map((_, i) => i)));
		}
	}, [selectedIndices.size, images.length]);

	// Effacer la sélection
	const clearSelection = useCallback(() => {
		setSelectedIndices(new Set());
	}, []);

	// Supprimer les éléments sélectionnés
	const deleteSelected = useCallback(() => {
		if (selectedIndices.size === 0) return;
		const indices = Array.from(selectedIndices).sort((a, b) => b - a);
		if (onRemoveMultiple) {
			onRemoveMultiple(indices);
		} else {
			// Supprimer du plus grand au plus petit pour préserver les index
			for (const index of indices) {
				onRemove(index);
			}
		}
		setSelectedIndices(new Set());
	}, [selectedIndices, onRemove, onRemoveMultiple]);

	// Raccourcis clavier globaux
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			// Ne pas interférer si un input/textarea est focus
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA"
			) {
				return;
			}

			const itemCount = images.length;
			if (itemCount === 0) return;

			switch (e.key) {
				case "ArrowRight":
					e.preventDefault();
					setFocusedIndex((prev) =>
						prev < itemCount - 1 ? prev + 1 : 0
					);
					break;
				case "ArrowLeft":
					e.preventDefault();
					setFocusedIndex((prev) =>
						prev > 0 ? prev - 1 : itemCount - 1
					);
					break;
				case "ArrowDown":
					e.preventDefault();
					// Sauter une rangée (approx 3-4 éléments selon la grille)
					setFocusedIndex((prev) =>
						Math.min(prev + 3, itemCount - 1)
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setFocusedIndex((prev) => Math.max(prev - 3, 0));
					break;
				case "Enter":
					if (focusedIndex >= 0) {
						e.preventDefault();
						setLightboxIndex(focusedIndex);
						setLightboxOpen(true);
					}
					break;
				case "a":
					if ((e.ctrlKey || e.metaKey) && enableSelection) {
						e.preventDefault();
						selectAll();
					}
					break;
				case " ":
					if (enableSelection && focusedIndex >= 0) {
						e.preventDefault();
						toggleSelection(focusedIndex);
					}
					break;
				case "Escape":
					if (selectedIndices.size > 0) {
						e.preventDefault();
						clearSelection();
					}
					break;
			}
		};

		container.addEventListener("keydown", handleKeyDown);
		return () => container.removeEventListener("keydown", handleKeyDown);
	}, [
		images.length,
		focusedIndex,
		enableSelection,
		selectedIndices.size,
		selectAll,
		toggleSelection,
		clearSelection,
	]);

	// Focus l'élément quand focusedIndex change
	useEffect(() => {
		if (focusedIndex >= 0) {
			const items = containerRef.current?.querySelectorAll(
				'[role="listitem"]'
			);
			const item = items?.[focusedIndex] as HTMLElement | undefined;
			item?.focus();
		}
	}, [focusedIndex]);

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
			{/* Barre d'actions de sélection */}
			<AnimatePresence mode="wait">
				{enableSelection && selectedIndices.size > 0 && (
					<motion.div
						role="toolbar"
						aria-label="Actions sur la sélection"
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: "auto" }}
						exit={{ opacity: 0, height: 0 }}
						transition={{
							duration: shouldReduceMotion ? 0 : 0.2,
							ease: "easeOut",
						}}
						className="overflow-hidden mb-4"
					>
						<div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-primary/20 bg-primary/5">
							<div className="flex items-center gap-2">
								<div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
									<motion.span
										key={selectedIndices.size}
										initial={
											shouldReduceMotion
												? false
												: { scale: 0.8, opacity: 0 }
										}
										animate={{ scale: 1, opacity: 1 }}
										transition={{ duration: 0.15 }}
									>
										{selectedIndices.size}
									</motion.span>
								</div>
								<p
									className="text-sm font-medium"
									aria-live="polite"
									aria-atomic="true"
								>
									{selectedIndices.size > 1
										? "sélectionnés"
										: "sélectionné"}
								</p>
							</div>

							<div
								className="h-4 w-px bg-border/50 hidden sm:block"
								aria-hidden="true"
							/>

							<div className="flex-1" />

							<div className="flex items-center gap-1.5">
								<Button
									type="button"
									variant="destructive"
									size="sm"
									onClick={deleteSelected}
									className="h-8 px-3"
								>
									<Trash2 className="h-4 w-4 mr-1.5" />
									Supprimer
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={clearSelection}
									className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10"
									aria-label="Effacer la sélection"
								>
									<X className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Grille de médias */}
			<div
				ref={containerRef}
				className="grid grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full"
				role="list"
				aria-label="Galerie de médias du produit"
				tabIndex={-1}
			>
				<AnimatePresence mode="popLayout">
					{images.map((media, index) => {
						const isVideo = media.mediaType === "VIDEO";
						const isGeneratingThumbnail =
							isVideo && generatingThumbnails?.has(media.url);
						const isSelected = selectedIndices.has(index);
						const isImageLoaded = loadedImages.has(media.url);
						const isPrimary = index === 0;
						const format = getMediaFormat(media.url);

						const handleOpenDeleteDialog = () => {
							deleteDialog.open({
								index,
								url: media.url,
								skipUtapiDelete,
								onRemove: () => onRemove(index),
							});
						};

						return (
							<Tooltip key={media.url}>
								<TooltipTrigger asChild>
									<motion.div
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
										onFocus={() => setFocusedIndex(index)}
										onKeyDown={(e) => {
											if (
												e.key === "Delete" ||
												e.key === "Backspace"
											) {
												e.preventDefault();
												if (
													enableSelection &&
													selectedIndices.size > 0
												) {
													deleteSelected();
												} else {
													handleOpenDeleteDialog();
												}
											}
										}}
										role="listitem"
										aria-label={`${isVideo ? "Vidéo" : "Image"} ${index + 1}${isPrimary ? " (principale)" : ""}${isSelected ? " - sélectionné" : ""}`}
										aria-selected={
											enableSelection
												? isSelected
												: undefined
										}
										className={cn(
											"group relative aspect-square rounded-lg overflow-hidden border-2 shrink-0",
											"motion-safe:transition-all motion-safe:duration-200",
											"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
											"motion-safe:hover:scale-[1.02]",
											isSelected
												? "border-primary ring-2 ring-primary/30"
												: "border-border hover:border-primary/50",
											isPrimary &&
												"ring-2 ring-amber-500/50 border-amber-500/50"
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
															src={
																media.thumbnailUrl
															}
															alt={
																media.altText ||
																`Miniature vidéo ${index + 1}`
															}
															fill
															className="object-cover"
															sizes="25vw"
															quality={80}
															loading="lazy"
															decoding="async"
															onLoad={() =>
																handleImageLoaded(
																	media.url
																)
															}
														/>
													) : (
														<video
															src={media.url}
															className="w-full h-full object-cover"
															loop
															muted
															playsInline
															preload="none"
															onMouseEnter={(
																e
															) => {
																if (
																	e
																		.currentTarget
																		.readyState ===
																	0
																) {
																	e.currentTarget.load();
																}
																void e.currentTarget.play();
															}}
															onMouseLeave={(
																e
															) => {
																e.currentTarget.pause();
																e.currentTarget.currentTime = 0;
															}}
															aria-label={
																media.altText ||
																`Aperçu vidéo ${index + 1}`
															}
														>
															Votre navigateur ne
															supporte pas la
															lecture de vidéos.
														</video>
													)}
													<div className="absolute top-10 right-1 z-10 sm:top-2 sm:right-2">
														<MediaTypeBadge
															type="VIDEO"
															size="sm"
														/>
													</div>
													<div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0 motion-safe:transition-opacity">
														<div className="bg-black/70 rounded-full p-3 shadow-xl">
															<Play
																className="w-6 h-6 text-white"
																fill="white"
															/>
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
													alt={
														media.altText ||
														`Galerie ${index + 1}`
													}
													fill
													className={cn(
														"object-cover motion-safe:transition-opacity",
														isImageLoaded
															? "opacity-100"
															: "opacity-0"
													)}
													sizes="25vw"
													quality={80}
													loading={
														index > 0
															? "lazy"
															: undefined
													}
													decoding="async"
													onLoad={() =>
														handleImageLoaded(
															media.url
														)
													}
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

										{/* Checkbox de sélection */}
										{enableSelection && (
											<div className="absolute top-1 left-1 z-20">
												<Checkbox
													checked={isSelected}
													onCheckedChange={() =>
														toggleSelection(index)
													}
													aria-label={`Sélectionner le média ${index + 1}`}
													className="h-5 w-5 border-2 border-white bg-black/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
												/>
											</div>
										)}

										{/* Badge principal */}
										{isPrimary && !enableSelection && (
											<div className="absolute top-1 left-1 z-10 pointer-events-none sm:top-2 sm:left-2">
												<div className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
													<Star className="w-3 h-3" />
													<span className="hidden sm:inline">Principal</span>
												</div>
											</div>
										)}

										{/* Badge numéro */}
										<div className="absolute bottom-1 left-1 pointer-events-none">
											<div className="bg-background/90 text-foreground text-[10px] font-medium px-1.5 py-0.5 rounded">
												#{index + 1}
											</div>
										</div>
									</motion.div>
								</TooltipTrigger>
								<TooltipContent side="bottom" className="max-w-xs">
									<div className="space-y-1 text-xs">
										<p className="font-medium">
											{isVideo ? "Vidéo" : "Image"} #{index + 1}
											{isPrimary && " (principale)"}
										</p>
										<p className="text-muted-foreground">
											Format: {format}
										</p>
										{media.altText && (
											<p className="text-muted-foreground truncate">
												Alt: {media.altText}
											</p>
										)}
									</div>
								</TooltipContent>
							</Tooltip>
						);
					})}
				</AnimatePresence>
			</div>

			{/* Lightbox */}
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
