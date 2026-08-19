"use client";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { useMediaFieldUpload } from "@/modules/products/hooks/use-media-field-upload";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { useAdminFormKeyboard } from "@/shared/hooks/use-admin-form-keyboard";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useServerFieldErrors } from "@/shared/hooks/use-server-field-errors";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/shared/utils/toast";
import type { CreateProductFormProps } from "./create-product-form-types";
import { MediaArrayCard } from "./shared/media-array-card";
import { CreateProductInfoCard } from "./create-product-info-card";
import { CreateProductPriceStockCard } from "./create-product-price-stock-card";
import { CreateProductEtabliBar } from "./create-product-etabli-bar";
import { runAfterValidation } from "@/shared/utils/run-after-validation";
import { PAGE_FADE_NAVIGATION } from "@/shared/constants/view-transitions";

export type { CreateProductFormProps };

const PRODUCTS_LIST_PATH = "/admin/catalogue/produits";

/**
 * Traduit un nom de champ TanStack en libellé humain pour le récapitulatif
 * d'erreurs. N'y lister QUE des champs réellement validés : `status` y figurait
 * alors qu'aucun validateur ne le vise (il a toujours une valeur), donc l'entrée
 * ne pouvait pas être atteinte.
 */
const FIELD_LABELS: Record<string, string> = {
	name: "Nom du bijou",
	description: "Description",
	priceEuros: "Prix de vente",
	typeId: "Type de bijou",
	collectionIds: "Collections",
	// Le libellé suit le titre visible de la section, cible du lien : « Les photos ».
	media: "Les photos",
	"initialVariant.colorId": "Couleur",
	"initialVariant.materialId": "Matériau",
	"initialVariant.size": "Taille",
	"initialVariant.priceEuros": "Prix de la variante",
	"initialVariant.stock": "Stock",
};

