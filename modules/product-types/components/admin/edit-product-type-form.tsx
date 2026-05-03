"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { updateProductType } from "@/modules/product-types/actions/update-product-type";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

export interface EditableProductType {
	id: string;
	label: string;
	slug: string;
	description: string | null;
}

interface EditProductTypeFormProps {
	productType: EditableProductType;
	onSuccess?: () => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function EditProductTypeForm({
	productType,
	onSuccess,
	redirectOnSuccess = true,
	className,
}: EditProductTypeFormProps) {
	const router = useRouter();
	const haptic = useHaptic();

	const form = useAppForm({
		defaultValues: {
			label: productType.label,
			description: productType.description ?? "",
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateProductType,
			createToastCallbacks({
				loadingMessage: "Mise à jour du type...",
				onSuccess: () => {
					haptic("success");
					onSuccess?.();
					if (redirectOnSuccess) {
						setTimeout(
							() => router.push("/admin/catalogue/types-de-produits"),
							FORM_SUCCESS_REDIRECT_DELAY_MS,
						);
					}
				},
			}),
		),
		undefined,
	);

	return (
		<form
			action={action}
			className={cn("space-y-6", className)}
			onSubmit={() => form.handleSubmit()}
		>
			<input type="hidden" name="id" value={productType.id} />

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
							{isPending ? "Enregistrement..." : "Enregistrer"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
