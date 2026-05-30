"use client";

import { AdminFormFooter } from "@/shared/components/admin-form-footer";
import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useCreateProductSkuForm } from "@/modules/skus/hooks/use-create-sku-form";
import { useMediaFieldUpload } from "@/modules/products/hooks/use-media-field-upload";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";
import type { SkuFormSharedProps } from "./sku-form-types";
import { SkuMediaCard } from "./sku-media-card";
import { SkuSidebarCards } from "./sku-sidebar-cards";

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

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	withViewTransition(() => router.push(path));
}

export function CreateProductVariantForm({
	colors,
	materials,
	product,
	productSlug,
}: SkuFormSharedProps) {
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
		offlineContextKey: `create-sku-${product.id}`,
	});

	const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const { form, action, isPending } = useCreateProductSkuForm({
		onSuccess: (message) => {
			haptic("success");
			allowNavigationRef.current?.();
			toast.success(
				message || "Variante créée avec succès",
				isMobile
					? undefined
					: {
							action: {
								label: "Voir les variantes",
								onClick: () => navigateWithTransition(router, variantsListPath),
							},
						},
			);
			navigateWithTransition(router, variantsListPath);
		},
	});

	useEffect(() => {
		form.setFieldValue("productId", product.id);
	}, [product.id, form]);

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

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending || isMediaUploading) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, isMediaUploading, formRef, haptic]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || isPending) return;
			const target = event.target as HTMLElement | null;
			// Ignore Escape when it is closing an open overlay (dialog, sheet, popover,
			// Select/dropdown menu) — otherwise closing a Select would also trigger the
			// "unsaved changes" confirm and navigate away.
			if (
				target?.closest(
					"[data-slot='dialog-content'],[data-slot='sheet-content'],[data-slot='popover-content'],[data-slot='select-content'],[data-slot='dropdown-menu-content'],[role='dialog']",
				)
			) {
				return;
			}
			if (
				form.state.isDirty &&
				!window.confirm("Les modifications non enregistrées seront perdues. Continuer ?")
			) {
				return;
			}
			event.preventDefault();
			haptic("light");
			allowNavigation();
			navigateWithTransition(router, variantsListPath);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, form, haptic, router, allowNavigation, variantsListPath]);

	const { handleUpload } = useMediaFieldUpload({
		uploadMedia,
		getAltText: () => product.title || undefined,
		isUploading: isMediaUploading,
	});

	return (
		<form
			ref={formRef}
			aria-label="Formulaire de création de variante"
			className="space-y-6"
			onSubmit={(event) => {
				event.preventDefault();
				if (isPending || isMediaUploading || form.state.isSubmitting) return;
				const formData = new FormData(event.currentTarget);
				void form.handleSubmit().then(() => {
					if (form.state.isValid) {
						action(formData);
					} else {
						requestAnimationFrame(() => focusFirstInvalid());
					}
				});
			}}
			onInvalidCapture={onInvalidCapture}
		>
			<input type="hidden" name="productId" value={product.id} />

			<form.Subscribe
				selector={(state) => ({
					media: state.values.media,
					isActive: state.values.isActive,
					isDefault: state.values.isDefault,
					colorIds: state.values.colorIds,
					materialIds: state.values.materialIds,
				})}
			>
				{({ media, isActive, isDefault, colorIds, materialIds }) => (
					<>
						{media.length > 0 ? (
							<input type="hidden" name="media" value={JSON.stringify(media)} />
						) : null}
						<input type="hidden" name="isActive" value={String(isActive)} />
						<input type="hidden" name="isDefault" value={String(isDefault)} />
						<input type="hidden" name="colorIds" value={JSON.stringify(colorIds)} />
						<input type="hidden" name="materialIds" value={JSON.stringify(materialIds)} />
					</>
				)}
			</form.Subscribe>
			{deletedImageUrls.length > 0 && (
				<input type="hidden" name="deletedImageUrls" value={JSON.stringify(deletedImageUrls)} />
			)}

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
					if (fieldErrors.length < 2) return null;
					return <ErrorSummary fieldErrors={fieldErrors} />;
				}}
			</form.Subscribe>

			<fieldset disabled={isPending} className="space-y-6">
				<SkuMediaCard
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
					offlineContextKey={`create-sku-${product.id}`}
					onReplayOffline={async (files) => {
						await uploadMedia(files);
					}}
					viewTransitionPrefix="sku-create"
				/>

				<SkuSidebarCards
					form={form}
					colors={colors}
					materials={materials}
					viewTransitionPrefix="sku-create"
				/>
			</fieldset>

			<form.AppForm>
				<AdminFormFooter pending={isPending}>
					<form.Subscribe selector={(state) => [state.canSubmit] as const}>
						{([canSubmit]) => (
							<div className="flex justify-end">
								<Button
									type="submit"
									size="input"
									disabled={!canSubmit || isPending || isMediaUploading}
									onClick={() => haptic("medium")}
									className="w-full sm:w-auto sm:min-w-56"
								>
									{(isPending || isMediaUploading) && (
										<Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
									)}
									<span>
										{isPending
											? "Création…"
											: isMediaUploading
												? "Téléversement…"
												: "Créer la variante"}
									</span>
									{!isPending && !isMediaUploading && (
										<Kbd
											aria-hidden="true"
											className="ml-1 hidden bg-white/15 text-white/80 lg:inline-flex"
										>
											⌘S
										</Kbd>
									)}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</AdminFormFooter>
			</form.AppForm>
		</form>
	);
}
