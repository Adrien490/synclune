"use client";

import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { getCatalogDropzoneAppearance } from "@/modules/media/utils/upload-dropzone-appearance";
import { cn } from "@/shared/utils/cn";
import type { AnyFieldApi } from "@tanstack/react-form";
import { Upload } from "lucide-react";
import { toast } from "@/shared/utils/toast";

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
					// Clear and repopulate the field (reverse iteration for safe index removal)
					const currentLength = (field.state.value as MediaItem[]).length;
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
				skipUtapiDelete={true}
				maxItems={maxCount}
				renderUploadZone={() => (
					<div className="flex h-full w-full flex-col">
						{isMediaUploading && (
							<div className="bg-primary/5 flex items-center justify-center gap-2 rounded-t-lg px-2 py-1.5">
								<div className="border-primary/20 border-t-primary h-4 w-4 animate-spin rounded-full border-2" />
								<p className="text-muted-foreground text-xs">Upload en cours...</p>
							</div>
						)}
						<UploadDropzone
							endpoint="catalogMedia"
							onChange={async (files) => {
								const remaining = maxCount - media.length;
								const filesToUpload = files.slice(0, remaining);

								if (files.length > remaining) {
									toast.warning(
										`Seulement ${remaining} média${remaining > 1 ? "s ont" : " a"} été ajouté${remaining > 1 ? "s" : ""}`,
									);
								}

								// Sort images before videos to ensure images fill first positions
								const sorted = [...filesToUpload].sort((a, b) => {
									const aIsVideo = a.type.startsWith("video/") ? 1 : 0;
									const bIsVideo = b.type.startsWith("video/") ? 1 : 0;
									return aIsVideo - bIsVideo;
								});

								// Block video-first upload when field is empty
								if (media.length === 0 && sorted[0]?.type.startsWith("video/")) {
									toast.error("La première position doit être une image, pas une vidéo.");
									return;
								}

								// useMediaUpload handles validation, retry, and video thumbnails
								const results = await uploadMedia(sorted);
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
							config={{ mode: "auto", appendOnPaste: true }}
							className="ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden w-full *:before:hidden! *:after:hidden! [&>*::after]:hidden! [&>*::before]:hidden!"
							aria-label="Zone d'upload des médias"
							appearance={getCatalogDropzoneAppearance()}
							content={{
								uploadIcon: ({ isDragActive }) => (
									<Upload
										className={cn(
											"h-12 w-12 transition-all duration-200",
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

									const remaining = maxCount - media.length;
									return (
										<div className="space-y-1 text-center">
											<p className="text-sm font-medium">Glissez vos médias ici</p>
											<p className="text-muted-foreground text-xs">
												{remaining} {remaining > 1 ? "médias restants" : "média restant"} • Max 16MB
												(image) / 512MB (vidéo)
											</p>
										</div>
									);
								},
								allowedContent: () => null,
								button: () => <span className="sr-only">Sélectionner des médias</span>,
							}}
						/>
					</div>
				)}
			/>
			{field.state.meta.errors.length > 0 && (
				<ul className="text-destructive mt-2 list-none space-y-1 text-sm" role="alert">
					{(field.state.meta.errors as string[]).map((error) => (
						<li key={error}>{error}</li>
					))}
				</ul>
			)}
			<p className="text-muted-foreground text-xs">
				⚠️ La première position doit être une image (pas une vidéo) • Format carré recommandé •
				1200x1200px min
			</p>
		</div>
	);
}
