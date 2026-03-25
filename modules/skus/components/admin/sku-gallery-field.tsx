"use client";

import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";
import { getCatalogDropzoneAppearance } from "@/modules/media/utils/upload-dropzone-appearance";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { AnimatePresence, m } from "motion/react";
import { ImagePlus, Info, Upload } from "lucide-react";
import { toast } from "sonner";
import type { MediaData } from "@/modules/skus/types/sku-form.types";
import type { MediaUploadResult } from "@/modules/media/types/hooks.types";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";

interface SkuGalleryFieldProps {
	value: MediaData[];
	setValue: (value: MediaData[]) => void;
	pushValue: (value: MediaData) => void;
	productName: string;
	uploadMedia: (files: File[]) => Promise<MediaUploadResult[]>;
	isUploading: boolean;
}

const MAX_GALLERY_COUNT = ARRAY_LIMITS.SKU_GALLERY_MEDIA;

export function SkuGalleryField({
	value,
	setValue,
	pushValue,
	productName,
	uploadMedia,
	isUploading: isMediaUploading,
}: SkuGalleryFieldProps) {
	const currentCount = value.length;
	const isAtLimit = currentCount >= MAX_GALLERY_COUNT;

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label>Galerie (optionnel)</Label>
				<MediaCounterBadge count={currentCount} max={MAX_GALLERY_COUNT} />
			</div>

			{isAtLimit && (
				<div className="bg-secondary/10 border-secondary flex items-start gap-2 rounded-lg border p-3">
					<Info className="text-secondary-foreground mt-0.5 h-4 w-4 shrink-0" />
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
							onChange={(newMedia) => setValue(newMedia)}
							skipUtapiDelete={true}
						/>
					</m.div>
				)}
			</AnimatePresence>

			{value.length === 0 && (
				<div className="bg-muted/20 border-border flex items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-left">
					<ImagePlus className="text-muted-foreground/50 h-6 w-6 shrink-0" />
					<div>
						<p className="text-foreground text-sm font-medium">Aucun média</p>
						<p className="text-muted-foreground text-xs">
							Jusqu'à {MAX_GALLERY_COUNT} images et vidéos
						</p>
					</div>
				</div>
			)}

			{!isAtLimit && (
				<div className="space-y-2">
					{isMediaUploading && (
						<div className="bg-primary/5 flex items-center justify-center gap-2 rounded-lg px-3 py-2">
							<div className="border-primary/20 border-t-primary h-4 w-4 animate-spin rounded-full border-2" />
							<p className="text-muted-foreground text-xs">Upload en cours...</p>
						</div>
					)}
					<UploadDropzone
						endpoint="catalogMedia"
						onBeforeUploadBegin={(files) => {
							const remaining = MAX_GALLERY_COUNT - value.length;
							if (files.length > remaining) {
								toast.warning(
									`Seulement ${remaining} média${remaining > 1 ? "s" : ""} seront ajouté${remaining > 1 ? "s" : ""}`,
								);
								return files.slice(0, remaining);
							}
							return files;
						}}
						onChange={async (files) => {
							// onBeforeUploadBegin already enforces the limit, so no need to re-check here
							if (files.length === 0) return;

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
						}}
						onUploadError={(error) => {
							toast.error(`Erreur: ${error.message}`);
						}}
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
										"h-10 w-10 transition-all duration-200",
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
											{remaining} {remaining > 1 ? "médias restants" : "média restant"} • Max 16MB
											(image) / 512MB (vidéo)
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
				</div>
			)}
		</div>
	);
}
