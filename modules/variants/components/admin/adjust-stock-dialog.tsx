"use client";

import { PackageIcon } from "@phosphor-icons/react/ssr";

import { AdjustStockForm } from "@/modules/variants/components/admin/adjust-stock-form";
import {
	ResponsiveDialog,
	ResponsiveDialogContent,
	ResponsiveDialogDescription,
	ResponsiveDialogHeader,
	ResponsiveDialogTitle,
} from "@/shared/components/responsive-dialog";
import { useDialog } from "@/shared/providers/overlay-store-provider";

export const ADJUST_STOCK_DIALOG_ID = "adjust-variant-stock";

type AdjustStockDialogData = {
	variantId: string;
	variantName: string;
	currentStock: number;
	[key: string]: unknown;
};

export function AdjustStockDialog() {
	const { isOpen, data, close } = useDialog<AdjustStockDialogData>(ADJUST_STOCK_DIALOG_ID);

	return (
		<ResponsiveDialog open={isOpen} onOpenChange={(open) => !open && close()}>
			<ResponsiveDialogContent className="sm:max-w-100">
				<ResponsiveDialogHeader>
					<ResponsiveDialogTitle className="flex items-center gap-2">
						<PackageIcon className="text-primary size-5" />
						Ajuster le stock
					</ResponsiveDialogTitle>
					<ResponsiveDialogDescription>
						Variante : <span className="font-semibold">{data?.variantName}</span>
					</ResponsiveDialogDescription>
				</ResponsiveDialogHeader>

				{data && (
					<AdjustStockForm
						variantId={data.variantId}
						variantName={data.variantName}
						currentStock={data.currentStock}
						onSuccess={close}
					/>
				)}
			</ResponsiveDialogContent>
		</ResponsiveDialog>
	);
}
