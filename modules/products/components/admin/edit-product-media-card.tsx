"use client";

import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import {
	UploadErrorBanner,
	UploadProgress as UploadProgressBar,
	type UploadPhase,
} from "@/shared/components/media-upload/upload-progress";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import type { FailedUpload } from "@/modules/media/types/hooks.types";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { Camera, ImagePlus, Info, Upload } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "@/shared/utils/toast";
import type { EditProductFormInstance } from "./edit-product-form-types";

const ACCEPTED_MEDIA_MIME = "image/*,video/*,.heic,.heif";

type MediaArrayField = MediaField & {
	state: {
		value: Array<{
			url: string;
			mediaType: "IMAGE" | "VIDEO";
			altText?: string;
			thumbnailUrl?: string | null;
			blurDataUrl?: string;
		}>;
		meta: { errors: unknown[] };
	};
	removeValue: (index: number) => void;
};

interface UploadProgressShape {
	phase: UploadPhase | string;
	completed: number;
	total: number;
	queued: number;
	current?: string;
}

interface EditProductMediaCardProps {
	form: EditProductFormInstance;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	handleUpload: (files: File[], field: MediaField) => void;
	setDeletedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
	failedFiles: FailedUpload[];
	onCancel: () => void;
	onRetry: () => void;
	onRetryOne?: (file: File) => void;
	onDismissErrors: () => void;
}

export function EditProductMediaCard({
	form,
	isMediaUploading,
	uploadProgress,
	handleUpload,
	setDeletedImageUrls,
	failedFiles,
	onCancel,
	onRetry,
	onRetryOne,
	onDismissErrors,
}: EditProductMediaCardProps) {
	const maxMediaCount = ARRAY_LIMITS.SKU_MEDIA;

	return (
		<Card
			role="region"
			aria-label="Médias du bijou"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "product-edit-media" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className="text-muted-foreground lg:text-foreground text-sm font-semibold tracking-wide uppercase lg:text-base lg:font-semibold lg:tracking-normal lg:normal-case">
					Médias
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 pb-[max(0px,env(safe-area-inset-bottom))] sm:px-0 sm:pb-0 lg:px-6">
				<form.Field
					name="defaultSku.media"
					mode="array"
					validators={{
						onChange: ({ value }) =>
							value.length === 0 ? "Au moins une image est requise" : undefined,
					}}
				>
					{(field) => {
						const currentCount = field.state.value.length;
						const isAtLimit = currentCount >= maxMediaCount;

						return (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground text-xs">
										La première image sera l'image principale. Glissez pour réordonner.
									</p>
									<MediaCounterBadge count={currentCount} max={maxMediaCount} />
								</div>

								{isAtLimit && (
									<div className="bg-secondary/10 border-secondary flex items-start gap-2 rounded-lg border p-3">
										<Info className="text-secondary-foreground mt-0.5 h-4 w-4 shrink-0" />
										<p className="text-secondary-foreground text-xs">
											Limite de {maxMediaCount} médias atteinte
										</p>
									</div>
								)}

								{failedFiles.length > 0 && (
									<UploadErrorBanner
										failedFiles={failedFiles}
										onRetry={onRetry}
										onRetryOne={onRetryOne}
										onDismiss={onDismissErrors}
									/>
								)}

								{field.state.value.length === 0 ? (
									<EmptyMediaState
										field={field as unknown as MediaArrayField}
										isMediaUploading={isMediaUploading}
										uploadProgress={uploadProgress}
										isAtLimit={isAtLimit}
										maxMediaCount={maxMediaCount}
										handleUpload={handleUpload}
										onCancel={onCancel}
									/>
								) : (
									<MediaUploadGrid
										media={field.state.value.map((m) => ({
											url: m.url,
											mediaType: m.mediaType,
											altText: m.altText ?? undefined,
											thumbnailUrl: m.thumbnailUrl ?? undefined,
											blurDataUrl: m.blurDataUrl ?? undefined,
										}))}
										onChange={(newMedia) => {
											const currentUrls = new Set(newMedia.map((m) => m.url));
											const removed = field.state.value
												.filter((m) => !currentUrls.has(m.url))
												.map((m) => m.url);
											if (removed.length > 0) {
												setDeletedImageUrls((prev) => [...prev, ...removed]);
											}
											const currentLength = field.state.value.length;
											for (let i = currentLength - 1; i >= 0; i--) {
												field.removeValue(i);
											}
											newMedia.forEach((m) =>
												field.pushValue({
													url: m.url,
													mediaType: m.mediaType,
													altText: m.altText ?? undefined,
													thumbnailUrl: m.thumbnailUrl ?? undefined,
													blurDataUrl: m.blurDataUrl ?? undefined,
												}),
											);
										}}
										skipUtapiDelete
										maxItems={maxMediaCount}
										renderUploadZone={
											isAtLimit
												? undefined
												: () => (
														<InlineUploadZone
															field={field as unknown as MediaArrayField}
															isMediaUploading={isMediaUploading}
															uploadProgress={uploadProgress}
															handleUpload={handleUpload}
														/>
													)
										}
									/>
								)}
							</div>
						);
					}}
				</form.Field>
			</CardContent>
		</Card>
	);
}

