"use client";

import { ErrorSummary } from "@/shared/components/forms/error-summary";
import { Button } from "@/shared/components/ui/button";
import { Kbd } from "@/shared/components/ui/kbd";
import { useUpdateProductForm } from "@/modules/products/hooks/use-update-product-form";
import { useMediaFieldUpload } from "@/modules/products/hooks/use-media-field-upload";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useUnsavedChanges } from "@/shared/hooks/use-unsaved-changes";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { withViewTransition } from "@/shared/utils/with-view-transition";
import type { EditProductFormProps } from "./edit-product-form-types";
import { EditProductMediaCard } from "./edit-product-media-card";
import { EditProductInfoCard } from "./edit-product-info-card";
import { EditProductSidebarCards } from "./edit-product-sidebar-cards";

export type { EditProductFormProps };

const PRODUCTS_LIST_PATH = "/admin/catalogue/produits";

const FIELD_LABELS: Record<string, string> = {
	title: "Titre du bijou",
	description: "Description",
	typeId: "Type de bijou",
	collectionIds: "Collections",
	status: "Visibilité",
	"defaultSku.media": "Médias",
	"defaultSku.colorId": "Couleur",
	"defaultSku.materialId": "Matériau",
	"defaultSku.size": "Taille",
	"defaultSku.priceInclTaxEuros": "Prix de vente",
	"defaultSku.compareAtPriceEuros": "Prix comparé",
	"defaultSku.inventory": "Stock",
	"defaultSku.isActive": "Statut du SKU",
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
		failedFiles: failedMediaUploads,
		retryFailed: retryFailedMediaUploads,
		retrySingle: retrySingleMediaUpload,
		clearFailed: clearFailedMediaUploads,
	} = useMediaUpload();

	const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();
	const allowNavigationRef = useRef<(() => void) | null>(null);

	const originalImageUrls = useMemo(() => {
		const defaultSku = product.skus[0];
		return defaultSku?.images.map((img) => img.url) ?? [];
	}, [product]);

	const { form, action, isPending } = useUpdateProductForm({
		product,
		onSuccess: (message) => {
			haptic("success");
			allowNavigationRef.current?.();
			toast.success(message || "Bijou modifié avec succès", {
				action: {
					label: "Voir les bijoux",
					onClick: () => navigateWithTransition(router, PRODUCTS_LIST_PATH),
				},
			});
			navigateWithTransition(router, PRODUCTS_LIST_PATH);
		},
	});

	const { allowNavigation } = useUnsavedChanges(form.state.isDirty, !isPending);
	useEffect(() => {
		allowNavigationRef.current = allowNavigation;
	}, [allowNavigation]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			const isSaveShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s";
			if (!isSaveShortcut) return;
			event.preventDefault();
			if (isPending || isMediaUploading || !form.state.canSubmit) return;
			haptic("medium");
			formRef.current?.requestSubmit();
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, isMediaUploading, form, formRef, haptic]);

	useEffect(() => {
		if (isMobile) return;
		const handler = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || isPending) return;
			const target = event.target as HTMLElement | null;
			if (
				target?.closest(
					"[data-slot='dialog-content'],[data-slot='sheet-content'],[data-slot='popover-content'],[role='dialog']",
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
			navigateWithTransition(router, PRODUCTS_LIST_PATH);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [isMobile, isPending, form, haptic, router, allowNavigation]);

	const { handleUpload } = useMediaFieldUpload({
		uploadMedia,
		getAltText: () => form.state.values.title || undefined,
		isUploading: isMediaUploading,
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire d'édition de bijou"
			className="space-y-6"
			onSubmit={() => {
				void form.handleSubmit();
				if (!form.state.canSubmit) {
					focusFirstInvalid();
				}
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
				})}
			>
				{({ productId, skuId, media, status, isActive, collectionIds }) => {
					const currentUrls = new Set(media.map((m) => m.url));
					const removedOriginal = originalImageUrls.filter((url) => !currentUrls.has(url));
					const allDeleted = Array.from(new Set([...deletedImageUrls, ...removedOriginal]));
					return (
						<>
							<input type="hidden" name="productId" value={productId} />
							<input type="hidden" name="defaultSku.skuId" value={skuId} />
							{media.length > 0 ? (
								<input type="hidden" name="defaultSku.media" value={JSON.stringify(media)} />
							) : null}
							<input type="hidden" name="status" value={status} />
							<input type="hidden" name="defaultSku.isActive" value={String(isActive)} />
							<input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
							{allDeleted.length > 0 && (
								<input type="hidden" name="deletedImageUrls" value={JSON.stringify(allDeleted)} />
							)}
						</>
					);
				}}
			</form.Subscribe>

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
						onRetry={() => {
							void retryFailedMediaUploads();
						}}
						onRetryOne={(file) => {
							void retrySingleMediaUpload(file);
						}}
						onDismissErrors={clearFailedMediaUploads}
					/>
					<EditProductInfoCard form={form} productTypes={productTypes} collections={collections} />
				</div>

				<EditProductSidebarCards form={form} colors={colors} materials={materials} />
			</fieldset>

			<form.AppForm>
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-4 border-t px-4 py-3 backdrop-blur-md motion-safe:transition-[backdrop-filter] md:bottom-0 md:-mx-6 md:px-6">
					<span className="sr-only" role="status" aria-live="polite">
						{isPending ? "Envoi du formulaire en cours..." : ""}
					</span>
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
											? "Enregistrement…"
											: isMediaUploading
												? "Téléversement…"
												: "Enregistrer les modifications"}
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
				</div>
			</form.AppForm>
		</form>
	);
}
