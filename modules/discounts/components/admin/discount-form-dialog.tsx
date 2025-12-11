"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/ui/responsive-dialog";
import { FieldLabel, FormLayout, useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { createDiscount } from "@/modules/discounts/actions/create-discount";
import { updateDiscount } from "@/modules/discounts/actions/update-discount";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect } from "react";
import { DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";

export const DISCOUNT_DIALOG_ID = "discount-form";

interface DiscountDialogData extends Record<string, unknown> {
	discount?: {
		id: string;
		code: string;
		type: DiscountType;
		value: number;
		minOrderAmount: number | null;
		maxUsageCount: number | null;
		maxUsagePerUser: number | null;
		isActive: boolean;
	};
}

export function DiscountFormDialog() {
	const { isOpen, close, data } =
		useDialog<DiscountDialogData>(DISCOUNT_DIALOG_ID);
	const discount = data?.discount;
	const isUpdateMode = !!discount;

	// Single form instance
	const form = useAppForm({
		defaultValues: {
			code: "",
			type: "PERCENTAGE" as DiscountType,
			value: 0,
			minOrderAmount: null as number | null,
			maxUsageCount: null as number | null,
			maxUsagePerUser: null as number | null,
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createDiscount,
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
			updateDiscount,
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

	// Reset form values when discount data changes
	useEffect(() => {
		if (discount) {
			form.reset({
				code: discount.code,
				type: discount.type,
				value: discount.value,
				minOrderAmount: discount.minOrderAmount,
				maxUsageCount: discount.maxUsageCount,
				maxUsagePerUser: discount.maxUsagePerUser,
			});
		} else {
			form.reset({
				code: "",
				type: "PERCENTAGE" as DiscountType,
				value: 0,
				minOrderAmount: null,
				maxUsageCount: null,
				maxUsagePerUser: null,
			});
		}
	}, [discount, form]);

	return (
		<ResponsiveDialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<ResponsiveDialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le code promo" : "Créer un code promo"}
					</ResponsiveDialogTitle>
				</ResponsiveDialogHeader>

				<form
					action={action}
					className="flex flex-col flex-1 min-h-0"
					onSubmit={() => form.handleSubmit()}
				>
					{/* Contenu scrollable */}
					<div className="flex-1 overflow-y-auto space-y-6 pr-2">
					{/* Hidden field for ID in update mode */}
					{isUpdateMode && discount && (
						<input type="hidden" name="id" value={discount.id} />
					)}

					<form.AppForm>
						<form.FormErrorDisplay />
					</form.AppForm>

					<RequiredFieldsNote />

					<div className="space-y-6">
						{/* Code Field */}
						<form.AppField
							name="code"
							validators={{
								onChange: ({ value }) => {
									if (!value || value.length < 3) {
										return "Le code doit contenir au moins 3 caractères";
									}
									if (value.length > 30) {
										return "Le code ne peut pas dépasser 30 caractères";
									}
									if (!/^[A-Z0-9-]+$/i.test(value)) {
										return "Le code ne peut contenir que des lettres, chiffres et tirets";
									}
									return undefined;
								},
							}}
						>
							{(field) => (
								<div className="space-y-2">
									<FieldLabel required>Code</FieldLabel>
									<field.InputField
										label=""
										type="text"
										placeholder="ex: BIENVENUE10, ETE2025"
										disabled={isPending}
										className="uppercase"
									/>
								</div>
							)}
						</form.AppField>

						{/* Type and Value */}
						<FormLayout>
							{/* Type Field */}
							<form.AppField name="type">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Type de réduction</FieldLabel>
										<field.SelectField
											label=""
											placeholder="Choisir un type"
											disabled={isPending}
											options={Object.entries(DISCOUNT_TYPE_LABELS).map(
												([value, label]) => ({
													value,
													label,
												})
											)}
										/>
									</div>
								)}
							</form.AppField>

							{/* Value Field */}
							<form.AppField
								name="value"
								validators={{
									onChange: ({ value }) => {
										if (!value || value <= 0) {
											return "La valeur doit être positive";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Valeur</FieldLabel>
										<field.InputField
											label=""
											type="number"
											placeholder="ex: 10 pour 10% ou 1000 pour 10€"
											disabled={isPending}
											min={1}
										/>
										<p className="text-xs text-muted-foreground">
											% ou centimes selon le type
										</p>
									</div>
								)}
							</form.AppField>
						</FormLayout>

						{/* Min Order Amount Field */}
						<form.AppField name="minOrderAmount">
							{(field) => (
								<div className="space-y-2">
									<FieldLabel optional>Montant minimum de commande</FieldLabel>
									<field.InputField
										label=""
										type="number"
										placeholder="ex: 5000 pour 50€ minimum"
										disabled={isPending}
										min={0}
									/>
									<p className="text-xs text-muted-foreground">
										En centimes. Laisser vide pour aucun minimum.
									</p>
								</div>
							)}
						</form.AppField>

						{/* Max Usage Fields */}
						<FormLayout>
							{/* Max Usage Count Field */}
							<form.AppField name="maxUsageCount">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Utilisations max (total)</FieldLabel>
										<field.InputField
											label=""
											type="number"
											placeholder="Illimité"
											disabled={isPending}
											min={1}
										/>
									</div>
								)}
							</form.AppField>

							{/* Max Usage Per User Field */}
							<form.AppField name="maxUsagePerUser">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Utilisations max par client</FieldLabel>
										<field.InputField
											label=""
											type="number"
											placeholder="Illimité"
											disabled={isPending}
											min={1}
										/>
									</div>
								)}
							</form.AppField>
						</FormLayout>
					</div>

					</div>
					{/* Fin du contenu scrollable */}

					{/* Footer fixe */}
					<div className="shrink-0 flex justify-end pt-4 border-t mt-4">
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
