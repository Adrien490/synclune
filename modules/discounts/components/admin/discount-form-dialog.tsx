"use client";

import { Button } from "@/shared/components/ui/button";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { FieldLabel, useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { createDiscount } from "@/modules/discounts/actions/create-discount";
import { updateDiscount } from "@/modules/discounts/actions/update-discount";
import { useDialog } from "@/shared/providers/dialog-store-provider";
import { useEffect } from "react";
import { type DiscountType } from "@/app/generated/prisma/browser";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";
import { useActionState } from "react";
import { withCallbacks } from "@/shared/utils/with-callbacks";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";

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
		startsAt: Date | null;
		endsAt: Date | null;
	};
}

const formatDateTimeLocal = (date: Date | null): string =>
	date ? date.toISOString().slice(0, 16) : "";

export function DiscountFormDialog() {
	const { isOpen, close, data } = useDialog<DiscountDialogData>(DISCOUNT_DIALOG_ID);
	const discount = data?.discount;
	const isUpdateMode = !!discount;
	const haptic = useHaptic();
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	// Single form instance
	const form = useAppForm({
		defaultValues: {
			code: "",
			type: "PERCENTAGE" as DiscountType,
			value: 0,
			minOrderAmount: null as number | null,
			maxUsageCount: null as number | null,
			maxUsagePerUser: null as number | null,
			startsAt: "" as string,
			endsAt: "" as string,
		},
	});

	// Create action
	const [, createAction, isCreatePending] = useActionState(
		withCallbacks(
			createDiscount,
			createToastCallbacks({
				loadingMessage: "Création du code…",
				onSuccess: () => {
					haptic("success");
					close();
					form.reset();
				},
				onError: () => {
					haptic("error");
				},
			}),
		),
		undefined,
	);

	// Update action
	const [, updateAction, isUpdatePending] = useActionState(
		withCallbacks(
			updateDiscount,
			createToastCallbacks({
				loadingMessage: "Mise à jour du code…",
				onSuccess: () => {
					haptic("success");
					close();
				},
				onError: () => {
					haptic("error");
				},
			}),
		),
		undefined,
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
				startsAt: formatDateTimeLocal(discount.startsAt),
				endsAt: formatDateTimeLocal(discount.endsAt),
			});
		} else {
			form.reset({
				code: "",
				type: "PERCENTAGE" as DiscountType,
				value: 0,
				minOrderAmount: null,
				maxUsageCount: null,
				maxUsagePerUser: null,
				startsAt: "",
				endsAt: "",
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
			<ResponsiveDialogContent className="flex max-h-[85vh] max-w-2xl flex-col">
				<ResponsiveDialogHeader className="shrink-0">
					<ResponsiveDialogTitle>
						{isUpdateMode ? "Modifier le code promo" : "Créer un code promo"}
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						{isUpdateMode
							? "Modifiez les paramètres du code promo existant"
							: "Configurez un nouveau code promo pour vos clients"}
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				<form
					ref={formRef}
					action={action}
					onSubmit={(event) => {
						if (!form.state.canSubmit) {
							event.preventDefault();
							focusFirstInvalid();
						}
					}}
					className="flex min-h-0 flex-1 flex-col"
				>
					{/* Contenu scrollable */}
					<div className="flex-1 gap-y-6 overflow-y-auto pr-2">
						{/* Hidden field for ID in update mode */}
						{isUpdateMode && <input type="hidden" name="id" value={discount!.id} />}

						<RequiredFieldsNote />

						<div className="space-y-6">
							{/* Code Field */}
							<form.AppField
								name="code"
								validators={{
									onChange: ({ value }) => {
										// Transforme en majuscules pour cohérence avec le serveur
										const upperValue = value.toUpperCase();
										if (!upperValue || upperValue.length < 3) {
											return "Le code doit contenir au moins 3 caractères";
										}
										if (upperValue.length > 30) {
											return "Le code ne peut pas dépasser 30 caractères";
										}
										if (!/^[A-Z0-9-]+$/.test(upperValue)) {
											return "Le code ne peut contenir que des lettres, chiffres et tirets";
										}
										return undefined;
									},
									// Transform value on blur to uppercase
									onBlur: ({ value, fieldApi }) => {
										if (value) {
											fieldApi.setValue(value.toUpperCase());
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<div className="space-y-2">
										<FieldLabel htmlFor={field.name} required>
											Code
										</FieldLabel>
										<field.InputField
											label=""
											type="text"
											placeholder="ex: BIENVENUE10, ETE2025"
											disabled={isPending}
											className="uppercase"
											autoCapitalize="characters"
											autoComplete="off"
											spellCheck={false}
											autoCorrect="off"
											enterKeyHint="next"
											maxLength={30}
										/>
									</div>
								)}
							</form.AppField>

							{/* Type and Value */}
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								{/* Type Field */}
								<form.AppField name="type">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel htmlFor={field.name} required>
												Type de réduction
											</FieldLabel>
											<field.SelectField
												label=""
												placeholder="Choisir un type"
												disabled={isPending}
												options={Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({
													value,
													label,
												}))}
											/>
										</div>
									)}
								</form.AppField>

								{/* Value Field */}
								<form.Subscribe selector={(state) => state.values.type}>
									{(currentType) => (
										<form.AppField
											name="value"
											validators={{
												onChange: ({ value }) => {
													if (!value || value <= 0) {
														return "La valeur doit être positive";
													}
													if (currentType === "PERCENTAGE" && value > 100) {
														return "Le pourcentage ne peut pas dépasser 100%";
													}
													return undefined;
												},
											}}
										>
											{(field) => (
												<div className="space-y-2">
													<FieldLabel htmlFor={field.name} required>
														{currentType === "PERCENTAGE" ? "Pourcentage" : "Montant (centimes)"}
													</FieldLabel>
													<field.InputField
														label=""
														type="number"
														placeholder={currentType === "PERCENTAGE" ? "ex: 10" : "ex: 1000"}
														disabled={isPending}
														min={1}
														max={currentType === "PERCENTAGE" ? 100 : undefined}
														inputMode={currentType === "PERCENTAGE" ? "numeric" : "decimal"}
														enterKeyHint="next"
													/>
													<p className="text-muted-foreground text-xs">
														{currentType === "PERCENTAGE"
															? "Pourcentage de réduction (1 à 100)"
															: field.state.value && field.state.value > 0
																? `= ${(field.state.value / 100).toFixed(2).replace(".", ",")} €`
																: "Valeur en centimes (ex : 1000 = 10,00 €)"}
													</p>
												</div>
											)}
										</form.AppField>
									)}
								</form.Subscribe>
							</div>

							{/* Min Order Amount Field */}
							<form.AppField name="minOrderAmount">
								{(field) => (
									<div className="space-y-2">
										<FieldLabel htmlFor={field.name} optional>
											Montant minimum de commande (centimes)
										</FieldLabel>
										<field.InputField
											label=""
											type="number"
											placeholder="ex: 5000"
											disabled={isPending}
											min={0}
											inputMode="decimal"
											enterKeyHint="next"
										/>
										<p className="text-muted-foreground text-xs">
											{field.state.value && field.state.value > 0
												? `= ${(field.state.value / 100).toFixed(2).replace(".", ",")} € minimum`
												: "En centimes (ex : 5000 = 50,00 €). Laisser vide pour aucun minimum."}
										</p>
									</div>
								)}
							</form.AppField>

							{/* Max Usage Fields */}
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								{/* Max Usage Count Field */}
								<form.AppField name="maxUsageCount">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel htmlFor={field.name} optional>
												Utilisations max (total)
											</FieldLabel>
											<field.InputField
												label=""
												type="number"
												placeholder="Illimité"
												disabled={isPending}
												min={1}
												inputMode="numeric"
												enterKeyHint="next"
											/>
										</div>
									)}
								</form.AppField>

								{/* Max Usage Per User Field */}
								<form.AppField name="maxUsagePerUser">
									{(field) => (
										<div className="space-y-2">
											<FieldLabel htmlFor={field.name} optional>
												Utilisations max par client
											</FieldLabel>
											<field.InputField
												label=""
												type="number"
												placeholder="Illimité"
												disabled={isPending}
												min={1}
												inputMode="numeric"
												enterKeyHint="done"
											/>
										</div>
									)}
								</form.AppField>
							</div>

							{/* Période de validité */}
							<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
								<form.AppField name="startsAt">
									{(field) => (
										<field.DateTimeField
											label="Date de début"
											placeholder="Activation immédiate"
											optional
											disabled={isPending}
										/>
									)}
								</form.AppField>

								<form.AppField name="endsAt">
									{(field) => (
										<field.DateTimeField
											label="Date de fin"
											placeholder="Durée illimitée"
											optional
											disabled={isPending}
										/>
									)}
								</form.AppField>
							</div>
						</div>
					</div>
					{/* Fin du contenu scrollable */}

					{/* Footer fixe */}
					<div className="mt-4 flex shrink-0 justify-end border-t pt-4 pr-[max(0rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0rem,env(safe-area-inset-left))]">
						<form.Subscribe selector={(state) => [state.canSubmit]}>
							{([canSubmit]) => (
								<Button disabled={!canSubmit || isPending} type="submit">
									{isPending ? "Enregistrement…" : isUpdateMode ? "Enregistrer" : "Créer"}
								</Button>
							)}
						</form.Subscribe>
					</div>
				</form>
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
