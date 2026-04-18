"use client";

import { DragDropProvider, DragOverlay, KeyboardSensor, PointerSensor } from "@dnd-kit/react";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { RestrictToWindow } from "@dnd-kit/dom/modifiers";
import { arrayMove } from "@dnd-kit/helpers";
import type { DragEndEvent } from "@dnd-kit/react";
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { useReducedMotion } from "motion/react";
import { Play } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useLightbox } from "@/shared/hooks";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { lazy, Suspense } from "react";
import { STORAGE_KEYS } from "@/shared/constants/storage-keys";
import { UI_DELAYS } from "@/modules/media/constants/ui-interactions.constants";

// Lazy loading - lightbox charge uniquement a l'ouverture
const MediaLightbox = lazy(() => import("@/modules/media/components/media-lightbox"));
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "@/modules/media/components/admin/delete-gallery-media-alert-dialog";
import { SortableMediaItem } from "@/modules/media/components/admin/sortable-media-item";
import type { MediaItem } from "@/modules/media/types/hooks.types";
import type { Slide } from "yet-another-react-lightbox";

export type { MediaItem };

interface MediaUploadGridProps {
	/** List of medias */
	media: MediaItem[];
	/** Callback called when the list changes (reorder or deletion) */
	onChange: (media: MediaItem[]) => void;
	/** If true, don't delete via UTAPI immediately (edit mode) */
	skipUtapiDelete?: boolean;
	/** Maximum number of medias allowed */
	maxItems?: number;
	/** Upload zone (rendered by parent) */
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
	const isMobile = useIsMobile();

	// Image loading state
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// Lightbox state with back-button + focus-restore support
	const { isOpen: lightboxOpen, open: openLightboxHook, close: closeLightbox } = useLightbox();
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// State for accessibility announcements (aria-live)
	const [announcement, setAnnouncement] = useState<string>("");

	// State for long-press mobile hint (first visit)
	const [showLongPressHint, setShowLongPressHint] = useState(false);

	// Track if dragging for child components
	const [isDraggingAny, setIsDraggingAny] = useState(false);

	// Condition to show the hint (only when there are at least 2 medias)
	const hasMultipleMedia = media.length > 1;

	// Show long-press hint for new users on mobile (once only) — P2.5
	useEffect(() => {
		if (typeof window === "undefined") return;
		// Desktop drag-and-drop is discoverable via the alternative Up/Down buttons;
		// the hint targets mobile users who need to discover the long-press gesture.
		if (!isMobile) return;
		try {
			const hasSeenHint = localStorage.getItem(STORAGE_KEYS.MEDIA_UPLOAD_HINT_SEEN);
			if (hasSeenHint) return;
		} catch {
			// localStorage unavailable (private browsing, etc.)
			return;
		}

		// Show the hint only if there are at least 2 medias
		if (hasMultipleMedia) {
			queueMicrotask(() => {
				setShowLongPressHint(true);
				triggerHaptic("selection");
			});
			const timer = setTimeout(() => {
				setShowLongPressHint(false);
				try {
					localStorage.setItem(STORAGE_KEYS.MEDIA_UPLOAD_HINT_SEEN, "true");
				} catch {
					// Ignore write failure
				}
			}, UI_DELAYS.HINT_DISAPPEAR_MS);
			return () => clearTimeout(timer);
		}
	}, [hasMultipleMedia, isMobile]);

	// Prepare slides for the lightbox
	const slides: Slide[] = media.map((m) => {
		if (m.mediaType === "VIDEO") {
			return {
				type: "video" as const,
				sources: [{ src: m.url, type: getVideoMimeType(m.url) }],
				poster: m.thumbnailUrl ?? undefined,
			};
		}
		return {
			src: m.url,
			alt: m.altText ?? "Image du produit",
		};
	});

	// Mark an image as loaded
	const handleImageLoaded = (url: string) => {
		setLoadedImages((prev) => new Set(prev).add(url));
	};

	// Open the lightbox
	const openLightbox = (index: number) => {
		setLightboxIndex(index);
		openLightboxHook();
	};

	// Handle drag start
	const handleDragStart = () => {
		setIsDraggingAny(true);
		setAnnouncement("Élément sélectionné. Utilisez les flèches pour déplacer.");
	};

	// Handle drag end
	const handleDragEnd = (event: DragEndEvent) => {
		setIsDraggingAny(false);

		if (event.canceled) {
			setAnnouncement("Déplacement annulé.");
			return;
		}

		const { source, target } = event.operation;

		if (!source || !target || source.id === target.id) {
			setAnnouncement("");
			return;
		}

		const oldIndex = media.findIndex((m) => m.url === source.id);
		const newIndex = media.findIndex((m) => m.url === target.id);

		// Compute the new array before validation
		const newMedia = arrayMove(media, oldIndex, newIndex);

		// Prevent a video from ending up in first position (covers all cases)
		if (newMedia[0]?.mediaType === "VIDEO") {
			triggerHaptic("error");
			toast.error("La première position doit être une image, pas une vidéo.");
			setAnnouncement("Impossible de placer une vidéo en première position.");
			return;
		}

		const draggedMedia = media[oldIndex];
		const mediaType = draggedMedia?.mediaType === "VIDEO" ? "Vidéo" : "Image";

		triggerHaptic("selection");
		withViewTransition(() => onChange(newMedia));

		// Screen reader feedback
		setAnnouncement(`${mediaType} déplacée en position ${newIndex + 1}.`);
	};

