"use client";

import { TriangleAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";

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
			<form.Subscribe
				selector={(state) =>
					[state.values.status, Number(state.values.initialSku.inventory)] as const
				}
			>
				{([status, inventory]) => {
					if (status !== "PUBLIC" || inventory > 0) return null;
					return (
						<Alert variant="warning" data-slot="publication-warning">
							<TriangleAlert aria-hidden="true" />
							<AlertTitle>Publication incohérente</AlertTitle>
							<AlertDescription>
								Le serveur refusera la création car le stock initial est à zéro. Repassez le statut
								en « Brouillon » ou renseignez un stock avant d'enregistrer.
							</AlertDescription>
						</Alert>
					);
				}}
			</form.Subscribe>
		</div>
	);
}
