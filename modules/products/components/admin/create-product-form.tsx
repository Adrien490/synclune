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
import { withViewTransition } from "@/shared/utils/with-view-transition";
import type { CreateProductFormProps } from "./create-product-form-types";
import { CreateProductMediaCard } from "./create-product-media-card";
import { CreateProductInfoCard } from "./create-product-info-card";
import { CreateProductSidebarCards } from "./create-product-sidebar-cards";
import { runAfterValidation } from "@/shared/utils/run-after-validation";

export type { CreateProductFormProps };

const PRODUCTS_LIST_PATH = "/admin/catalogue/produits";

const FIELD_LABELS: Record<string, string> = {
	title: "Titre du bijou",
	description: "Description",
	typeId: "Type de bijou",
	collectionIds: "Collections",
	status: "Visibilité",
	"initialSku.media": "Médias",
	"initialSku.colorIds": "Couleurs",
	"initialSku.materialIds": "Matériaux",
	"initialSku.size": "Taille",
	"initialSku.priceInclTaxEuros": "Prix de vente",
	"initialSku.compareAtPriceEuros": "Prix comparé",
	"initialSku.inventory": "Stock",
};

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

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
	} = useMediaUpload({
		enableOfflineQueue: true,
		offlineContextKey: "create-product",
	});

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
					onClick: () => navigateWithTransition(router, PRODUCTS_LIST_PATH),
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
		getAltText: () => form.state.values.title || undefined,
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
					media: state.values.initialSku.media,
					status: state.values.status,
					collectionIds: state.values.collectionIds,
					colorIds: state.values.initialSku.colorIds,
					materialIds: state.values.initialSku.materialIds,
				})}
			>
				{({ media, status, collectionIds, colorIds, materialIds }) => (
					<>
						{media.length > 0 ? (
							<input type="hidden" name="initialSku.media" value={JSON.stringify(media)} />
						) : null}
						<input type="hidden" name="status" value={status} />
						<input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
						<input type="hidden" name="initialSku.colorIds" value={JSON.stringify(colorIds)} />
						<input
							type="hidden"
							name="initialSku.materialIds"
							value={JSON.stringify(materialIds)}
						/>
					</>
				)}
			</form.Subscribe>
			{deletedImageUrls.length > 0 && (
				<input type="hidden" name="deletedImageUrls" value={JSON.stringify(deletedImageUrls)} />
			)}

			<FormServerErrorAlert errors={serverErrors} />

			{/* Validation error summary — appears after first submit attempt if 2+ errors */}
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
				{/* Main column */}
				<div className="space-y-6 lg:col-span-2">
					<CreateProductMediaCard
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
						onReplayOffline={async (files) => {
							// Re-feed offline-queued files into the same upload pipeline
							await uploadMedia(files);
						}}
					/>
					<CreateProductInfoCard
						form={form}
						productTypes={productTypes}
						collections={collections}
					/>
				</div>

				{/* Sidebar */}
				<CreateProductSidebarCards form={form} colors={colors} materials={materials} />
			</fieldset>

			{/* Sticky footer: always-visible actions (safe-area + admin bottom-bar aware) */}
			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<form.Subscribe selector={(state) => [state.values.status] as const}>
						{([status]) => (
							<div className="flex justify-end">
								<form.SubmitButton
									isPending={isPending || isMediaUploading}
									idleLabel={status === "PUBLIC" ? "Publier le bijou" : "Enregistrer le brouillon"}
									pendingLabel={
										isPending
											? status === "PUBLIC"
												? "Publication…"
												: "Enregistrement…"
											: "Téléversement…"
									}
									showKbdHint
									className="w-full sm:w-auto sm:min-w-56"
								/>
							</div>
						)}
					</form.Subscribe>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
