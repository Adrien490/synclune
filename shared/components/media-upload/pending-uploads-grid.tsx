"use client";

import { Button } from "@/shared/components/ui/button";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useIsTouchDevice } from "@/shared/hooks/use-touch-device";
// `formatBytesShort` (Ko / Mo / Go) et non l'ancien `formatFileSize` (KB / MB) :
// ces pastilles s'affichent juste sous un hint « max 16 Mo ».
import { formatBytesShort } from "@/modules/media/utils/format-bytes";
import {
	formatVideoDuration,
	getVideoMetadata,
	type VideoMetadataPreview,
} from "@/modules/media/hooks/use-video-thumbnail";
import { cn } from "@/shared/utils/cn";
import { PlayIcon, XIcon } from "@phosphor-icons/react/ssr";
import { Spinner } from "@/shared/components/ui/spinner";
import { useEffect, useId, useRef, useState } from "react";
import { DragDropProvider, KeyboardSensor, PointerSensor, type DragEndEvent } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { PointerActivationConstraints } from "@dnd-kit/dom";
import { RestrictToWindow } from "@dnd-kit/dom/modifiers";
import { arrayMove } from "@dnd-kit/helpers";

interface PendingUploadsGridProps {
	/** Files awaiting confirmation */
	files: File[];
	/** Triggered when user removes a single file from the pending list */
	onRemove: (index: number) => void;
	/** Triggered when user confirms — files are sent to the upload pipeline */
	onConfirm: () => void;
	/** Triggered when user cancels — clears all pending files */
	onCancel: () => void;
	/** Triggered when user reorders pending files (P2.3). When omitted, items are static. */
	onReorder?: (next: File[]) => void;
	/** Optional label for the confirm CTA (e.g. "Téléverser") */
	confirmLabel?: string;
	/** Disable both CTAs while an upload is in flight */
	disabled?: boolean;
	/** Additional CSS classes */
	className?: string;
}

/**
 * Preview grid for files awaiting upload confirmation.
 * Lets the user remove individual files before sending the batch to UploadThing.
 *
 * Mobile: horizontal scroll with `scroll-fade-x` edge fades (avoids 2 stacked rows on 375w viewport).
 * Desktop: flex-wrap.
 *
 * Generates `URL.createObjectURL` previews and revokes them on unmount.
 * EXIF orientation is honoured via CSS `image-orientation: from-image` (P1.4).
 */
