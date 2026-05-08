"use client";

import { AdjustStockDialog } from "@/modules/skus/components/admin/adjust-stock-dialog";
import { DeleteProductSkuAlertDialog } from "@/modules/skus/components/admin/delete-sku-alert-dialog";
import { UpdatePriceDialog } from "@/modules/skus/components/admin/update-price-dialog";

export function SkusAdminDialogs() {
	return (
		<>
			<DeleteProductSkuAlertDialog />
			<AdjustStockDialog />
			<UpdatePriceDialog />
		</>
	);
}
