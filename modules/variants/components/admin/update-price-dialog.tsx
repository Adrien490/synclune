"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/overlay-store-provider";

import { UpdatePriceForm } from "@/modules/variants/components/admin/update-price-form";

export const UPDATE_PRICE_DIALOG_ID = "update-variant-price";

export type UpdatePriceDialogData = {
	variantId: string;
	variantName: string;
	/** Override de prix en centimes, `null` si la variante suit le produit. */
	priceCents: number | null;
	/** Prix du produit parent en centimes. */
	productPriceCents: number;
	[key: string]: unknown;
};

export function UpdatePriceDialog() {
	const { isOpen, data, close } = useDialog<UpdatePriceDialogData>(UPDATE_PRICE_DIALOG_ID);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="sm:max-w-100">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle>Modifier le prix</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Variante : <span className="font-semibold">{data?.variantName}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{data && (
					<UpdatePriceForm
						key={`${data.variantId}-${isOpen}`}
						variantId={data.variantId}
						variantName={data.variantName}
						priceCents={data.priceCents}
						productPriceCents={data.productPriceCents}
						onSuccess={close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
