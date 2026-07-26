"use client";

import { useState } from "react";
import { ImagePlus, Upload } from "lucide-react";

import { NativeDropzone } from "@/shared/components/media-upload/native-dropzone";
import { PendingUploadsGrid } from "@/shared/components/media-upload/pending-uploads-grid";
import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import {
	UploadProgress as UploadProgressBar,
	type UploadPhase,
} from "@/shared/components/media-upload/upload-progress";
import {
	IMAGE_FORMATS_LABEL,
	VIDEO_FORMATS_LABEL,
} from "@/modules/media/constants/media-limits.constants";
import type { FileProgress } from "@/modules/media/types/hooks.types";
import { MEDIA_SIZE_LIMITS } from "@/modules/media/utils/validate-media-file";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import type { MediaArrayField } from "@/modules/products/types/media-field.types";
import { toast } from "@/shared/utils/toast";

// SSOT upload-zone copy derived from the size + format constants (F3).
const IMAGE_MAX_MB = Math.round(MEDIA_SIZE_LIMITS.CATALOG_IMAGE / 1024 / 1024);
const VIDEO_MAX_MB = Math.round(MEDIA_SIZE_LIMITS.VIDEO / 1024 / 1024);
/** Long format+size hint (empty-state dropzone). */
const MEDIA_FORMATS_HINT = `Images ${IMAGE_FORMATS_LABEL} (max ${IMAGE_MAX_MB} Mo) · Vidéos ${VIDEO_FORMATS_LABEL} (max ${VIDEO_MAX_MB} Mo)`;
/** Short size hint (action-sheet trigger description). */
const MEDIA_SIZE_HINT = `Image (${IMAGE_MAX_MB} Mo) / Vidéo (${VIDEO_MAX_MB} Mo)`;
/** Shared accept filter for catalog media (images + videos). */
const CATALOG_ACCEPT = "image/*,video/*";

export interface UploadProgressShape {
	phase: UploadPhase | string;
	completed: number;
	total: number;
	queued: number;
	current?: string;
	files?: FileProgress[];
	bytesUploaded?: number;
	bytesTotal?: number;
	bytesPerSecond?: number | null;
	etaSeconds?: number | null;
}

/**
 * Computes the upload progress percentage (0-100) for shared <UploadProgress>.
 */
function progressPercent(progress: UploadProgressShape | null): number {
	if (!progress || progress.total === 0) return 0;
	return Math.min(100, Math.round((progress.completed / progress.total) * 100));
}

// ============================================================================
// Empty state (dropzone visible quand aucun média uploadé)
// ============================================================================

interface EmptyMediaStateProps {
	field: MediaArrayField;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	isAtLimit: boolean;
	maxMediaCount: number;
	/** Nombre de médias déjà présents dans le champ — pilote le count "X restants" sur le trigger */
	currentCount?: number;
	handleUpload: (files: File[], field: MediaField) => void;
	onCancel: () => void;
	onCancelOne?: (fileName: string) => void;
}

