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
import { useAppForm } from "@/shared/components/forms";
import { createProductType } from "@/modules/product-types/actions/create-product-type";
import { updateProductType } from "@/modules/product-types/actions/update-product-type";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect, useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

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
	const isUpdateMode = !!productType;

	const form = useAppForm({
		defaultValues: {
			label: "",
			description: "",
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createProductType,
			createToastCallbacks({
				onSuccess: () => {
					close();
					form.reset();
				},
			})
		),
		undefined
	);

	// Update action
	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateProductType,
			createToastCallbacks({
				onSuccess: () => {
					close();
				},
			})
		),
		undefined
	);

	const isPending = isCreatePending || isUpdatePending;
	const action = isUpdateMode ? updateAction : createAction;

	// Reset form values when productType data changes
	useEffect(() => {
		if (productType) {
			form.reset({
				label: productType.label,
				description: productType.description || "",
			});
		} else {
			form.reset({
				label: "",
				description: "",
			});
		}
	}, [productType, form]);

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
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le type de produit" : "Créer un type de produit"}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{isUpdateMode
							? "Modifiez les informations du type. Les changements seront appliqués à tous les produits utilisant ce type."
							: "Ajoutez un nouveau type pour catégoriser vos produits."}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
					{isUpdateMode && productType && (
						<input type="hidden" name="id" value={productType.id} />
					)}

					<RequiredFieldsNote />

					<div className="space-y-4">
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

					<div className="flex justify-end pt-4">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending
										? "Enregistrement..."
										: isUpdateMode
											? "Enregistrer"
											: "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
