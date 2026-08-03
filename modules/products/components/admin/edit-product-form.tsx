"use client";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useUpdateProductForm } from "@/modules/products/hooks/use-update-product-form";
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
import { withViewTransition } from "@/shared/utils/view-transition";
import type { EditProductFormProps } from "./edit-product-form-types";
import { EditProductMediaCard } from "./edit-product-media-card";
import { EditProductInfoCard } from "./edit-product-info-card";
import { EditProductSidebarCards } from "./edit-product-sidebar-cards";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

export type { EditProductFormProps };

const PRODUCTS_LIST_PATH = "/admin/catalogue/produits";

const FIELD_LABELS: Record<string, string> = {
	title: "Titre du bijou",
	description: "Description",
	typeId: "Type de bijou",
	collectionIds: "Collections",
	status: "Visibilité",
	"defaultSku.media": "Médias",
	"defaultSku.colorIds": "Couleurs",
	"defaultSku.materialIds": "Matériaux",
	"defaultSku.size": "Taille",
	"defaultSku.priceInclTaxEuros": "Prix de vente",
	"defaultSku.compareAtPriceEuros": "Prix comparé",
	"defaultSku.inventory": "Stock",
	"defaultSku.isActive": "Statut de la variante",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditProductForm({
	product,
	productTypes,
	collections,
	colors,
	materials,
}: EditProductFormProps) {
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

	const originalImageUrls = product.skus[0]?.images.map((img) => img.url) ?? [];

	const { form, state, action, isPending } = useUpdateProductForm({
		product,
		onSuccess: (message) => {
			haptic("success");
			allowNavigationRef.current?.();
			// Pas d'action : la ligne suivante navigue déjà vers `PRODUCTS_LIST_PATH`,
			// exactement la destination que proposait « Voir les bijoux ». L'utilisateur
			// se retrouvait donc avec un bouton menant là où il venait d'arriver.
			toast.success(message || "Bijou peaufiné");
			navigateWithTransition(router, PRODUCTS_LIST_PATH);
		},
	});

	// Les messages produit ne sont pas path-préfixés → tout VALIDATION_ERROR serveur est global
	const serverErrors = useServerFieldErrors({ state });

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
		getAltText: () => form.state.values.title || undefined,
		isUploading: isMediaUploading,
	});

	return (
		<form
			ref={formRef}
			aria-label="Formulaire d'édition de bijou"
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
					"EditProductForm",
				);
			}}
			onInvalidCapture={onInvalidCapture}
		>
			<form.Subscribe
				selector={(state) => ({
					productId: state.values.productId,
					skuId: state.values.defaultSku.skuId,
					media: state.values.defaultSku.media,
					status: state.values.status,
					isActive: state.values.defaultSku.isActive,
					collectionIds: state.values.collectionIds,
					colorIds: state.values.defaultSku.colorIds,
					materialIds: state.values.defaultSku.materialIds,
				})}
			>
				{({ productId, skuId, media, status, isActive, collectionIds, colorIds, materialIds }) => {
					const currentUrls = new Set(media.map((m) => m.url));
					const removedOriginal = originalImageUrls.filter((url) => !currentUrls.has(url));
					const allDeleted = Array.from(new Set([...deletedImageUrls, ...removedOriginal]));
					return (
						<>
							<input type="hidden" name="productId" value={productId} />
							<input type="hidden" name="defaultSku.skuId" value={skuId} />
							{/* Stock rendu à l'ouverture — délibérément lu sur `product` et NON sur
							    l'état du formulaire : c'est la baseline qui permet à l'action
							    d'appliquer un delta relatif plutôt qu'un set absolu, et donc de ne
							    pas écraser les ventes concurrentes survenues pendant l'édition
							    (STOCK-PHANTOM-001). La lire dans `state.values` la ferait suivre la
							    saisie ⇒ delta toujours nul ⇒ champ de stock inopérant. */}
							<input
								type="hidden"
								name="defaultSku.originalInventory"
								value={product.skus[0]?.inventory ?? 0}
							/>
							{media.length > 0 ? (
								<input type="hidden" name="defaultSku.media" value={JSON.stringify(media)} />
							) : null}
							<input type="hidden" name="status" value={status} />
							<input type="hidden" name="defaultSku.isActive" value={String(isActive)} />
							<input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
							<input type="hidden" name="defaultSku.colorIds" value={JSON.stringify(colorIds)} />
							<input
								type="hidden"
								name="defaultSku.materialIds"
								value={JSON.stringify(materialIds)}
							/>
							{allDeleted.length > 0 && (
								<input type="hidden" name="deletedImageUrls" value={JSON.stringify(allDeleted)} />
							)}
						</>
					);
				}}
			</form.Subscribe>

			<FormServerErrorAlert errors={serverErrors} />

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

			<fieldset
				disabled={isPending}
				className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start"
			>
				<div className="space-y-6 lg:col-span-2">
					<EditProductMediaCard
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
					<EditProductInfoCard
						form={form}
						productTypes={productTypes}
						collections={collections}
						currentType={product.type}
					/>
				</div>

				<EditProductSidebarCards form={form} colors={colors} materials={materials} />
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending || isMediaUploading}
							idleLabel="Enregistrer les modifications"
							pendingLabel={isPending ? "Enregistrement…" : "Téléversement…"}
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
