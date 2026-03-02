"use client";

import { MediaCounterBadge } from "@/modules/media/components/media-counter-badge";
import { MediaUploadGrid } from "@/modules/media/components/admin/media-upload-grid";
import { Label } from "@/shared/components/ui/label";
import { UploadProgress } from "@/modules/media/components/admin/upload-progress";
import { cn } from "@/shared/utils/cn";
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
						const remaining = MAX_GALLERY_COUNT - value.length;
						const filesToUpload = files.slice(0, remaining);
						if (files.length > remaining) {
							toast.warning(
								`Seulement ${remaining} média${remaining > 1 ? "s" : ""} seront ajouté${remaining > 1 ? "s" : ""}`,
							);
						}
						if (filesToUpload.length === 0) return;

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
					}}
					onUploadError={(error) => {
						toast.error(`Erreur: ${error.message}`);
					}}
					className="ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden w-full *:before:hidden! *:after:hidden! [&>*::after]:hidden! [&>*::before]:hidden!"
					appearance={{
						container: ({ isDragActive, isUploading: uploading }) => ({
							border: "2px dashed",
							borderColor: isDragActive
								? "var(--primary)"
								: "color-mix(in oklch, var(--muted-foreground) 25%, transparent)",
							borderRadius: "0.75rem",
							backgroundColor: isDragActive
								? "color-mix(in oklch, var(--primary) 5%, transparent)"
								: "color-mix(in oklch, var(--muted) 30%, transparent)",
							padding: "1rem",
							transition: "all 0.2s ease-in-out",
							height: "min(140px, 20vh)",
							minHeight: "120px",
							display: "flex",
							flexDirection: "column",
							alignItems: "center",
							justifyContent: "center",
							gap: "0.5rem",
							cursor: uploading ? "not-allowed" : "pointer",
							opacity: uploading ? 0.7 : 1,
							position: "relative",
							boxShadow: isDragActive
								? "0 0 0 1px color-mix(in oklch, var(--primary) 20%, transparent), 0 4px 12px color-mix(in oklch, var(--primary) 10%, transparent)"
								: "var(--shadow-sm)",
						}),
						uploadIcon: ({ isDragActive, isUploading: uploading }) => ({
							color: isDragActive
								? "var(--primary)"
								: "color-mix(in oklch, var(--primary) 70%, transparent)",
							width: "2rem",
							height: "2rem",
							transition: "all 0.2s ease-in-out",
							transform: isDragActive ? "scale(1.1)" : "scale(1)",
							opacity: uploading ? 0.5 : 1,
						}),
						label: ({ isDragActive, isUploading: uploading }) => ({
							color: isDragActive ? "var(--primary)" : "var(--foreground)",
							fontSize: "0.875rem",
							fontWeight: "500",
							textAlign: "center",
							transition: "color 0.2s ease-in-out",
							opacity: uploading ? 0.5 : 1,
							width: "100%",
							wordBreak: "break-word",
						}),
						allowedContent: ({ isUploading: uploading }) => ({
							color: "var(--muted-foreground)",
							fontSize: "0.75rem",
							textAlign: "center",
							marginTop: "0.25rem",
							opacity: uploading ? 0.5 : 1,
						}),
					}}
					content={{
						uploadIcon: ({ isDragActive, isUploading: uploading, uploadProgress }) => {
							if (uploading) {
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
							return (
								<Upload
									className={cn(
										"h-10 w-10 transition-all duration-200",
										isDragActive ? "text-primary scale-110" : "text-primary/70",
									)}
								/>
							);
						},
						label: ({ isDragActive, isUploading: uploading }) => {
							if (uploading) {
								return null;
							}

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
						button: () => <span className="sr-only">Sélectionner des images pour la galerie</span>,
					}}
					config={{
						mode: "auto",
					}}
				/>
			)}
		</div>
	);
}
