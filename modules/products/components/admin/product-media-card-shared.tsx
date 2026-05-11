"use client";

import { useEffect, useRef } from "react";
import { ImagePlus, Upload } from "lucide-react";

import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import {
	UploadProgress as UploadProgressBar,
	type UploadPhase,
} from "@/shared/components/media-upload/upload-progress";
import type { FileProgress } from "@/modules/media/types/hooks.types";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import type { MediaArrayField } from "@/modules/products/types/media-field.types";
import { toast } from "@/shared/utils/toast";

export const ACCEPTED_MEDIA_MIME = "image/*,video/*,.heic,.heif";

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
export function progressPercent(progress: UploadProgressShape | null): number {
	if (!progress || progress.total === 0) return 0;
	return Math.min(100, Math.round((progress.completed / progress.total) * 100));
}

/**
 * Patches the UploadThing dropzone <input type="file"> with explicit `accept`
 * MIME so the browser picker filters correctly on desktop and iOS.
 */
export function useDropzoneAccept(containerRef: React.RefObject<HTMLDivElement | null>) {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const apply = () => {
			const input = container.querySelector<HTMLInputElement>('input[type="file"]');
			if (input && input.getAttribute("accept") !== ACCEPTED_MEDIA_MIME) {
				input.setAttribute("accept", ACCEPTED_MEDIA_MIME);
			}
		};

		apply();
		const observer = new MutationObserver(apply);
		observer.observe(container, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [containerRef]);
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
	handleUpload,
	onCancel,
	onCancelOne,
}: EmptyMediaStateProps) {
	const dropzoneRef = useRef<HTMLDivElement>(null);
	useDropzoneAccept(dropzoneRef);

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

			{/* Dropzone — always visible for queueing */}
			{!isAtLimit && (
				<div id="media-upload-zone" className="space-y-3">
					{!isMediaUploading && (
						<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed p-3">
							<ImagePlus className="text-muted-foreground/50 size-5" />
							<p className="text-muted-foreground text-sm">
								Ajoutez jusqu'à {maxMediaCount} images et vidéos
							</p>
						</div>
					)}

					<UploadActionSheet
						accept="image/*,video/*"
						multiple
						disabled={isMediaUploading}
						onFilesSelected={(files) => handleUpload(files, field)}
						triggerLabel="Ajouter des médias"
						triggerDescription={`Jusqu'à ${maxMediaCount} • Image (16 Mo) / Vidéo (512 Mo)`}
						sheetTitle="Ajouter des médias"
						sheetDescription="Choisissez les photos ou vidéos à ajouter au produit"
						showCamera
						desktopFallback={
							<div ref={dropzoneRef}>
								<UploadDropzone
									endpoint="catalogMedia"
									onChange={(files) => handleUpload(files, field)}
									onUploadError={(error) => {
										toast.error(`Erreur: ${error.message}`);
									}}
									config={{ mode: "auto", appendOnPaste: true }}
									aria-label="Zone d'upload des médias du bijou"
									className="focus-within:ring-ring w-full rounded-xl focus-within:ring-2 focus-within:ring-offset-2"
									appearance={{
										container: ({ isDragActive }) => ({
											border: "2px dashed",
											borderColor: isDragActive
												? "var(--primary)"
												: "color-mix(in oklch, var(--muted-foreground) 25%, transparent)",
											borderRadius: "0.75rem",
											backgroundColor: isDragActive
												? "color-mix(in oklch, var(--primary) 5%, transparent)"
												: "color-mix(in oklch, var(--muted) 30%, transparent)",
											padding: isMediaUploading ? "1rem" : "1.5rem",
											minHeight: isMediaUploading ? "80px" : "160px",
											maxHeight: isMediaUploading ? "120px" : "260px",
											display: "flex",
											flexDirection: "column",
											alignItems: "center",
											justifyContent: "center",
											gap: "0.5rem",
											cursor: "pointer",
										}),
										uploadIcon: () => ({ display: "none" }),
										label: () => ({ display: "none" }),
										allowedContent: () => ({
											display: "none",
										}),
										button: () => ({ display: "none" }),
									}}
									content={{
										uploadIcon: () => (
											<Upload
												className={
													isMediaUploading ? "text-primary/50 size-8" : "text-primary/70 size-12"
												}
											/>
										),
										label: ({ isDragActive }) => (
											<div className="space-y-1 text-center">
												<p className={isMediaUploading ? "text-sm" : "font-medium"}>
													{isDragActive
														? "Relâchez"
														: isMediaUploading
															? "Ajouter d'autres médias"
															: "Ajouter des médias"}
												</p>
												{!isMediaUploading && (
													<p className="text-muted-foreground text-xs">
														Images (max 16 Mo) et vidéos (max 512 Mo)
													</p>
												)}
											</div>
										),
									}}
								/>
							</div>
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
}

export function InlineUploadZone({
	field,
	isMediaUploading,
	uploadProgress,
	handleUpload,
}: InlineUploadZoneProps) {
	const dropzoneRef = useRef<HTMLDivElement>(null);
	useDropzoneAccept(dropzoneRef);

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
			<UploadActionSheet
				accept="image/*,video/*"
				multiple
				disabled={isMediaUploading}
				onFilesSelected={(files) => handleUpload(files, field)}
				triggerLabel="Ajouter"
				triggerClassName="h-full min-h-0 w-full flex-1 border-dashed"
				sheetTitle="Ajouter des médias"
				showCamera
				desktopFallback={
					<div ref={dropzoneRef} className="flex h-full min-h-0 w-full flex-1 flex-col gap-1">
						<UploadDropzone
							endpoint="catalogMedia"
							onChange={(files) => handleUpload(files, field)}
							onUploadError={(error) => {
								toast.error(`Erreur: ${error.message}`);
							}}
							config={{ mode: "auto", appendOnPaste: true }}
							className="h-full min-h-0 w-full flex-1"
							appearance={{
								container: ({ isDragActive }) => ({
									height: "100%",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									cursor: "pointer",
									backgroundColor: isDragActive
										? "color-mix(in oklch, var(--primary) 5%, transparent)"
										: "transparent",
								}),
								uploadIcon: () => ({
									display: "none",
								}),
								label: () => ({
									display: "none",
								}),
								allowedContent: () => ({
									display: "none",
								}),
								button: () => ({
									display: "none",
								}),
							}}
							content={{
								uploadIcon: () => <Upload className="text-muted-foreground/50 size-6" />,
								label: () => (
									<p className="text-muted-foreground mt-1 text-center text-xs">Ajouter</p>
								),
							}}
						/>
					</div>
				}
			/>
		</div>
	);
}
