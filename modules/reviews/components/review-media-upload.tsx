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

/**
 * Upload de photos pour les avis clients.
 * Mobile : camera capture natif via UploadActionSheet.
 * Desktop : drag & drop UploadDropzone avec paste support.
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

	const { upload, retryFailed, clearFailed, isUploading, progress, failedFiles, queuedCount } =
		useMediaUpload({
			endpoint: "reviewMedia",
			maxFiles: REVIEW_CONFIG.MAX_MEDIA_COUNT,
			maxSizeImage: REVIEW_MAX_SIZE,
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

	const handleFilesSelected = (files: File[]) => {
		const remainingSlots = REVIEW_CONFIG.MAX_MEDIA_COUNT - media.length - pendingFiles.length;
		if (remainingSlots <= 0) {
			toast.warning(`Maximum ${REVIEW_CONFIG.MAX_MEDIA_COUNT} photos`);
			return;
		}
		const accepted = files.slice(0, remainingSlots);
		if (files.length > accepted.length) {
			toast.warning(`${files.length - accepted.length} photo(s) ignorée(s)`, {
				description: `Limite de ${REVIEW_CONFIG.MAX_MEDIA_COUNT} photos atteinte`,
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
		<div className={cn("space-y-3", className)} aria-busy={isUploading} aria-live="polite">
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

			{pendingFiles.length > 0 && (
				<PendingUploadsGrid
					files={pendingFiles}
					onRemove={handleRemovePending}
					onConfirm={handleConfirmUpload}
					onCancel={() => setPendingFiles([])}
					disabled={isUploading}
					confirmLabel={`Téléverser ${pendingFiles.length} photo${pendingFiles.length > 1 ? "s" : ""}`}
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
					disabled={disabled}
					onFilesSelected={handleFilesSelected}
					triggerLabel="Ajouter des photos"
					triggerDescription={`${remaining} photo${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} (max 4 Mo)`}
					sheetTitle="Ajouter une photo"
					sheetDescription="Prenez votre bijou en photo ou choisissez depuis votre galerie"
					showCamera
					desktopFallback={
						<UploadDropzone
							endpoint="reviewMedia"
							aria-label="Zone d'upload des photos pour l'avis"
							onUploadBegin={() => haptic("light")}
							onClientUploadComplete={(res) => {
								haptic("success");
								if (res.length > 0) {
									const newMedia: ReviewMediaItem[] = res.map((file) => ({
										url: file.ufsUrl,
										blurDataUrl: file.serverData.blurDataUrl ?? undefined,
										altText: undefined,
									}));
									const updatedMedia = [...media, ...newMedia].slice(
										0,
										REVIEW_CONFIG.MAX_MEDIA_COUNT,
									);
									onChange(updatedMedia);
									toast.success(
										`${res.length} photo${res.length > 1 ? "s" : ""} ajoutée${res.length > 1 ? "s" : ""}`,
									);
								}
							}}
							onUploadError={(error) => {
								haptic("error");
								toast.error(error.message || "Erreur lors de l'upload");
							}}
							config={{ mode: "auto", appendOnPaste: true }}
							appearance={{
								container: cn(
									"border-2 border-dashed rounded-lg p-4 cursor-pointer motion-safe:transition-colors relative",
									"hover:border-primary/50 hover:bg-muted/50",
									"ut-uploading:border-primary ut-uploading:bg-primary/5",
								),
								uploadIcon: "hidden",
								label: "hidden",
								allowedContent: "hidden",
								button: "hidden",
							}}
							content={{
								uploadIcon: ({ isUploading: uploading, uploadProgress }) => {
									if (uploading) {
										return (
											<div
												className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm"
												role="status"
												aria-live="polite"
											>
												<UploadProgress
													progress={uploadProgress}
													variant="compact"
													isProcessing={uploadProgress >= 100}
												/>
											</div>
										);
									}
									return null;
								},
								label: ({ isUploading: uploading }) => {
									if (uploading) return null;
									return (
										<div className="flex flex-col items-center gap-2 py-2">
											<div className="text-center">
												<p className="text-sm font-medium">Glissez vos photos ou cliquez</p>
												<p className="text-muted-foreground text-xs">
													{remaining} restante{remaining > 1 ? "s" : ""} (max 4 Mo)
												</p>
											</div>
										</div>
									);
								},
								allowedContent: () => null,
								button: () => <span className="sr-only">Ajouter des photos</span>,
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

			{media.length >= REVIEW_CONFIG.MAX_MEDIA_COUNT && (
				<p className="text-muted-foreground text-center text-xs">
					Limite de {REVIEW_CONFIG.MAX_MEDIA_COUNT} photos atteinte
				</p>
			)}
		</div>
	);
}
