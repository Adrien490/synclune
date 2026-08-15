"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";

import { FORM_SECTION_CARD_CLASS } from "./shared-styles";
import { FormSectionTitle } from "@/shared/components/forms/form-section-title";

export interface StockFieldProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Shared across multiple form instances (Create/Edit Product, Create/Edit VARIANT). Union typing would create generic explosion; caller is responsible for field name validity.
	form: any;
	/** Nom du champ TanStack pour l'inventaire (e.g. "initialVariant.stock"). */
	stockFieldName: string;
	/** Identifiant unique pour aria-describedby (default "stock-card"). */
	hintIdPrefix?: string;
	/** Microcopie sous le champ (default variant-side wording). */
	hint?: string;
}

export interface StockCardProps extends StockFieldProps {
	viewTransitionName?: string;
}

/**
 * Le champ de quantité, sans chrome de section — monté soit dans `StockCard`,
 * soit dans la section « Le prix et le stock » du formulaire de création.
 */
export function StockField({
	form,
	stockFieldName,
	hintIdPrefix = "stock-card",
	hint = "Laisse vide ou 0 si la variante est en rupture",
}: StockFieldProps) {
	return (
		<form.AppField name={stockFieldName}>
			{(field: {
				InputGroupField: React.ComponentType<{
					type: string;
					min?: number;
					inputMode: "text" | "numeric";
					enterKeyHint: "next" | "done";
					"aria-describedby": string;
					children?: React.ReactNode;
				}>;
			}) => (
				<div className="space-y-2">
					{/* `htmlFor` = `id` posé par `InputGroupField` — cf. `pricing-card.tsx`. */}
					<FieldLabel htmlFor={stockFieldName} optional>
						Quantité en stock
					</FieldLabel>
					<field.InputGroupField
						type="number"
						min={0}
						inputMode="numeric"
						enterKeyHint="done"
						aria-describedby={`${hintIdPrefix}-hint`}
					>
						<InputGroupAddon align="inline-end">
							<PackageIcon className="text-muted-foreground size-4" />
							<InputGroupText className="text-muted-foreground text-xs">unités</InputGroupText>
						</InputGroupAddon>
					</field.InputGroupField>
					<p id={`${hintIdPrefix}-hint`} className="text-muted-foreground text-xs">
						{hint}
					</p>
				</div>
			)}
		</form.AppField>
	);
}

export function StockCard({ viewTransitionName, ...field }: StockCardProps) {
	return (
		<Card
			role="region"
			aria-label="Stock"
			className={FORM_SECTION_CARD_CLASS}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 md:px-6">
				<FormSectionTitle>Stock</FormSectionTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 md:px-6">
				<StockField {...field} />
			</CardContent>
		</Card>
	);
}
