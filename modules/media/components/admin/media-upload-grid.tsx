"use client";

import {
	DndContext,
	DragOverlay,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
	type DragStartEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/shared/components/ui/button";
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
import { useReducedMotion } from "framer-motion";
import { Check, Expand, GripVertical, MoreVertical, Play, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { toast } from "sonner";
import { GalleryErrorBoundary } from "@/modules/media/components/gallery-error-boundary";
import MediaLightbox from "@/modules/media/components/media-lightbox";
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "./delete-gallery-media-alert-dialog";
import type { Slide } from "yet-another-react-lightbox";

export interface MediaItem {
	url: string;
	altText: string | undefined;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl: string | undefined;
	thumbnailSmallUrl: string | undefined;
	blurDataUrl: string | undefined;
}

interface MediaUploadGridProps {
	/** Liste des médias */
	media: MediaItem[];
	/** Callback appelé quand la liste change (réordonnement ou suppression) */
	onChange: (media: MediaItem[]) => void;
	/** Si true, ne supprime pas via UTAPI immédiatement (mode édition) */
	skipUtapiDelete?: boolean;
	/** Nombre maximum de médias autorisés */
	maxItems?: number;
	/** Zone d'upload (rendu par le parent) */
	renderUploadZone?: () => React.ReactNode;
}

interface SortableMediaItemProps {
	media: MediaItem;
	index: number;
	isPrimary: boolean;
	isImageLoaded: boolean;
	shouldReduceMotion: boolean | null;
	isDraggingAny: boolean;
	showLongPressHint: boolean;
	onImageLoaded: (url: string) => void;
	onOpenLightbox: (index: number) => void;
	onOpenDeleteDialog: () => void;
}

function SortableMediaItem({
	media,
	index,
	isPrimary,
	isImageLoaded,
	shouldReduceMotion,
	isDraggingAny,
	showLongPressHint,
	onImageLoaded,
	onOpenLightbox,
	onOpenDeleteDialog,
}: SortableMediaItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: media.url });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition: shouldReduceMotion ? undefined : transition,
		zIndex: isDragging ? 50 : undefined,
	};

	const isVideo = media.mediaType === "VIDEO";

	return (
		<div
			ref={setNodeRef}
			style={style}
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Delete" || e.key === "Backspace") {
					e.preventDefault();
					onOpenDeleteDialog();
				}
			}}
			className={cn(
				"group relative aspect-square rounded-lg overflow-hidden border-2 shrink-0",
				shouldReduceMotion
					? ""
					: "motion-safe:transition-all motion-safe:duration-200",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
				isDragging && "opacity-50 scale-105 shadow-xl",
				isPrimary
					? "ring-2 ring-amber-500/50 border-amber-500"
					: "border-border hover:border-primary/50"
			)}
			role="listitem"
			aria-label={`${isVideo ? "Vidéo" : "Image"} ${index + 1}${isPrimary ? " (principale)" : ""}`}
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
								className={cn(
									"object-cover",
									// P6 - Transition blur pour remplacement fluide
									shouldReduceMotion ? "" : "motion-safe:transition-opacity motion-safe:duration-300",
									isImageLoaded ? "opacity-100" : "opacity-0"
								)}
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								quality={80}
								loading="lazy"
								decoding="async"
								// P6 - Utiliser blur placeholder pendant chargement
								placeholder={media.blurDataUrl ? "blur" : "empty"}
								blurDataURL={media.blurDataUrl}
								onLoad={() => onImageLoaded(media.url)}
							/>
						) : (
							<video
								src={media.url}
								className="w-full h-full object-cover"
								loop
								muted
								playsInline
								preload="metadata"
								onTouchEnd={(e) => {
									// Sur mobile : tap ouvre le lightbox (comportement unifié)
									// Ignorer si on est en cours de drag
									if (isDraggingAny) return;
									e.stopPropagation();
									onOpenLightbox(index);
								}}
								onMouseEnter={(e) => {
									// Desktop hover : auto-play
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
								Ton navigateur ne supporte pas la lecture de vidéos.
							</video>
						)}
						{/* Icône Play - cliquable pour ouvrir le lightbox */}
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onOpenLightbox(index);
							}}
							className="absolute inset-0 flex items-center justify-center cursor-pointer"
							aria-label={`Lire la vidéo ${index + 1}`}
						>
							<div className="bg-black/70 hover:bg-black/90 rounded-full p-3 shadow-xl transition-colors">
								<Play className="w-6 h-6 text-white" fill="white" />
							</div>
						</button>
					</div>
				) : (
					<Image
						src={media.url}
						alt={media.altText || `Image ${index + 1}`}
						fill
						className={cn(
							"object-cover",
							shouldReduceMotion ? "" : "motion-safe:transition-opacity",
							isImageLoaded ? "opacity-100" : "opacity-0"
						)}
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						quality={80}
						loading={index > 0 ? "lazy" : undefined}
						decoding="async"
						onLoad={() => onImageLoaded(media.url)}
					/>
				)}
			</div>

			{/* Badge principal - En bas sur mobile (évite collision avec drag handle) */}
			{isPrimary && (
				<div className="absolute bottom-2 left-2 sm:top-2 sm:bottom-auto sm:left-2 z-10 pointer-events-none">
					<div className="flex items-center gap-1 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md">
						<Star className="w-3 h-3" fill="currentColor" aria-hidden="true" />
						<span className="sm:hidden">1</span>
						<span className="hidden sm:inline">Principal</span>
					</div>
				</div>
			)}

			{/* Handle de drag - Positionné à gauche sur mobile pour éviter collision avec menu */}
			{/* P3/P4 - Taille unifiée + Tooltip persistant */}
			<Tooltip>
				<TooltipTrigger asChild>
					<button
						type="button"
						{...attributes}
						{...listeners}
						aria-label={`Réorganiser ${isVideo ? "la vidéo" : "l'image"} ${index + 1}`}
						aria-describedby="drag-instructions"
						className={cn(
							"absolute z-20 cursor-grab active:cursor-grabbing",
							"top-2 left-2 sm:top-1 sm:left-auto sm:right-10",
							"flex",
							"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full",
							shouldReduceMotion ? "" : "motion-safe:transition-opacity"
						)}
					>
						{/* P3 - Taille unifiée: 10x10 minimum pour accessibilité tactile */}
						<div className="h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center shadow-lg">
							<GripVertical className="h-5 w-5 text-white" aria-hidden="true" />
						</div>
					</button>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="sm:hidden">
					Maintenir pour déplacer
				</TooltipContent>
			</Tooltip>

			{/* Hint long-press mobile (première visite) */}
			{showLongPressHint && (
				<div
					className={cn(
						"absolute top-16 left-2 z-30 sm:hidden",
						"animate-in fade-in-0 slide-in-from-top-2 duration-300"
					)}
					aria-hidden="true"
				>
					<div className="bg-black/90 text-white text-xs px-2.5 py-1.5 rounded-md shadow-lg whitespace-nowrap">
						Maintenir pour déplacer
					</div>
				</div>
			)}

			{/* Actions Desktop - Boutons en bas à droite au hover */}
			<div
				className={cn(
					"absolute bottom-2 right-2 z-20 flex items-center gap-1.5",
					"motion-safe:transition-opacity",
					"hidden sm:flex",
					"opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onOpenLightbox(index);
							}}
							className="h-9 w-9 rounded-full bg-black/70 hover:bg-black/90 border-0"
							aria-label={`Agrandir le média ${index + 1}`}
						>
							<Expand className="h-4 w-4 text-white" aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Agrandir</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onOpenDeleteDialog();
							}}
							className="h-9 w-9 rounded-full bg-black/70 hover:bg-destructive border-0"
							aria-label={`Supprimer le média ${index + 1}`}
						>
							<Trash2 className="h-4 w-4 text-white" aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Supprimer</TooltipContent>
				</Tooltip>
			</div>

			{/* Actions Mobile - DropdownMenu */}
			<div className="absolute top-2 right-2 z-20 sm:hidden">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							className="h-11 w-11 rounded-full bg-black/70 hover:bg-black/90 border-0"
							aria-label={`Actions pour le média ${index + 1}`}
						>
							<MoreVertical className="h-5 w-5 text-white" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-[160px]">
						<DropdownMenuItem
							onClick={() => onOpenLightbox(index)}
							className="gap-2 py-2.5"
						>
							<Expand className="h-4 w-4" />
							Agrandir
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							variant="destructive"
							onClick={onOpenDeleteDialog}
							className="gap-2 py-2.5"
						>
							<Trash2 className="h-4 w-4" />
							Supprimer
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