export function CreateProductForm({
	productTypes,
	collections,
	colors,
	materials,
}: CreateProductFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const {
		upload: uploadMedia,
		isUploading: isMediaUploading,
		progress: uploadProgress,
		cancel: cancelMediaUpload,
		cancelOne: cancelOneMediaUpload,
		failedFiles: failedMediaUploads,
		retryFailed: retryFailedMediaUploads,
		retrySingle: retrySingleMediaUpload,
		clearFailed: clearFailedMediaUploads,
	} = useMediaUpload({});

	const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { form, state, action, isPending } = useCreateProductForm({
		onSuccess: (message) => {
			haptic("success");
			allowNavigationRef.current?.();
			// Action conservée sur TOUS les viewports : la création enchaîne (le
			// formulaire est reset et re-focalisé ci-dessous), donc « Voir les bijoux »
			// est la seule sortie vers la liste. La suppression sur mobile datait du
			// MicroToast, qui ignorait les actions ; Sonner les rend sur tout viewport.
			toast.success(message || "Nouveau bijou dans l'atelier", {
				action: {
					label: "Voir les bijoux",
					onClick: () => router.push(PRODUCTS_LIST_PATH, PAGE_FADE_NAVIGATION),
				},
			});
			form.reset();
			setDeletedImageUrls([]);
			clearFailedMediaUploads();
			// Re-focus the title field to streamline creating another product
			requestAnimationFrame(() => {
				formRef.current?.querySelector<HTMLElement>("#title")?.focus();
			});
		},
	});

	// Les messages produit ne sont pas path-préfixés → tout VALIDATION_ERROR serveur est global
	const serverErrors = useServerFieldErrors({ state });

	// Guard against accidental navigation loss: beforeunload + popstate + Link clicks (via NavigationGuardProvider)
	// Block navigation when form is dirty OR an upload is currently in flight (P0.2)
	const { allowNavigation } = useUnsavedChanges(
		form.state.isDirty || isMediaUploading,
		!isPending,
		{
			message: isMediaUploading
				? "Un téléversement est en cours. Quitter abandonnera les fichiers en cours."
				: undefined,
		},
	);
	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	// Desktop keyboard shortcut: Cmd+S / Ctrl+S submits with the currently selected status
	// Desktop keyboard shortcut: Escape cancels (symmetric to Cmd+S) — confirm if dirty
	useAdminFormKeyboard({
		formRef,
		isPending,
		isMobile,
		listPath: PRODUCTS_LIST_PATH,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		extraBusy: isMediaUploading,
	});

	const { handleUpload } = useMediaFieldUpload({
		uploadMedia,
		getAltText: () => form.state.values.name || undefined,
		isUploading: isMediaUploading,
	});

	return (
		<form
			ref={formRef}
			aria-label="Formulaire de création de bijou"
			aria-busy={isPending || isMediaUploading}
			className="space-y-6"
			onSubmit={(event) => {
				event.preventDefault();
				if (isPending || isMediaUploading || form.state.isSubmitting) return;
				const formData = new FormData(event.currentTarget);
				runAfterValidation(
					form.handleSubmit(),
					() => {
						if (form.state.isValid) {
							action(formData);
						} else {
							requestAnimationFrame(() => focusFirstInvalid());
						}
					},
					"CreateProductForm",
				);
			}}
			onInvalidCapture={onInvalidCapture}
		>
			{/* Hidden fields — grouped in one Subscribe to avoid multiple store subscriptions */}
			<form.Subscribe
				selector={(state) => ({
					media: state.values.media,
					active: state.values.active,
					typeId: state.values.typeId,
					collectionIds: state.values.collectionIds,
					colorId: state.values.initialVariant.colorId,
					materialId: state.values.initialVariant.materialId,
				})}
			>
				{({ media, active, typeId, collectionIds, colorId, materialId }) => (
					<>
						{media.length > 0 ? (
							<input type="hidden" name="media" value={JSON.stringify(media)} />
						) : null}
						<input type="hidden" name="active" value={active} />
						<input type="hidden" name="typeId" value={typeId} />
						<input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
						<input type="hidden" name="initialVariant.colorId" value={colorId} />
						<input type="hidden" name="initialVariant.materialId" value={materialId} />
					</>
				)}
			</form.Subscribe>
			{deletedImageUrls.length > 0 && (
				<input type="hidden" name="deletedImageUrls" value={JSON.stringify(deletedImageUrls)} />
			)}

			<FormServerErrorAlert errors={serverErrors} />

			{/* Récapitulatif de validation — dès la première erreur, après la première
			    tentative d'envoi (`ErrorSummary` gère lui-même le singulier). */}
			<form.Subscribe
				selector={(state) => ({
					submissionAttempts: state.submissionAttempts,
					fieldMeta: state.fieldMeta,
				})}
			>
				{({ submissionAttempts, fieldMeta }) => {
					if (!submissionAttempts) return null;
					const fieldErrors = Object.entries(
						fieldMeta as Record<string, { errors?: Array<string | undefined> }>,
					)
						.map(([name, meta]) => {
							const first = meta.errors?.find((e): e is string => Boolean(e));
							return first ? { name, label: FIELD_LABELS[name] ?? name, message: first } : null;
						})
						.filter(
							(item): item is { name: string; label: string; message: string } => item !== null,
						);
					if (fieldErrors.length === 0) return null;
					return <ErrorSummary fieldErrors={fieldErrors} />;
				}}
			</form.Subscribe>

			<RequiredFieldsNote />

			{/*
			 * Colonne unique bornée à 46rem (736px). Le conteneur admin est
			 * `max-w-[100rem]` sans `mx-auto` : sans borne interne, la description
			 * s'étirait sur ~910px à 1680 de large, soit ~150 caractères par ligne.
			 * Le plafond est sur la colonne, pas sur le `<main>` — l'espace en trop
			 * devient de la marge, jamais une colonne de plus.
			 */}
			<fieldset disabled={isPending} className="max-w-[46rem] space-y-10">
				<MediaArrayCard
					fieldName="media"
					viewTransitionName="product-create-media"
					title="Les photos"
					// Le nom annoncé suit le titre visible : la région s'appelait encore
					// « Médias du bijou » alors que la section affiche « Les photos ».
					ariaLabel="Les photos"
					accent="sun"
					form={form}
					isMediaUploading={isMediaUploading}
					uploadProgress={uploadProgress}
					handleUpload={handleUpload}
					setDeletedImageUrls={setDeletedImageUrls}
					failedFiles={failedMediaUploads}
					onCancel={cancelMediaUpload}
					onCancelOne={cancelOneMediaUpload}
					onRetry={() => {
						void retryFailedMediaUploads();
					}}
					onRetryOne={(file) => {
						void retrySingleMediaUpload(file);
					}}
					onDismissErrors={clearFailedMediaUploads}
				/>
				<CreateProductInfoCard
					form={form}
					productTypes={productTypes}
					collections={collections}
					colors={colors}
					materials={materials}
				/>
				<CreateProductPriceStockCard form={form} />
			</fieldset>

			{/*
			 * Sticky footer: always-visible actions (safe-area + admin bottom-bar aware).
			 * Plus de `<form.AppForm>` : il n'existait que pour fournir le contexte à
			 * `form.SubmitButton`, dont la barre d'établi a délibérément divergé (cf. sa
			 * dérogation commentée). Le reste de la barre n'utilise que `form.Subscribe`
			 * et `form.AppField`, qui n'en dépendent pas.
			 */}
			<AdminFormFooter
				pending={isPending}
				// `AdminFormFooter` est collant sous `md` et REDEVIENT statique au-dessus
				// (`md:static`) : le sticky desktop y est d'ordinaire inutile, le `<main>`
				// suffisant à ramener le pied de formulaire. Ici il ne suffit pas — la
				// colonne unique rend la page plus haute que l'ancienne grille à deux
				// colonnes, donc prix, stock et visibilité se retrouveraient PLUS loin
				// qu'avant. On rétablit donc le collage au-dessus de `md`, au call site
				// seulement : le composant est partagé par 21 formulaires et sa sobriété
				// est une décision verrouillée.
				className="md:bg-background/80 md:sticky md:bottom-0 md:z-10 md:-mx-[var(--admin-main-x,1.5rem)] md:px-[var(--admin-main-x,1.5rem)] md:py-3 md:backdrop-blur-md"
			>
				<CreateProductEtabliBar
					form={form}
					isPending={isPending}
					isMediaUploading={isMediaUploading}
				/>
			</AdminFormFooter>
		</form>
	);
}
