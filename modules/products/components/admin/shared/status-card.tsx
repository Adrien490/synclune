"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { useHaptic } from "@/shared/hooks/use-haptic";

import { FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

type RadioOption = { value: string; label: string };

/**
 * Carte « Statut » partagée. Rend toujours un radio (Visibilité produit OU
 * Disponibilité variante).
 *
 * ⚠️ La checkbox « Variante par défaut » a disparu avec `ProductSku.isDefault`
 * (audit schéma V5, lot A) : la variante principale est désormais le rang 0 de
 * `position`, un ORDRE — plus un drapeau qu'une case à cocher saurait porter.
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
			</CardContent>
		</Card>
	);
}
