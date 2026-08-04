"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { Button } from "@/shared/components/ui/button";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/shared/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/utils/cn";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
import { UI_DELAYS } from "@/modules/media/constants/ui-interactions.constants";
import { EditAltTextDialog } from "@/modules/media/components/admin/edit-alt-text-dialog";
import {
	ArrowDownIcon,
	ArrowUpIcon,
	ArrowsOutIcon,
	DotsSixVerticalIcon,
	DotsThreeVerticalIcon,
	FileTextIcon,
	PlayIcon,
	StarIcon,
	TrashIcon,
} from "@phosphor-icons/react/ssr";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/modules/media/types/hooks.types";
import { IMAGE_QUALITY } from "@/modules/media/constants/image-config.constants";

export interface SortableMediaItemProps {
	media: MediaItem;
	index: number;
	isPrimary: boolean;
	isImageLoaded: boolean;
	shouldReduceMotion: boolean | null;
	isDraggingAny: boolean;
	onImageLoaded: (url: string) => void;
	onOpenLightbox: (index: number) => void;
	onOpenDeleteDialog: () => void;
	/** WCAG 2.5.7: Alternative to drag for moving the item up */
	onMoveUp?: () => void;
	/** WCAG 2.5.7: Alternative to drag for moving the item down */
	onMoveDown?: () => void;
	/** Total number of items (to determine if we can move down) */
	totalCount?: number;
	/** Promote this item to first position (set as primary). Omitted when isPrimary or for videos. */
	onSetAsPrimary?: () => void;
	/** Update the media's alt text (description for SEO + screen readers). */
	onUpdateAltText?: (altText: string) => void;
	/**
	 * Id du span d'instructions clavier rendu par la grille parente. Sans ce
	 * binding, le KeyboardSensor pose son propre `aria-describedby` générique
	 * (il ne s'efface que si l'attribut existe déjà) et les instructions
	 * françaises ne sont jamais vocalisées.
	 */
	dragInstructionsId?: string;
}

// Tap-vs-scroll threshold on the video element (px of movement between touchstart and touchend).
const VIDEO_TAP_MOVE_TOLERANCE_PX = 10;

