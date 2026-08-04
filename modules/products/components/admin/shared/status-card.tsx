"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";

import { FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

type RadioOption = { value: string; label: string };

/**
 * Carte « Statut » partagée. Rend toujours un radio (Visibilité produit OU
 * Disponibilité variante). Optionnellement, une checkbox `isDefault` après le radio
 * pour les variantes (admin SKU form).
 */
export interface StatusCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Shared across multiple form instances (Create/Edit Product, Create/Edit SKU). Union typing would create generic explosion; caller is responsible for field name validity.
	form: any;

	/** Titre de la card (default "Statut"). */
	cardTitle?: string;
	/** aria-label de la Card region. */
	cardAriaLabel?: string;

	// --- Radio principal (toujours rendu) ---
	radioFieldName: string;
	radioLabel: string;
	radioOptions: RadioOption[];
	radioHint?: string;

	// --- Checkbox isDefault optionnelle (uniquement pour SKU forms) ---
	isDefaultFieldName?: string;
	isDefaultLabel?: string;
	isDefaultCheckboxLabel?: string;
	isDefaultHint?: string;

	viewTransitionName?: string;
}

export function StatusCard({
	form,
	cardTitle = "Statut",
	cardAriaLabel = "Statut",
	radioFieldName,
	radioLabel,
	radioOptions,
	radioHint,
	isDefaultFieldName,
	isDefaultLabel = "Variante par défaut",
	isDefaultCheckboxLabel = "Affichée en premier sur la fiche produit",
	isDefaultHint,
	viewTransitionName,
}: StatusCardProps) {
	const haptic = useHaptic();

	return (
		<Card
			role="region"
			aria-label={cardAriaLabel}
			className={FORM_SECTION_CARD_CLASS}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>{cardTitle}</FormSectionTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 md:px-6">
				<form.AppField name={radioFieldName} listeners={{ onChange: () => haptic("selection") }}>
					{(field: {
						name: string;
						RadioGroupField: React.ComponentType<{
							label: string;
							options: RadioOption[];
						}>;
					}) => (
						<div className="space-y-2">
							<FieldLabel htmlFor={field.name} required>
								{radioLabel}
							</FieldLabel>
							<field.RadioGroupField label="" options={radioOptions} />
							{radioHint ? <p className="text-muted-foreground text-xs">{radioHint}</p> : null}
						</div>
					)}
				</form.AppField>

				{isDefaultFieldName ? (
					<form.AppField
						name={isDefaultFieldName}
						listeners={{ onChange: () => haptic("selection") }}
					>
						{(field: { CheckboxField: React.ComponentType<{ label: string }> }) => (
							<div className="space-y-2">
								<FieldLabel optional>{isDefaultLabel}</FieldLabel>
								<field.CheckboxField label={isDefaultCheckboxLabel} />
								{isDefaultHint ? (
									<p className="text-muted-foreground text-xs">{isDefaultHint}</p>
								) : null}
							</div>
						)}
					</form.AppField>
				) : null}
			</CardContent>
		</Card>
	);
}
