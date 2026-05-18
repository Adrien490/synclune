"use client";

import { Euro, Percent } from "lucide-react";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { InputGroupAddon } from "@/shared/components/ui/input-group";

import { DISCOUNT_TYPE_LABELS } from "../../constants/discount.constants";
import { type DiscountFormInstance } from "../../hooks/use-discount-form";
import { validateDiscountCodeField } from "../../utils/validate-discount-code-field";

const MOBILE_SECTION_TITLE =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase lg:text-foreground lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal";

interface DiscountCodeSectionProps {
	form: DiscountFormInstance;
	isPending: boolean;
}

export function DiscountCodeSection({ form, isPending }: DiscountCodeSectionProps) {
	return (
		<Card
			role="region"
			aria-label="Code et type de réduction"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "discount-code-section" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Code et type de réduction</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 lg:px-6">
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
								description="Lettres majuscules, chiffres et tirets uniquement, 3 à 30 caractères."
							/>
						</div>
					)}
				</form.AppField>

				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<form.AppField name="type">
						{(field) => {
							const helpId = `${field.name}-desc`;
							return (
								<div className="space-y-2">
									<FieldLabel htmlFor={field.name} required>
										Type de réduction
									</FieldLabel>
									<field.SelectField
										label=""
										placeholder="Choisir un type"
										disabled={isPending}
										aria-describedby={helpId}
										options={Object.entries(DISCOUNT_TYPE_LABELS).map(([value, label]) => ({
											value,
											label,
										}))}
									/>
									<p id={helpId} className="text-muted-foreground text-xs">
										Pourcentage applique un % de réduction ; Montant fixe retire une somme directe.
									</p>
								</div>
							);
						}}
					</form.AppField>

					<form.Subscribe selector={(state) => state.values.type}>
						{(currentType) => (
							<form.AppField
								name="valueEuros"
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
											{currentType === "PERCENTAGE" ? "Pourcentage" : "Montant fixe"}
										</FieldLabel>
										<field.InputGroupField
											type="number"
											placeholder={currentType === "PERCENTAGE" ? "ex: 10" : "ex: 10.00"}
											disabled={isPending}
											min={1}
											max={currentType === "PERCENTAGE" ? 100 : undefined}
											step={currentType === "PERCENTAGE" ? 1 : 0.01}
											inputMode={currentType === "PERCENTAGE" ? "numeric" : "decimal"}
											enterKeyHint="next"
											description={
												currentType === "PERCENTAGE"
													? "Pourcentage de réduction (1 à 100)."
													: "Montant fixe retiré du panier (en euros)."
											}
										>
											{currentType === "PERCENTAGE" ? (
												<InputGroupAddon align="inline-end">
													<Percent className="size-4" aria-hidden="true" />
												</InputGroupAddon>
											) : (
												<InputGroupAddon align="inline-start">
													<Euro className="size-4" aria-hidden="true" />
												</InputGroupAddon>
											)}
										</field.InputGroupField>
									</div>
								)}
							</form.AppField>
						)}
					</form.Subscribe>
				</div>
			</CardContent>
		</Card>
	);
}
