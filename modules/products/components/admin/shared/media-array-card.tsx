"use client";

import { useRef } from "react";
import { Info } from "lucide-react";

import { cn } from "@/shared/utils/cn";
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
	UploadProgressPanel,
	type UploadProgressShape,
} from "../product-media-card-shared";

import { FORM_SECTION_CARD_CLASS, MOBILE_SECTION_TITLE } from "./shared-styles";

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
	// Ancre de retour du focus quand le bandeau de progression disparaît : sans elle,
	// le focus retomberait sur `<body>` à la fin de chaque envoi.
	const cardRef = useRef<HTMLDivElement>(null);

	const offlineQueue = useOfflineUploadQueue({
		endpoint: "catalogMedia",
		contextKey: offlineContextKey,
		onReplayFiles: onReplayOffline,
		// ⚠️ `autoReplayOnReconnect` doit rester à `true` : la bannière annonce
		// « L'envoi reprendra tout seul dès que tu seras de nouveau en ligne. » Cette
		// option a longtemps existé avec un défaut `false` qu'aucune surface ne
		// passait — la promesse était donc fausse, et un fichier mis en file y restait
		// indéfiniment. Ne pas retirer l'un sans réécrire l'autre.
		autoReplayOnReconnect: true,
		// Pas de rejeu par-dessus un envoi déjà en vol.
		paused: isMediaUploading,
	});

	return (
		<Card
			ref={cardRef}
			tabIndex={-1}
			role="region"
			aria-label={ariaLabel}
			className={cn(FORM_SECTION_CARD_CLASS, "focus-visible:outline-none")}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Médias</CardTitle>
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
										La première image sera l'image principale. Glisse-dépose pour réorganiser.
										<br />
										{/*
										 * Le cadrage est une information que l'admin ne peut PAS déduire de ce
										 * qu'il voit : les tuiles sont carrées ici, alors que la carte produit
										 * de la boutique recadre en 3:4 (mobile) puis 4:5, et que la galerie
										 * PDP est en `object-cover`. Sans cette ligne, un bijou cadré large se
										 * découvre rogné une fois publié.
										 */}
										<span className="text-muted-foreground/80">
											Les vignettes de la boutique recadrent en 3:4 — garde le bijou vers le centre.
										</span>
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
										queuedBytes={offlineQueue.queuedBytes}
										oldestQueuedAt={offlineQueue.oldestQueuedAt}
										isOffline={offlineQueue.isOffline}
										onReplay={() => void offlineQueue.replay()}
										onDismiss={() => void offlineQueue.dropAll()}
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
									<>
										{/*
										 * Bandeau de progression — au-dessus de la grille, pas dans la tuile
										 * « Ajouter ». Même composant et même contenu que dans l'état vide :
										 * la tuile ne montrait qu'un « 0/1 », sans pourcentage, sans ETA et
										 * sans bouton Annuler, si bien qu'à partir du premier média un envoi
										 * n'était plus interruptible.
										 */}
										{isMediaUploading && uploadProgress && (
											<UploadProgressPanel
												uploadProgress={uploadProgress}
												onCancel={onCancel}
												onCancelOne={onCancelOne}
												anchorRef={cardRef}
												className="mb-3"
											/>
										)}
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
																handleUpload={handleUpload}
																maxMediaCount={maxMediaCount}
																currentCount={currentCount}
															/>
														)
											}
										/>
									</>
								)}
							</div>
						);
					}}
				</form.Field>
			</CardContent>
		</Card>
	);
}
