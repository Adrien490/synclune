"use client";

import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/dialog-store-provider";

import { UpdatePriceForm } from "@/modules/skus/components/admin/update-price-form";

export const UPDATE_PRICE_DIALOG_ID = "update-sku-price";

type UpdatePriceDialogData = {
	skuId: string;
	skuName: string;
	currentPrice: number;
	currentCompareAtPrice: number | null;
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
						Variante : <span className="font-semibold">{data?.skuName}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{data && (
					<UpdatePriceForm
						key={`${data.skuId}-${isOpen}`}
						skuId={data.skuId}
						skuName={data.skuName}
						currentPrice={data.currentPrice}
						currentCompareAtPrice={data.currentCompareAtPrice}
						onSuccess={close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
