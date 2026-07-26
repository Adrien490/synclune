"use client";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { FormServerErrorAlert } from "@/shared/components/forms/form-server-error-alert";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useUpdateProductSkuForm } from "@/modules/skus/hooks/use-update-sku-form";
import type { SkuWithImages } from "@/modules/skus/data/get-sku";
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
import { withViewTransition } from "@/shared/utils/with-view-transition";
import type { SkuFormInstance, SkuFormSharedProps } from "./sku-form-types";
import { SkuMediaCard } from "./sku-media-card";
import { SkuSidebarCards } from "./sku-sidebar-cards";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

interface EditProductVariantFormProps extends SkuFormSharedProps {
	sku: SkuWithImages;
}

const FIELD_LABELS: Record<string, string> = {
	colorIds: "Couleurs",
	materialIds: "Matériaux",
	size: "Taille",
	isActive: "Disponibilité",
	isDefault: "Variante par défaut",
	priceInclTaxEuros: "Prix de vente",
	compareAtPriceEuros: "Prix comparé",
	inventory: "Stock",
	media: "Médias",
};

// Champs pouvant recevoir une erreur serveur path-préfixée ("size: Trop long")
// émise par create-sku.ts / update-sku.ts (cf. CLAUDE.md § Validation patterns)
const SERVER_FIELD_NAMES = [
	"priceInclTaxEuros",
	"compareAtPriceEuros",
	"inventory",
	"size",
	"colorIds",
	"materialIds",
	"media",
] as const;

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function EditProductVariantForm({
	colors,
	materials,
	product,
	productSlug,
	sku,
}: EditProductVariantFormProps) {
	const router = useRouter();
	const haptic = useHaptic();
	const isMobile = useIsMobile();
	const variantsListPath = `/admin/catalogue/produits/${productSlug}/variantes`;

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
	} = useMediaUpload({
		enableOfflineQueue: true,
		offlineContextKey: `edit-sku-${sku.id}`,
	});

	const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const originalImageUrls = sku.images.map((img) => img.url);

	const { form, state, action, isPending } = useUpdateProductSkuForm({
		sku,
		onSuccess: (message, data) => {
			haptic("success");
			allowNavigationRef.current?.();
			const targetPath = data?.productSlug
				? `/admin/catalogue/produits/${data.productSlug}/variantes`
				: variantsListPath;
			// Pas d'action : la ligne suivante navigue déjà vers `targetPath`, exactement
			// la destination que proposait « Voir les variantes ».
			toast.success(message || "Variante mise à jour avec succès");
			navigateWithTransition(router, targetPath);
		},
	});

	const serverErrors = useServerFieldErrors({
		state,
		fieldNames: SERVER_FIELD_NAMES,
		setFieldError: (field, message) =>
			form.setFieldMeta(field, (prev) => ({ ...prev, errors: [message] })),
		onFieldError: () => requestAnimationFrame(() => focusFirstInvalid()),
	});

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
		listPath: variantsListPath,
		allowNavigation,
		getIsDirty: () => form.state.isDirty,
		extraBusy: isMediaUploading,
	});

	const { handleUpload } = useMediaFieldUpload({
		uploadMedia,
		getAltText: () => product.title || undefined,
		isUploading: isMediaUploading,
	});

	return (
		<form
			ref={formRef}
			aria-label="Formulaire d'édition de variante"
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
					"EditSkuForm",
				);
			}}
			onInvalidCapture={onInvalidCapture}
		>
			<input type="hidden" name="skuId" value={sku.id} />
			{/* Stock rendu à l'ouverture : permet à l'action de calculer un delta
			    relatif (au lieu d'un set absolu) et de ne pas écraser les ventes
			    concurrentes (décréments webhook) survenues pendant l'édition. */}
			<input type="hidden" name="originalInventory" value={sku.inventory} />

			<form.Subscribe
				selector={(state) => ({
					media: state.values.media,
					isActive: state.values.isActive,
					isDefault: state.values.isDefault,
					colorIds: state.values.colorIds,
					materialIds: state.values.materialIds,
				})}
			>
				{({ media, isActive, isDefault, colorIds, materialIds }) => {
					const currentUrls = new Set(media.map((m) => m.url));
					const removedOriginal = originalImageUrls.filter((url) => !currentUrls.has(url));
					const allDeleted = Array.from(new Set([...deletedImageUrls, ...removedOriginal]));
					return (
						<>
							{media.length > 0 ? (
								<input type="hidden" name="media" value={JSON.stringify(media)} />
							) : null}
							<input type="hidden" name="isActive" value={String(isActive)} />
							<input type="hidden" name="isDefault" value={String(isDefault)} />
							<input type="hidden" name="colorIds" value={JSON.stringify(colorIds)} />
							<input type="hidden" name="materialIds" value={JSON.stringify(materialIds)} />
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

			<fieldset disabled={isPending} className="space-y-6">
				<SkuMediaCard
					form={form as unknown as SkuFormInstance}
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
					offlineContextKey={`edit-sku-${sku.id}`}
					onReplayOffline={async (files) => {
						await uploadMedia(files);
					}}
					viewTransitionPrefix="sku-edit"
					skipUtapiDelete
				/>

				<SkuSidebarCards
					form={form as unknown as SkuFormInstance}
					colors={colors}
					materials={materials}
					viewTransitionPrefix="sku-edit"
				/>
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<div className="flex justify-end">
						<form.SubmitButton
							isPending={isPending || isMediaUploading}
							idleLabel="Mettre à jour la variante"
							pendingLabel={isPending ? "Mise à jour…" : "Téléversement…"}
							showKbdHint
							className="w-full sm:w-auto sm:min-w-56"
						/>
					</div>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
