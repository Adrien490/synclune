"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/shared/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import {
	ArrowDown,
	ArrowUp,
	Expand,
	GripVertical,
	MoreVertical,
	Play,
	Star,
	Trash2,
} from "lucide-react";
import Image from "next/image";
import type { MediaItem } from "@/shared/components/media-upload/media-upload-grid";

export interface SortableMediaItemProps {
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
	/** WCAG 2.5.7: Alternative to drag for moving the item up */
	onMoveUp?: () => void;
	/** WCAG 2.5.7: Alternative to drag for moving the item down */
	onMoveDown?: () => void;
	/** Total number of items (to determine if we can move down) */
	totalCount?: number;
}

export function SortableMediaItem({
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
	onMoveUp,
	onMoveDown,
	totalCount = 1,
}: SortableMediaItemProps) {
	const canMoveUp = index > 0 && onMoveUp;
	const canMoveDown = index < totalCount - 1 && onMoveDown;
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: media.url,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition: shouldReduceMotion ? undefined : transition,
		zIndex: isDragging ? 50 : undefined,
	};

	const isVideo = media.mediaType === "VIDEO";

	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- sortable item needs keyboard interactions
		<div
			ref={setNodeRef}
			style={style}
			// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- sortable item needs keyboard interactions
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Delete" || e.key === "Backspace") {
					e.preventDefault();
					onOpenDeleteDialog();
				}
			}}
			className={cn(
				"group relative aspect-square shrink-0 overflow-hidden rounded-lg border-2",
				shouldReduceMotion ? "" : "motion-safe:transition-all motion-safe:duration-200",
				"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				isDragging && "opacity-30",
				isPrimary
					? "border-amber-500 ring-2 ring-amber-500/50"
					: "border-border hover:border-primary/50",
			)}
			role="group"
			aria-label={`${isVideo ? "Vidéo" : "Image"} ${index + 1}${isPrimary ? " (principale)" : ""}`}
		>
			{/* Skeleton/Loading state */}
			{!isImageLoaded && !isVideo && (
				<div className="bg-muted absolute inset-0 z-10 motion-safe:animate-pulse" />
			)}

			<div className="bg-muted relative h-full w-full">
				{isVideo ? (
					<div className="relative h-full w-full">
						{media.thumbnailUrl ? (
							<Image
								src={media.thumbnailUrl}
								alt={media.altText ?? `Miniature vidéo ${index + 1}`}
								fill
								className={cn(
									"object-cover",
									shouldReduceMotion
										? ""
										: "motion-safe:transition-opacity motion-safe:duration-300",
									isImageLoaded ? "opacity-100" : "opacity-0",
								)}
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								quality={80}
								loading="lazy"
								decoding="async"
								placeholder={media.blurDataUrl ? "blur" : "empty"}
								blurDataURL={media.blurDataUrl}
								onLoad={() => onImageLoaded(media.url)}
							/>
						) : (
							<video
								src={media.url}
								className="h-full w-full object-cover"
								loop
								muted
								playsInline
								preload="metadata"
								onTouchEnd={(e) => {
									if (isDraggingAny) return;
									e.stopPropagation();
									onOpenLightbox(index);
								}}
								onMouseEnter={(e) => {
									if (e.currentTarget.readyState === 0) {
										e.currentTarget.load();
									}
									e.currentTarget.play().catch(() => {
										// Ignore autoplay errors (e.g. user hasn't interacted yet)
									});
								}}
								onMouseLeave={(e) => {
									e.currentTarget.pause();
									e.currentTarget.currentTime = 0;
								}}
								aria-label={media.altText ?? `Aperçu vidéo ${index + 1}`}
							>
								<track kind="captions" srcLang="fr" label="Français" default />
								Votre navigateur ne supporte pas la lecture de vidéos.
							</video>
						)}
						{/* Play icon - clickable to open lightbox */}
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onOpenLightbox(index);
							}}
							className={cn(
								"absolute inset-0 flex cursor-pointer items-center justify-center",
								"opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
								"motion-safe:transition-opacity",
							)}
							aria-label={`Lire la vidéo ${index + 1}`}
						>
							<div className="rounded-full bg-black/70 p-3 shadow-xl transition-colors hover:bg-black/90">
								<Play className="h-6 w-6 text-white" fill="white" />
							</div>
						</button>
					</div>
				) : (
					<Image
						src={media.url}
						alt={media.altText ?? `Image ${index + 1}`}
						fill
						className={cn(
							"object-cover",
							shouldReduceMotion ? "" : "motion-safe:transition-opacity",
							isImageLoaded ? "opacity-100" : "opacity-0",
						)}
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						quality={80}
						loading={index > 0 ? "lazy" : undefined}
						decoding="async"
						placeholder={media.blurDataUrl ? "blur" : "empty"}
						blurDataURL={media.blurDataUrl}
						onLoad={() => onImageLoaded(media.url)}
					/>
				)}
			</div>

			{/* Primary badge */}
			{isPrimary && (
				<div className="pointer-events-none absolute bottom-2 left-2 z-10 sm:top-2 sm:bottom-auto sm:left-2">
					<div className="flex items-center gap-1 rounded bg-amber-600 px-1.5 py-0.5 text-xs font-bold text-white shadow-md">
						<Star className="h-3 w-3" fill="currentColor" aria-hidden="true" />
						<span className="sm:hidden">1</span>
						<span className="hidden sm:inline">Principal</span>
					</div>
				</div>
			)}

			{/* Drag handle */}
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
							"top-2 left-2 sm:top-2 sm:right-2 sm:left-auto",
							"flex",
							"opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100",
							"focus-visible:ring-primary rounded-full focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
							shouldReduceMotion ? "" : "motion-safe:transition-opacity",
						)}
					>
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/70 shadow-lg hover:bg-black/90">
							<GripVertical className="h-5 w-5 text-white" aria-hidden="true" />
						</div>
					</button>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="sm:hidden">
					Maintenir pour déplacer
				</TooltipContent>
			</Tooltip>

			{/* Long-press hint mobile */}
			{showLongPressHint && (
				<div
					className={cn(
						"absolute top-16 left-2 z-30 sm:hidden",
						"animate-in fade-in-0 slide-in-from-top-2 duration-300",
					)}
					aria-hidden="true"
				>
					<div className="rounded-md bg-black/90 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg">
						Maintenir pour déplacer
					</div>
				</div>
			)}

			{/* Desktop actions */}
			<div
				className={cn(
					"absolute right-2 bottom-2 z-20 flex items-center gap-1.5",
					"motion-safe:transition-opacity",
					"hidden sm:flex",
					"opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
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
							className="h-9 w-9 rounded-full border-0 bg-black/70 hover:bg-black/90"
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
							className="hover:bg-destructive h-9 w-9 rounded-full border-0 bg-black/70"
							aria-label={`Supprimer le média ${index + 1}`}
						>
							<Trash2 className="h-4 w-4 text-white" aria-hidden="true" />
						</Button>
					</TooltipTrigger>
					<TooltipContent>Supprimer</TooltipContent>
				</Tooltip>
			</div>

			{/* Mobile actions */}
			<div className="absolute top-2 right-2 z-20 sm:hidden">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							className="h-11 w-11 rounded-full border-0 bg-black/70 hover:bg-black/90"
							aria-label={`Actions pour le média ${index + 1}`}
						>
							<MoreVertical className="h-5 w-5 text-white" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="min-w-40">
						<DropdownMenuItem onClick={() => onOpenLightbox(index)} className="gap-2 py-2.5">
							<Expand className="h-4 w-4" />
							Agrandir
						</DropdownMenuItem>
						{/* WCAG 2.5.7: Drag alternatives */}
						{(canMoveUp ?? canMoveDown) && <DropdownMenuSeparator />}
						{canMoveUp && (
							<DropdownMenuItem onClick={onMoveUp} className="gap-2 py-2.5">
								<ArrowUp className="h-4 w-4" />
								Déplacer vers le haut
							</DropdownMenuItem>
						)}
						{canMoveDown && (
							<DropdownMenuItem onClick={onMoveDown} className="gap-2 py-2.5">
								<ArrowDown className="h-4 w-4" />
								Déplacer vers le bas
							</DropdownMenuItem>
						)}
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
