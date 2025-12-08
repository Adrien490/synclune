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
	rectSortingStrategy,
} from "@dnd-kit/sortable";
import { snapCenterToCursor, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { toast } from "sonner";
import { GalleryErrorBoundary } from "@/modules/media/components/gallery-error-boundary";
import MediaLightbox from "@/modules/media/components/media-lightbox";
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "./delete-gallery-media-alert-dialog";
import { SortableMediaItem } from "./sortable-media-item";
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

	// État du drag actif pour DragOverlay (index pour O(1) lookup)
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const activeMedia = activeIndex !== null ? media[activeIndex] : null;

	// État pour les annonces accessibilité (aria-live)
	const [announcement, setAnnouncement] = useState<string>("");

	// État pour l'indication long-press mobile (première visite)
	const [showLongPressHint, setShowLongPressHint] = useState(false);

	// Afficher le hint long-press pour les nouveaux utilisateurs sur mobile (une seule fois)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const hasSeenHint = localStorage.getItem("media-upload-hint-seen");
		if (hasSeenHint) return;

		// Afficher le hint seulement s'il y a au moins 2 médias
		if (media.length > 1) {
			setShowLongPressHint(true);
			const timer = setTimeout(() => {
				setShowLongPressHint(false);
				localStorage.setItem("media-upload-hint-seen", "true");
			}, 4000);
			return () => clearTimeout(timer);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [media.length > 1]);

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
		const draggedIndex = media.findIndex((m) => m.url === draggedId);
		setActiveIndex(draggedIndex);

		// Annonce pour les lecteurs d'écran
		const draggedMedia = media[draggedIndex];
		const mediaType = draggedMedia?.mediaType === "VIDEO" ? "Vidéo" : "Image";
		setAnnouncement(`${mediaType} ${draggedIndex + 1} sélectionnée. Utilisez les flèches pour déplacer.`);
	};

	// Gestion du drag end
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveIndex(null);

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
		setActiveIndex(null);
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
									isDraggingAny={activeIndex !== null}
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
				<DragOverlay adjustScale={!shouldReduceMotion} modifiers={[snapCenterToCursor, restrictToWindowEdges]}>
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
