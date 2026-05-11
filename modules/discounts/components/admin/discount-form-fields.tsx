"use client";

import { FieldLabel } from "@/shared/components/forms";

import { DISCOUNT_TYPE_LABELS } from "../../constants/discount.constants";
import { type DiscountFormInstance } from "../../hooks/use-discount-form";
import { validateDiscountCodeField } from "../../utils/validate-discount-code-field";

interface DiscountFormFieldsProps {
	form: DiscountFormInstance;
	isPending: boolean;
}

/**
 * Champs partagés entre create-discount-form, discount-update-form et discount-form-dialog.
 * Évite la triplication des 8 fields + validators (code, type, value, minOrderAmount,
 * maxUsageCount, maxUsagePerUser, startsAt, endsAt).
 */
export function DiscountFormFields({ form, isPending }: DiscountFormFieldsProps) {
	return (
		<div className="space-y-6">
			<form.AppField
				name="code"
				validators={{
					onChange: validateDiscountCodeField,
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
		</div>
	);
}
