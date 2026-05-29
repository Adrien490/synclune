"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { toast } from "@/shared/utils/toast";

import {
	UploadProgress,
	UploadErrorBanner,
} from "@/shared/components/media-upload/upload-progress";
import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import { NativeDropzone } from "@/shared/components/media-upload/native-dropzone";
import { PendingUploadsGrid } from "@/shared/components/media-upload/pending-uploads-grid";
import { OfflineQueueBanner } from "@/shared/components/media-upload/offline-queue-banner";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { useOfflineUploadQueue } from "@/modules/media/hooks/use-offline-upload-queue";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import ScrollFade from "@/shared/components/scroll-fade";
import { cn } from "@/shared/utils/cn";

import { REVIEW_CONFIG } from "../constants/review.constants";

export interface ReviewMediaItem {
	url: string;
	blurDataUrl?: string;
	altText?: string;
}

interface ReviewMediaUploadProps {
	media: ReviewMediaItem[];
	onChange: (media: ReviewMediaItem[]) => void;
	onMediaRemoved?: (url: string) => void;
	disabled?: boolean;
	className?: string;
}

const REVIEW_MAX_SIZE = 4 * 1024 * 1024;
const REVIEW_OFFLINE_CONTEXT_KEY = "review-media";

/**
 * Upload de photos pour les avis clients.
 * Mobile : capture native via UploadActionSheet.
 * Desktop : drop zone native (drag&drop fichiers depuis Finder).
 *
 * Tout passe par `useMediaUpload` — pipeline unifié mobile/desktop avec
 * compression HEIC + retry + bytes-based progress (P0.3).
 */
