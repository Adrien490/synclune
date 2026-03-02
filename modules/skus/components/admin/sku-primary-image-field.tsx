"use client";

import { Label } from "@/shared/components/ui/label";
import { PrimaryImageUpload } from "@/modules/media/components/admin/primary-image-upload";
import { UploadProgress } from "@/modules/media/components/admin/upload-progress";
import { cn } from "@/shared/utils/cn";
import { UploadDropzone } from "@/modules/media/utils/uploadthing";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { MediaData } from "@/modules/skus/types/sku-form.types";

interface SkuPrimaryImageFieldProps {
	value: MediaData | undefined;
	onChange: (value: MediaData | undefined) => void;
	productName: string;
	startUpload: (files: File[]) => Promise<
		| {
				serverData: {
					url: string;
					blurDataUrl?: string | null;
				};
		  }[]
		| undefined
	>;
	isUploading: boolean;
}

export function SkuPrimaryImageField({
	value,
	onChange,
	productName,
	startUpload,
}: SkuPrimaryImageFieldProps) {
	return (
		<div className="space-y-2">
			<Label htmlFor="primary-image-upload">Image principale</Label>
			<PrimaryImageUpload
				imageUrl={value?.url}
				mediaType={value?.mediaType}
				onRemove={() => onChange(undefined)}
				skipUtapiDelete={true}
				productName={productName}
				renderUploadZone={() => (
					<div className="relative">
						<UploadDropzone
							endpoint="catalogMedia"
							onChange={async (files) => {
								if (files.length > 1) {
									toast.error("Vous ne pouvez uploader qu'une seule image principale");
									return;
								}

								const file = files[0];
								if (!file) return;
								const isVideo = file.type.startsWith("video/");

								if (isVideo) {
									toast.error("Les vidéos ne peuvent pas être utilisées comme média principal");
									return;
								}

								const maxSize = 16 * 1024 * 1024;
								if (file.size > maxSize) {
									toast.error("L'image dépasse la limite de 16MB");
									return;
								}

								try {
									const res = await startUpload(files);
									const serverData = res?.[0]?.serverData;
									if (serverData?.url) {
										onChange({
											url: serverData.url,
											thumbnailUrl: undefined,
											blurDataUrl: serverData.blurDataUrl ?? undefined,
											altText: productName,
											mediaType: "IMAGE",
										});
									}
								} catch {
									toast.error("Échec de l'upload");
								}
							}}
							onUploadError={(error) => {
								toast.error(`Erreur: ${error.message}`);
							}}
							className="ut-loading-text:!hidden ut-readying:!hidden ut-uploading:after:!hidden w-full *:before:hidden! *:after:hidden! [&>*::after]:hidden! [&>*::before]:hidden!"
							appearance={{
								container: ({ isDragActive, isUploading: uploading }) => ({
									border: "3px dashed",
									borderColor: isDragActive
										? "var(--primary)"
										: "color-mix(in oklch, var(--muted-foreground) 25%, transparent)",
									borderRadius: "1rem",
									backgroundColor: isDragActive
										? "color-mix(in oklch, var(--primary) 5%, transparent)"
										: "color-mix(in oklch, var(--muted) 30%, transparent)",
									padding: "2rem",
									transition: "all 0.2s ease-in-out",
									height: "min(280px, 25vh)",
									minHeight: "220px",
									maxHeight: "350px",
									display: "flex",
									flexDirection: "column",
									alignItems: "center",
									justifyContent: "center",
									gap: "0.75rem",
									cursor: uploading ? "not-allowed" : "pointer",
									opacity: uploading ? 0.7 : 1,
									position: "relative",
									boxShadow: isDragActive
										? "0 0 0 2px color-mix(in oklch, var(--primary) 20%, transparent), 0 8px 24px color-mix(in oklch, var(--primary) 15%, transparent)"
										: "var(--shadow-md)",
								}),
								uploadIcon: ({ isDragActive, isUploading: uploading }) => ({
									color: isDragActive
										? "var(--primary)"
										: "color-mix(in oklch, var(--primary) 70%, transparent)",
									width: "3.5rem",
									height: "3.5rem",
									transition: "all 0.2s ease-in-out",
									transform: isDragActive ? "scale(1.15)" : "scale(1)",
									opacity: uploading ? 0.5 : 1,
								}),
								label: ({ isDragActive, isUploading: uploading }) => ({
									color: isDragActive ? "var(--primary)" : "var(--foreground)",
									fontSize: "1rem",
									fontWeight: "600",
									textAlign: "center",
									transition: "color 0.2s ease-in-out",
									opacity: uploading ? 0.5 : 1,
									width: "100%",
									wordBreak: "break-word",
								}),
								allowedContent: ({ isUploading: uploading }) => ({
									color: "var(--muted-foreground)",
									fontSize: "0.875rem",
									textAlign: "center",
									marginTop: "0.5rem",
									opacity: uploading ? 0.5 : 1,
								}),
							}}
							content={{
								uploadIcon: ({ isDragActive, isUploading: uploading, uploadProgress }) => {
									if (uploading) {
										return (
											<div className="bg-background/90 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-sm">
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
												"h-16 w-16 transition-all duration-200",
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
												<p className="text-primary text-lg font-semibold">Relâchez pour uploader</p>
											</div>
										);
									}

									return (
										<div className="space-y-2 text-center">
											<p className="text-lg font-semibold">Glissez votre image principale ici</p>
											<p className="text-muted-foreground text-sm">ou cliquez pour sélectionner</p>
											<p className="text-muted-foreground mt-2 text-xs">Image • Max 16MB</p>
										</div>
									);
								},
								allowedContent: () => null,
								button: () => <span className="sr-only">Sélectionner une image principale</span>,
							}}
							config={{
								mode: "auto",
							}}
						/>
					</div>
				)}
			/>
		</div>
	);
}
