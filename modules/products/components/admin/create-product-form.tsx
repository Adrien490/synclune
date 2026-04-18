"use client";

import { Button } from "@/shared/components/ui/button";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { useMediaFieldUpload } from "@/modules/products/hooks/use-media-field-upload";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/shared/utils/toast";
import type { CreateProductFormProps } from "./create-product-form-types";
import { CreateProductMediaCard } from "./create-product-media-card";
import { CreateProductInfoCard } from "./create-product-info-card";
import { CreateProductSidebarCards } from "./create-product-sidebar-cards";

export type { CreateProductFormProps };

const PRODUCTS_LIST_PATH = "/admin/catalogue/produits";

function navigateWithTransition(router: ReturnType<typeof useRouter>, path: string) {
	if (typeof document !== "undefined" && "startViewTransition" in document) {
		(
			document as Document & { startViewTransition: (cb: () => void) => unknown }
		).startViewTransition(() => router.push(path));
		return;
	}
	router.push(path);
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
	} = useMediaUpload();

	const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
	const { formRef, focusFirstInvalid, onInvalidCapture } = useFocusFirstError();

	const { form, action, isPending } = useCreateProductForm({
		onSuccess: (message) => {
			haptic("success");
			toast.success(message || "Bijou créé avec succès", {
				action: {
					label: "Voir les bijoux",
					onClick: () => navigateWithTransition(router, PRODUCTS_LIST_PATH),
				},
			});
			form.reset();
		},
	});

	// Warn before leaving if the form is dirty (prevent accidental refresh / navigation loss)
	useEffect(() => {
		const handler = (event: BeforeUnloadEvent) => {
			if (!form.state.isDirty || isPending) return;
			event.preventDefault();
		};
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [form.state.isDirty, isPending]);

	// Desktop keyboard shortcut: Cmd+S / Ctrl+S submits with the currently selected status
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

	const { handleUpload } = useMediaFieldUpload({
		uploadMedia,
		getAltText: () => form.state.values.title || undefined,
		isUploading: isMediaUploading,
	});

	return (
		<form
			ref={formRef}
			action={action}
			aria-label="Formulaire de création de bijou"
			className="space-y-6"
			onSubmit={() => {
				void form.handleSubmit();
				if (!form.state.canSubmit) {
					focusFirstInvalid();
				}
			}}
			onInvalidCapture={onInvalidCapture}
		>
			{/* Hidden fields */}
			<form.Subscribe selector={(state) => [state.values.initialSku.media]}>
				{([media]) =>
					media?.length ? (
						<input type="hidden" name="initialSku.media" value={JSON.stringify(media)} />
					) : null
				}
			</form.Subscribe>
			<form.Subscribe selector={(state) => [state.values.status]}>
				{([status]) => <input type="hidden" name="status" value={status} />}
			</form.Subscribe>
			<form.Subscribe selector={(state) => [state.values.collectionIds]}>
				{([collectionIds]) => (
					<input type="hidden" name="collectionIds" value={JSON.stringify(collectionIds)} />
				)}
			</form.Subscribe>
			{deletedImageUrls.length > 0 && (
				<input type="hidden" name="deletedImageUrls" value={JSON.stringify(deletedImageUrls)} />
			)}

			<fieldset disabled={isPending} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
				{/* Main column */}
				<div className="space-y-6 lg:col-span-2">
					<CreateProductMediaCard
						form={form}
						isMediaUploading={isMediaUploading}
						uploadProgress={uploadProgress}
						handleUpload={handleUpload}
						setDeletedImageUrls={setDeletedImageUrls}
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
				<div className="bg-background/95 sticky bottom-[calc(var(--bottom-bar-height,56px)+env(safe-area-inset-bottom))] z-10 -mx-4 border-t px-4 py-3 backdrop-blur-md md:bottom-0 md:-mx-6 md:px-6">
					<span className="sr-only" role="status" aria-live="polite">
						{isPending ? "Envoi du formulaire en cours..." : ""}
					</span>
					<form.Subscribe selector={(state) => [state.canSubmit, state.values.status] as const}>
						{([canSubmit, status]) => (
							<div className="flex sm:justify-end">
								<Button
									type="submit"
									size="input"
									disabled={!canSubmit || isPending || isMediaUploading}
									onClick={() => haptic("medium")}
									className="w-full sm:w-auto sm:min-w-56"
								>
									{isPending
										? status === "PUBLIC"
											? "Publication..."
											: "Enregistrement..."
										: isMediaUploading
											? "Upload en cours..."
											: status === "PUBLIC"
												? "Publier le bijou"
												: "Enregistrer le brouillon"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</div>
			</form.AppForm>
		</form>
	);
}
