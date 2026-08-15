"use client";

import { useRef } from "react";
import { InfoIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/shared/utils/cn";
import { MediaCounterBadge } from "@/shared/components/media-upload/media-counter-badge";
import { MediaUploadGrid } from "@/shared/components/media-upload/media-upload-grid";
import { UploadErrorBanner } from "@/shared/components/media-upload/upload-progress";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import type { FailedUpload } from "@/modules/media/types/hooks.types";
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

import { FORM_SECTION_ACCENT_CLASS, FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

/**
 * Carte « Médias » partagée entre les formulaires Créer/Éditer Produit et Créer/Éditer
 * Variante. Encapsule la mécanique commune (compteur, banner erreur,
 * empty state, grille drag-reorder, zone inline) pour garantir un alignement visuel
 * et fonctionnel total entre les trois flows.
 *
 * Le binding TanStack Form se fait via `form.Field name=... mode="array"`. Le `form`
 * est intentionnellement typé `unknown` à l'interface du composant pour accepter les
 * trois types d'instance (CreateProductFormInstance, EditProductFormInstance,
 * VariantFormInstance) sans union explicite — la responsabilité du nom de champ correct
 * revient au caller.
 */
export interface MediaArrayCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	/** Nom du champ TanStack Form (e.g. "initialVariant.media", "defaultVariant.media", "media"). */
	fieldName: string;
	/** Nom inscrit dans `style.viewTransitionName` (e.g. "product-create-media"). */
	viewTransitionName?: string;
	/** Plafond du nombre de médias (default = ARRAY_LIMITS.VARIANT_MEDIA). */
	maxMediaCount?: number;
	/** Aria-label sur la Card region (default "Médias du bijou"). */
	ariaLabel?: string;
	/** Titre affiché de la section (default "Médias"). */
	title?: string;
	/** Accent de marque posé en repère de gouttière (cf. FORM_SECTION_ACCENT_CLASS). */
	accent?: "rose" | "lavender" | "mint" | "sun";

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
	maxMediaCount = ARRAY_LIMITS.VARIANT_MEDIA,
	ariaLabel = "Médias du bijou",
	title = "Médias",
	accent,
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
	skipUtapiDelete = false,
}: MediaArrayCardProps) {
	// Ancre de retour du focus quand le bandeau de progression disparaît : sans elle,
	// le focus retomberait sur `<body>` à la fin de chaque envoi.
	const cardRef = useRef<HTMLDivElement>(null);

	return (
		<Card
			ref={cardRef}
			tabIndex={-1}
			role="region"
			aria-label={ariaLabel}
			data-accent={accent}
			className={cn(
				FORM_SECTION_CARD_CLASS,
				accent && FORM_SECTION_ACCENT_CLASS,
				"focus-visible:outline-none",
			)}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>{title}</FormSectionTitle>
			</CardHeader>
			<CardContent className="px-0 pb-[max(0px,env(safe-area-inset-bottom))] sm:px-0 sm:pb-0 md:px-6">
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
						/*
						 * ⚠️ Le champ média n'a pas de contrôle unique — il n'existait donc dans
						 * le DOM ni `id`, ni marqueur d'invalidité. Deux mécanismes en
						 * dépendaient et échouaient EN SILENCE :
						 *
						 * - `focusFirstInvalid()` cherche `[aria-invalid="true"]` dans le
						 *   formulaire ; il n'en trouvait aucun, donc soumettre sans photo ne
						 *   déplaçait ni le focus ni le scroll ni l'haptique ;
						 * - le lien « Photos » du récapitulatif d'erreurs cherche
						 *   `#<nom du champ>` ; il ne trouvait rien, donc le bouton était mort.
						 *
						 * Le manque de photo est le PREMIER de la cascade « ce qui manque » de la
						 * règle d'établi, donc le plus fréquent : les deux chemins prévus pour y
						 * emmener l'admin ne fonctionnaient précisément que dans les autres cas.
						 *
						 * `role="group"` : un champ composite EST un groupe, et c'est ce qui rend
						 * `aria-describedby` porteur — l'admin focalisé ici s'entend annoncer le
						 * message d'erreur.
						 *
						 * ⚠️ Le marqueur machine est `data-field-invalid`, PAS `aria-invalid` :
						 * ARIA 1.2 ne liste pas `aria-invalid` parmi les états supportés par
						 * `group`, donc l'y poser serait ignoré des lecteurs d'écran tout en
						 * faisant passer le champ pour correctement marqué. `useFocusFirstError`
						 * accepte les deux sélecteurs pour cette raison.
						 */
						const errorId = `${fieldName}-error`;
						const hasError = arrayField.state.meta.errors.some(Boolean);

						return (
							<div
								id={fieldName}
								role="group"
								aria-label={ariaLabel}
								tabIndex={-1}
								data-field-invalid={hasError || undefined}
								aria-describedby={hasError ? errorId : undefined}
								className="space-y-3 focus-visible:outline-none"
							>
								<div className="flex items-center justify-between">
									{/*
									 * L'astérisque manquait : `RequiredFieldsNote` annonce en tête de
									 * formulaire que l'astérisque marque l'obligatoire, or la photo est
									 * le PREMIER manque que réclame la règle d'établi — et la seule
									 * exigence qui n'était signalée nulle part avant l'envoi. Même
									 * marqueur que `FieldLabel`, `aria-hidden` compris : c'est
									 * `aria-invalid` sur le groupe qui porte l'information aux lecteurs
									 * d'écran, pas ce caractère.
									 */}
									<p className="text-muted-foreground text-xs">
										<span className="text-destructive" aria-hidden="true">
											*{" "}
										</span>
										La première image sera l'image principale. Glisse-dépose pour réorganiser.
										<br />
										{/*
										 * Le cadrage est une information que l'admin ne peut PAS déduire de ce
										 * qu'il voit : les tuiles sont carrées ici, alors que la carte produit
										 * de la boutique recadre en 3:4 (mobile) puis 4:5, et que la galerie
										 * PDP est en `object-cover`. Sans cette ligne, un bijou cadré large se
										 * découvre rogné une fois publié.
										 */}
										<span className="text-muted-foreground">
											Les vignettes de la boutique recadrent en 3:4 — garde le bijou vers le centre.
										</span>
									</p>
									<MediaCounterBadge count={currentCount} max={maxMediaCount} />
								</div>

								{isAtLimit && (
									<div className="bg-secondary/10 border-secondary flex items-start gap-2 rounded-lg border p-3">
										<InfoIcon className="text-secondary-foreground mt-0.5 size-4 shrink-0" />
										<p className="text-secondary-foreground text-xs">
											Limite de {maxMediaCount} médias atteinte
										</p>
									</div>
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
										errorId={errorId}
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
												type: m.type,
												alt: m.alt ?? undefined,
												thumbnailUrl: m.thumbnailUrl ?? undefined,
												blurDataUrl: m.blurDataUrl ?? undefined,
												width: m.width,
												height: m.height,
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
														type: m.type,
														alt: m.alt ?? undefined,
														thumbnailUrl: m.thumbnailUrl ?? undefined,
														blurDataUrl: m.blurDataUrl ?? undefined,
														// Chaque reorder/suppression reconstruit le tableau :
														// omettre les dimensions ici les perdait au premier
														// glisser-déposer, avant même la soumission.
														width: m.width,
														height: m.height,
													}),
												);
											}}
											skipUtapiDelete={skipUtapiDelete}
											maxItems={maxMediaCount}
											ariaLabel={ariaLabel}
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
