"use client";

import { FieldLabel } from "@/shared/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { InputGroupAddon, InputGroupText } from "@/shared/components/ui/input-group";
import { Euro, Package } from "lucide-react";
import type { SkuFormInstance } from "./sku-form-types";

interface SkuSidebarCardsProps {
	form: SkuFormInstance;
}

const MOBILE_SECTION_TITLE =
	"text-muted-foreground text-sm font-semibold tracking-wide uppercase lg:text-foreground lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal";

const COMPARE_AT_PRICE_ERROR = "Le prix comparé doit être supérieur ou égal au prix de vente";

type CompareAtValidatorArgs = {
	value: number | null | undefined;
	fieldApi: {
		form: { getFieldValue: (name: "priceInclTaxEuros") => number | null | undefined };
	};
};

function validateCompareAtPrice({ value, fieldApi }: CompareAtValidatorArgs) {
	if (!value) return undefined;
	const price = fieldApi.form.getFieldValue("priceInclTaxEuros");
	return price && value < price ? COMPARE_AT_PRICE_ERROR : undefined;
}

export function SkuSidebarCards({ form }: SkuSidebarCardsProps) {
	return (
		<div className="space-y-6">
			<PricingCard form={form} />
			<StockCard form={form} />
		</div>
	);
}

function PricingCard({ form }: { form: SkuFormInstance }) {
	return (
		<Card
			role="region"
			aria-label="Tarification"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Tarification</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4 px-0 sm:px-0 lg:px-6">
				<form.AppField
					name="priceInclTaxEuros"
					validators={{
						onChange: ({ value }: { value: number | null }) =>
							!value || value <= 0 ? "Le prix doit être supérieur à 0" : undefined,
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel required>Prix de vente final</FieldLabel>
							<field.InputGroupField
								type="number"
								step="0.01"
								required
								enterKeyHint="next"
								aria-describedby="sku-price-sale-hint"
							>
								<InputGroupAddon>
									<Euro className="h-4 w-4" />
								</InputGroupAddon>
							</field.InputGroupField>
							<p id="sku-price-sale-hint" className="text-muted-foreground text-xs">
								Le prix que paiera le client
							</p>
						</div>
					)}
				</form.AppField>

				<form.AppField
					name="compareAtPriceEuros"
					validators={{
						onChangeListenTo: ["priceInclTaxEuros"],
						onChange: validateCompareAtPrice,
						onBlur: validateCompareAtPrice,
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Ancien prix (affiché barré)</FieldLabel>
							<field.InputGroupField
								type="number"
								step="0.01"
								enterKeyHint="done"
								aria-describedby="sku-price-compare-hint"
							>
								<InputGroupAddon>
									<Euro className="h-4 w-4" />
								</InputGroupAddon>
							</field.InputGroupField>
							<p id="sku-price-compare-hint" className="text-muted-foreground text-xs">
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

function StockCard({ form }: { form: SkuFormInstance }) {
	return (
		<Card
			role="region"
			aria-label="Stock"
			className="lg:bg-card gap-3 rounded-none border-0 bg-transparent py-0 shadow-none lg:gap-6 lg:rounded-xl lg:border lg:py-6 lg:shadow-md"
		>
			<CardHeader className="px-0 sm:px-0 lg:px-6">
				<CardTitle className={MOBILE_SECTION_TITLE}>Stock</CardTitle>
			</CardHeader>
			<CardContent className="px-0 sm:px-0 lg:px-6">
				<form.AppField name="inventory">
					{(field) => (
						<div className="space-y-2">
							<FieldLabel optional>Quantité en stock</FieldLabel>
							<field.InputGroupField
								type="number"
								min={0}
								inputMode="numeric"
								enterKeyHint="done"
								aria-describedby="sku-stock-hint"
							>
								<InputGroupAddon align="inline-end">
									<Package className="text-muted-foreground h-4 w-4" />
									<InputGroupText className="text-muted-foreground text-xs">unités</InputGroupText>
								</InputGroupAddon>
							</field.InputGroupField>
							<p id="sku-stock-hint" className="text-muted-foreground text-xs">
								Laissez vide ou 0 si la variante est en rupture
							</p>
						</div>
					)}
				</form.AppField>
			</CardContent>
		</Card>
	);
}