	// Open the delete dialog
	const handleOpenDeleteDialog = (index: number) => {
		deleteDialog.open({
			index,
			url: media[index]!.url,
			skipUtapiDelete,
			onRemove: () => {
				const newMedia = media.filter((_, i) => i !== index);
				// Prevent a video in first position after deletion
				if (newMedia[0]?.mediaType === "VIDEO") {
					triggerHaptic("error");
					toast.error(
						"Impossible : une vidéo passerait en première position. Réorganisez d'abord.",
					);
					return;
				}
				triggerHaptic("success");
				withViewTransition(() => onChange(newMedia));
			},
		});
	};

	// WCAG 2.5.7: Drag alternatives for reordering
	const handleMoveUp = (index: number) => {
		if (index <= 0) return;
		const newMedia = arrayMove(media, index, index - 1);
		// Prevent a video in first position
		if (newMedia[0]?.mediaType === "VIDEO") {
			triggerHaptic("error");
			toast.error("La première position doit être une image, pas une vidéo.");
			return;
		}
		triggerHaptic("selection");
		withViewTransition(() => onChange(newMedia));
		setAnnouncement(`Média déplacé en position ${index}.`);
	};

	const handleMoveDown = (index: number) => {
		if (index >= media.length - 1) return;
		const newMedia = arrayMove(media, index, index + 1);
		// Prevent a video in first position
		if (newMedia[0]?.mediaType === "VIDEO") {
			triggerHaptic("error");
			toast.error("La première position doit être une image, pas une vidéo.");
			return;
		}
		triggerHaptic("selection");
		withViewTransition(() => onChange(newMedia));
		setAnnouncement(`Média déplacé en position ${index + 2}.`);
	};

	const canAddMore = media.length < maxItems;

	return (
		<>
			<DragDropProvider
				sensors={[
					PointerSensor.configure({
						activationConstraints: [
							new PointerActivationConstraints.Distance({
								value: UI_DELAYS.DRAG_ACTIVATION_DISTANCE_PX,
							}),
						],
					}),
					KeyboardSensor,
				]}
				modifiers={[RestrictToWindow]}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
			>
				{/* Keyboard drag & drop instructions (screen readers) */}
				<span id="drag-instructions" className="sr-only">
					Utilisez Espace ou Entrée pour saisir un élément, les flèches pour le déplacer, Espace ou
					Entrée pour déposer, Échap pour annuler.
				</span>

				{/* aria-live region for drag & drop announcements */}
				<div aria-live="polite" aria-atomic="true" className="sr-only">
					{announcement}
				</div>

				<div
					className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4"
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
								isDraggingAny={isDraggingAny}
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

					{/* Upload zone */}
					{canAddMore && renderUploadZone && (
						<div className="aspect-square overflow-hidden rounded-lg">{renderUploadZone()}</div>
					)}
				</div>

				{/* DragOverlay for better visual feedback during drag */}
				<DragOverlay>
					{(source) => {
						const sourceMedia = media.find((m) => m.url === source.id);
						if (!sourceMedia) return null;

						return (
							<div className="border-primary bg-muted aspect-square overflow-hidden rounded-lg border-2 shadow-2xl">
								{sourceMedia.mediaType === "VIDEO" ? (
									<div className="relative h-full w-full">
										{sourceMedia.thumbnailUrl ? (
											<Image
												src={sourceMedia.thumbnailUrl}
												alt="Vidéo en cours de déplacement"
												fill
												className="object-cover"
												sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 23vw"
											/>
										) : (
											<div className="bg-muted flex h-full w-full items-center justify-center">
												<Play className="text-muted-foreground h-8 w-8" />
											</div>
										)}
										<div className="absolute inset-0 flex items-center justify-center">
											<div className="rounded-full bg-black/70 p-2">
												<Play className="h-5 w-5 text-white" fill="white" />
											</div>
										</div>
									</div>
								) : (
									<Image
										src={sourceMedia.url}
										alt="Image en cours de déplacement"
										fill
										className="object-cover"
										sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 23vw"
									/>
								)}
							</div>
						);
					}}
				</DragOverlay>
			</DragDropProvider>

			{/* Lightbox */}
			{lightboxOpen && (
				<Suspense fallback={null}>
					<MediaLightbox
						open={lightboxOpen}
						close={closeLightbox}
						slides={slides}
						index={lightboxIndex}
						onIndexChange={setLightboxIndex}
					/>
				</Suspense>
			)}
		</>
	);
}
