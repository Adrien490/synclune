"use client";

import { useActionState } from "react";

import { type DiscountType } from "@/app/generated/prisma/browser";
import { FieldLabel, useAppForm } from "@/shared/components/forms";
import { RequiredFieldsNote } from "@/shared/components/required-fields-note";
import { Button } from "@/shared/components/ui/button";
import { useFocusFirstError } from "@/shared/hooks/use-focus-first-error";
import { useHaptic } from "@/shared/hooks/use-haptic";
import { createToastCallbacks } from "@/shared/utils/create-toast-callbacks";
import { withCallbacks } from "@/shared/utils/with-callbacks";

import { updateDiscount } from "@/modules/discounts/actions/update-discount";
import { DISCOUNT_TYPE_LABELS } from "@/modules/discounts/constants/discount.constants";

interface DiscountUpdateFormProps {
	discount: {
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

export function DiscountUpdateForm({ discount }: DiscountUpdateFormProps) {
	const haptic = useHaptic();
	const { formRef, focusFirstInvalid } = useFocusFirstError();

	const form = useAppForm({
		defaultValues: {
			code: discount.code,
			type: discount.type,
			value: discount.value,
			minOrderAmount: discount.minOrderAmount,
			maxUsageCount: discount.maxUsageCount,
			maxUsagePerUser: discount.maxUsagePerUser,
			startsAt: formatDateTimeLocal(discount.startsAt),
			endsAt: formatDateTimeLocal(discount.endsAt),
		},
	});

	const [, action, isPending] = useActionState(
		withCallbacks(
			updateDiscount,
			createToastCallbacks({
				loadingMessage: "Mise à jour du code...",
				onSuccess: () => haptic("success"),
				onError: () => haptic("error"),
			}),
		),
		undefined,
	);

	return (
		<form
			ref={formRef}
			action={action}
			onSubmit={(event) => {
				if (!form.state.canSubmit) {
					event.preventDefault();
					focusFirstInvalid();
				}
			}}
			className="flex flex-col gap-6"
		>
			<input type="hidden" name="id" value={discount.id} />

			<RequiredFieldsNote />

			<form.AppField
				name="code"
				validators={{
					onChange: ({ value }) => {
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

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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

			<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
