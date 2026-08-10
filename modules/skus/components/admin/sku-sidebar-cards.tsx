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

/**
 * Cards de configuration d'une variante (Variante, Prix, Stock, Statut).
 *
 * Disposées en grille 2 colonnes équilibrée sur desktop (`lg:`) sous la card média
 * pleine largeur : colonne 1 = Variante (haute) + Statut, colonne 2 = Prix + Stock.
 * Sur mobile, les colonnes s'empilent (rendu « flat » via FORM_SECTION_CARD_CLASS).
 */
export function SkuSidebarCards({
	form,
	colors,
	materials,
	viewTransitionPrefix = "sku-create",
}: SkuSidebarCardsProps) {
	return (
		<div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
			{/* Colonne 1 : Variante (haute) + Statut */}
			<div className="flex flex-col gap-6">
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
					viewTransitionName={`${viewTransitionPrefix}-status`}
				/>
			</div>
			{/* Colonne 2 : Prix + Stock */}
			<div className="flex flex-col gap-6">
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
					hint="Laisse vide ou 0 si la variante est en rupture"
					viewTransitionName={`${viewTransitionPrefix}-stock`}
				/>
			</div>
		</div>
	);
}
