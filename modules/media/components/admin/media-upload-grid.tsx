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
import { useReducedMotion } from "motion/react";
import { Play } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { toast } from "sonner";
import { ErrorBoundary } from "@/shared/components/error-boundary";
import dynamic from "next/dynamic";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { UI_DELAYS } from "@/modules/media/constants/media.constants";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = dynamic(
	() => import("@/modules/media/components/media-lightbox"),
	{ ssr: false }
);
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "./delete-gallery-media-alert-dialog";
import { SortableMediaItem } from "./sortable-media-item";
import type { Slide } from "yet-another-react-lightbox";

export interface MediaItem {
	url: string;
	altText: string | undefined;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl: string | undefined;
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
	maxItems = 6,
	renderUploadZone,
}: MediaUploadGridProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const shouldReduceMotion = useReducedMotion();

	// État de chargement des images
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// État du lightbox (null = fermé, number = index ouvert)
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

	// Etat du drag actif pour DragOverlay (index pour O(1) lookup)
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// Verification bounds: activeIndex pourrait etre hors limites si media change pendant drag
	const activeMedia =
		activeIndex !== null && activeIndex < media.length ? media[activeIndex] : null;

	// État pour les annonces accessibilité (aria-live)
	const [announcement, setAnnouncement] = useState<string>("");

	// État pour l'indication long-press mobile (première visite)
	const [showLongPressHint, setShowLongPressHint] = useState(false);

	// Condition pour afficher le hint (seulement quand on a au moins 2 médias)
	const hasMultipleMedia = media.length > 1;

	// Afficher le hint long-press pour les nouveaux utilisateurs sur mobile (une seule fois)
	useEffect(() => {
		if (typeof window === "undefined") return;
		const hasSeenHint = localStorage.getItem(STORAGE_KEYS.MEDIA_UPLOAD_HINT_SEEN);
		if (hasSeenHint) return;

		// Afficher le hint seulement s'il y a au moins 2 médias
		if (hasMultipleMedia) {
			setShowLongPressHint(true);
			const timer = setTimeout(() => {
				setShowLongPressHint(false);
				localStorage.setItem(STORAGE_KEYS.MEDIA_UPLOAD_HINT_SEEN, "true");
			}, UI_DELAYS.HINT_DISAPPEAR_MS);
			return () => clearTimeout(timer);
		}
	}, [hasMultipleMedia]);

	// Sensors pour le drag & drop (desktop + mobile)
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: UI_DELAYS.DRAG_ACTIVATION_DISTANCE_PX,
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: UI_DELAYS.LONG_PRESS_ACTIVATION_MS,
				tolerance: UI_DELAYS.LONG_PRESS_TOLERANCE_PX,
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

			// Calculer le nouveau tableau avant validation
			const newMedia = arrayMove(media, oldIndex, newIndex);

			// Empêcher qu'une vidéo se retrouve en première position (couvre tous les cas)
			if (newMedia[0]?.mediaType === "VIDEO") {
				toast.error("La première position doit être une image, pas une vidéo.");
				setAnnouncement("Impossible de placer une vidéo en première position.");
				return;
			}

			const draggedMedia = media[oldIndex];
			const mediaType = draggedMedia?.mediaType === "VIDEO" ? "Vidéo" : "Image";

			onChange(newMedia);

			// Feedback pour lecteur d'écran
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

	// WCAG 2.5.7: Alternatives au drag pour réordonner
	const handleMoveUp = (index: number) => {
		if (index <= 0) return;
		const newMedia = arrayMove(media, index, index - 1);
		// Empêcher une vidéo en première position
		if (newMedia[0]?.mediaType === "VIDEO") {
			toast.error("La première position doit être une image, pas une vidéo.");
			return;
		}
		onChange(newMedia);
		setAnnouncement(`Média déplacé en position ${index}.`);
	};

	const handleMoveDown = (index: number) => {
		if (index >= media.length - 1) return;
		const newMedia = arrayMove(media, index, index + 1);
		onChange(newMedia);
		setAnnouncement(`Média déplacé en position ${index + 2}.`);
	};

	const canAddMore = media.length < maxItems;

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragStart={handleDragStart}
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
									onMoveUp={() => handleMoveUp(index)}
									onMoveDown={() => handleMoveDown(index)}
									totalCount={media.length}
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
				open={lightboxIndex !== null}
				close={() => setLightboxIndex(null)}
				slides={slides}
				index={lightboxIndex ?? 0}
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
		<ErrorBoundary errorMessage="Impossible de charger la grille de medias">
			<MediaUploadGrid {...props} />
		</ErrorBoundary>
	);
}