export function ReviewMediaUpload({
	media,
	onChange,
	onMediaRemoved,
	disabled = false,
	className,
}: ReviewMediaUploadProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);

	const remaining = REVIEW_CONFIG.MAX_MEDIA_COUNT - media.length;
	const canAddMore = remaining > 0 && !disabled;

	const {
		upload,
		cancel,
		cancelOne,
		retryFailed,
		retrySingle,
		clearFailed,
		isUploading,
		progress,
		failedFiles,
		queuedCount,
	} = useMediaUpload({
		endpoint: "reviewMedia",
		maxFiles: REVIEW_CONFIG.MAX_MEDIA_COUNT,
		maxSizeImage: REVIEW_MAX_SIZE,
		enableOfflineQueue: true,
		offlineContextKey: REVIEW_OFFLINE_CONTEXT_KEY,
		onSuccess: (results) => {
			haptic("success");
			const newMedia = [
				...media,
				...results.map((r) => ({ url: r.url, blurDataUrl: r.blurDataUrl })),
			].slice(0, REVIEW_CONFIG.MAX_MEDIA_COUNT);
			onChange(newMedia);
			setPendingFiles([]);
			toast.success(
				`${results.length} photo${results.length > 1 ? "s" : ""} ajoutée${results.length > 1 ? "s" : ""}`,
			);
		},
		onError: () => {
			haptic("error");
		},
	});

	// Block navigation while files are pending or an upload is in flight (P0.2)
	useUnsavedChanges(pendingFiles.length > 0 || isUploading, true, {
		message:
			pendingFiles.length > 0
				? "Des photos sont en attente de téléversement. Quitter les abandonnera."
				: "Un téléversement est en cours. Quitter abandonnera les fichiers en cours.",
	});

	// Offline queue (P1.2)
	const offlineQueue = useOfflineUploadQueue({
		endpoint: "reviewMedia",
		contextKey: REVIEW_OFFLINE_CONTEXT_KEY,
	});

	const handleReplayOffline = async () => {
		const files = await offlineQueue.drainAsFiles();
		if (files.length === 0) return;
		await upload(files);
		const { listEntries } = await import("@/modules/media/lib/offline-upload-queue");
		const entries = await listEntries({
			endpoint: "reviewMedia",
			contextKey: REVIEW_OFFLINE_CONTEXT_KEY,
		});
		for (const e of entries) await offlineQueue.drop(e.id);
	};

	// Local validation: filter wrong-type / oversized / over-limit files before queueing
	const acceptFiles = (files: File[]): File[] => {
		const remainingSlots = REVIEW_CONFIG.MAX_MEDIA_COUNT - media.length - pendingFiles.length;
		if (remainingSlots <= 0) {
			toast.warning(`Maximum ${REVIEW_CONFIG.MAX_MEDIA_COUNT} photos`);
			return [];
		}
		const accepted: File[] = [];
		const wrongType: { name: string; type: string }[] = [];
		const oversized: { name: string; size: number }[] = [];
		for (const file of files) {
			if (accepted.length >= remainingSlots) break;
			if (!file.type.startsWith("image/")) {
				wrongType.push({ name: file.name, type: file.type || "type inconnu" });
				continue;
			}
			if (file.size > REVIEW_MAX_SIZE) {
				oversized.push({ name: file.name, size: file.size });
				continue;
			}
			accepted.push(file);
		}
		if (wrongType.length > 0) {
			const first = wrongType[0]!;
			const moreSuffix =
				wrongType.length > 1
					? ` (+${wrongType.length - 1} autre${wrongType.length > 2 ? "s" : ""})`
					: "";
			toast.warning(`${wrongType.length} fichier(s) ignoré(s)`, {
				description: `« ${first.name} » (${first.type})${moreSuffix} — seuls JPEG, PNG, WebP et HEIC sont acceptés.`,
			});
		}
		if (oversized.length > 0) {
			const first = oversized[0]!;
			const sizeMb = (first.size / 1024 / 1024).toFixed(1);
			const moreSuffix =
				oversized.length > 1
					? ` (+${oversized.length - 1} autre${oversized.length > 2 ? "s" : ""})`
					: "";
			toast.warning(`${oversized.length} fichier(s) trop volumineux`, {
				description: `« ${first.name} » fait ${sizeMb} Mo${moreSuffix} — maximum 4 Mo par photo.`,
			});
		}
		const dropped = files.length - accepted.length - wrongType.length - oversized.length;
		if (dropped > 0) {
			toast.warning(`Limite de ${REVIEW_CONFIG.MAX_MEDIA_COUNT} photos`, {
				description: `${dropped} fichier(s) ignoré(s)`,
			});
		}
		return accepted;
	};

	const handleFilesSelected = (files: File[]) => {
		const accepted = acceptFiles(files);
		if (accepted.length > 0) {
			setPendingFiles((prev) => [...prev, ...accepted]);
		}
	};

	const handleRemovePending = (index: number) => {
		setPendingFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleConfirmUpload = async () => {
		if (pendingFiles.length === 0) return;
		await upload(pendingFiles);
	};

	const handleRemoveMedia = (index: number) => {
		haptic("medium");
		const removed = media[index];
		if (removed) onMediaRemoved?.(removed.url);
		const newMedia = media.filter((_, i) => i !== index);
		onChange(newMedia);
	};

	const thumbnails = media.map((m, index) => (
		<div
			key={m.url}
			role="listitem"
			className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg border"
		>
			<Image
				src={m.url}
				alt={m.altText ?? `Photo ${index + 1}`}
				fill
				className="object-cover"
				sizes="80px"
				placeholder={m.blurDataUrl ? "blur" : "empty"}
				blurDataURL={m.blurDataUrl}
			/>
			<button
				type="button"
				onClick={() => handleRemoveMedia(index)}
				disabled={disabled}
				aria-label={`Supprimer la photo ${index + 1}`}
				className={cn(
					"absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow",
					"after:absolute after:-inset-2 after:content-['']",
					"hover:bg-black/90 disabled:opacity-50",
					"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				)}
			>
				<X className="size-3.5" aria-hidden="true" />
			</button>
		</div>
	));

	return (
		<div className={cn("space-y-3", className)} aria-busy={isUploading}>
			{media.length > 0 && (
				<>
					{isMobile ? (
						<ScrollFade axis="horizontal" fadeFromClass="from-background">
							<div role="list" aria-label="Photos ajoutées" className="flex gap-2 pb-1">
								{thumbnails}
							</div>
						</ScrollFade>
					) : (
						<div role="list" aria-label="Photos ajoutées" className="flex flex-wrap gap-2">
							{thumbnails}
						</div>
					)}
				</>
			)}

			{offlineQueue.queuedCount > 0 && (
				<OfflineQueueBanner
					queuedCount={offlineQueue.queuedCount}
					isOffline={offlineQueue.isOffline}
					onReplay={() => void handleReplayOffline()}
					disabled={isUploading}
				/>
			)}

			{pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={handleRemovePending}
					onConfirm={handleConfirmUpload}
					onCancel={() => setPendingFiles([])}
					onReorder={(next) => setPendingFiles(next)}
					disabled={isUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} photo${pendingFiles.length > 1 ? "s" : ""}`}
				/>
			)}

			{failedFiles.length > 0 && (
				<UploadErrorBanner
					failedFiles={failedFiles}
					onRetry={() => void retryFailed()}
					onRetryOne={(file) => void retrySingle(file)}
					onDismiss={clearFailed}
				/>
			)}

			{canAddMore && pendingFiles.length === 0 && !isUploading && (
				<UploadActionSheet
					accept="image/*"
					multiple={remaining > 1}
					disabled={disabled}
					onFilesSelected={handleFilesSelected}
					triggerLabel="Ajouter des photos"
					triggerDescription={`${remaining} cliché${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""} (max 4 Mo)`}
					sheetTitle="Ajouter une photo"
					sheetDescription="Capturez votre bijou ou choisissez un cliché de votre galerie"
					showCamera
					desktopFallback={
						<NativeDropzone
							accept="image/*"
							multiple={remaining > 1}
							disabled={disabled}
							onFiles={handleFilesSelected}
							pasteFilter={(f) => f.type.startsWith("image/")}
							ariaLabel="Zone d'upload des photos pour l'avis (glissez ou cliquez)"
							primaryLabel="Glissez vos photos ou cliquez"
							dropLabel="Relâchez pour ajouter"
							hint={`${remaining} restante${remaining > 1 ? "s" : ""} (max 4 Mo) — collez aussi avec Ctrl/Cmd+V`}
						/>
					}
				/>
			)}

			{isUploading && progress && (
				<div
					className="bg-background/80 flex items-center justify-center rounded-lg border p-4 backdrop-blur-sm"
					role="status"
					aria-live="polite"
				>
					<UploadProgress
						progress={
							progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
						}
						phase={progress.phase}
						currentFileName={progress.current}
						queuedCount={queuedCount}
						completedCount={progress.completed}
						files={progress.files}
						bytesUploaded={progress.bytesUploaded}
						bytesTotal={progress.bytesTotal}
						bytesPerSecond={progress.bytesPerSecond}
						etaSeconds={progress.etaSeconds}
						onCancel={cancel}
						onCancelOne={cancelOne}
					/>
				</div>
			)}

			{media.length >= REVIEW_CONFIG.MAX_MEDIA_COUNT && (
				<p className="text-muted-foreground text-center text-xs">
					Limite de {REVIEW_CONFIG.MAX_MEDIA_COUNT} photos atteinte
				</p>
			)}
		</div>
	);
}
