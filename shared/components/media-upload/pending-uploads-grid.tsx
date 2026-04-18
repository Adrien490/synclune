"use client";

import { Button } from "@/shared/components/ui/button";
import ScrollFade from "@/shared/components/scroll-fade";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { formatFileSize } from "@/modules/media/utils/upload-helpers";
import {
	formatVideoDuration,
	getVideoMetadata,
	type VideoMetadataPreview,
} from "@/modules/media/hooks/use-video-thumbnail";
import { cn } from "@/shared/utils/cn";
import { Loader2, Play, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface PendingUploadsGridProps {
	/** Files awaiting confirmation */
	files: File[];
	/** Triggered when user removes a single file from the pending list */
	onRemove: (index: number) => void;
	/** Triggered when user confirms — files are sent to the upload pipeline */
	onConfirm: () => void;
	/** Triggered when user cancels — clears all pending files */
	onCancel: () => void;
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
 * Mobile: horizontal scroll with ScrollFade gradients (avoids 2 stacked rows on 375w viewport).
 * Desktop: flex-wrap.
 *
 * Generates `URL.createObjectURL` previews and revokes them on unmount.
 */
export function PendingUploadsGrid({
	files,
	onRemove,
	onConfirm,
	onCancel,
	confirmLabel,
	disabled = false,
	className,
}: PendingUploadsGridProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();

	// Object URLs computed in render — revoked on cleanup to avoid memory leaks
	const previews = useMemo(
		() =>
			files.map((file) => {
				if (!file.type.startsWith("image/")) return "";
				try {
					return URL.createObjectURL(file);
				} catch {
					return "";
				}
			}),
		[files],
	);

	useEffect(() => {
		return () => {
			for (const url of previews) {
				if (url) URL.revokeObjectURL(url);
			}
		};
	}, [previews]);

	// Video metadata previews (P2.4) — async first-frame + duration extraction
	const [videoPreviews, setVideoPreviews] = useState<Map<string, VideoMetadataPreview>>(
		() => new Map(),
	);

	useEffect(() => {
		const controller = new AbortController();
		const toProcess = files
			.map((file, index) => ({ file, key: `${file.name}-${file.lastModified}-${index}` }))
			.filter(({ file, key }) => file.type.startsWith("video/") && !videoPreviews.has(key));

		if (toProcess.length === 0) return;

		void (async () => {
			for (const { file, key } of toProcess) {
				if (controller.signal.aborted) return;
				const metadata = await getVideoMetadata(file, controller.signal);
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- signal.aborted can become true during await
				if (controller.signal.aborted || !metadata) continue;
				setVideoPreviews((prev) => {
					if (prev.has(key)) return prev;
					const next = new Map(prev);
					next.set(key, metadata);
					return next;
				});
			}
		})();

		return () => controller.abort();
	}, [files, videoPreviews]);

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

	const ctaLabel = confirmLabel ?? `Ajouter ${files.length} fichier${files.length > 1 ? "s" : ""}`;

	const items = files.map((file, index) => {
		const preview = previews[index];
		const isVideo = file.type.startsWith("video/");
		const itemKey = `${file.name}-${file.lastModified}-${index}`;
		const videoMeta = isVideo ? videoPreviews.get(itemKey) : undefined;
		const videoPreviewUrl = videoMeta?.previewDataUrl ?? "";
		const videoDuration = videoMeta ? formatVideoDuration(videoMeta.durationSec) : null;

		return (
			<div
				key={itemKey}
				className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg border"
			>
				{!isVideo && preview ? (
					// eslint-disable-next-line @next/next/no-img-element -- blob URL preview, not an optimised remote image
					<img
						src={preview}
						alt={`Aperçu ${file.name}`}
						className="size-full object-cover"
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
						<Loader2
							className="text-muted-foreground size-4 animate-spin motion-reduce:animate-none"
							aria-label="Extraction de la miniature vidéo"
						/>
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
						<Play className="size-5 text-white drop-shadow-md" fill="currentColor" />
					</div>
				)}

				{/* Remove button — 44px touch target via after extender */}
				<button
					type="button"
					onClick={() => handleRemove(index)}
					disabled={disabled}
					aria-label={`Retirer ${file.name}`}
					className={cn(
						"absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow",
						"after:absolute after:-inset-2 after:content-['']",
						"hover:bg-black/90 disabled:opacity-50",
						"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
					)}
				>
					<X className="size-3.5" aria-hidden="true" />
				</button>

				{/* Info pills: duration (videos) + file size */}
				<div className="pointer-events-none absolute right-1 bottom-1 left-1 flex items-center justify-between gap-1">
					{videoDuration ? (
						<span
							className="bg-background/90 text-foreground rounded px-1 text-[10px] tabular-nums shadow-sm"
							aria-hidden="true"
						>
							{videoDuration}
						</span>
					) : (
						<span />
					)}
					<span
						className="bg-background/90 text-foreground rounded px-1 text-[10px] tabular-nums shadow-sm"
						aria-hidden="true"
					>
						{formatFileSize(file.size)}
					</span>
				</div>
			</div>
		);
	});

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
					{formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
				</span>
			</div>

			{isMobile ? (
				<ScrollFade axis="horizontal" fadeFromClass="from-background">
					<div className="flex gap-2 pb-1">{items}</div>
				</ScrollFade>
			) : (
				<div className="flex flex-wrap gap-2">{items}</div>
			)}

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
					{disabled && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
					{ctaLabel}
				</Button>
			</div>
		</div>
	);
}
