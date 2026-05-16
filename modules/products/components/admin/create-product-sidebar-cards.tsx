"use client";

import { PricingCard } from "./shared/pricing-card";
import { StatusCard } from "./shared/status-card";
import { StockCard } from "./shared/stock-card";
import { VariantCard } from "./shared/variant-card";
import type {
	CreateProductFormInstance,
	CreateProductFormProps,
} from "./create-product-form-types";

interface CreateProductSidebarCardsProps {
	form: CreateProductFormInstance;
	colors: CreateProductFormProps["colors"];
	materials: CreateProductFormProps["materials"];
}

export function CreateProductSidebarCards({
	form,
	colors,
	materials,
}: CreateProductSidebarCardsProps) {
	return (
		<div className="space-y-6">
			<VariantCard
				form={form}
				colors={colors}
				materials={materials}
				colorIdsFieldName="initialSku.colorIds"
				materialsFieldName="initialSku.materialIds"
				sizeFieldName="initialSku.size"
				ariaLabel="Variante initiale"
				tooltipText="Ces attributs concernent la première variante du produit. Vous pourrez ajouter d'autres variantes après la création."
			/>
			<PricingCard
				form={form}
				priceFieldName="initialSku.priceInclTaxEuros"
				compareAtPriceFieldName="initialSku.compareAtPriceEuros"
				hintIdPrefix="create-product-price"
			/>
			<StockCard
				form={form}
				inventoryFieldName="initialSku.inventory"
				hintIdPrefix="create-product-stock"
				hint="Laissez vide ou 0 si le bijou est en rupture"
			/>
			<StatusCard
				form={form}
				radioFieldName="status"
				radioLabel="Visibilité"
				radioOptions={[
					{ value: "DRAFT", label: "Brouillon" },
					{ value: "PUBLIC", label: "Public" },
				]}
				radioHint="Un brouillon reste invisible côté boutique. Public le rend visible immédiatement."
				cardAriaLabel="Statut du bijou"
			/>
		</div>
	);
}
