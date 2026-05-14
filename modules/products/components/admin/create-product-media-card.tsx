"use client";

import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { OfflineQueueBanner } from "@/shared/components/media-upload/offline-queue-banner";
import { UploadErrorBanner } from "@/shared/components/media-upload/upload-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { FailedUpload } from "@/modules/media/types/hooks.types";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import { asMediaArrayField, asMediaField } from "@/modules/products/types/media-field.types";
import { useOfflineUploadQueue } from "@/modules/media/hooks/use-offline-upload-queue";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";
import { Info } from "lucide-react";
import type { CreateProductFormInstance } from "./create-product-form-types";
import {
	EmptyMediaState,
	InlineUploadZone,
	type UploadProgressShape,
} from "./product-media-card-shared";

interface CreateProductMediaCardProps {
	form: CreateProductFormInstance;
	isMediaUploading: boolean;
	uploadProgress: UploadProgressShape | null;
	handleUpload: (files: File[], field: MediaField) => void;
	setDeletedImageUrls: React.Dispatch<React.SetStateAction<string[]>>;
	failedFiles: FailedUpload[];
	onCancel: () => void;
	onCancelOne?: (fileName: string) => void;
	onRetry: () => void;
	onRetryOne?: (file: File) => void;
	onDismissErrors: () => void;
	/** Drain offline queue + upload via parent's handleUpload (P1.2) */
	onReplayOffline?: (files: File[]) => void | Promise<void>;
}

export function CreateProductMediaCard({
	form,
	isMediaUploading,
	uploadProgress,
	handleUpload,
	setDeletedImageUrls,
	failedFiles,
	onCancel,
	onCancelOne,
	onRetry,
	onRetryOne,
	onDismissErrors,
	onReplayOffline,
}: CreateProductMediaCardProps) {
	const maxMediaCount = ARRAY_LIMITS.SKU_MEDIA;

	// Offline queue surface (P1.2)
	const offlineQueue = useOfflineUploadQueue({
		endpoint: "catalogMedia",
		contextKey: "create-product",
	});

	const handleReplayOffline = async () => {
		const files = await offlineQueue.drainAsFiles();
		if (files.length === 0 || !onReplayOffline) return;
		await onReplayOffline(files);
		const { listEntries } = await import("@/modules/media/lib/offline-upload-queue");
		const entries = await listEntries({ endpoint: "catalogMedia", contextKey: "create-product" });
		for (const e of entries) await offlineQueue.drop(e.id);
	};

	return (
		<Card
			role="region"
			aria-label="Médias du bijou"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "product-create-media" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className="text-muted-foreground lg:text-foreground text-sm font-semibold tracking-wide uppercase lg:text-base lg:font-semibold lg:tracking-normal lg:normal-case">
					Médias
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 pb-[max(0px,env(safe-area-inset-bottom))] sm:px-0 sm:pb-0 lg:px-6">
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
										La première image sera l'image principale. Maintenez pour réordonner.
									</p>
									<MediaCounterBadge count={currentCount} max={maxMediaCount} />
								</div>

								{isAtLimit && (
									<div className="bg-secondary/10 border-secondary flex items-start gap-2 rounded-lg border p-3">
										<Info className="text-secondary-foreground mt-0.5 size-4 shrink-0" />
										<p className="text-secondary-foreground text-xs">
											Limite de {maxMediaCount} médias atteinte
										</p>
									</div>
								)}

								{offlineQueue.queuedCount > 0 && (
									<OfflineQueueBanner
										queuedCount={offlineQueue.queuedCount}
										isOffline={offlineQueue.isOffline}
										onReplay={() => void handleReplayOffline()}
										disabled={isMediaUploading}
									/>
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
										field={asMediaArrayField(field)}
										isMediaUploading={isMediaUploading}
										uploadProgress={uploadProgress}
										isAtLimit={isAtLimit}
										maxMediaCount={maxMediaCount}
										currentCount={currentCount}
										handleUpload={handleUpload}
										onCancel={onCancel}
										onCancelOne={onCancelOne}
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
										onFilesDropped={(files) => handleUpload(files, asMediaField(field))}
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
															field={asMediaField(field)}
															isMediaUploading={isMediaUploading}
															uploadProgress={uploadProgress}
															handleUpload={handleUpload}
															maxMediaCount={maxMediaCount}
															currentCount={currentCount}
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
