"use client";

import { PricingCard } from "./shared/pricing-card";
import { StatusCard } from "./shared/status-card";
import { StockCard } from "./shared/stock-card";
import { VariantCard } from "./shared/variant-card";
import type { EditProductFormInstance, EditProductFormProps } from "./edit-product-form-types";

interface EditProductSidebarCardsProps {
	form: EditProductFormInstance;
	colors: EditProductFormProps["colors"];
	materials: EditProductFormProps["materials"];
}

export function EditProductSidebarCards({ form, colors, materials }: EditProductSidebarCardsProps) {
	return (
		<div className="space-y-6">
			<VariantCard
				form={form}
				colors={colors}
				materials={materials}
				colorIdsFieldName="defaultSku.colorIds"
				materialsFieldName="defaultSku.materialIds"
				sizeFieldName="defaultSku.size"
				ariaLabel="Variante par défaut"
				tooltipText="Ces attributs concernent la variante par défaut du produit. Les autres variantes se gèrent depuis la page Variantes."
			/>
			<PricingCard
				form={form}
				priceFieldName="defaultSku.priceInclTaxEuros"
				compareAtPriceFieldName="defaultSku.compareAtPriceEuros"
				hintIdPrefix="edit-product-price"
			/>
			<StockCard
				form={form}
				inventoryFieldName="defaultSku.inventory"
				hintIdPrefix="edit-product-stock"
				hint="Laissez vide ou 0 si le bijou est en rupture"
			/>
			<StatusCard
				form={form}
				radioFieldName="status"
				radioLabel="Visibilité"
				radioOptions={[
					{ value: "DRAFT", label: "Brouillon" },
					{ value: "PUBLIC", label: "Public" },
					{ value: "ARCHIVED", label: "Archivé" },
				]}
				radioHint="Archiver désactive automatiquement toutes les variantes"
				cardAriaLabel="Statut du bijou"
			/>
			<StatusCard
				form={form}
				cardTitle="Statut de la variante"
				cardAriaLabel="Statut de la variante par défaut"
				radioFieldName="defaultSku.isActive"
				radioLabel="Disponibilité"
				radioOptions={[
					{ value: "true", label: "Actif" },
					{ value: "false", label: "Inactif" },
				]}
				radioHint="Une variante inactive n'est plus achetable même si le produit est public"
			/>
		</div>
	);
}
