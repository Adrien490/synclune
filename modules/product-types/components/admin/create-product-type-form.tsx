"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { createProductType } from "@/modules/product-types/actions/create-product-type";
import { useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { FORM_SUCCESS_REDIRECT_DELAY_MS } from "@/shared/constants/ui-delays";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { cn } from "@/shared/utils/cn";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

interface CreateProductTypeFormProps {
	onSuccess?: () => void;
	onCreated?: (id: string) => void;
	redirectOnSuccess?: boolean;
	className?: string;
}

export function CreateProductTypeForm({
	onSuccess,
	onCreated,
	redirectOnSuccess = true,
	className,
}: CreateProductTypeFormProps = {}) {
	const router = useRouter();
	const haptic = useHaptic();

	const form = useAppForm({
		defaultValues: {
			label: "",
			description: "",
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			createProductType,
			createToastCallbacks({
				loadingMessage: "Création du type...",
				onSuccess: (result: unknown) => {
					if (
						result &&
						typeof result === "object" &&
						"data" in result &&
						result.data &&
						typeof result.data === "object" &&
						"id" in result.data &&
						typeof result.data.id === "string"
					) {
						onCreated?.(result.data.id);
					}
					haptic("success");
					form.reset();
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
							{isPending ? "Enregistrement..." : "Créer"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