export function EmptyMediaState({
	field,
	isMediaUploading,
	uploadProgress,
	isAtLimit,
	maxMediaCount,
	currentCount,
	handleUpload,
	onCancel,
	onCancelOne,
}: EmptyMediaStateProps) {
	const remaining = Math.max(0, maxMediaCount - (currentCount ?? field.state.value.length));
	const remainingLabel = `${remaining} restant${remaining > 1 ? "s" : ""}`;
	// Pending-preview (review-before-send) on both mobile and desktop (F2).
	const pendingMode = !isAtLimit && !isMediaUploading;
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const cappedRemaining = Math.max(0, remaining - pendingFiles.length);

	const onPickerFiles = (files: File[]) => {
		if (!pendingMode) {
			handleUpload(files, field);
			return;
		}
		const capped = files.slice(0, cappedRemaining);
		if (capped.length === 0) {
			toast.warning(`Vous avez atteint ${maxMediaCount} médias`);
			return;
		}
		if (capped.length < files.length) {
			toast.warning(
				`Seulement ${capped.length} média${capped.length > 1 ? "s" : ""} ajouté${capped.length > 1 ? "s" : ""} à la file`,
			);
		}
		setPendingFiles((prev) => [...prev, ...capped]);
	};

	const handleConfirmPending = () => {
		if (pendingFiles.length === 0) return;
		const toUpload = pendingFiles;
		setPendingFiles([]);
		handleUpload(toUpload, field);
	};

	return (
		<div className="space-y-3">
			{/* Progress feedback during upload — shared component (cancel-aware) */}
			{isMediaUploading && uploadProgress && (
				<div className="bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-3 rounded-xl border-2 px-4 py-6">
					<UploadProgressBar
						progress={progressPercent(uploadProgress)}
						phase={uploadProgress.phase as UploadPhase}
						currentFileName={uploadProgress.current}
						queuedCount={uploadProgress.queued}
						completedCount={uploadProgress.completed}
						files={uploadProgress.files}
						bytesUploaded={uploadProgress.bytesUploaded}
						bytesTotal={uploadProgress.bytesTotal}
						bytesPerSecond={uploadProgress.bytesPerSecond}
						etaSeconds={uploadProgress.etaSeconds}
						onCancel={onCancel}
						onCancelOne={onCancelOne}
					/>
				</div>
			)}

			{/* Pending uploads — preview avant upload effectif, mobile + desktop (F2) */}
			{pendingMode && pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
					onConfirm={handleConfirmPending}
					onCancel={() => setPendingFiles([])}
					onReorder={(next) => setPendingFiles(next)}
					disabled={isMediaUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} média${pendingFiles.length > 1 ? "s" : ""}`}
				/>
			)}

			{/* Dropzone — always visible for queueing */}
			{!isAtLimit && (
				<div id="media-upload-zone" className="space-y-3">
					{!isMediaUploading && pendingFiles.length === 0 && (
						<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed p-3">
							<ImagePlus className="text-muted-foreground/50 size-5" />
							<p className="text-muted-foreground text-sm">
								Confiez jusqu'à {maxMediaCount} médias de votre bijou à l'atelier
							</p>
						</div>
					)}

					<UploadActionSheet
						accept={CATALOG_ACCEPT}
						multiple
						disabled={isMediaUploading}
						onFilesSelected={onPickerFiles}
						triggerLabel="Ajouter des médias"
						triggerDescription={`${remainingLabel} • ${MEDIA_SIZE_HINT}`}
						sheetTitle="Ajouter des médias"
						sheetDescription="Sélectionnez les images qui mettront votre pièce en lumière"
						showCamera
						desktopFallback={
							<NativeDropzone
								accept={CATALOG_ACCEPT}
								multiple
								disabled={isMediaUploading}
								onFiles={onPickerFiles}
								ariaLabel="Zone d'upload des médias du bijou"
								primaryLabel="Cliquez ou glissez-déposez vos médias"
								dropLabel="Relâchez pour ajouter"
								hint={MEDIA_FORMATS_HINT}
								icon={<Upload className="text-primary/70 size-12" aria-hidden="true" />}
								className="min-h-40 rounded-xl"
							/>
						}
					/>
				</div>
			)}
			{field.state.meta.errors.length > 0 && (
				<div role="alert" className="text-destructive space-y-1 text-center text-sm">
					{field.state.meta.errors.map((error: unknown) => (
						<p key={String(error)}>{String(error)}</p>
					))}
				</div>
			)}
		</div>
	);
}

// ============================================================================
// Inline zone (à côté de la grille quand au moins 1 média uploadé)
// ============================================================================

interface InlineUploadZoneProps {
	field: MediaField;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	handleUpload: (files: File[], field: MediaField) => void;
	/** Nombre total autorisé — pilote le count "X restants" du trigger */
	maxMediaCount?: number;
	/** Nombre de médias déjà présents — pilote le count "X restants" du trigger */
	currentCount?: number;
}

export function InlineUploadZone({
	field,
	isMediaUploading,
	uploadProgress,
	handleUpload,
	maxMediaCount,
	currentCount,
}: InlineUploadZoneProps) {
	const remaining =
		maxMediaCount !== undefined
			? Math.max(0, maxMediaCount - (currentCount ?? field.state.value.length))
			: null;
	const remainingLabel =
		remaining !== null ? `${remaining} restant${remaining > 1 ? "s" : ""}` : undefined;
	// Pending-preview on both mobile and desktop (F2).
	const pendingMode = !isMediaUploading;
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const cappedRemaining = remaining !== null ? Math.max(0, remaining - pendingFiles.length) : null;

	const onPickerFiles = (files: File[]) => {
		if (!pendingMode) {
			handleUpload(files, field);
			return;
		}
		const capped = cappedRemaining !== null ? files.slice(0, cappedRemaining) : files;
		if (capped.length === 0) {
			toast.warning(`Limite atteinte`);
			return;
		}
		if (capped.length < files.length) {
			toast.warning(
				`Seulement ${capped.length} média${capped.length > 1 ? "s" : ""} ajouté${capped.length > 1 ? "s" : ""} à la file`,
			);
		}
		setPendingFiles((prev) => [...prev, ...capped]);
	};

	const handleConfirmPending = () => {
		if (pendingFiles.length === 0) return;
		const toUpload = pendingFiles;
		setPendingFiles([]);
		handleUpload(toUpload, field);
	};

	return (
		<div className="flex h-full w-full flex-col">
			{isMediaUploading && (
				<div className="bg-primary/5 flex items-center justify-center gap-2 rounded-t-lg px-2 py-1.5">
					<div className="border-primary/20 border-t-primary size-4 rounded-full border-2 motion-safe:animate-spin" />
					<p className="text-muted-foreground text-xs">
						{uploadProgress?.completed ?? 0}/{uploadProgress?.total ?? 0}
						{uploadProgress && uploadProgress.queued > 0 && (
							<span> (+{uploadProgress.queued})</span>
						)}
					</p>
				</div>
			)}
			{pendingMode && pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={(index) => setPendingFiles((prev) => prev.filter((_, i) => i !== index))}
					onConfirm={handleConfirmPending}
					onCancel={() => setPendingFiles([])}
					onReorder={(next) => setPendingFiles(next)}
					disabled={isMediaUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} média${pendingFiles.length > 1 ? "s" : ""}`}
					className="mb-2"
				/>
			)}
			<UploadActionSheet
				accept={CATALOG_ACCEPT}
				multiple
				disabled={isMediaUploading}
				onFilesSelected={onPickerFiles}
				triggerLabel="Ajouter"
				triggerDescription={remainingLabel}
				triggerClassName="h-full min-h-0 w-full flex-1 border-dashed"
				sheetTitle="Ajouter des médias"
				showCamera
				desktopFallback={
					<NativeDropzone
						accept={CATALOG_ACCEPT}
						multiple
						disabled={isMediaUploading}
						onFiles={onPickerFiles}
						ariaLabel="Zone d'upload des médias du bijou"
						primaryLabel="Ajouter"
						dropLabel="Relâchez"
						icon={<Upload className="text-muted-foreground/50 size-6" aria-hidden="true" />}
						className="h-full min-h-0 w-full flex-1 gap-1 border-0 p-2"
					/>
				}
			/>
		</div>
	);
}
