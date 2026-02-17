"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { useCreateProductTypeForm } from "@/modules/product-types/hooks/use-create-product-type-form";
import { useUpdateProductTypeForm } from "@/modules/product-types/hooks/use-update-product-type-form";
import { useDialog } from "@/shared/providers/dialog-store-provider";

export const PRODUCT_TYPE_DIALOG_ID = "product-type-form";

interface ProductTypeDialogData extends Record<string, unknown> {
	productType?: {
		id: string;
		label: string;
		description?: string | null;
		slug: string;
	};
}

export function ProductTypeFormDialog() {
	const { isOpen, close, data } = useDialog<ProductTypeDialogData>(
		PRODUCT_TYPE_DIALOG_ID
	);
	const productType = data?.productType;

	// Use appropriate form hook based on mode
	const createFormHook = useCreateProductTypeForm({
		onSuccess: () => {
			close();
		},
	});

	const updateFormHook = useUpdateProductTypeForm({
		productType: productType || {
			id: "",
			label: "",
			description: "",
			slug: "",
		},
		onSuccess: () => {
			close();
			updateFormHook.form.reset();
		},
	});

	// Render create form
	if (!productType) {
		const { form, action, isPending } = createFormHook;
		return (
			<ResponsiveDialog
				open={isOpen}
				onOpenChange={(open) => {
					if (!open && !isPending) {
						close();
					}
				}}
			>
				<ResponsiveDialogContent className="max-w-md">
					<ResponsiveDialogHeader>
						<ResponsiveDialogTitle>Créer un type de produit</ResponsiveDialogTitle>
						<ResponsiveDialogDescription>
							Ajoutez un nouveau type pour catégoriser vos produits.
						</ResponsiveDialogDescription>
					</ResponsiveDialogHeader>

					<form
						action={action}
						className="space-y-6"
						onSubmit={() => form.handleSubmit()}
					>
						<RequiredFieldsNote />

						<div className="space-y-4">
							{/* Label Field */}
							<form.AppField
								name="label"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (!value || value.length < 1) {
											return "Le label est requis";
										}
										if (value.length > 50) {
											return "Le label ne peut pas dépasser 50 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.InputField
										label="Label"
										type="text"
										placeholder="ex: Colliers, Bagues, Bracelets"
										disabled={isPending}
										required
									/>
								)}
							</form.AppField>

							{/* Description Field */}
							<form.AppField
								name="description"
								validators={{
									onChange: ({ value }: { value: string }) => {
										if (value && value.length > 500) {
											return "La description ne peut pas dépasser 500 caractères";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.TextareaField
										label="Description"
										placeholder="Décrivez le type de produit..."
										disabled={isPending}
										rows={4}
									/>
								)}
							</form.AppField>
						</div>

						{/* Submit button */}
						<div className="flex justify-end pt-4">
							<form.Subscribe selector={(state) => [state.canSubmit]}>
								{([canSubmit]) => (
									<Button disabled={!canSubmit || isPending} type="submit">
										{isPending ? "Enregistrement..." : "Créer"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</ResponsiveDialogContent>
			</ResponsiveDialog>
		);
	}

	// Render update form
	const { form, action, isPending } = updateFormHook;
	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<ResponsiveDialogContent className="max-w-md">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Modifier le type de produit</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Modifiez les informations du type. Les changements seront
						appliqués à tous les produits utilisant ce type.
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					<input type="hidden" name="id" value={productType.id} />

					<RequiredFieldsNote />

					<div className="space-y-4">
						{/* Label Field */}
						<form.AppField
							name="label"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (!value || value.length < 1) {
										return "Le label est requis";
									}
									if (value.length > 50) {
										return "Le label ne peut pas dépasser 50 caractères";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.InputField
									label="Label"
									type="text"
									placeholder="ex: Colliers, Bagues, Bracelets"
									disabled={isPending}
									required
								/>
							)}
						</form.AppField>

						{/* Description Field */}
						<form.AppField
							name="description"
							validators={{
								onChange: ({ value }: { value: string }) => {
									if (value && value.length > 500) {
										return "La description ne peut pas dépasser 500 caractères";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<field.TextareaField
									label="Description"
									placeholder="Décrivez le type de produit..."
									disabled={isPending}
									rows={4}
								/>
							)}
						</form.AppField>
					</div>

					{/* Submit button */}
					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending ? "Enregistrement..." : "Enregistrer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