export function PendingUploadsGrid({
	files,
	onRemove,
	onConfirm,
	onCancel,
	onReorder,
	confirmLabel,
	disabled = false,
	className,
}: PendingUploadsGridProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const isTouchDevice = useIsTouchDevice();
	// Id unique : deux grilles montées en même temps ne doivent pas se partager
	// le span d'instructions clavier.
	const dragInstructionsId = useId();

	// Région live du réordonnancement — laissée ouverte en P3 par l'audit du
	// 2026-05-20 : le drag clavier fonctionnait sans qu'aucun retour vocal ne dise
	// où l'élément avait atterri. Montée avec un contenu VIDE, sinon une région
	// aria-live qui apparaît en même temps que son texte n'est pas vocalisée.
	const [announcement, setAnnouncement] = useState("");

	// Object URLs créées dans un effet et NON pendant le render : le render doit
	// rester pur (React peut le rejouer ou l'abandonner — les URLs d'un render
	// abandonné n'auraient jamais été révoquées et auraient retenu les Blobs).
	const [previews, setPreviews] = useState<string[]>([]);

	useEffect(() => {
		// Boucle explicite (et non `map`) : chaque URL créée est poussée dans `urls`,
		// le tableau que le cleanup révoque — l'appariement création/révocation reste
		// lisible pour un humain comme pour l'analyse statique.
		const urls: string[] = [];
		for (const file of files) {
			if (!file.type.startsWith("image/")) {
				urls.push("");
				continue;
			}
			try {
				urls.push(URL.createObjectURL(file));
			} catch {
				urls.push("");
			}
		}
		// eslint-disable-next-line react-hooks/set-state-in-effect -- ressource navigateur : sa création est un effet de bord, impossible en render
		setPreviews(urls);

		return () => {
			for (const url of urls) {
				if (url) URL.revokeObjectURL(url);
			}
		};
	}, [files]);

	// Video metadata previews — async first-frame + duration extraction
	const [videoPreviews, setVideoPreviews] = useState<Map<string, VideoMetadataPreview>>(
		() => new Map(),
	);
	// Clés déjà extraites — un ref, PAS l'état `videoPreviews` dans les deps : avec
	// l'état en dépendance, chaque metadata résolue relançait l'effet, dont le
	// cleanup abortait l'extraction en vol des vidéos restantes avant de la
	// redémarrer — O(N²) démarrages sur un lot. Une clé abortée n'est pas marquée,
	// elle sera retentée au prochain passage.
	const extractedKeysRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		const controller = new AbortController();
		const currentKeys = new Set(
			files.map((file, index) => `${file.name}-${file.lastModified}-${index}`),
		);

		// Async chain : purge des entries obsolètes (G3) + extraction des metadata des nouvelles videos.
		// Le purge est fusionné dans la même chaîne pour éviter setState synchrone en effect
		// (react-hooks/set-state-in-effect) et garantir une seule mise à jour par cycle.
		void (async () => {
			// Phase 1: purge stale entries (ref + state)
			for (const key of [...extractedKeysRef.current]) {
				if (!currentKeys.has(key)) extractedKeysRef.current.delete(key);
			}
			setVideoPreviews((prev) => {
				if (prev.size === 0) return prev;
				let hasStale = false;
				for (const key of prev.keys()) {
					if (!currentKeys.has(key)) {
						hasStale = true;
						break;
					}
				}
				if (!hasStale) return prev;
				const next = new Map<string, VideoMetadataPreview>();
				for (const [key, value] of prev) {
					if (currentKeys.has(key)) next.set(key, value);
				}
				return next;
			});

			// Phase 2: extract metadata for new videos
			const toProcess = files
				.map((file, index) => ({ file, key: `${file.name}-${file.lastModified}-${index}` }))
				.filter(
					({ file, key }) => file.type.startsWith("video/") && !extractedKeysRef.current.has(key),
				);

			for (const { file, key } of toProcess) {
				if (controller.signal.aborted) return;
				const metadata = await getVideoMetadata(file, controller.signal);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted can become true during await
				if (controller.signal.aborted || !metadata) continue;
				extractedKeysRef.current.add(key);
				setVideoPreviews((prev) => {
					if (prev.has(key)) return prev;
					const next = new Map(prev);
					next.set(key, metadata);
					return next;
				});
			}
		})();

		return () => controller.abort();
	}, [files]);

	if (files.length === 0) return null;

	const handleRemove = (index: number) => {
		haptic("light");
		onRemove(index);
	};

	const handleConfirm = () => {
		haptic("medium");
		onConfirm();
	};

	const handleCancel = () => {
		haptic("light");
		onCancel();
	};

	const handleDragStart = () => {
		setAnnouncement("Fichier saisi. Utilise les flèches pour le déplacer.");
	};

	const handleDragEnd = (event: DragEndEvent) => {
		if (!onReorder) return;
		if (event.canceled) {
			setAnnouncement("Déplacement annulé.");
			return;
		}
		const { source, target } = event.operation;
		if (!source || !target || source.id === target.id) {
			setAnnouncement("");
			return;
		}
		const sourceIndex = files.findIndex((f, i) => `${f.name}-${f.lastModified}-${i}` === source.id);
		const targetIndex = files.findIndex((f, i) => `${f.name}-${f.lastModified}-${i}` === target.id);
		if (sourceIndex < 0 || targetIndex < 0) return;
		haptic("selection");
		onReorder(arrayMove(files, sourceIndex, targetIndex));
		setAnnouncement(
			`${files[sourceIndex]?.name ?? "Fichier"} déplacé en position ${targetIndex + 1} sur ${files.length}.`,
		);
	};

	const ctaLabel =
		confirmLabel ?? `Téléverser ${files.length} fichier${files.length > 1 ? "s" : ""}`;

	const items = files.map((file, index) => {
		const preview = previews[index];
		const isVideo = file.type.startsWith("video/");
		const itemKey = `${file.name}-${file.lastModified}-${index}`;
		const videoMeta = isVideo ? videoPreviews.get(itemKey) : undefined;
		const videoPreviewUrl = videoMeta?.previewDataUrl ?? "";
		const videoDuration = videoMeta ? formatVideoDuration(videoMeta.durationSec) : null;

		return (
			<PendingUploadItem
				key={itemKey}
				itemKey={itemKey}
				file={file}
				index={index}
				preview={preview ?? ""}
				isVideo={isVideo}
				videoPreviewUrl={videoPreviewUrl}
				videoDuration={videoDuration}
				disabled={disabled}
				draggable={Boolean(onReorder)}
				dragInstructionsId={dragInstructionsId}
				onRemove={() => handleRemove(index)}
			/>
		);
	});

	const list = isMobile ? (
		<div
			data-slot="scroll-fade-container"
			data-no-edge-swipe=""
			className="scroll-fade-x no-scrollbar w-full overflow-x-auto overflow-y-hidden"
		>
			<div className="flex w-fit min-w-full gap-2 pb-1">{items}</div>
		</div>
	) : (
		<div className="flex flex-wrap gap-2">{items}</div>
	);

	const listSection = onReorder ? (
		<DragDropProvider
			sensors={[
				PointerSensor.configure({
					activationConstraints: isTouchDevice
						? [new PointerActivationConstraints.Delay({ value: 250, tolerance: 8 })]
						: [new PointerActivationConstraints.Distance({ value: 8 })],
				}),
				KeyboardSensor,
			]}
			modifiers={[RestrictToWindow]}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
			<span id={dragInstructionsId} className="sr-only">
				Utilise Espace ou Entrée pour saisir un fichier, les flèches pour le déplacer, Espace ou
				Entrée pour déposer, Échap pour annuler.
			</span>
			<div aria-live="polite" aria-atomic="true" className="sr-only">
				{announcement}
			</div>
			{list}
		</DragDropProvider>
	) : (
		list
	);

	return (
		<div
			className={cn("space-y-3 rounded-xl border p-3", className)}
			role="group"
			aria-label={`${files.length} fichier${files.length > 1 ? "s" : ""} en attente de confirmation`}
		>
			<div className="flex items-center justify-between gap-2">
				<p className="text-sm font-medium">
					{files.length} fichier{files.length > 1 ? "s" : ""} en attente
				</p>
				<span className="text-muted-foreground text-xs tabular-nums">
					{formatBytesShort(files.reduce((sum, f) => sum + f.size, 0))}
				</span>
			</div>

			{listSection}

			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="ghost"
					onClick={handleCancel}
					disabled={disabled}
					className="min-h-11 sm:min-w-24"
				>
					Annuler
				</Button>
				<Button
					type="button"
					variant="default"
					onClick={handleConfirm}
					disabled={disabled}
					className="min-h-11 sm:min-w-32"
				>
					{disabled && <Spinner presentational />}
					{ctaLabel}
				</Button>
			</div>
		</div>
	);
}

