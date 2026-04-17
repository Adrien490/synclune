"use client";

import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { ImagePlus, Info, Upload } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import type { CreateProductFormInstance } from "./create-product-form-types";

// The field type from TanStack Form's render prop for media array fields
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

interface CreateProductMediaCardProps {
	form: CreateProductFormInstance;
	isMediaUploading: boolean;
	uploadProgress: {
		phase: string;
		completed: number;
		total: number;
		queued: number;
		current?: string;
	} | null;
	handleUpload: (files: File[], field: MediaField) => void;
	setDeletedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
}

export function CreateProductMediaCard({
	form,
	isMediaUploading,
	uploadProgress,
	handleUpload,
	setDeletedImageUrls,
}: CreateProductMediaCardProps) {
	const maxMediaCount = ARRAY_LIMITS.SKU_MEDIA;

	return (
		<Card className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md">
			<CardHeader className="hidden lg:grid lg:px-6">
				<CardTitle>Médias</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 lg:px-6">
				<form.Field
					name="initialSku.media"
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

								{field.state.value.length === 0 ? (
									<EmptyMediaState
										field={field as unknown as MediaArrayField}
										isMediaUploading={isMediaUploading}
										uploadProgress={uploadProgress}
										isAtLimit={isAtLimit}
										maxMediaCount={maxMediaCount}
										handleUpload={handleUpload}
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

// Sub-component: empty state with dropzone
function EmptyMediaState({
	field,
	isMediaUploading,
	uploadProgress,
	isAtLimit,
	maxMediaCount,
	handleUpload,
}: {
	field: MediaArrayField;
	isMediaUploading: boolean;
	uploadProgress: CreateProductMediaCardProps["uploadProgress"];
	isAtLimit: boolean;
	maxMediaCount: number;
	handleUpload: (files: File[], field: MediaField) => void;
}) {
	return (
		<div className="space-y-3">
			{/* Progress feedback during upload */}
			{isMediaUploading && uploadProgress && (
				<div
					role="status"
					aria-live="polite"
					className="bg-primary/5 border-primary/20 flex flex-col items-center justify-center gap-4 rounded-xl border-2 px-4 py-6"
				>
					<div className="relative">
						<div className="border-primary/20 border-t-primary h-12 w-12 animate-spin rounded-full border-4" />
						<Upload className="text-primary absolute inset-0 m-auto h-5 w-5" />
					</div>
					<div className="space-y-1 text-center">
						<p className="text-foreground text-sm font-medium">
							{uploadProgress.phase === "validating" && "Validation des fichiers..."}
							{uploadProgress.phase === "generating-thumbnails" && "Génération des miniatures..."}
							{uploadProgress.phase === "uploading" && "Upload en cours..."}
							{uploadProgress.phase === "done" && "Terminé !"}
						</p>
						<p className="text-muted-foreground text-sm">
							{uploadProgress.completed} / {uploadProgress.total} fichier(s)
						</p>
						{uploadProgress.queued > 0 && (
							<p className="text-muted-foreground/70 text-xs">
								+{uploadProgress.queued} en attente
							</p>
						)}
						{uploadProgress.current && (
							<p className="text-muted-foreground/70 max-w-50 truncate text-xs">
								{uploadProgress.current}
							</p>
						)}
					</div>
				</div>
			)}

			{/* Dropzone — always visible for queueing */}
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
					<UploadDropzone
						endpoint="catalogMedia"
						onChange={(files) => handleUpload(files, field)}
						onUploadError={(error) => {
							toast.error(`Erreur: ${error.message}`);
						}}
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
								height: isMediaUploading ? "min(100px, 15vh)" : "min(200px, 25vh)",
								minHeight: isMediaUploading ? "80px" : "160px",
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

// Sub-component: inline upload zone when media already exists
function InlineUploadZone({
	field,
	isMediaUploading,
	uploadProgress,
	handleUpload,
}: {
	field: MediaField;
	isMediaUploading: boolean;
	uploadProgress: CreateProductMediaCardProps["uploadProgress"];
	handleUpload: (files: File[], field: MediaField) => void;
}) {
	return (
		<div className="flex h-full w-full flex-col">
			{isMediaUploading && (
				<div className="bg-primary/5 flex items-center justify-center gap-2 rounded-t-lg px-2 py-1.5">
					<div className="border-primary/20 border-t-primary h-4 w-4 animate-spin rounded-full border-2" />
					<p className="text-muted-foreground text-xs">
						{uploadProgress?.completed ?? 0}/{uploadProgress?.total ?? 0}
						{uploadProgress && uploadProgress.queued > 0 && (
							<span> (+{uploadProgress.queued})</span>
						)}
					</p>
				</div>
			)}
			<UploadDropzone
				endpoint="catalogMedia"
				onChange={(files) => handleUpload(files, field)}
				onUploadError={(error) => {
					toast.error(`Erreur: ${error.message}`);
				}}
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
	);
}
