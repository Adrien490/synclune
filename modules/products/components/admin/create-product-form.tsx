"use client";

import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { useCreateProductForm } from "@/modules/products/hooks/use-create-product-form";
import { useMediaFieldUpload } from "@/modules/products/hooks/use-media-field-upload";
import { useMediaUpload } from "@/modules/media/hooks/use-media-upload";
import { CircleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CreateProductFormProps } from "./create-product-form-types";
import { CreateProductMediaCard } from "./create-product-media-card";
import { CreateProductInfoCard } from "./create-product-info-card";
import { CreateProductSidebarCards } from "./create-product-sidebar-cards";

export type { CreateProductFormProps };

export function CreateProductForm({
	productTypes,
	collections,
	colors,
	materials,
}: CreateProductFormProps) {
	const router = useRouter();
	const {
		upload: uploadMedia,
		isUploading: isMediaUploading,
		progress: uploadProgress,
	} = useMediaUpload();

	const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
	const formRef = useRef<HTMLFormElement>(null);

	const { form, action, isPending, formErrors } = useCreateProductForm({
		onSuccess: (message) => {
			toast.success(message || "Bijou créé avec succès", {
				action: {
					label: "Voir les bijoux",
					onClick: () => router.push("/admin/catalogue/produits"),
				},
			});
			form.reset();
		},
	});

	// Scroll to first error after failed submission
	const scrollToFirstError = () => {
		requestAnimationFrame(() => {
			const firstError = formRef.current?.querySelector('[data-invalid="true"], [role="alert"]');
			if (firstError) {
				firstError.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		});
	};

	// Scroll to global form errors when they appear (server-side)
	useEffect(() => {
		if (formErrors.length > 0) {
			scrollToFirstError();
		}
	}, [formErrors]);

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
			className="space-y-6 pb-4 sm:pb-8"
			onSubmit={() => {
				void form.handleSubmit();
				if (!form.state.canSubmit) {
					scrollToFirstError();
				}
			}}
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

			{/* Global form errors (server-side) */}
			{formErrors.length > 0 && (
				<Alert variant="destructive" role="alert" aria-live="assertive">
					<CircleAlert className="size-4" />
					<AlertDescription>
						{formErrors.map((error, i) => (
							<p key={i}>{String(error)}</p>
						))}
					</AlertDescription>
				</Alert>
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

			{/* Footer */}
			<form.AppForm>
				<div className="pt-4">
					<span className="sr-only" role="status" aria-live="polite">
						{isPending ? "Envoi du formulaire en cours..." : ""}
					</span>
					<form.Subscribe selector={(state) => [state.canSubmit]}>
						{([canSubmit]) => (
							<div className="flex justify-end gap-3">
								<Button
									type="submit"
									variant="secondary"
									size="input"
									disabled={!canSubmit || isPending || isMediaUploading}
									onClick={() => form.setFieldValue("status", "DRAFT")}
									className="min-w-0 flex-1 sm:min-w-40 sm:flex-none"
								>
									{isPending && form.state.values.status === "DRAFT" ? (
										"Enregistrement..."
									) : (
										<>
											<span className="sm:hidden">Brouillon</span>
											<span className="hidden sm:inline">Enregistrer comme brouillon</span>
										</>
									)}
								</Button>
								<Button
									type="submit"
									size="input"
									disabled={!canSubmit || isPending || isMediaUploading}
									onClick={() => form.setFieldValue("status", "PUBLIC")}
									className="min-w-0 flex-1 sm:min-w-40 sm:flex-none"
								>
									{isPending && form.state.values.status === "PUBLIC" ? (
										"Publication..."
									) : isMediaUploading ? (
										"Upload en cours..."
									) : (
										<>
											<span className="sm:hidden">Publier</span>
											<span className="hidden sm:inline">Publier le bijou</span>
										</>
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
