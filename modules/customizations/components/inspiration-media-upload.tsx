"use client";

import Image from "next/image";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

import { UploadProgress } from "@/shared/components/media-upload/upload-progress";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { FieldLabel } from "@/shared/components/forms";
import { cn } from "@/shared/utils/cn";

const MAX_INSPIRATION_MEDIAS = 5;

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

export function InspirationMediaUpload({
	medias,
	onMediasChange,
	onDeleteMedia,
}: InspirationMediaUploadProps) {
	return (
		<div className="space-y-2">
			<FieldLabel htmlFor="inspirationImages" optional>
				Images d&apos;inspiration
			</FieldLabel>
			<p className="text-muted-foreground text-sm">
				Ajoutez jusqu&apos;à {MAX_INSPIRATION_MEDIAS} images pour illustrer votre idée
			</p>

			{medias.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{medias.map((media, index) => (
						<div
							key={media.url}
							className="group relative size-20 overflow-hidden rounded-lg border"
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
								onClick={() => {
									const newMedias = medias.filter((_, i) => i !== index);
									onMediasChange(newMedias);
									onDeleteMedia(media.url);
								}}
								className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
								aria-label={`Supprimer l'image ${index + 1}`}
							>
								<X className="size-5 text-white" aria-hidden="true" />
							</button>
						</div>
					))}
				</div>
			)}

			{medias.length < MAX_INSPIRATION_MEDIAS && (
				<UploadDropzone
					endpoint="customizationMedia"
					onClientUploadComplete={(res) => {
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
						toast.error(error.message || "Erreur lors de l'upload");
					}}
					config={{ mode: "auto" }}
					aria-label="Zone d'upload pour images d'inspiration"
					appearance={{
						container: ({ isDragActive, isUploading }) =>
							cn(
								"border-2 border-dashed rounded-lg p-6 transition-colors relative min-h-[140px]",
								isDragActive
									? "border-primary bg-primary/5"
									: "border-border/50 hover:border-primary/50 hover:bg-muted/50",
								isUploading && "border-primary/50 bg-primary/5 cursor-not-allowed",
								!isUploading && "cursor-pointer",
							),
						uploadIcon: "hidden",
						label: "hidden",
						allowedContent: "hidden",
						button: "hidden",
					}}
					content={{
						uploadIcon: ({ isDragActive, isUploading, uploadProgress }) => {
							if (isUploading) {
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
										"size-10 transition-all duration-200",
										isDragActive ? "text-primary scale-110" : "text-muted-foreground",
									)}
									aria-hidden="true"
								/>
							);
						},
						label: ({ isDragActive, isUploading }) => {
							if (isUploading) return null;
							return isDragActive
								? "Relâchez pour ajouter"
								: "Glissez vos images ou cliquez pour parcourir";
						},
						allowedContent: ({ isUploading }) => {
							if (isUploading) return null;
							const remaining = MAX_INSPIRATION_MEDIAS - medias.length;
							return `${remaining} image${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""} — JPEG, PNG, WebP — 4 Mo max`;
						},
						button: () => (
							<span className="sr-only">Sélectionner des images d&apos;inspiration</span>
						),
					}}
				/>
			)}

			<input type="hidden" name="inspirationMedias" value={JSON.stringify(medias)} />
		</div>
	);
}
