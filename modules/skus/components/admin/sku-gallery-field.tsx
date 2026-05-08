"use client";

import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { PendingUploadsGrid } from "@/shared/components/media-upload/pending-uploads-grid";
import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import {
	UploadErrorBanner,
	UploadProgress,
	type UploadPhase,
} from "@/shared/components/media-upload/upload-progress";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { triggerHaptic } from "@/shared/hooks/use-haptic";
import { getCatalogDropzoneAppearance } from "@/modules/media/utils/upload-dropzone-appearance";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { ImagePlus, Info, Upload } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import type { MediaData } from "@/modules/skus/types/sku-form.types";
import type { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";

interface SkuGalleryFieldProps {
	value: MediaData[];
	setValue: (value: MediaData[]) => void;
	pushValue: (value: MediaData) => void;
	productName: string;
	galleryUpload: ReturnType<typeof useMediaUpload>;
}

const MAX_GALLERY_COUNT = ARRAY_LIMITS.SKU_GALLERY_MEDIA;

export function SkuGalleryField({
	value,
	setValue,
	pushValue,
	productName,
	galleryUpload,
}: SkuGalleryFieldProps) {
	const {
		upload: uploadMedia,
		cancel,
		retryFailed,
		retrySingle,
		clearFailed,
		isUploading: isMediaUploading,
		progress,
		failedFiles,
		queuedCount,
	} = galleryUpload;

	const [pendingFiles, setPendingFiles] = useState<File[]>([]);

	const currentCount = value.length;
	const isAtLimit = currentCount >= MAX_GALLERY_COUNT;

	const handleFilesSelected = (files: File[]) => {
		const remainingSlots = MAX_GALLERY_COUNT - value.length - pendingFiles.length;
		if (remainingSlots <= 0) {
			triggerHaptic("error");
			toast.warning(`Limite de ${MAX_GALLERY_COUNT} médias atteinte`);
			return;
		}
		const accepted = files.slice(0, remainingSlots);
		if (files.length > accepted.length) {
			triggerHaptic("error");
			toast.warning(`${files.length - accepted.length} fichier(s) ignoré(s)`, {
				description: `Limite de ${MAX_GALLERY_COUNT} médias`,
			});
		}
		setPendingFiles((prev) => [...prev, ...accepted]);
	};

	const handleRemovePending = (index: number) => {
		setPendingFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleConfirmUpload = async () => {
		if (pendingFiles.length === 0) return;
		const filesToUpload = pendingFiles;
		setPendingFiles([]);
		try {
			triggerHaptic("medium");
			const results = await uploadMedia(filesToUpload);
			results.forEach((result) => {
				pushValue({
					url: result.url,
					blurDataUrl: result.blurDataUrl,
					thumbnailUrl: result.thumbnailUrl,
					altText: productName,
					mediaType: result.mediaType,
				});
			});
			if (results.length > 0) triggerHaptic("success");
		} catch {
			triggerHaptic("error");
		}
	};

	const handleCancelPending = () => {
		setPendingFiles([]);
	};

	const progressPercent =
		progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label>Galerie (optionnel)</Label>
				<MediaCounterBadge count={currentCount} max={MAX_GALLERY_COUNT} />
			</div>

			{isAtLimit && (
				<div className="bg-secondary/10 border-secondary flex items-start gap-2 rounded-lg border p-3">
					<Info className="text-secondary-foreground mt-0.5 size-4 shrink-0" />
					<div className="text-secondary-foreground text-sm">
						<p className="font-medium">Limite atteinte</p>
						<p className="mt-0.5 text-xs">Supprimez un média pour en ajouter un nouveau.</p>
					</div>
				</div>
			)}

			<AnimatePresence mode="popLayout">
				{value.length > 0 && (
					<m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
						<MediaUploadGrid
							media={value.map((m) => ({
								url: m.url,
								mediaType: m.mediaType,
								altText: m.altText ?? undefined,
								thumbnailUrl: m.thumbnailUrl ?? undefined,
								blurDataUrl: m.blurDataUrl ?? undefined,
							}))}
							onChange={(newMedia) => {
								if (newMedia.length !== value.length) triggerHaptic("light");
								setValue(newMedia);
							}}
							skipUtapiDelete
						/>
					</m.div>
				)}
			</AnimatePresence>

			{value.length === 0 && pendingFiles.length === 0 && !isMediaUploading && (
				<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed p-3 text-left">
					<ImagePlus className="text-muted-foreground/50 size-6 shrink-0" />
					<div>
						<p className="text-foreground text-sm font-medium">Aucun média</p>
						<p className="text-muted-foreground text-xs">
							Jusqu'à {MAX_GALLERY_COUNT} images et vidéos
						</p>
					</div>
				</div>
			)}

			{pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={handleRemovePending}
					onConfirm={handleConfirmUpload}
					onCancel={handleCancelPending}
					disabled={isMediaUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} fichier${pendingFiles.length > 1 ? "s" : ""}`}
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

			{isMediaUploading && progress && (
				<div
					className="bg-primary/5 border-primary/20 flex items-center justify-center rounded-lg border p-4"
					role="status"
					aria-live="polite"
				>
					<UploadProgress
						progress={progressPercent}
						phase={progress.phase as UploadPhase}
						currentFileName={progress.current}
						queuedCount={queuedCount}
						completedCount={progress.completed}
						files={progress.files}
						onCancel={cancel}
					/>
				</div>
			)}

			{!isAtLimit && pendingFiles.length === 0 && !isMediaUploading && (
				<UploadActionSheet
					accept="image/*,video/*"
					multiple
					disabled={isMediaUploading}
					onFilesSelected={handleFilesSelected}
					triggerLabel="Ajouter à la galerie"
					triggerDescription={`${MAX_GALLERY_COUNT - currentCount} restant${MAX_GALLERY_COUNT - currentCount > 1 ? "s" : ""} • Image (16 Mo) / Vidéo (512 Mo)`}
					sheetTitle="Ajouter à la galerie"
					sheetDescription="Choisissez les photos ou vidéos à ajouter à la galerie"
					showCamera
					desktopFallback={
						<UploadDropzone
							endpoint="catalogMedia"
							onBeforeUploadBegin={(files) => {
								const remaining = MAX_GALLERY_COUNT - value.length;
								if (files.length > remaining) {
									triggerHaptic("error");
									toast.warning(
										`Seulement ${remaining} média${remaining > 1 ? "s" : ""} seront ajouté${remaining > 1 ? "s" : ""}`,
									);
									return files.slice(0, remaining);
								}
								return files;
							}}
							onChange={async (files) => {
								if (files.length === 0) return;
								triggerHaptic("medium");
								try {
									const results = await uploadMedia(files);
									results.forEach((result) => {
										pushValue({
											url: result.url,
											blurDataUrl: result.blurDataUrl,
											thumbnailUrl: result.thumbnailUrl,
											altText: productName,
											mediaType: result.mediaType,
										});
									});
									if (results.length > 0) triggerHaptic("success");
								} catch (err) {
									triggerHaptic("error");
									throw err;
								}
							}}
							onUploadError={(error) => {
								toast.error(`Erreur: ${error.message}`);
							}}
							config={{ mode: "auto", appendOnPaste: true }}
							className="ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden w-full *:before:hidden! *:after:hidden! [&>*::after]:hidden! [&>*::before]:hidden!"
							appearance={getCatalogDropzoneAppearance({
								height: "min(140px, 20vh)",
								minHeight: "120px",
								padding: "1rem",
								iconSize: "2rem",
								labelFontSize: "0.875rem",
							})}
							content={{
								uploadIcon: ({ isDragActive }) => (
									<Upload
										className={cn(
											"size-10 transition-all duration-200",
											isDragActive ? "text-primary scale-110" : "text-primary/70",
										)}
									/>
								),
								label: ({ isDragActive }) => {
									if (isDragActive) {
										return (
											<div className="text-center">
												<p className="text-primary text-sm font-medium">Relâchez pour ajouter</p>
											</div>
										);
									}

									const remaining = MAX_GALLERY_COUNT - value.length;
									return (
										<div className="space-y-1 text-center">
											<p className="text-sm font-medium">Ajouter à la galerie</p>
											<p className="text-muted-foreground text-xs">
												{remaining} {remaining > 1 ? "médias restants" : "média restant"} • Max 16
												Mo (image) / 512 Mo (vidéo)
											</p>
										</div>
									);
								},
								allowedContent: () => null,
								button: () => (
									<span className="sr-only">Sélectionner des images pour la galerie</span>
								),
							}}
						/>
					}
				/>
			)}
		</div>
	);
}
