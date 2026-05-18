"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import { type DiscountFormInstance } from "../../hooks/use-discount-form";

const MOBILE_SECTION_TITLE =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase lg:text-foreground lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal";

interface DiscountValiditySectionProps {
	form: DiscountFormInstance;
	isPending: boolean;
}

export function DiscountValiditySection({ form, isPending }: DiscountValiditySectionProps) {
	return (
		<Card
			role="region"
			aria-label="Période de validité"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={{ viewTransitionName: "discount-validity-section" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Période de validité</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 lg:px-6">
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<form.AppField name="startsAt">
						{(field) => (
							<field.DateTimeField
								label="Date de début"
								placeholder="Activation immédiate"
								optional
								disabled={isPending}
								helpText="Heure locale du navigateur. Laisser vide pour activer immédiatement."
							/>
						)}
					</form.AppField>

					<form.Subscribe selector={(state) => state.values.startsAt}>
						{(startsAt) => (
							<form.AppField
								name="endsAt"
								validators={{
									onChangeListenTo: ["startsAt"],
									onChange: ({ value, fieldApi }) => {
										if (!value) return undefined;
										const start = fieldApi.form.getFieldValue("startsAt");
										if (start && value <= start) {
											return "Doit être postérieure à la date de début";
										}
										return undefined;
									},
								}}
							>
								{(field) => (
									<field.DateTimeField
										label="Date de fin"
										placeholder="Durée illimitée"
										optional
										disabled={isPending}
										min={startsAt || undefined}
										helpText="Heure locale du navigateur. Laisser vide pour une durée illimitée."
									/>
								)}
							</form.AppField>
						)}
					</form.Subscribe>
				</div>
			</CardContent>
		</Card>
	);
}
