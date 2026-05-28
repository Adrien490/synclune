"use client";

import { Euro } from "lucide-react";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { InputGroupAddon } from "@/shared/components/ui/input-group";
import {
	FORM_SECTION_CARD_CLASS,
	FORM_SECTION_TITLE_CLASS,
} from "@/shared/components/forms/form-section-styles";

import { type DiscountFormInstance } from "../../hooks/use-discount-form";

interface DiscountConditionsSectionProps {
	form: DiscountFormInstance;
	isPending: boolean;
}

export function DiscountConditionsSection({ form, isPending }: DiscountConditionsSectionProps) {
	return (
		<Card
			role="region"
			aria-label="Conditions d'utilisation"
			className={FORM_SECTION_CARD_CLASS}
			style={{ viewTransitionName: "discount-conditions-section" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={FORM_SECTION_TITLE_CLASS}>Conditions d&apos;utilisation</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 lg:px-6">
				<form.AppField name="minOrderAmountEuros">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} optional>
								Montant minimum de commande
							</FieldLabel>
							<field.InputGroupField
								type="number"
								placeholder="ex: 50.00"
								disabled={isPending}
								min={0}
								step={0.01}
								inputMode="decimal"
								enterKeyHint="next"
								description="Panier minimal requis pour appliquer le code. Laisser vide pour aucun minimum."
							>
								<InputGroupAddon align="inline-start">
									<Euro className="size-4" aria-hidden="true" />
								</InputGroupAddon>
							</field.InputGroupField>
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
									description="Laisser vide pour autoriser un nombre illimité d'utilisations."
								/>
							</div>
						)}
					</form.AppField>

					<form.AppField
						name="maxUsagePerUser"
						validators={{
							onChangeListenTo: ["maxUsageCount"],
							onChange: ({ value, fieldApi }) => {
								if (value == null) return undefined;
								const total = fieldApi.form.getFieldValue("maxUsageCount");
								if (total != null && value > total) {
									return "Ne peut pas dépasser le nombre max total";
								}
								return undefined;
							},
						}}
					>
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
									description="Limite par client unique. Laisser vide pour aucune limite par client."
								/>
							</div>
						)}
					</form.AppField>
				</div>
			</CardContent>
		</Card>
	);
}