export function MediaUploadGrid({
	media,
	onChange,
	skipUtapiDelete,
	maxItems = 11,
	renderUploadZone,
}: MediaUploadGridProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const shouldReduceMotion = useReducedMotion();

	// État de chargement des images
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// État du lightbox
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// État du drag actif pour DragOverlay
	const [activeId, setActiveId] = useState<string | null>(null);
	const activeMedia = activeId ? media.find((m) => m.url === activeId) : null;

	// État pour les annonces accessibilité (aria-live)
	const [announcement, setAnnouncement] = useState<string>("");

	// État pour l'indication long-press mobile (première visite)
	const [showLongPressHint, setShowLongPressHint] = useState(false);

	// Afficher le hint long-press pour les nouveaux utilisateurs sur mobile
	useEffect(() => {
		// Vérifier si c'est la première visite et s'il y a des médias
		if (media.length > 1 && typeof window !== "undefined") {
			const hasSeenHint = localStorage.getItem("media-upload-hint-seen");
			if (!hasSeenHint) {
				setShowLongPressHint(true);
				// Masquer après 4 secondes
				const timer = setTimeout(() => {
					setShowLongPressHint(false);
					localStorage.setItem("media-upload-hint-seen", "true");
				}, 4000);
				return () => clearTimeout(timer);
			}
		}
	}, [media.length]);

	// Sensors pour le drag & drop (desktop + mobile)
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 250, // Long press 250ms pour mobile
				tolerance: 5, // Tolérance mouvement 5px
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Préparer les slides pour le lightbox
	const slides: Slide[] = media.map((m) => {
		if (m.mediaType === "VIDEO") {
			return {
				type: "video" as const,
				sources: [{ src: m.url, type: getVideoMimeType(m.url) }],
				poster: m.thumbnailUrl || undefined,
			};
		}
		return {
			src: m.url,
			alt: m.altText || "Image du produit",
		};
	});

	// Marquer une image comme chargée
	const handleImageLoaded = (url: string) => {
		setLoadedImages((prev) => new Set(prev).add(url));
	};

	// Ouvrir le lightbox
	const openLightbox = (index: number) => {
		setLightboxIndex(index);
		setLightboxOpen(true);
	};

	// Gestion du drag start
	const handleDragStart = (event: DragStartEvent) => {
		const draggedId = event.active.id as string;
		setActiveId(draggedId);

		// Annonce pour les lecteurs d'écran
		const draggedIndex = media.findIndex((m) => m.url === draggedId);
		const draggedMedia = media[draggedIndex];
		const mediaType = draggedMedia?.mediaType === "VIDEO" ? "Vidéo" : "Image";
		setAnnouncement(`${mediaType} ${draggedIndex + 1} sélectionnée. Utilisez les flèches pour déplacer.`);
	};

	// Gestion du drag end
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveId(null);

		if (over && active.id !== over.id) {
			const oldIndex = media.findIndex((m) => m.url === active.id);
			const newIndex = media.findIndex((m) => m.url === over.id);
			const draggedMedia = media[oldIndex];
			const mediaType = draggedMedia?.mediaType === "VIDEO" ? "Vidéo" : "Image";

			// Empêcher de mettre une vidéo en première position
			if (newIndex === 0 && media[oldIndex].mediaType === "VIDEO") {
				toast.error("La première position doit être une image, pas une vidéo.");
				setAnnouncement("Impossible de placer une vidéo en première position.");
				return;
			}

			const newMedia = arrayMove(media, oldIndex, newIndex);
			onChange(newMedia);

			// Feedback visuel et sonore
			toast.success("Ordre des médias mis à jour", { duration: 2000 });
			setAnnouncement(`${mediaType} déplacée en position ${newIndex + 1}.`);
		} else {
			// Pas de changement
			setAnnouncement("");
		}
	};

	// Gestion du drag cancel
	const handleDragCancel = () => {
		setActiveId(null);
		setAnnouncement("Déplacement annulé.");
	};

	// Ouvrir le dialog de suppression
	const handleOpenDeleteDialog = (index: number) => {
		deleteDialog.open({
			index,
			url: media[index].url,
			skipUtapiDelete,
			onRemove: () => {
				const newMedia = media.filter((_, i) => i !== index);
				onChange(newMedia);
			},
		});
	};

	const canAddMore = media.length < maxItems;

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={(event) => {
					handleDragStart(event);
					// Feedback haptique sur mobile si supporté
					if (typeof navigator !== "undefined" && navigator.vibrate) {
						navigator.vibrate(50);
					}
				}}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				<SortableContext
					items={media.map((m) => m.url)}
					strategy={rectSortingStrategy}
				>
					{/* Instructions pour le drag & drop au clavier (screen readers) */}
					<span id="drag-instructions" className="sr-only">
						Utilisez Espace ou Entrée pour saisir un élément, les flèches pour le déplacer,
						Espace ou Entrée pour déposer, Échap pour annuler.
					</span>

					{/* Région aria-live pour les annonces de drag & drop */}
					<div aria-live="polite" aria-atomic="true" className="sr-only">
						{announcement}
					</div>

					<div
						className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-3 lg:gap-4 w-full"
						role="list"
						aria-label="Médias du produit"
					>
						{media.map((m, index) => {
							const isImageLoaded = loadedImages.has(m.url);

							return (
								<SortableMediaItem
									key={m.url}
									media={m}
									index={index}
									isPrimary={index === 0}
									isImageLoaded={isImageLoaded}
									shouldReduceMotion={shouldReduceMotion}
									isDraggingAny={!!activeId}
									showLongPressHint={showLongPressHint && index === 1}
									onImageLoaded={handleImageLoaded}
									onOpenLightbox={openLightbox}
									onOpenDeleteDialog={() => handleOpenDeleteDialog(index)}
								/>
							);
						})}

						{/* Zone d'upload */}
						{canAddMore && renderUploadZone && (
							<div className="aspect-square rounded-lg overflow-hidden">
								{renderUploadZone()}
							</div>
						)}
					</div>
				</SortableContext>

				{/* DragOverlay pour un meilleur feedback visuel pendant le drag */}
				<DragOverlay adjustScale={!shouldReduceMotion}>
					{activeMedia ? (
						<div className="aspect-square rounded-lg overflow-hidden border-2 border-primary shadow-2xl bg-muted">
							{activeMedia.mediaType === "VIDEO" ? (
								<div className="relative w-full h-full">
									{activeMedia.thumbnailUrl ? (
										<Image
											src={activeMedia.thumbnailUrl}
											alt="Vidéo en cours de déplacement"
											fill
											className="object-cover"
											sizes="150px"
										/>
									) : (
										<div className="w-full h-full bg-muted flex items-center justify-center">
											<Play className="w-8 h-8 text-muted-foreground" />
										</div>
									)}
									<div className="absolute inset-0 flex items-center justify-center">
										<div className="bg-black/70 rounded-full p-2">
											<Play className="w-5 h-5 text-white" fill="white" />
										</div>
									</div>
								</div>
							) : (
								<Image
									src={activeMedia.url}
									alt="Image en cours de déplacement"
									fill
									className="object-cover"
									sizes="150px"
								/>
							)}
						</div>
					) : null}
				</DragOverlay>
			</DndContext>

			{/* Lightbox */}
			<MediaLightbox
				open={lightboxOpen}
				close={() => setLightboxOpen(false)}
				slides={slides}
				index={lightboxIndex}
				onIndexChange={setLightboxIndex}
			/>
		</>
	);
}

// Wrapper avec ErrorBoundary
export function MediaUploadGridWithErrorBoundary(
	props: MediaUploadGridProps
) {
	return (
		<GalleryErrorBoundary>
			<MediaUploadGrid {...props} />
		</GalleryErrorBoundary>
	);
}
