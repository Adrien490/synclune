"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { toast } from "sonner";

import {
	UploadProgress,
	UploadErrorBanner,
} from "@/shared/components/media-upload/upload-progress";
import { UploadActionSheet } from "@/shared/components/media-upload/upload-action-sheet";
import { PendingUploadsGrid } from "@/shared/components/media-upload/pending-uploads-grid";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import ScrollFade from "@/shared/components/scroll-fade";
import { FieldLabel } from "@/shared/components/forms";
import { cn } from "@/shared/utils/cn";
import { MAX_INSPIRATION_MEDIAS } from "@/modules/media/constants/media-limits.constants";

export interface InspirationMediaItem {
	url: string;
	blurDataUrl?: string;
	altText?: string;
}

interface InspirationMediaUploadProps {
	medias: InspirationMediaItem[];
	onMediasChange: (medias: InspirationMediaItem[]) => void;
	onDeleteMedia: (url: string) => void;
}

const CUSTOMIZATION_MAX_SIZE = 4 * 1024 * 1024;

export function InspirationMediaUpload({
	medias,
	onMediasChange,
	onDeleteMedia,
}: InspirationMediaUploadProps) {
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);

	const remaining = MAX_INSPIRATION_MEDIAS - medias.length;
	const canAddMore = remaining > 0;

	const { upload, retryFailed, clearFailed, isUploading, progress, failedFiles, queuedCount } =
		useMediaUpload({
			endpoint: "customizationMedia",
			maxFiles: MAX_INSPIRATION_MEDIAS,
			maxSizeImage: CUSTOMIZATION_MAX_SIZE,
			onSuccess: (results) => {
				haptic("success");
				const newMedias = [
					...medias,
					...results.map((r) => ({ url: r.url, blurDataUrl: r.blurDataUrl })),
				].slice(0, MAX_INSPIRATION_MEDIAS);
				onMediasChange(newMedias);
				setPendingFiles([]);
			},
			onError: () => {
				haptic("error");
			},
		});

	const handleFilesSelected = (files: File[]) => {
		const remainingSlots = MAX_INSPIRATION_MEDIAS - medias.length - pendingFiles.length;
		if (remainingSlots <= 0) {
			toast.warning(`Maximum ${MAX_INSPIRATION_MEDIAS} images`);
			return;
		}
		const accepted = files.slice(0, remainingSlots);
		if (files.length > accepted.length) {
			toast.warning(`${files.length - accepted.length} fichier(s) ignoré(s)`, {
				description: `Limite de ${MAX_INSPIRATION_MEDIAS} images atteinte`,
			});
		}
		setPendingFiles((prev) => [...prev, ...accepted]);
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
		const removed = medias[index];
		const newMedias = medias.filter((_, i) => i !== index);
		onMediasChange(newMedias);
		if (removed) onDeleteMedia(removed.url);
	};

	const thumbnails = medias.map((media, index) => (
		<div
			key={media.url}
			role="listitem"
			className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg border"
		>
			<Image
				src={media.url}
				alt={media.altText ?? `Inspiration ${index + 1}`}
				fill
				className="object-cover"
				sizes="80px"
				placeholder={media.blurDataUrl ? "blur" : undefined}
				blurDataURL={media.blurDataUrl}
			/>
			<button
				type="button"
				onClick={() => handleRemoveMedia(index)}
				aria-label={`Supprimer l'image ${index + 1}`}
				className={cn(
					"absolute top-1 right-1 z-10 flex size-7 items-center justify-center rounded-full bg-black/70 text-white shadow",
					"after:absolute after:-inset-2 after:content-['']",
					"hover:bg-black/90",
					"focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
				)}
			>
				<X className="size-3.5" aria-hidden="true" />
			</button>
		</div>
	));

	return (
		<div className="space-y-2" aria-busy={isUploading} aria-live="polite">
			<FieldLabel htmlFor="inspirationImages" optional>
				Images d&apos;inspiration
			</FieldLabel>
			<p className="text-muted-foreground text-sm">
				Ajoutez jusqu&apos;à {MAX_INSPIRATION_MEDIAS} images pour illustrer votre idée
			</p>

			{medias.length > 0 && (
				<>
					{isMobile ? (
						<ScrollFade axis="horizontal" fadeFromClass="from-background">
							<div
								role="list"
								aria-label="Images d'inspiration ajoutées"
								className="flex gap-2 pb-1"
							>
								{thumbnails}
							</div>
						</ScrollFade>
					) : (
						<div
							role="list"
							aria-label="Images d'inspiration ajoutées"
							className="flex flex-wrap gap-2"
						>
							{thumbnails}
						</div>
					)}
				</>
			)}

			{pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={handleRemovePending}
					onConfirm={handleConfirmUpload}
					onCancel={() => setPendingFiles([])}
					disabled={isUploading}
				/>
			)}

			{failedFiles.length > 0 && (
				<UploadErrorBanner
					failedFiles={failedFiles}
					onRetry={() => void retryFailed()}
					onDismiss={clearFailed}
				/>
			)}

			{canAddMore && pendingFiles.length === 0 && !isUploading && (
				<UploadActionSheet
					accept="image/*"
					multiple={remaining > 1}
					onFilesSelected={handleFilesSelected}
					triggerLabel="Ajouter des images d'inspiration"
					triggerDescription={`${remaining} image${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} — JPEG, PNG, WebP, HEIC — 4 Mo max`}
					sheetTitle="Ajouter une image"
					sheetDescription="Choisissez une source pour vos inspirations"
					desktopFallback={
						<UploadDropzone
							endpoint="customizationMedia"
							onUploadBegin={() => haptic("light")}
							onClientUploadComplete={(res) => {
								haptic("success");
								const newMedias = [
									...medias,
									...res.map((f) => ({
										url: f.ufsUrl,
										blurDataUrl: f.serverData.blurDataUrl,
									})),
								].slice(0, MAX_INSPIRATION_MEDIAS);
								onMediasChange(newMedias);
							}}
							onUploadError={(error) => {
								haptic("error");
								toast.error(error.message || "Erreur lors de l'upload");
							}}
							config={{ mode: "auto", appendOnPaste: true }}
							aria-label="Zone d'upload pour images d'inspiration"
							appearance={{
								container: ({ isDragActive, isUploading: dropzoneUploading }) =>
									cn(
										"border-2 border-dashed rounded-lg p-6 motion-safe:transition-colors relative min-h-[140px]",
										isDragActive
											? "border-primary bg-primary/5"
											: "border-border/50 hover:border-primary/50 hover:bg-muted/50",
										dropzoneUploading && "border-primary/50 bg-primary/5 cursor-not-allowed",
										!dropzoneUploading && "cursor-pointer",
									),
								uploadIcon: "hidden",
								label: "hidden",
								allowedContent: "hidden",
								button: "hidden",
							}}
							content={{
								uploadIcon: ({ isUploading: dropzoneUploading, uploadProgress }) => {
									if (dropzoneUploading) {
										return (
											<div
												className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm"
												role="status"
												aria-live="polite"
											>
												<UploadProgress
													progress={uploadProgress}
													isProcessing={uploadProgress >= 100}
												/>
											</div>
										);
									}
									return null;
								},
								label: ({ isDragActive, isUploading: dropzoneUploading }) => {
									if (dropzoneUploading) return null;
									return isDragActive
										? "Relâchez pour ajouter"
										: "Glissez vos images ou cliquez pour parcourir";
								},
								allowedContent: ({ isUploading: dropzoneUploading }) => {
									if (dropzoneUploading) return null;
									return `${remaining} image${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} — JPEG, PNG, WebP, HEIC — 4 Mo max`;
								},
								button: () => (
									<span className="sr-only">Sélectionner des images d&apos;inspiration</span>
								),
							}}
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
					/>
				</div>
			)}

			<input type="hidden" name="inspirationMedias" value={JSON.stringify(medias)} />
		</div>
	);
}
