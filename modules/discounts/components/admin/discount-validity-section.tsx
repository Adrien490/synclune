"use client";

import {
	FORM_SECTION_CARD_CLASS,
	FORM_SECTION_TITLE_CLASS,
} from "@/shared/components/forms/form-section-styles";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";

import { type DiscountFormInstance } from "../../hooks/use-discount-form";

interface DiscountValiditySectionProps {
	form: DiscountFormInstance;
	isPending: boolean;
}

export function DiscountValiditySection({ form, isPending }: DiscountValiditySectionProps) {
	return (
		<Card
			role="region"
			aria-label="Période de validité"
			className={FORM_SECTION_CARD_CLASS}
			style={{ viewTransitionName: "discount-validity-section" }}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={FORM_SECTION_TITLE_CLASS}>Période de validité</CardTitle>
			</CardHeader>
			<CardContent className="space-y-6 px-0 sm:px-0 lg:px-6">
				{/*
				 * Un seul champ : il n'y a plus de date de DÉBUT (`Discount.startsAt`
				 * retiré le 2026-08-04). Un code est utilisable dès sa création ; pour
				 * le préparer à l'avance, le créer désactivé et l'activer au moment
				 * voulu via le toggle.
				 */}
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
					<form.AppField name="endsAt">
						{(field) => (
							<field.DateTimeField
								label="Date de fin"
								placeholder="Durée illimitée"
								optional
								disabled={isPending}
								helpText="Heure locale du navigateur. Laisser vide pour une durée illimitée."
							/>
						)}
					</form.AppField>
				</div>
			</CardContent>
		</Card>
	);
}