interface PendingUploadItemProps {
	itemKey: string;
	file: File;
	index: number;
	preview: string;
	isVideo: boolean;
	videoPreviewUrl: string;
	videoDuration: string | null;
	disabled: boolean;
	draggable: boolean;
	/** Id du span d'instructions clavier rendu par la grille (useId du parent). */
	dragInstructionsId: string;
	onRemove: () => void;
}

function PendingUploadItem({
	itemKey,
	file,
	index,
	preview,
	isVideo,
	videoPreviewUrl,
	videoDuration,
	disabled,
	draggable,
	dragInstructionsId,
	onRemove,
}: PendingUploadItemProps) {
	// Hooks must run unconditionally — when not draggable we simply don't attach the ref
	const sortable = useSortable({ id: itemKey, index });

	return (
		<div
			ref={draggable ? sortable.ref : undefined}
			{...(draggable
				? {
						tabIndex: 0,
						role: "group",
						"aria-roledescription": "fichier réorganisable",
						"aria-label": `Fichier ${index + 1} : ${file.name}`,
						"aria-describedby": dragInstructionsId,
					}
				: {})}
			className={cn(
				"bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg border",
				draggable && "touch-none",
				draggable &&
					"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				draggable && sortable.isDragging && "ring-primary z-10 ring-2",
			)}
		>
			{!isVideo && preview ? (
				// eslint-disable-next-line @next/next/no-img-element -- blob URL preview, not an optimised remote image
				<img
					src={preview}
					alt={`Aperçu ${file.name}`}
					className="size-full object-cover [image-orientation:from-image]"
					loading="lazy"
					decoding="async"
				/>
			) : isVideo && videoPreviewUrl ? (
				// eslint-disable-next-line @next/next/no-img-element -- client-generated data URL thumbnail
				<img
					src={videoPreviewUrl}
					alt={`Aperçu vidéo ${file.name}`}
					className="size-full object-cover"
					loading="lazy"
					decoding="async"
				/>
			) : isVideo ? (
				<div className="bg-muted flex size-full animate-pulse items-center justify-center motion-reduce:animate-none">
					<Spinner label="Extraction de la miniature vidéo" className="text-muted-foreground" />
				</div>
			) : (
				<div className="bg-muted flex size-full items-center justify-center">
					<span className="text-muted-foreground text-xs uppercase">Fichier</span>
				</div>
			)}

			{isVideo && (
				<div
					className="pointer-events-none absolute inset-0 flex items-center justify-center"
					aria-hidden="true"
				>
					<PlayIcon className="size-5 text-white drop-shadow-md" fill="currentColor" />
				</div>
			)}

			{/* Remove button — 44px touch target via after extender */}
			<button
				type="button"
				onClick={onRemove}
				disabled={disabled}
				aria-label={`Retirer ${file.name}`}
				className={cn(
					"absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow",
					"after:absolute after:-inset-2 after:content-['']",
					"hover:bg-black/90 disabled:opacity-50",
					"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				)}
			>
				<XIcon className="size-3.5" aria-hidden="true" />
			</button>

			{/* Info pills: duration (videos) + file size */}
			<div className="pointer-events-none absolute right-1 bottom-1 left-1 flex items-center justify-between gap-1">
				{videoDuration ? (
					<span
						className="bg-background/90 text-foreground text-2xs rounded px-1 tabular-nums shadow-sm"
						aria-hidden="true"
					>
						{videoDuration}
					</span>
				) : (
					<span />
				)}
				<span
					className="bg-background/90 text-foreground text-2xs rounded px-1 tabular-nums shadow-sm"
					aria-hidden="true"
				>
					{formatBytesShort(file.size)}
				</span>
			</div>
		</div>
	);
}
