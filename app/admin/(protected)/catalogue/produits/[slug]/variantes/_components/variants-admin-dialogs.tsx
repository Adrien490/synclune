"use client";

import { AdjustStockDialog } from "@/modules/variants/components/admin/adjust-stock-dialog";
import { DeleteProductVariantAlertDialog } from "@/modules/variants/components/admin/delete-variant-alert-dialog";
import { UpdatePriceDialog } from "@/modules/variants/components/admin/update-price-dialog";

export function VariantsAdminDialogs() {
	return (
		<>
			<DeleteProductVariantAlertDialog />
			<AdjustStockDialog />
			<UpdatePriceDialog />
		</>
	);
}
