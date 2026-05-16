"use client";

import { Info } from "lucide-react";

import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { OfflineQueueBanner } from "@/shared/components/media-upload/offline-queue-banner";
import { UploadErrorBanner } from "@/shared/components/media-upload/upload-progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import type { FailedUpload } from "@/modules/media/types/hooks.types";
import { useOfflineUploadQueue } from "@/modules/media/hooks/use-offline-upload-queue";
import type { MediaField } from "@/modules/products/hooks/use-media-field-upload";
import {
	asMediaArrayField,
	asMediaField,
	type MediaArrayFieldValue,
} from "@/modules/products/types/media-field.types";
import { ARRAY_LIMITS } from "@/shared/constants/validation-limits";

import {
	EmptyMediaState,
	InlineUploadZone,
	type UploadProgressShape,
} from "../product-media-card-shared";

/**
 * Carte « Médias » partagée entre les formulaires Créer/Éditer Produit et Créer/Éditer
 * Variante. Encapsule la mécanique commune (compteur, banner offline, banner erreur,
 * empty state, grille drag-reorder, zone inline) pour garantir un alignement visuel
 * et fonctionnel total entre les trois flows.
 *
 * Le binding TanStack Form se fait via `form.Field name=... mode="array"`. Le `form`
 * est intentionnellement typé `unknown` à l'interface du composant pour accepter les
 * trois types d'instance (CreateProductFormInstance, EditProductFormInstance,
 * SkuFormInstance) sans union explicite — la responsabilité du nom de champ correct
 * revient au caller.
 */
export interface MediaArrayCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	/** Nom du champ TanStack Form (e.g. "initialSku.media", "defaultSku.media", "media"). */
	fieldName: string;
	/** Nom inscrit dans `style.viewTransitionName` (e.g. "product-create-media"). */
	viewTransitionName?: string;
	/** Plafond du nombre de médias (default = ARRAY_LIMITS.SKU_MEDIA). */
	maxMediaCount?: number;
	/** Aria-label sur la Card region (default "Médias du bijou"). */
	ariaLabel?: string;

	// Upload pipeline (parent porte useMediaUpload + useMediaFieldUpload)
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

	// Offline queue
	/** Routing key matching the parent's enableOfflineQueue context */
	offlineContextKey?: string;
	/** Drain offline queue + upload via parent's handleUpload (P1.2) */
	onReplayOffline?: (files: File[]) => void | Promise<void>;

	/**
	 * Skip UploadThing delete when reorder/remove. Vrai pour les forms d'édition
	 * (l'action serveur calcule le diff et supprime ce qui a été retiré). Faux pour
	 * la création (suppression immédiate côté UploadThing).
	 */
	skipUtapiDelete?: boolean;
}

export function MediaArrayCard({
	form,
	fieldName,
	viewTransitionName,
	maxMediaCount = ARRAY_LIMITS.SKU_MEDIA,
	ariaLabel = "Médias du bijou",
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
	offlineContextKey,
	onReplayOffline,
	skipUtapiDelete = false,
}: MediaArrayCardProps) {
	const offlineQueue = useOfflineUploadQueue({
		endpoint: "catalogMedia",
		contextKey: offlineContextKey,
	});

	const handleReplayOffline = async () => {
		const files = await offlineQueue.drainAsFiles();
		if (files.length === 0 || !onReplayOffline) return;
		await onReplayOffline(files);
		const { listEntries } = await import("@/modules/media/lib/offline-upload-queue");
		const entries = await listEntries({
			endpoint: "catalogMedia",
			contextKey: offlineContextKey,
		});
		for (const e of entries) await offlineQueue.drop(e.id);
	};

	return (
		<Card
			role="region"
			aria-label={ariaLabel}
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className="text-muted-foreground lg:text-foreground text-sm font-semibold tracking-wide uppercase lg:text-base lg:font-semibold lg:tracking-normal lg:normal-case">
					Médias
				</CardTitle>
			</CardHeader>
			<CardContent className="px-0 pb-[max(0px,env(safe-area-inset-bottom))] sm:px-0 sm:pb-0 lg:px-6">
				<form.Field
					name={fieldName}
					mode="array"
					validators={{
						onChange: ({ value }: { value: MediaArrayFieldValue[] }) =>
							value.length === 0 ? "Au moins une image est requise" : undefined,
					}}
				>
					{(field: unknown) => {
						const arrayField = asMediaArrayField(field);
						const currentCount = arrayField.state.value.length;
						const isAtLimit = currentCount >= maxMediaCount;

						return (
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<p className="text-muted-foreground text-xs">
										La première image sera l'image principale. Glissez-déposez pour réorganiser.
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

								{arrayField.state.value.length === 0 ? (
									<EmptyMediaState
										field={arrayField}
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
										media={arrayField.state.value.map((m) => ({
											url: m.url,
											mediaType: m.mediaType,
											altText: m.altText ?? undefined,
											thumbnailUrl: m.thumbnailUrl ?? undefined,
											blurDataUrl: m.blurDataUrl ?? undefined,
										}))}
										onFilesDropped={(files) => handleUpload(files, asMediaField(field))}
										onChange={(newMedia) => {
											const currentUrls = new Set(newMedia.map((m) => m.url));
											const removed = arrayField.state.value
												.filter((m) => !currentUrls.has(m.url))
												.map((m) => m.url);
											if (removed.length > 0) {
												setDeletedImageUrls((prev) => [...prev, ...removed]);
											}
											const currentLength = arrayField.state.value.length;
											for (let i = currentLength - 1; i >= 0; i--) {
												arrayField.removeValue(i);
											}
											newMedia.forEach((m) =>
												(field as { pushValue: (v: MediaArrayFieldValue) => void }).pushValue({
													url: m.url,
													mediaType: m.mediaType,
													altText: m.altText ?? undefined,
													thumbnailUrl: m.thumbnailUrl ?? undefined,
													blurDataUrl: m.blurDataUrl ?? undefined,
												}),
											);
										}}
										skipUtapiDelete={skipUtapiDelete}
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
