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
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { ArrowDown, ArrowUp, Expand, GripVertical, MoreVertical, Play, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import type { MediaItem } from "./media-upload-grid";

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
	/** WCAG 2.5.7: Alternative au drag pour monter l'élément */
	onMoveUp?: () => void;
	/** WCAG 2.5.7: Alternative au drag pour descendre l'élément */
	onMoveDown?: () => void;
	/** Nombre total d'éléments (pour déterminer si on peut descendre) */
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
				isDragging && "opacity-30",
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
									shouldReduceMotion ? "" : "motion-safe:transition-opacity motion-safe:duration-300",
									isImageLoaded ? "opacity-100" : "opacity-0"
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
								className="w-full h-full object-cover"
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
										// Ignorer les erreurs d'autoplay (ex: user hasn't interacted yet)
									});
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
							className={cn(
								"absolute inset-0 flex items-center justify-center cursor-pointer",
								"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
								"motion-safe:transition-opacity"
							)}
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
						placeholder={media.blurDataUrl ? "blur" : "empty"}
						blurDataURL={media.blurDataUrl}
						onLoad={() => onImageLoaded(media.url)}
					/>
				)}
			</div>

			{/* Badge principal */}
			{isPrimary && (
				<div className="absolute bottom-2 left-2 sm:top-2 sm:bottom-auto sm:left-2 z-10 pointer-events-none">
					<div className="flex items-center gap-1 bg-amber-600 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md">
						<Star className="w-3 h-3" fill="currentColor" aria-hidden="true" />
						<span className="sm:hidden">1</span>
						<span className="hidden sm:inline">Principal</span>
					</div>
				</div>
			)}

			{/* Handle de drag */}
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
							"top-2 left-2 sm:top-2 sm:left-auto sm:right-2",
							"flex",
							"opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full",
							shouldReduceMotion ? "" : "motion-safe:transition-opacity"
						)}
					>
						<div className="h-10 w-10 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center shadow-lg">
							<GripVertical className="h-5 w-5 text-white" aria-hidden="true" />
						</div>
					</button>
				</TooltipTrigger>
				<TooltipContent side="bottom" className="sm:hidden">
					Maintenir pour déplacer
				</TooltipContent>
			</Tooltip>

			{/* Hint long-press mobile */}
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

			{/* Actions Desktop */}
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

			{/* Actions Mobile */}
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
						{/* WCAG 2.5.7: Alternatives au drag */}
						{(canMoveUp || canMoveDown) && <DropdownMenuSeparator />}
						{canMoveUp && (
							<DropdownMenuItem
								onClick={onMoveUp}
								className="gap-2 py-2.5"
							>
								<ArrowUp className="h-4 w-4" />
								Déplacer vers le haut
							</DropdownMenuItem>
						)}
						{canMoveDown && (
							<DropdownMenuItem
								onClick={onMoveDown}
								className="gap-2 py-2.5"
							>
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
