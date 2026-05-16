"use client";

import { Euro } from "lucide-react";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { InputGroupAddon } from "@/shared/components/ui/input-group";

import { MOBILE_SECTION_TITLE } from "./shared-styles";

const COMPARE_AT_PRICE_ERROR = "Le prix comparé doit être supérieur ou égal au prix de vente";

export interface PricingCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	form: any;
	/** Nom du champ TanStack pour le prix de vente (e.g. "initialSku.priceInclTaxEuros"). */
	priceFieldName: string;
	/** Nom du champ pour le prix comparé (e.g. "initialSku.compareAtPriceEuros"). */
	compareAtPriceFieldName: string;
	/** Identifiant unique pour les aria-describedby (default "pricing-card"). */
	hintIdPrefix?: string;
	viewTransitionName?: string;
}

export function PricingCard({
	form,
	priceFieldName,
	compareAtPriceFieldName,
	hintIdPrefix = "pricing-card",
	viewTransitionName,
}: PricingCardProps) {
	const validateCompareAtPrice = ({
		value,
		fieldApi,
	}: {
		value: number | null | undefined;
		fieldApi: {
			form: { getFieldValue: (name: string) => number | null | undefined };
		};
	}) => {
		if (!value) return undefined;
		const price = fieldApi.form.getFieldValue(priceFieldName);
		return price && value < price ? COMPARE_AT_PRICE_ERROR : undefined;
	};

	return (
		<Card
			role="region"
			aria-label="Tarification"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Tarification</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField
					name={priceFieldName}
					validators={{
						onChange: ({ value }: { value: number | null }) =>
							!value || value <= 0 ? "Le prix doit être supérieur à 0" : undefined,
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
							<FieldLabel required>Prix de vente final</FieldLabel>
							<field.InputGroupField
								type="number"
								step="0.01"
								required
								enterKeyHint="next"
								aria-describedby={`${hintIdPrefix}-sale-hint`}
							>
								<InputGroupAddon>
									<Euro className="size-4" />
								</InputGroupAddon>
							</field.InputGroupField>
							<p id={`${hintIdPrefix}-sale-hint`} className="text-muted-foreground text-xs">
								Le prix que paiera le client
							</p>
						</div>
					)}
				</form.AppField>

				<form.AppField
					name={compareAtPriceFieldName}
					validators={{
						onChangeListenTo: [priceFieldName],
						onChange: validateCompareAtPrice,
						onBlur: validateCompareAtPrice,
					}}
				>
					{(field: {
						InputGroupField: React.ComponentType<{
							type: string;
							step: string;
							enterKeyHint: "next" | "done";
							"aria-describedby": string;
							children?: React.ReactNode;
						}>;
					}) => (
						<div className="space-y-2">
							<FieldLabel optional>Ancien prix (affiché barré)</FieldLabel>
							<field.InputGroupField
								type="number"
								step="0.01"
								enterKeyHint="done"
								aria-describedby={`${hintIdPrefix}-compare-hint`}
							>
								<InputGroupAddon>
									<Euro className="size-4" />
								</InputGroupAddon>
							</field.InputGroupField>
							<p id={`${hintIdPrefix}-compare-hint`} className="text-muted-foreground text-xs">
								Sera affiché barré à côté du prix actuel (ex:{" "}
								<span className="line-through">45€</span> → 39€)
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
