"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Upload } from "lucide-react";

import { PendingUploadsGrid } from "@/shared/components/media-upload/pending-uploads-grid";
import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import {
	UploadProgress as UploadProgressBar,
	type UploadPhase,
} from "@/shared/components/media-upload/upload-progress";
import type { FileProgress } from "@/modules/media/types/hooks.types";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import type { MediaArrayField } from "@/modules/products/types/media-field.types";
import { useIsMobile } from "@/shared/hooks/use-mobile";
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
 *
 * One-shot après mount : l'input UploadThing est rendu de façon stable dans le
 * cycle de vie du composant. Si l'input arrive tardivement (rare), un MutationObserver
 * one-shot avec `subtree: true` patche puis se déconnecte immédiatement — pas de coût permanent.
 */
export function useDropzoneAccept(containerRef: React.RefObject<HTMLDivElement | null>) {
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const apply = (): boolean => {
			const input = container.querySelector<HTMLInputElement>('input[type="file"]');
			if (!input) return false;
			if (input.getAttribute("accept") !== ACCEPTED_MEDIA_MIME) {
				input.setAttribute("accept", ACCEPTED_MEDIA_MIME);
			}
			return true;
		};

		if (apply()) return;

		const observer = new MutationObserver(() => {
			if (apply()) observer.disconnect();
		});
		observer.observe(container, { childList: true, subtree: true });
		return () => observer.disconnect();
	}, [containerRef]);
}

/**
 * Intercepte les paste de fichiers image/vidéo au niveau de la fenêtre et redirige
 * vers le pipeline unifié `useMediaUpload` (au lieu de `appendOnPaste` UploadThing qui
 * court-circuiterait compression HEIC / bytes-progress / retry / offline queue).
 *
 * Skip si le focus est sur un input/textarea/contenteditable — l'utilisateur colle
 * du texte, pas une image.
 */
export function useDropzoneNativePaste(enabled: boolean, onFiles: (files: File[]) => void): void {
	const onFilesRef = useRef(onFiles);
	useEffect(() => {
		onFilesRef.current = onFiles;
	});

	useEffect(() => {
		if (!enabled) return;
		const handler = (e: ClipboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target) {
				const tag = target.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
			}
			const items = e.clipboardData?.files;
			if (!items || items.length === 0) return;
			const files = Array.from(items).filter(
				(f) => f.type.startsWith("image/") || f.type.startsWith("video/"),
			);
			if (files.length === 0) return;
			e.preventDefault();
			onFilesRef.current(files);
		};
		window.addEventListener("paste", handler);
		return () => window.removeEventListener("paste", handler);
	}, [enabled]);
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
	const dropzoneRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();
	const remaining = Math.max(0, maxMediaCount - (currentCount ?? field.state.value.length));
	const remainingLabel = `${remaining} restant${remaining > 1 ? "s" : ""}`;
	const pendingMode = isMobile && !isAtLimit && !isMediaUploading;
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const cappedRemaining = Math.max(0, remaining - pendingFiles.length);

	useDropzoneAccept(dropzoneRef);
	useDropzoneNativePaste(!isAtLimit && !isMediaUploading, (files) => handleUpload(files, field));

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

			{/* Pending uploads (mobile) — preview avant upload effectif (P0 G6) */}
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
								Confiez jusqu'à {maxMediaCount} clichés de votre bijou à l'atelier
							</p>
						</div>
					)}

					<UploadActionSheet
						accept="image/*,video/*"
						multiple
						disabled={isMediaUploading}
						onFilesSelected={onPickerFiles}
						triggerLabel="Ajouter des médias"
						triggerDescription={`${remainingLabel} • Image (16 Mo) / Vidéo (512 Mo)`}
						sheetTitle="Ajouter des médias"
						sheetDescription="Sélectionnez les images qui mettront votre pièce en lumière"
						showCamera
						desktopFallback={
							<div ref={dropzoneRef}>
								<UploadDropzone
									endpoint="catalogMedia"
									onChange={(files) => handleUpload(files, field)}
									onUploadError={(error) => {
										toast.error(`Erreur: ${error.message}`);
									}}
									config={{ mode: "auto" }}
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
	const dropzoneRef = useRef<HTMLDivElement>(null);
	const isMobile = useIsMobile();
	useDropzoneAccept(dropzoneRef);
	useDropzoneNativePaste(!isMediaUploading, (files) => handleUpload(files, field));
	const remaining =
		maxMediaCount !== undefined
			? Math.max(0, maxMediaCount - (currentCount ?? field.state.value.length))
			: null;
	const remainingLabel =
		remaining !== null ? `${remaining} restant${remaining > 1 ? "s" : ""}` : undefined;
	const pendingMode = isMobile && !isMediaUploading;
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
				accept="image/*,video/*"
				multiple
				disabled={isMediaUploading}
				onFilesSelected={onPickerFiles}
				triggerLabel="Ajouter"
				triggerDescription={remainingLabel}
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
							config={{ mode: "auto" }}
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
