"use client";

import { PricingCard } from "@/modules/products/components/admin/shared/pricing-card";
import { StatusCard } from "@/modules/products/components/admin/shared/status-card";
import { StockCard } from "@/modules/products/components/admin/shared/stock-card";
import { VariantCard } from "@/modules/products/components/admin/shared/variant-card";

import type { SkuFormInstance, SkuFormSharedProps } from "./sku-form-types";

interface SkuSidebarCardsProps {
	form: SkuFormInstance;
	colors: SkuFormSharedProps["colors"];
	materials: SkuFormSharedProps["materials"];
	/** Préfixe pour les viewTransitionName (default "sku-create"). */
	viewTransitionPrefix?: "sku-create" | "sku-edit";
}

export function SkuSidebarCards({
	form,
	colors,
	materials,
	viewTransitionPrefix = "sku-create",
}: SkuSidebarCardsProps) {
	return (
		<div className="space-y-6">
			<VariantCard
				form={form}
				colors={colors}
				materials={materials}
				colorIdsFieldName="colorIds"
				materialsFieldName="materialIds"
				sizeFieldName="size"
				ariaLabel="Variante"
				tooltipText="Couleur, matériau et taille distinguent cette variante des autres variantes du même produit."
				viewTransitionName={`${viewTransitionPrefix}-variant`}
			/>
			<PricingCard
				form={form}
				priceFieldName="priceInclTaxEuros"
				compareAtPriceFieldName="compareAtPriceEuros"
				hintIdPrefix={`${viewTransitionPrefix}-price`}
				viewTransitionName={`${viewTransitionPrefix}-pricing`}
			/>
			<StockCard
				form={form}
				inventoryFieldName="inventory"
				hintIdPrefix={`${viewTransitionPrefix}-stock`}
				hint="Laissez vide ou 0 si la variante est en rupture"
				viewTransitionName={`${viewTransitionPrefix}-stock`}
			/>
			<StatusCard
				form={form}
				cardAriaLabel="Statut de la variante"
				radioFieldName="isActive"
				radioLabel="Disponibilité"
				radioOptions={[
					{ value: "true", label: "Actif" },
					{ value: "false", label: "Inactif" },
				]}
				radioHint="Une variante inactive n'est pas achetable même si le produit est public"
				isDefaultFieldName="isDefault"
				isDefaultLabel="Variante par défaut"
				isDefaultCheckboxLabel="Affichée en premier sur la fiche produit"
				isDefaultHint="Une seule variante par produit peut être marquée par défaut"
				viewTransitionName={`${viewTransitionPrefix}-status`}
			/>
		</div>
	);
}