function progressPercent(progress: UploadProgressShape | null): number {
	if (!progress || progress.total === 0) return 0;
	return Math.min(100, Math.round((progress.completed / progress.total) * 100));
}

function useDropzoneAccept(containerRef: React.RefObject<HTMLDivElement | null>) {
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

function CameraCaptureButton({
	field,
	handleUpload,
	disabled,
	variant = "default",
}: {
	field: MediaField;
	handleUpload: (files: File[], field: MediaField) => void;
	disabled?: boolean;
	variant?: "default" | "compact";
}) {
	const isMobile = useIsMobile();
	const haptic = useHaptic();
	const inputRef = useRef<HTMLInputElement>(null);

	if (!isMobile) return null;

	return (
		<>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				capture="environment"
				multiple
				className="sr-only"
				aria-hidden="true"
				tabIndex={-1}
				onChange={(e) => {
					const files = Array.from(e.target.files ?? []);
					if (files.length === 0) return;
					handleUpload(files, field);
					e.target.value = "";
				}}
			/>
			<Button
				type="button"
				variant="outline"
				size={variant === "compact" ? "sm" : "input"}
				disabled={disabled}
				onClick={() => {
					haptic("light");
					inputRef.current?.click();
				}}
				className={
					variant === "compact" ? "h-11 w-full gap-2" : "h-12 w-full gap-2 text-sm font-medium"
				}
				aria-label="Prendre une photo avec l'appareil photo"
			>
				<Camera className="size-5" aria-hidden="true" />
				Prendre une photo
			</Button>
		</>
	);
}

function EmptyMediaState({
	field,
	isMediaUploading,
	uploadProgress,
	isAtLimit,
	maxMediaCount,
	handleUpload,
	onCancel,
}: {
	field: MediaArrayField;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	isAtLimit: boolean;
	maxMediaCount: number;
	handleUpload: (files: File[], field: MediaField) => void;
	onCancel: () => void;
}) {
	const dropzoneRef = useRef<HTMLDivElement>(null);
	useDropzoneAccept(dropzoneRef);

	return (
		<div className="space-y-3">
			{isMediaUploading && uploadProgress && (
				<div className="bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-3 rounded-xl border-2 px-4 py-6">
					<UploadProgressBar
						progress={progressPercent(uploadProgress)}
						phase={uploadProgress.phase as UploadPhase}
						currentFileName={uploadProgress.current}
						queuedCount={uploadProgress.queued}
						onCancel={onCancel}
					/>
				</div>
			)}

			{!isAtLimit && (
				<div id="media-upload-zone" className="space-y-3">
					{!isMediaUploading && (
						<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed px-3 py-3">
							<ImagePlus className="text-muted-foreground/50 h-5 w-5" />
							<p className="text-muted-foreground text-sm">
								Ajoutez jusqu'à {maxMediaCount} images et vidéos
							</p>
						</div>
					)}

					<CameraCaptureButton
						field={field}
						handleUpload={handleUpload}
						disabled={isMediaUploading}
					/>

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
											isMediaUploading ? "text-primary/50 h-8 w-8" : "text-primary/70 h-12 w-12"
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
												Images (max 16MB) et vidéos (max 512MB)
											</p>
										)}
									</div>
								),
							}}
						/>
					</div>
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

function InlineUploadZone({
	field,
	isMediaUploading,
	uploadProgress,
	handleUpload,
}: {
	field: MediaField;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	handleUpload: (files: File[], field: MediaField) => void;
}) {
	const dropzoneRef = useRef<HTMLDivElement>(null);
	useDropzoneAccept(dropzoneRef);

	return (
		<div className="flex h-full w-full flex-col">
			{isMediaUploading && (
				<div className="bg-primary/5 flex items-center justify-center gap-2 rounded-t-lg px-2 py-1.5">
					<div className="border-primary/20 border-t-primary h-4 w-4 rounded-full border-2 motion-safe:animate-spin" />
					<p className="text-muted-foreground text-xs">
						{uploadProgress?.completed ?? 0}/{uploadProgress?.total ?? 0}
						{uploadProgress && uploadProgress.queued > 0 && (
							<span> (+{uploadProgress.queued})</span>
						)}
					</p>
				</div>
			)}
			<div ref={dropzoneRef} className="flex h-full min-h-0 w-full flex-1 flex-col gap-1">
				<CameraCaptureButton
					field={field}
					handleUpload={handleUpload}
					disabled={isMediaUploading}
					variant="compact"
				/>
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
						uploadIcon: () => <Upload className="text-muted-foreground/50 h-6 w-6" />,
						label: () => <p className="text-muted-foreground mt-1 text-center text-xs">Ajouter</p>,
					}}
				/>
			</div>
		</div>
	);
}
