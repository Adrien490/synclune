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
import { useState } from "react";
import { IMAGE_BLUR_FALLBACK } from "@/shared/constants/images";
import { useLightbox } from "@/shared/hooks";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";

import { lazy, Suspense } from "react";
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
	/** When provided, enables native drag-and-drop of files from the OS file system (P2.5) */
	onFilesDropped?: (files: File[]) => void;
}

export function MediaUploadGrid({
	media,
	onChange,
	skipUtapiDelete,
	maxItems = 6,
	renderUploadZone,
	onFilesDropped,
}: MediaUploadGridProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const shouldReduceMotion = useReducedMotion();
	const isTouchDevice = useIsTouchDevice();
	const [isFileDropTarget, setIsFileDropTarget] = useState(false);

	// Image loading state
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// Lightbox state with back-button + focus-restore support
	const { isOpen: lightboxOpen, open: openLightboxHook, close: closeLightbox } = useLightbox();
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// State for accessibility announcements (aria-live)
	const [announcement, setAnnouncement] = useState<string>("");

	// Track if dragging for child components
	const [isDraggingAny, setIsDraggingAny] = useState(false);

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
				const removedMedia = media[index];
				const snapshot = media;
				triggerHaptic("success");
				withViewTransition(() => onChange(newMedia));
				// Undo affordance — uniquement en mode skipUtapiDelete (différé),
				// sinon le fichier est déjà supprimé sur UploadThing et l'undo serait trompeur.
				if (skipUtapiDelete && removedMedia) {
					const isVideo = removedMedia.mediaType === "VIDEO";
					toast.success(`${isVideo ? "Vidéo" : "Image"} retirée de l'atelier`, {
						action: {
							label: "Annuler",
							onClick: () => {
								triggerHaptic("light");
								withViewTransition(() => onChange(snapshot));
								setAnnouncement(`${isVideo ? "Vidéo" : "Image"} restaurée.`);
							},
						},
					});
				}
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

	// Promote an image to first position (primary)
	const handleSetAsPrimary = (index: number) => {
		if (index === 0) return;
		const target = media[index];
		if (!target || target.mediaType === "VIDEO") {
			triggerHaptic("error");
			toast.error("Une vidéo ne peut pas être l'image principale.");
			return;
		}
		const newMedia = arrayMove(media, index, 0);
		triggerHaptic("medium");
		onChange(newMedia);
		setAnnouncement(`Image ${index + 1} définie comme image principale.`);
		toast.success("Définie comme image principale");
	};

	// Update the alt text (description) of a single media item
	const handleUpdateAltText = (index: number, altText: string) => {
		const target = media[index];
		if (!target) return;
		const next = altText.trim();
		if ((target.altText ?? "") === next) return;
		const newMedia = media.map((m, i) =>
			i === index ? { ...m, altText: next.length > 0 ? next : undefined } : m,
		);
		onChange(newMedia);
		setAnnouncement(
			next.length > 0
				? `Description du média ${index + 1} mise à jour.`
				: `Description du média ${index + 1} effacée.`,
		);
		toast.success("Description mise à jour");
	};

	const canAddMore = media.length < maxItems;

	return (
		<>
			<DragDropProvider
				sensors={[
					PointerSensor.configure({
						activationConstraints: isTouchDevice
							? [
									new PointerActivationConstraints.Delay({
										value: UI_DELAYS.LONG_PRESS_ACTIVATION_MS,
										tolerance: UI_DELAYS.LONG_PRESS_TOLERANCE_PX,
									}),
								]
							: [
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
					className={`xs:gap-2.5 grid w-full grid-cols-2 gap-2 rounded-lg sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4 ${
						isFileDropTarget && onFilesDropped
							? "ring-primary bg-primary/5 ring-2 ring-offset-2 transition-colors"
							: ""
					}`}
					role="list"
					aria-label="Médias du produit"
					{...(onFilesDropped
						? {
								onDragOver: (e: React.DragEvent<HTMLDivElement>) => {
									if (!e.dataTransfer.types.includes("Files")) return;
									e.preventDefault();
									e.dataTransfer.dropEffect = "copy";
									setIsFileDropTarget(true);
								},
								onDragLeave: (e: React.DragEvent<HTMLDivElement>) => {
									if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
									setIsFileDropTarget(false);
								},
								onDrop: (e: React.DragEvent<HTMLDivElement>) => {
									if (e.dataTransfer.files.length === 0) return;
									e.preventDefault();
									setIsFileDropTarget(false);
									triggerHaptic("medium");
									onFilesDropped(Array.from(e.dataTransfer.files));
								},
							}
						: {})}
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
								onImageLoaded={handleImageLoaded}
								onOpenLightbox={openLightbox}
								onOpenDeleteDialog={() => handleOpenDeleteDialog(index)}
								onMoveUp={() => handleMoveUp(index)}
								onMoveDown={() => handleMoveDown(index)}
								totalCount={media.length}
								onSetAsPrimary={
									m.mediaType === "VIDEO" || index === 0
										? undefined
										: () => handleSetAsPrimary(index)
								}
								onUpdateAltText={(altText) => handleUpdateAltText(index, altText)}
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
												placeholder="blur"
												blurDataURL={IMAGE_BLUR_FALLBACK}
											/>
										) : (
											<div className="bg-muted flex h-full w-full items-center justify-center">
												<Play className="text-muted-foreground size-8" />
											</div>
										)}
										<div className="absolute inset-0 flex items-center justify-center">
											<div className="rounded-full bg-black/70 p-2">
												<Play className="size-5 text-white" fill="white" />
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
										placeholder="blur"
										blurDataURL={IMAGE_BLUR_FALLBACK}
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
