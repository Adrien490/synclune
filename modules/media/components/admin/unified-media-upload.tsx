"use client";

import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
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
import { useAlertDialog } from "@/shared/providers/alert-dialog-store-provider";
import { cn } from "@/shared/utils/cn";
import { useReducedMotion } from "framer-motion";
import { Expand, GripVertical, Loader2, MoreVertical, Play, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { getVideoMimeType } from "@/modules/media/utils/media-utils";
import { toast } from "sonner";
import { GalleryErrorBoundary } from "@/modules/media/components/gallery-error-boundary";
import ProductLightbox from "@/modules/media/components/product-lightbox";
import { DELETE_GALLERY_MEDIA_DIALOG_ID } from "./delete-gallery-media-alert-dialog";
import type { Slide } from "yet-another-react-lightbox";

export interface MediaItem {
	url: string;
	altText?: string;
	mediaType: "IMAGE" | "VIDEO";
	thumbnailUrl?: string | null;
	thumbnailSmallUrl?: string | null;
}

interface UnifiedMediaUploadProps {
	/** Liste des médias */
	media: MediaItem[];
	/** Callback appelé quand la liste change (réordonnement ou suppression) */
	onChange: (media: MediaItem[]) => void;
	/** Si true, ne supprime pas via UTAPI immédiatement (mode édition) */
	skipUtapiDelete?: boolean;
	/** URLs des vidéos dont la miniature est en cours de génération */
	generatingThumbnails?: Set<string>;
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
	isGeneratingThumbnail: boolean;
	shouldReduceMotion: boolean | null;
	onImageLoaded: (url: string) => void;
	onOpenLightbox: (index: number) => void;
	onOpenDeleteDialog: () => void;
}

function SortableMediaItem({
	media,
	index,
	isPrimary,
	isImageLoaded,
	isGeneratingThumbnail,
	shouldReduceMotion,
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
								className="object-cover"
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								quality={80}
								loading="lazy"
								decoding="async"
								onLoad={() => onImageLoaded(media.url)}
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
								Ton navigateur ne supporte pas la lecture de vidéos.
							</video>
						)}
						<div
							className={cn(
								"absolute inset-0 flex items-center justify-center pointer-events-none group-hover:opacity-0",
								shouldReduceMotion ? "" : "motion-safe:transition-opacity"
							)}
						>
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

			{/* Badge principal */}
			{isPrimary && (
				<div className="absolute top-1 left-1 z-10 pointer-events-none sm:top-2 sm:left-2">
					<div className="flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
						<Star className="w-3 h-3" />
						<span className="hidden sm:inline">Principal</span>
					</div>
				</div>
			)}

			{/* Handle de drag - Desktop */}
			<div
				{...attributes}
				{...listeners}
				aria-label={`Réorganiser ${isVideo ? "la vidéo" : "l'image"} ${index + 1}`}
				className={cn(
					"absolute top-1 right-10 z-20 cursor-grab active:cursor-grabbing",
					"hidden sm:flex",
					"opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
					shouldReduceMotion ? "" : "motion-safe:transition-opacity"
				)}
			>
				<div className="h-8 w-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center">
					<GripVertical className="h-4 w-4 text-white" />
				</div>
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
						onOpenLightbox(index);
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
						onOpenDeleteDialog();
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

export function UnifiedMediaUpload({
	media,
	onChange,
	skipUtapiDelete,
	generatingThumbnails,
	maxItems = 11,
	renderUploadZone,
}: UnifiedMediaUploadProps) {
	const deleteDialog = useAlertDialog(DELETE_GALLERY_MEDIA_DIALOG_ID);
	const shouldReduceMotion = useReducedMotion();

	// État de chargement des images
	const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

	// État du lightbox
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxIndex, setLightboxIndex] = useState(0);

	// Sensors pour le drag & drop
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Préparer les slides pour le lightbox
	const slides: Slide[] = useMemo(
		() =>
			media.map((m) => {
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
			}),
		[media]
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

	// Gestion du drag end
	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const { active, over } = event;

			if (over && active.id !== over.id) {
				const oldIndex = media.findIndex((m) => m.url === active.id);
				const newIndex = media.findIndex((m) => m.url === over.id);

				// Empêcher de mettre une vidéo en première position
				if (newIndex === 0 && media[oldIndex].mediaType === "VIDEO") {
					toast.error("La première position doit être une image, pas une vidéo.");
					return;
				}

				const newMedia = arrayMove(media, oldIndex, newIndex);
				onChange(newMedia);
			}
		},
		[media, onChange]
	);

	// Ouvrir le dialog de suppression
	const handleOpenDeleteDialog = useCallback(
		(index: number) => {
			deleteDialog.open({
				index,
				url: media[index].url,
				skipUtapiDelete,
				onRemove: () => {
					const newMedia = media.filter((_, i) => i !== index);
					onChange(newMedia);
				},
			});
		},
		[deleteDialog, media, onChange, skipUtapiDelete]
	);

	const canAddMore = media.length < maxItems;

	return (
		<>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={media.map((m) => m.url)}
					strategy={rectSortingStrategy}
				>
					<div
						className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 w-full"
						role="list"
						aria-label="Médias du produit"
					>
						{media.map((m, index) => {
							const isVideo = m.mediaType === "VIDEO";
							const isGeneratingThumbnail =
								isVideo && (generatingThumbnails?.has(m.url) ?? false);
							const isImageLoaded = loadedImages.has(m.url);

							return (
								<SortableMediaItem
									key={m.url}
									media={m}
									index={index}
									isPrimary={index === 0}
									isImageLoaded={isImageLoaded}
									isGeneratingThumbnail={isGeneratingThumbnail}
									shouldReduceMotion={shouldReduceMotion}
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
			</DndContext>

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

// Wrapper avec ErrorBoundary
export function UnifiedMediaUploadWithErrorBoundary(
	props: UnifiedMediaUploadProps
) {
	return (
		<GalleryErrorBoundary>
			<UnifiedMediaUpload {...props} />
		</GalleryErrorBoundary>
	);
}