export function SortableMediaItem({
	media,
	index,
	isPrimary,
	isImageLoaded,
	shouldReduceMotion,
	isDraggingAny,
	onImageLoaded,
	onOpenLightbox,
	onOpenDeleteDialog,
	onMoveUp,
	onMoveDown,
	totalCount = 1,
	onSetAsPrimary,
	onUpdateAltText,
	dragInstructionsId,
}: SortableMediaItemProps) {
	const canMoveUp = Boolean(index > 0 && onMoveUp);
	const canMoveDown = Boolean(index < totalCount - 1 && onMoveDown);
	const haptic = useHaptic();
	const isTouchDevice = useIsTouchDevice();
	const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
	const [editAltOpen, setEditAltOpen] = useState(false);
	const [isPressing, setIsPressing] = useState(false);
	const mobileTriggerRef = useRef<HTMLButtonElement>(null);
	const wasMobileActionsOpenRef = useRef(false);

	// Restaure le focus sur le trigger EllipsisVertical après fermeture du drawer Actions —
	// Vaul ne le fait pas par défaut, le focus retourne au body (perte de contexte clavier).
	useEffect(() => {
		if (mobileActionsOpen) {
			wasMobileActionsOpenRef.current = true;
			return;
		}
		if (!wasMobileActionsOpenRef.current) return;
		wasMobileActionsOpenRef.current = false;
		const id = requestAnimationFrame(() => {
			mobileTriggerRef.current?.focus({ preventScroll: true });
		});
		return () => cancelAnimationFrame(id);
	}, [mobileActionsOpen]);
	// `handleRef` is intentionally not bound — leaving `sortable.handle` undefined makes the
	// entire `ref` element the drag source, so drag activates from anywhere on the tile (via
	// PointerSensor: distance on desktop, long-press on touch). The grip icon stays as a
	// visual cue. Child buttons keep their click handlers — quick taps fire before the
	// activation delay engages.
	const { ref, isDragSource } = useSortable({
		id: media.url,
		index,
		transition: shouldReduceMotion ? null : { duration: 200, easing: "ease" },
	});

	const isVideo = media.mediaType === "VIDEO";
	const [thumbnailError, setThumbnailError] = useState(false);
	const showThumbnail = isVideo && media.thumbnailUrl && !thumbnailError;

	// Haptique au DÉBUT du drag uniquement : c'est l'instant où l'utilisateur a
	// besoin de savoir que la prise est acquise. La fin de drag n'en émet plus —
	// avec le `selection` du drop (`media-upload-grid`), un simple réordonnancement
	// produisait 3 vibrations.
	const wasDragSourceRef = useRef(false);
	useEffect(() => {
		if (isDragSource && !wasDragSourceRef.current) {
			haptic("medium");
			wasDragSourceRef.current = true;
		} else if (!isDragSource && wasDragSourceRef.current) {
			wasDragSourceRef.current = false;
		}
	}, [isDragSource, haptic]);

	// Long-press visual feedback (touch only): scale down after LONG_PRESS_ACTIVATION_MS
	// to confirm the hold is registering before the drag engages.
	const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const clearPressTimer = () => {
		if (pressTimerRef.current) {
			clearTimeout(pressTimerRef.current);
			pressTimerRef.current = null;
		}
	};
	useEffect(() => () => clearPressTimer(), []);
	// When @dnd-kit engages the drag (pointer capture), release events may not bubble back
	// to React — reset the transient press flag defensively when drag starts.
	useEffect(() => {
		if (!isDragSource) return;
		clearPressTimer();
		// eslint-disable-next-line react-hooks/set-state-in-effect -- sync a transient UI flag with @dnd-kit's external drag state
		setIsPressing(false);
	}, [isDragSource]);

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (event.pointerType !== "touch") return;
		clearPressTimer();
		pressTimerRef.current = setTimeout(() => {
			setIsPressing(true);
		}, UI_DELAYS.LONG_PRESS_ACTIVATION_MS);
	};
	const handlePointerEnd = () => {
		clearPressTimer();
		setIsPressing(false);
	};

	// Tap-vs-scroll tracking on the video element (native tap to open lightbox).
	const videoTouchStartRef = useRef<{ x: number; y: number } | null>(null);

	const closeMobileActions = () => setMobileActionsOpen(false);

	const handleOpenLightbox = () => {
		haptic("selection");
		closeMobileActions();
		onOpenLightbox(index);
	};

	const handleOpenDeleteDialog = () => {
		haptic("medium");
		closeMobileActions();
		onOpenDeleteDialog();
	};

	const handleMoveUp = () => {
		if (!onMoveUp) return;
		haptic("selection");
		closeMobileActions();
		onMoveUp();
	};

	const handleMoveDown = () => {
		if (!onMoveDown) return;
		haptic("selection");
		closeMobileActions();
		onMoveDown();
	};

	const handleSetAsPrimaryFromDrawer = () => {
		if (!onSetAsPrimary) return;
		haptic("medium");
		closeMobileActions();
		onSetAsPrimary();
	};

	const handleOpenEditAlt = () => {
		haptic("light");
		closeMobileActions();
		setEditAltOpen(true);
	};

	const mobileActionItems = (
		<div
			className="flex flex-col gap-1 overflow-y-auto overscroll-contain pb-2"
			data-base-ui-swipe-ignore=""
		>
			{!isPrimary && onSetAsPrimary && (
				<button
					type="button"
					onClick={handleSetAsPrimaryFromDrawer}
					className="hover:bg-warning/10 active:bg-warning/15 flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]"
				>
					<StarIcon className="text-warning size-5" fill="currentColor" aria-hidden="true" />
					<span className="text-sm font-medium">Définir comme principale</span>
				</button>
			)}
			<button
				type="button"
				onClick={handleOpenLightbox}
				className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]"
			>
				<ArrowsOutIcon className="text-muted-foreground size-5" aria-hidden="true" />
				<span className="text-sm font-medium">Agrandir</span>
			</button>
			{onUpdateAltText && (
				<button
					type="button"
					onClick={handleOpenEditAlt}
					className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]"
				>
					<FileTextIcon className="text-muted-foreground size-5" aria-hidden="true" />
					<span className="text-sm font-medium">Modifier la description</span>
				</button>
			)}
			{canMoveUp && (
				<button
					type="button"
					onClick={handleMoveUp}
					className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]"
				>
					<ArrowUpIcon className="text-muted-foreground size-5" aria-hidden="true" />
					<span className="text-sm font-medium">Déplacer vers le haut</span>
				</button>
			)}
			{canMoveDown && (
				<button
					type="button"
					onClick={handleMoveDown}
					className="hover:bg-muted/50 active:bg-muted flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]"
				>
					<ArrowDownIcon className="text-muted-foreground size-5" aria-hidden="true" />
					<span className="text-sm font-medium">Déplacer vers le bas</span>
				</button>
			)}
			<button
				type="button"
				onClick={handleOpenDeleteDialog}
				className="hover:bg-destructive/10 active:bg-destructive/15 text-destructive flex min-h-14 w-full items-center gap-3 rounded-lg px-4 py-3 text-left motion-safe:transition-colors motion-safe:duration-[var(--duration-fast)]"
			>
				<TrashIcon className="size-5" aria-hidden="true" />
				<span className="text-sm font-semibold">Supprimer</span>
			</button>
			<DrawerClose
				render={
					<Button
						type="button"
						variant="ghost"
						className="mt-1 min-h-12 w-full"
						onClick={() => haptic("light")}
					/>
				}
			>
				Annuler
			</DrawerClose>
		</div>
	);

	return (
		// eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- sortable item needs keyboard interactions
		<div
			ref={ref}
			// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- sortable item needs keyboard interactions
			tabIndex={0}
			data-pressing={isPressing ? "" : undefined}
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerEnd}
			onPointerCancel={handlePointerEnd}
			onPointerLeave={handlePointerEnd}
			onKeyDown={(e) => {
				// Pas de branche Entrée : le KeyboardSensor est un listener NATIF sur la
				// tuile — il saisit sur Espace/Entrée avec `stopImmediatePropagation`
				// avant que le handler React (délégué à la racine) ne s'exécute. Une
				// branche Entrée→lightbox ici ne tournait que pour NumpadEnter.
				// L'aperçu clavier passe par le bouton « Agrandir » (focus-within).
				if (e.key === "Delete" || e.key === "Backspace") {
					if (isDraggingAny) return;
					e.preventDefault();
					onOpenDeleteDialog();
				}
			}}
			className={cn(
				"group relative aspect-square shrink-0 overflow-hidden rounded-lg border-2",
				"touch-manipulation select-none [-webkit-touch-callout:none]",
				// Drag affordance: grab cursor on desktop hover, grabbing while pressed/dragging.
				"can-hover:cursor-grab data-[pressing]:cursor-grabbing",
				isDragSource && "cursor-grabbing",
				shouldReduceMotion
					? ""
					: "motion-safe:transition-[transform,border-color,opacity,box-shadow] motion-safe:duration-[var(--duration-normal)]",
				"data-[pressing]:scale-[0.97]",
				"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				isDragSource && "opacity-30",
				isPrimary
					? "border-warning ring-warning/50 ring-2"
					: "border-border hover:border-primary/50",
			)}
			role="group"
			aria-roledescription="élément réorganisable"
			aria-label={`${isVideo ? "Vidéo" : "Image"} ${index + 1}${isPrimary ? " (principale)" : ""}`}
			aria-describedby={dragInstructionsId}
		>
			{/* Skeleton/Loading state — shown for images and video thumbnails while loading */}
			{/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- boolean OR is intentional */}
			{!isImageLoaded && (showThumbnail || !isVideo) && !media.blurDataUrl && (
				<div className="bg-muted absolute inset-0 z-10 motion-safe:animate-pulse" />
			)}

			<div className="bg-muted relative h-full w-full">
				{isVideo ? (
					<div className="relative h-full w-full">
						{showThumbnail ? (
							<Image
								src={media.thumbnailUrl!}
								alt={media.altText ?? `Miniature vidéo ${index + 1}`}
								fill
								className={cn(
									"object-cover",
									shouldReduceMotion
										? ""
										: "motion-safe:transition-opacity motion-safe:duration-[var(--duration-slow)]",
									isImageLoaded ? "opacity-100" : "opacity-0",
								)}
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								quality={IMAGE_QUALITY.STANDARD}
								decoding="async"
								placeholder={media.blurDataUrl ? "blur" : "empty"}
								blurDataURL={media.blurDataUrl}
								onLoad={() => onImageLoaded(media.url)}
								onError={() => setThumbnailError(true)}
							/>
						) : (
							/* Pas de `poster` : cette branche ne joue QUE si thumbnailUrl manque
							   ou a échoué, et `blurDataUrl` est un JPEG 8×8 (ou un ThumbHash) —
							   étiré sur la tuile il est plus dégradé que la première frame que
							   le navigateur décode via preload="metadata". Le conteneur
							   `bg-muted` sert de fond en attendant. */
							<video
								src={media.url}
								className="h-full w-full object-cover"
								loop
								muted
								playsInline
								preload="metadata"
								onTouchStart={(e) => {
									const t = e.touches[0];
									videoTouchStartRef.current = t ? { x: t.clientX, y: t.clientY } : null;
								}}
								onTouchEnd={(e) => {
									const start = videoTouchStartRef.current;
									videoTouchStartRef.current = null;
									if (isDraggingAny) return;
									if (start) {
										const t = e.changedTouches[0];
										if (t) {
											const dx = t.clientX - start.x;
											const dy = t.clientY - start.y;
											if (Math.hypot(dx, dy) > VIDEO_TAP_MOVE_TOLERANCE_PX) return;
										}
									}
									e.stopPropagation();
									handleOpenLightbox();
								}}
								onMouseEnter={
									isTouchDevice
										? undefined
										: (e) => {
												if (shouldReduceMotion) return;
												if (e.currentTarget.readyState === 0) {
													e.currentTarget.load();
												}
												e.currentTarget.play().catch(() => {
													// Ignore autoplay errors (e.g. user hasn't interacted yet)
												});
											}
								}
								onMouseLeave={
									isTouchDevice
										? undefined
										: (e) => {
												e.currentTarget.pause();
												e.currentTarget.currentTime = 0;
											}
								}
								aria-label={media.altText ?? `Aperçu vidéo ${index + 1}`}
							>
								Ton navigateur ne peut pas lire cette vidéo.
							</video>
						)}
						{/* Play icon - clickable to open lightbox.
						    `pointer-events-none` when invisible on hover-capable devices lets the
						    underlying <video> receive onMouseEnter/Leave + onTouch* (autoplay on hover,
						    tap-vs-scroll handling). Re-enabled on hover/focus so the button stays clickable. */}
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								handleOpenLightbox();
							}}
							className={cn(
								"absolute inset-0 flex cursor-pointer items-center justify-center",
								"can-hover:opacity-0 can-hover:group-focus-within:opacity-100 can-hover:group-hover:opacity-100 opacity-100",
								"can-hover:pointer-events-none can-hover:group-focus-within:pointer-events-auto can-hover:group-hover:pointer-events-auto",
								"motion-safe:transition-opacity motion-safe:duration-[var(--duration-normal)]",
							)}
							aria-label={`Lire la vidéo ${index + 1}`}
						>
							<div className="rounded-full bg-black/70 p-3 shadow-xl transition-colors hover:bg-black/90 active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]">
								<PlayIcon className="size-6 text-white" fill="white" />
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
							shouldReduceMotion
								? ""
								: "motion-safe:transition-opacity motion-safe:duration-[var(--duration-normal)]",
							isImageLoaded ? "opacity-100" : "opacity-0",
						)}
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
						quality={IMAGE_QUALITY.STANDARD}
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
					<div className="bg-warning text-warning-foreground flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold shadow-md">
						<StarIcon className="size-3" fill="currentColor" aria-hidden="true" />
						<span className="sm:hidden">1</span>
						<span className="hidden sm:inline">Principal</span>
					</div>
				</div>
			)}

			{/* Set-as-primary affordance — non-primary items only (videos receive undefined) */}
			{!isPrimary && onSetAsPrimary && (
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						e.stopPropagation();
						haptic("medium");
						onSetAsPrimary();
					}}
					className={cn(
						"absolute top-2 left-2 z-20 flex size-11 items-center justify-center rounded-full text-white",
						"bg-black/55 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/20 backdrop-blur-md",
						"can-hover:hover:bg-warning can-hover:hover:text-warning-foreground active:scale-[0.98] active:bg-black/75",
						"focus-visible:ring-warning focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
						"motion-safe:transition-[colors,transform] motion-safe:duration-[var(--duration-fast)]",
						"can-hover:opacity-0 can-hover:group-focus-within:opacity-100 can-hover:group-hover:opacity-100",
					)}
					aria-label={`Définir ${isVideo ? "la vidéo" : "l'image"} ${index + 1} comme principale`}
				>
					<StarIcon className="size-4" aria-hidden="true" />
				</button>
			)}

			{/* Drag affordance — visual cue only (the entire tile is the drag handle). Hidden on
			    touch devices where the EllipsisVertical drawer + inline chevrons cover reorder UX. */}
			<div
				aria-hidden="true"
				className={cn(
					"can-hover:flex pointer-events-none absolute top-2 right-2 z-20 hidden cursor-grab",
					"can-hover:opacity-0 can-hover:group-focus-within:opacity-100 can-hover:group-hover:opacity-100",
					shouldReduceMotion
						? ""
						: "motion-safe:transition-opacity motion-safe:duration-[var(--duration-fast)]",
				)}
			>
				<div className="flex size-11 items-center justify-center rounded-full bg-black/70 shadow-lg">
					<DotsSixVerticalIcon className="size-5 text-white" aria-hidden="true" />
				</div>
			</div>

			{/* Mobile inline reorder chevrons — alternative rapide au drawer Actions
			    (1 tap = 1 mouvement vs ouvrir-EllipsisVertical → Déplacer). Hidden sur hover-capable. */}
			{!isPrimary && (canMoveUp || canMoveDown) && (
				<div
					className="can-hover:hidden absolute right-2 bottom-2 z-10 flex items-center gap-1.5"
					aria-hidden="false"
				>
					{canMoveUp && (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								handleMoveUp();
							}}
							aria-label={`Déplacer ${isVideo ? "la vidéo" : "l'image"} ${index + 1} vers le haut`}
							className={cn(
								"flex size-9 items-center justify-center rounded-full",
								"bg-black/55 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/20 backdrop-blur-md",
								"active:scale-[0.95] active:bg-black/75",
								"focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none",
								"motion-safe:transition-[colors,transform] motion-safe:duration-[var(--duration-fast)]",
								"after:absolute after:-inset-1 after:content-['']",
							)}
						>
							<ArrowUpIcon className="size-4 text-white" aria-hidden="true" />
						</button>
					)}
					{canMoveDown && (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								handleMoveDown();
							}}
							aria-label={`Déplacer ${isVideo ? "la vidéo" : "l'image"} ${index + 1} vers le bas`}
							className={cn(
								"flex size-9 items-center justify-center rounded-full",
								"bg-black/55 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/20 backdrop-blur-md",
								"active:scale-[0.95] active:bg-black/75",
								"focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:outline-none",
								"motion-safe:transition-[colors,transform] motion-safe:duration-[var(--duration-fast)]",
								"after:absolute after:-inset-1 after:content-['']",
							)}
						>
							<ArrowDownIcon className="size-4 text-white" aria-hidden="true" />
						</button>
					)}
				</div>
			)}

			{/* Desktop actions — hover-reveal via can-hover (CSS-driven, no hydration flash) */}
			<div
				className={cn(
					"can-hover:flex absolute right-2 bottom-2 z-20 hidden items-center gap-1.5",
					"can-hover:opacity-0 can-hover:group-focus-within:opacity-100 can-hover:group-hover:opacity-100",
					shouldReduceMotion
						? ""
						: "motion-safe:transition-opacity motion-safe:duration-[var(--duration-fast)]",
				)}
			>
				{onUpdateAltText && (
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									type="button"
									variant="secondary"
									size="icon"
									onClick={(e) => {
										e.preventDefault();
										e.stopPropagation();
										setEditAltOpen(true);
									}}
									className="size-9 rounded-full border-0 bg-black/70 hover:bg-black/90 active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]"
									aria-label={`Modifier la description du média ${index + 1}`}
								/>
							}
						>
							<FileTextIcon className="size-4 text-white" aria-hidden="true" />
						</TooltipTrigger>
						<TooltipContent>Modifier la description</TooltipContent>
					</Tooltip>
				)}
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								type="button"
								variant="secondary"
								size="icon"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleOpenLightbox();
								}}
								className="size-9 rounded-full border-0 bg-black/70 hover:bg-black/90 active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]"
								aria-label={`Agrandir le média ${index + 1}`}
							/>
						}
					>
						<ArrowsOutIcon className="size-4 text-white" aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent>Agrandir</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger
						render={
							<Button
								type="button"
								variant="secondary"
								size="icon"
								onClick={(e) => {
									e.preventDefault();
									e.stopPropagation();
									handleOpenDeleteDialog();
								}}
								className="hover:bg-destructive size-9 rounded-full border-0 bg-black/70 active:scale-[0.98] motion-safe:transition-transform motion-safe:duration-[var(--duration-fast)]"
								aria-label={`Supprimer le média ${index + 1}`}
							/>
						}
					>
						<TrashIcon className="size-4 text-white" aria-hidden="true" />
					</TooltipTrigger>
					<TooltipContent>Supprimer</TooltipContent>
				</Tooltip>
			</div>

			{/* Mobile actions — Drawer Vaul bottom-sheet, hidden on hover-capable devices via CSS */}
			<div className="can-hover:hidden absolute top-2 right-2 z-20">
				<Drawer open={mobileActionsOpen} onOpenChange={setMobileActionsOpen}>
					<DrawerTrigger
						render={
							<Button
								ref={mobileTriggerRef}
								type="button"
								variant="secondary"
								size="icon"
								onClick={() => haptic("light")}
								className="size-11 rounded-full border-0 bg-black/55 shadow-[0_2px_8px_rgba(0,0,0,0.4)] ring-1 ring-white/20 backdrop-blur-md active:scale-[0.98] active:bg-black/75 motion-safe:transition-[colors,transform] motion-safe:duration-[var(--duration-fast)]"
								aria-label={`Actions pour le média ${index + 1}`}
							/>
						}
					>
						<DotsThreeVerticalIcon className="size-5 text-white" />
					</DrawerTrigger>
					<DrawerContent onOverlayClick={() => haptic("light")} className="max-h-[80vh]">
						<DrawerHeader>
							<div className="flex items-center gap-3">
								<div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-md">
									{isVideo && media.thumbnailUrl ? (
										<Image
											src={media.thumbnailUrl}
											alt=""
											fill
											className="object-cover"
											sizes="40px"
											aria-hidden="true"
										/>
									) : isVideo ? (
										<div className="bg-muted flex h-full w-full items-center justify-center">
											<PlayIcon
												className="text-muted-foreground size-4"
												fill="currentColor"
												aria-hidden="true"
											/>
										</div>
									) : (
										<Image
											src={media.url}
											alt=""
											fill
											className="object-cover"
											sizes="40px"
											aria-hidden="true"
										/>
									)}
								</div>
								<DrawerTitle className="flex-1 text-left">
									Actions sur {isVideo ? "la vidéo" : "l'image"} {index + 1}
								</DrawerTitle>
							</div>
						</DrawerHeader>
						{mobileActionItems}
					</DrawerContent>
				</Drawer>
			</div>

			{onUpdateAltText && (
				<EditAltTextDialog
					open={editAltOpen}
					onOpenChange={setEditAltOpen}
					currentAltText={media.altText}
					mediaType={media.mediaType}
					index={index}
					onSave={onUpdateAltText}
				/>
			)}
		</div>
	);
}
