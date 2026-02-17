"use client";

import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { UploadProgress } from "@/modules/media/components/admin/upload-progress";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { cn } from "@/shared/utils/cn";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Upload } from "lucide-react";
import { toast } from "sonner";

type MediaItem = {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
	altText?: string;
	mediaType: "IMAGE" | "VIDEO";
};

type UploadResult = {
	url: string;
	thumbnailUrl?: string | null;
	blurDataUrl?: string;
	mediaType: "IMAGE" | "VIDEO";
};

interface EditProductMediaSectionProps {
	field: AnyFieldApi;
	productTitle: string;
	maxCount: number;
	uploadMedia: (files: File[]) => Promise<UploadResult[]>;
	isMediaUploading: boolean;
}

export function EditProductMediaSection({
	field,
	productTitle,
	maxCount,
	uploadMedia,
	isMediaUploading,
}: EditProductMediaSectionProps) {
	const media = field.state.value as MediaItem[];

	return (
		<div className="space-y-4">
			<MediaUploadGrid
				media={media.map((m) => ({
					url: m.url,
					mediaType: m.mediaType,
					altText: m.altText ?? undefined,
					thumbnailUrl: m.thumbnailUrl ?? undefined,
					blurDataUrl: m.blurDataUrl ?? undefined,
				}))}
				onChange={(newMedia) => {
					// Clear and repopulate the field
					while ((field.state.value as MediaItem[]).length > 0) {
						field.removeValue(0);
					}
					newMedia.forEach((m) =>
						field.pushValue({
							url: m.url,
							mediaType: m.mediaType,
							altText: m.altText ?? undefined,
							thumbnailUrl: m.thumbnailUrl ?? undefined,
							blurDataUrl: m.blurDataUrl ?? undefined,
						})
					);
				}}
				skipUtapiDelete={true}
				maxItems={maxCount}
				renderUploadZone={() => (
					<UploadDropzone
						endpoint="catalogMedia"
						onChange={async (files) => {
							const remaining = maxCount - media.length;
							const filesToUpload = files.slice(0, remaining);

							if (files.length > remaining) {
								toast.warning(
									`Seulement ${remaining} média${remaining > 1 ? "s ont" : " a"} été ajouté${remaining > 1 ? "s" : ""}`
								);
							}

							// useMediaUpload handles validation, retry, and video thumbnails
							const results = await uploadMedia(filesToUpload);
							results.forEach((result) => {
								field.pushValue({
									url: result.url,
									thumbnailUrl: result.thumbnailUrl ?? undefined,
									blurDataUrl: result.blurDataUrl ?? undefined,
									altText: productTitle || undefined,
									mediaType: result.mediaType,
								});
							});
						}}
						onUploadError={(error) => {
							toast.error(`Erreur: ${error.message}`);
						}}
						className="w-full *:after:hidden! *:before:hidden! [&>*::after]:hidden! [&>*::before]:hidden! ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden"
						aria-label="Zone d'upload des médias"
						appearance={{
							container: ({ isDragActive, isUploading }) => ({
								border: "2px dashed",
								borderColor: isDragActive
									? "hsl(var(--primary))"
									: "hsl(var(--muted-foreground) / 0.25)",
								borderRadius: "0.75rem",
								backgroundColor: isDragActive
									? "hsl(var(--primary) / 0.05)"
									: "hsl(var(--muted) / 0.3)",
								padding: "1.5rem",
								transition: "all 0.2s ease-in-out",
								height: "min(180px, 22vh)",
								minHeight: "140px",
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: "0.5rem",
								cursor: isUploading ? "not-allowed" : "pointer",
								opacity: isUploading ? 0.7 : 1,
								position: "relative",
								boxShadow: isDragActive
									? "0 0 0 1px hsl(var(--primary) / 0.2), 0 4px 12px hsl(var(--primary) / 0.1)"
									: "0 1px 3px rgba(0, 0, 0, 0.1)",
							}),
							uploadIcon: ({ isDragActive, isUploading }) => ({
								color: isDragActive
									? "hsl(var(--primary))"
									: "hsl(var(--primary) / 0.7)",
								width: "2.5rem",
								height: "2.5rem",
								transition: "all 0.2s ease-in-out",
								transform: isDragActive ? "scale(1.1)" : "scale(1)",
								opacity: isUploading ? 0.5 : 1,
							}),
							label: ({ isDragActive, isUploading }) => ({
								color: isDragActive
									? "hsl(var(--primary))"
									: "hsl(var(--foreground))",
								fontSize: "0.9rem",
								fontWeight: "500",
								textAlign: "center",
								transition: "color 0.2s ease-in-out",
								opacity: isUploading ? 0.5 : 1,
								width: "100%",
								wordBreak: "break-word",
							}),
							allowedContent: ({ isUploading }) => ({
								color: "hsl(var(--muted-foreground))",
								fontSize: "0.75rem",
								textAlign: "center",
								marginTop: "0.25rem",
								opacity: isUploading ? 0.5 : 1,
							}),
						}}
						content={{
							uploadIcon: ({
								isDragActive,
								isUploading,
								uploadProgress,
							}) => {
								if (isUploading) {
									return (
										<div
											className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg z-10"
											role="status"
											aria-live="polite"
										>
											<UploadProgress progress={uploadProgress} isProcessing={uploadProgress >= 100} />
										</div>
									);
								}
								return (
									<Upload
										className={cn(
											"h-12 w-12 transition-all duration-200",
											isDragActive
												? "text-primary scale-110"
												: "text-primary/70"
										)}
									/>
								);
							},
							label: ({ isDragActive, isUploading }) => {
								if (isUploading) return null;

								if (isDragActive) {
									return (
										<div className="text-center">
											<p className="text-sm font-medium text-primary">
												Relâchez pour ajouter
											</p>
										</div>
									);
								}

								const remaining = maxCount - media.length;
								return (
									<div className="text-center space-y-1">
										<p className="text-sm font-medium">
											Glissez vos médias ici
										</p>
										<p className="text-xs text-muted-foreground">
											{remaining} {remaining > 1 ? "médias restants" : "média restant"} • Max 16MB (image) / 512MB (vidéo)
										</p>
									</div>
								);
							},
							allowedContent: () => null,
							button: () => (
								<span className="sr-only">
									Sélectionner des médias
								</span>
							),
						}}
						config={{
							mode: "auto",
						}}
					/>
				)}
			/>
			{field.state.meta.errors.length > 0 && (
				<ul
					className="text-sm text-destructive mt-2 list-none space-y-1"
					role="alert"
				>
					{(field.state.meta.errors as string[]).map((error, i) => (
						<li key={i}>{error}</li>
					))}
				</ul>
			)}
			<p className="text-xs text-muted-foreground">
				⚠️ La première position doit être une image (pas une vidéo) • Format carré recommandé • 1200x1200px min
			</p>
		</div>
	);
}
