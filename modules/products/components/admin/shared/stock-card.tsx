"use client";

import { Package } from "lucide-react";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";

import { FORM_SECTION_CARD_CLASS, MOBILE_SECTION_TITLE } from "./shared-styles";

export interface StockCardProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Shared across multiple form instances (Create/Edit Product, Create/Edit SKU). Union typing would create generic explosion; caller is responsible for field name validity.
	form: any;
	/** Nom du champ TanStack pour l'inventaire (e.g. "initialSku.inventory"). */
	inventoryFieldName: string;
	/** Identifiant unique pour aria-describedby (default "stock-card"). */
	hintIdPrefix?: string;
	/** Microcopie sous le champ (default sku-side wording). */
	hint?: string;
	viewTransitionName?: string;
}

export function StockCard({
	form,
	inventoryFieldName,
	hintIdPrefix = "stock-card",
	hint = "Laissez vide ou 0 si la variante est en rupture",
	viewTransitionName,
}: StockCardProps) {
	return (
		<Card
			role="region"
			aria-label="Stock"
			className={FORM_SECTION_CARD_CLASS}
			style={viewTransitionName ? { viewTransitionName } : undefined}
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Stock</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 lg:px-6">
				<form.AppField name={inventoryFieldName}>
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
							<FieldLabel optional>Quantité en stock</FieldLabel>
							<field.InputGroupField
								type="number"
								min={0}
								inputMode="numeric"
								enterKeyHint="done"
								aria-describedby={`${hintIdPrefix}-hint`}
							>
								<InputGroupAddon align="inline-end">
									<Package className="text-muted-foreground size-4" />
									<InputGroupText className="text-muted-foreground text-xs">unités</InputGroupText>
								</InputGroupAddon>
							</field.InputGroupField>
							<p id={`${hintIdPrefix}-hint`} className="text-muted-foreground text-xs">
								{hint}
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
