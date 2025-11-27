"use client";

import { Button } from "@/shared/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/shared/components/ui/dialog";
import { FieldLabel, FormLayout, useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/ui/required-fields-note";
import { createDiscount } from "@/modules/discount/actions/create-discount";
import { updateDiscount } from "@/modules/discount/actions/update-discount";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect } from "react";
import { DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discount/constants/discount.constants";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks/create-toast-callbacks";

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
		startsAt: Date;
		endsAt: Date | null;
		isActive: boolean;
	};
}

const formatDateForInput = (date: Date | null): string => {
	if (!date) return "";
	return new Date(date).toISOString().slice(0, 16);
};

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
			startsAt: new Date().toISOString().slice(0, 16),
			endsAt: null as string | null,
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createDiscount,
			createToastCallbacks({
				loadingMessage: "Création du code promo...",
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
				loadingMessage: "Modification du code promo...",
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
				startsAt: formatDateForInput(discount.startsAt),
				endsAt: discount.endsAt ? formatDateForInput(discount.endsAt) : null,
			});
		} else {
			form.reset({
				code: "",
				type: "PERCENTAGE" as DiscountType,
				value: 0,
				minOrderAmount: null,
				maxUsageCount: null,
				maxUsagePerUser: null,
				startsAt: new Date().toISOString().slice(0, 16),
				endsAt: null,
			});
		}
	}, [discount, form]);

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isPending) {
					close();
				}
			}}
		>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isUpdateMode ? "Modifier le code promo" : "Créer un code promo"}
					</DialogTitle>
				</DialogHeader>

				<form
					action={action}
					className="space-y-6"
					onSubmit={() => form.handleSubmit()}
				>
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

						{/* Type and Value in 2 columns */}
						<FormLayout cols={2}>
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

						{/* Max Usage Fields in 2 columns */}
						<FormLayout cols={2}>
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

						{/* Date Fields in 2 columns */}
						<FormLayout cols={2}>
							{/* Starts At Field */}
							<form.AppField name="startsAt">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel required>Date de début</FieldLabel>
										<field.InputField
											label=""
											type="datetime-local"
											disabled={isPending}
										/>
									</div>
								)}
							</form.AppField>

							{/* Ends At Field */}
							<form.AppField name="endsAt">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel optional>Date de fin</FieldLabel>
										<field.InputField
											label=""
											type="datetime-local"
											disabled={isPending}
										/>
										<p className="text-xs text-muted-foreground">
											Laisser vide pour aucune expiration
										</p>
									</div>
								)}
							</form.AppField>
						</FormLayout>
					</div>

					{/* Submit button */}
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
			</DialogContent>
		</Dialog>
	);
}
