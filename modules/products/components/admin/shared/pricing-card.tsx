"use client";

import { CurrencyEurIcon } from "@phosphor-icons/react/ssr";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { InputGroupAddon } from "@/shared/components/ui/input-group";

import { FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

export interface PricingFieldsProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	/** Nom du champ TanStack pour le prix de vente (e.g. "priceEuros"). */
	priceFieldName: string;
	/** Identifiant unique pour les aria-describedby (default "pricing-card"). */
	hintIdPrefix?: string;
	/**
	 * Prix optionnel (variantes) : vide = hérite du prix produit. Le champ
	 * n'est alors ni `required` ni validé « > 0 » quand il est vide.
	 */
	priceOptional?: boolean;
	/** Texte d'aide sous le champ (default « Le prix que paiera le client »). */
	priceHint?: string;
}

export interface PricingCardProps extends PricingFieldsProps {
	viewTransitionName?: string;
}

/**
 * Le champ de prix, sans chrome de section — schéma lean (lot 2) : plus de
 * prix comparé (`compareAtPrice` n'existe plus en base).
 *
 * Extrait pour être monté soit dans `PricingCard` (édition produit, variantes),
 * soit directement dans la section « Le prix et le stock » du formulaire de
 * création, qui le réunit avec le stock.
 */
export function PricingFields({
	form,
	priceFieldName,
	hintIdPrefix = "pricing-card",
	priceOptional = false,
	priceHint = "Le prix que paiera le client",
}: PricingFieldsProps) {
	return (
		<form.AppField
			name={priceFieldName}
			validators={{
				onChange: ({ value }: { value: number | null | "" | undefined }) => {
					if (priceOptional && (value === "" || value == null)) {
						return undefined;
					}
					return !value || value <= 0 ? "Le prix doit être supérieur à 0" : undefined;
				},
			}}
		>
			{(field: {
				InputGroupField: React.ComponentType<{
					type: string;
					step: string;
					required?: boolean;
					enterKeyHint: "next" | "done";
					"aria-describedby": string;
					children?: React.ReactNode;
				}>;
			}) => (
				<div className="space-y-2">
					{/*
					 * `htmlFor` = le nom du champ, qui est aussi l'`id` que pose
					 * `InputGroupField` (contrat verrouillé par
					 * `field-name-id-contract.regression.test.ts`). Sans lui, ce `<label>`
					 * ne s'associait à rien : l'input n'avait AUCUN nom accessible et
					 * s'annonçait par son seul indice (« Le prix que paiera le client »).
					 */}
					<FieldLabel htmlFor={priceFieldName} required={!priceOptional} optional={priceOptional}>
						Prix de vente final
					</FieldLabel>
					<field.InputGroupField
						type="number"
						step="0.01"
						required={!priceOptional}
						enterKeyHint="next"
						aria-describedby={`${hintIdPrefix}-sale-hint`}
					>
						<InputGroupAddon>
							<CurrencyEurIcon className="size-4" />
						</InputGroupAddon>
					</field.InputGroupField>
					<p id={`${hintIdPrefix}-sale-hint`} className="text-muted-foreground text-xs">
						{priceHint}
					</p>
				</div>
			)}
		</form.AppField>
	);
}

export function PricingCard({ viewTransitionName, ...fields }: PricingCardProps) {
	return (
		<Card
			role="region"
			aria-label="Tarification"
			className={FORM_SECTION_CARD_CLASS}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>Tarification</FormSectionTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 md:px-6">
				<PricingFields {...fields} />
			</CardContent>
		</Card>
	);
}
